// Real routes, isolated random database only; never modifies application records.
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const databaseName = `gaavli_contact_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
Object.assign(process.env, {
  MONGODB_URI: uri.toString(),
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
});
mongoose.set("maxTimeMS", 15000);
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Listing, Category, Notification } =
  await import("../src/server/models");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { VillageConnection } = await import("../src/server/models/coordinator");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { GET: contact } =
  await import("../src/app/api/v1/listings/[id]/contact/route");
const { POST: interested } =
  await import("../src/app/api/v1/listings/[id]/interested/route");
const { POST: notify } =
  await import("../src/app/api/v1/listings/[id]/notify-farmer/route");
const { GET: detail } = await import("../src/app/api/v1/listings/[id]/route");
const { getRequestContact, getActivityRequests } =
  await import("../src/server/services/requests");
const { getUserNotifications } =
  await import("../src/server/services/notifications");
const { sendFirebaseTestPush } =
  await import("../src/server/services/notification-push");
const { requireMobileSession } =
  await import("../src/server/services/mobile-auth");
const { GET: notificationInbox, PATCH: readNotifications } =
  await import("../src/app/api/v1/notifications/route");
const { GET: pushStatus, PUT: enablePush, DELETE: disablePush, PATCH: refreshPush } =
  await import("../src/app/api/v1/notifications/push-device/route");
const { POST: testPush } =
  await import("../src/app/api/v1/notifications/push-device/test/route");
const { PushDevice } = await import("../src/server/models/push-device");
const { POST: logout } = await import("../src/app/api/v1/auth/logout/route");
const { visibleSellerContact } =
  await import("../src/server/repositories/listing-contact");

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (
  path: string,
  token: string | null,
  method = "GET",
  body?: unknown,
  key?: string,
) =>
  new Request(`http://localhost/api/v1/${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function tokenFor(
  user: mongoose.Types.ObjectId,
  refreshToken = randomBytes(32).toString("hex"),
) {
  const token = randomBytes(32).toString("hex");
  await MobileSession.create({
    user,
    provider: "test",
    accessHash: hashToken(token),
    refreshHash: hashToken(refreshToken),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  return token;
}

const originalFetch = globalThis.fetch;
try {
  await connectMobileDb();
  await Promise.all([Listing.init(), Category.init()]);
  const [registered, browsing] = await Village.create([
    { nameEn: "Narayangaon", nameMr: "नारायणगाव" },
    { nameEn: "Kalamb", nameMr: "कळंब" },
  ]);
  const [buyer, seller, outsider] = await User.create([
    { name: "Buyer", mobile: "9000000001", village: registered._id },
    {
      name: "Seller",
      mobile: "9000000002",
      village: browsing._id,
      roles: ["buyer", "seller"],
    },
    { name: "Outsider", mobile: "9000000003", village: registered._id },
  ]);
  const buyerToken = await tokenFor(buyer._id);
  const sellerToken = await tokenFor(seller._id);
  const invalidDeviceSession = await tokenFor(seller._id);
  const revokedRefreshToken = randomBytes(32).toString("hex");
  const revokedSession = await tokenFor(seller._id, revokedRefreshToken);
  const buyerDevice = randomBytes(32).toString("hex");
  const sellerDevice = randomBytes(32).toString("hex");
  const invalidDevice = randomBytes(32).toString("hex");
  const revokedDevice = randomBytes(32).toString("hex");
  const pushPath = "notifications/push-device";
  const optIn = (session: string | null, token: string) =>
    enablePush(request(pushPath, session, "PUT", { token, language: "mr" }));
  assert.equal((await optIn(null, sellerDevice)).status, 401);
  assert.equal((await optIn(sellerToken, "invalid token")).status, 422);
  assert.deepEqual((await (await pushStatus(request(pushPath, sellerToken))).json()).data, {
    enabled: false,
  });
  for (const [session, device] of [
    [buyerToken, buyerDevice],
    [sellerToken, sellerDevice],
    [invalidDeviceSession, invalidDevice],
    [revokedSession, revokedDevice],
  ]) {
    const response = await optIn(session, device);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { enabled: true });
  }
  assert.equal(
    (await logout(request("auth/logout", null, "POST", { refreshToken: revokedRefreshToken }))).status,
    200,
  );
  const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
    project_id: "gaavli-fcm-test",
    client_email: "test@gaavli-fcm-test.iam.gserviceaccount.com",
    private_key: privateKey.export({ format: "pem", type: "pkcs8" }),
  });
  const sentPush: { token: string; notification: { body: string }; data: unknown }[] = [];
  const testPushes: string[] = [];
  let oauthCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (url === "https://oauth2.googleapis.com/token") {
      oauthCalls++;
      return Response.json({ access_token: "fcm-test", expires_in: 3600 });
    }
    assert.equal(url, "https://fcm.googleapis.com/v1/projects/gaavli-fcm-test/messages:send");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fcm-test");
    const { message, validate_only } = JSON.parse(String(init?.body));
    if (message.data.kind === "firebase-test") {
      assert.notEqual(validate_only, true);
      assert.match(message.notification.body, /चाचणी सूचना/);
      testPushes.push(message.token);
      return Response.json({ name: "test-message" });
    }
    assert.ok(await Notification.exists({ userId: seller._id, type: "BUYER_TRIED_CONTACT" }));
    sentPush.push(message);
    return message.token === invalidDevice
      ? Response.json({ error: { details: [{ errorCode: "UNREGISTERED" }] } }, { status: 404 })
      : Response.json({ name: "test-message" });
  };
  const runPushTest = (session: string | null, token: string) =>
    testPush(request(`${pushPath}/test`, session, "POST", { token }));
  assert.equal((await runPushTest(null, sellerDevice)).status, 401);
  assert.equal((await runPushTest(sellerToken, "invalid token")).status, 422);
  assert.equal((await runPushTest(buyerToken, sellerDevice)).status, 404);
  assert.equal((await runPushTest(sellerToken, invalidDevice)).status, 404);
  assert.equal((await runPushTest(revokedSession, revokedDevice)).status, 401);
  const testResult = await runPushTest(sellerToken, sellerDevice);
  assert.equal(testResult.status, 200);
  assert.deepEqual((await testResult.json()).data, { status: "accepted" });
  assert.deepEqual(testPushes, [sellerDevice]);
  assert.equal(await Notification.countDocuments(), 0);

  const pendingPushes: (() => Promise<void>)[] = [];
  for (const [accessToken, token] of [
    [sellerToken, sellerDevice],
    [buyerToken, buyerDevice],
  ]) {
    const { session } = await requireMobileSession(request(pushPath, accessToken));
    assert.deepEqual(
      await sendFirebaseTestPush(session, token, (send) => pendingPushes.push(send)),
      { status: "scheduled", delaySeconds: 5 },
    );
  }
  assert.deepEqual(testPushes, [sellerDevice], "no push before the callbacks run");
  const start = performance.now();
  const delivery = Promise.all(pendingPushes.map((send) => send()));
  assert.equal((await disablePush(request(pushPath, buyerToken, "DELETE"))).status, 200);
  await delivery;
  assert.ok(performance.now() - start >= 4900);
  assert.deepEqual(testPushes, [sellerDevice, sellerDevice]);
  assert.equal(await Notification.countDocuments(), 0);
  assert.equal((await optIn(buyerToken, buyerDevice)).status, 200);

  await Category.create({
    code: "PERISHABLE",
    name: "Fresh",
    nameMr: "ताजे",
    defaultShelfLife: "2 days",
    notifyMode: "daily_digest",
    status: "ACTIVE",
  });
  const base = {
    productName: "Tomato",
    productGroup: "vegetables",
    village: browsing._id,
    seller: seller._id,
    category: "PERISHABLE",
    quantity: 20,
    unit: "kg",
    price: 30,
    status: "active",
    expiresAt: new Date(Date.now() + 86400000),
  };
  const listing = await Listing.create(base);
  const id = String(listing._id);
  const read = (token: string | null = buyerToken, listingId = id) =>
    contact(
      request(`listings/${listingId}/contact`, token),
      context(listingId),
    );
  assert.equal(await VillageConnection.countDocuments(), 0);
  assert.equal((await read(null)).status, 401);
  const guestDetails = await detail(
    request(`listings/${id}?sourceVillageId=${browsing._id}`, null),
    context(id),
  );
  assert.equal(guestDetails.status, 200);
  assert.equal(
    JSON.stringify(await guestDetails.json()).includes("9000000002"),
    false,
  );
  const response = await read();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.data.seller.mobile, "+919000000002");
  assert.equal(
    await Notification.countDocuments(),
    0,
    "viewing contact sends no notification",
  );
  assert.equal((await read(sellerToken)).status, 403);
  // Reporting still uses its original village-scoped helper.
  await User.db.transaction(async (session) => {
    assert.equal(
      await visibleSellerContact(id, String(registered._id), session),
      null,
    );
  });
  assert.equal(
    (
      await notify(
        request(
          `listings/${id}/notify-farmer`,
          buyerToken,
          "POST",
          { quantity: 2, callbackConsent: true },
          "before-interest",
        ),
        context(id),
      )
    ).status,
    403,
  );
  const interest = await interested(
    request(`listings/${id}/interested`, buyerToken, "POST", {}),
    context(id),
  );
  assert.equal(
    interest.status,
    200,
    "Call's contact/interest route allows cross-village access",
  );
  const message = "उद्या येतो\nPlease keep it ready.";
  const input = {
    quantity: 2,
    callbackConsent: true,
    message: `  ${message}  `,
  };
  const notification = await notify(
    request(
      `listings/${id}/notify-farmer`,
      buyerToken,
      "POST",
      input,
      "cross-village-notify",
    ),
    context(id),
  );
  assert.equal(notification.status, 200);
  const noticeId = (await notification.json()).data.notificationId;
  assert.equal(oauthCalls, 1, "devices share the OAuth access token");
  assert.deepEqual(new Set(sentPush.map((row) => row.token)), new Set([sellerDevice, invalidDevice]));
  assert.equal(sentPush.length, 2);
  for (const push of sentPush) {
    assert.match(push.notification.body, /नवीन विनंती/);
    assert.doesNotMatch(push.notification.body, /Buyer|9000000001|Tomato|Please keep/);
    assert.deepEqual(push.data, { kind: "seller-request" });
  }
  assert.equal(await PushDevice.exists({ _id: invalidDevice }), null);
  assert.deepEqual((await (await pushStatus(request(pushPath, invalidDeviceSession))).json()).data, {
    enabled: true,
  });
  const repeat = await notify(
    request(`listings/${id}/notify-farmer`, buyerToken, "POST", input, "cross-village-notify"),
    context(id),
  );
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).data.notificationId, noticeId);
  assert.equal(sentPush.length, 2, "replay does not send another push");
  assert.equal((await disablePush(request(pushPath, sellerToken, "DELETE"))).status, 200);
  assert.equal((await runPushTest(sellerToken, sellerDevice)).status, 404);
  assert.deepEqual(testPushes, [sellerDevice, sellerDevice]);
  assert.deepEqual(
    (await (await pushStatus(request(pushPath, sellerToken))).json()).data,
    { enabled: false },
  );
  assert.deepEqual(
    (await (await refreshPush(request(pushPath, sellerToken, "PATCH", {
      token: sellerDevice,
      language: "hi",
    }))).json()).data,
    { enabled: false },
  );
  const savedNotice = await Notification.findById(noticeId).lean();
  assert.equal(savedNotice?.data?.message, message);
  assert.ok(savedNotice?.body.includes(message));
  assert.ok(savedNotice?.bodyMr?.includes(message));
  const messageHistory = await getActivityRequests(String(seller._id), {
    direction: "received",
    page: 1,
    limit: 20,
    includeMessages: "true",
    includeBuyerMobile: "true",
  });
  assert.equal(messageHistory.requests[0].message, message);
  assert.equal(messageHistory.requests[0].person.mobile, "9000000001");
  const inboxQuery = {
    page: 1,
    limit: 20,
    language: "en" as const,
    includeReadState: "true" as const,
  };
  const sellerInbox = await getUserNotifications(
    String(seller._id),
    inboxQuery,
  );
  assert.equal(sellerInbox.notifications[0].readAt, null);
  assert.equal(
    (await getUserNotifications(String(outsider._id), inboxQuery)).total,
    0,
  );
  const readAt = new Date();
  await Notification.updateOne({ _id: noticeId }, { $set: { readAt } });
  assert.equal(
    (await getUserNotifications(String(seller._id), inboxQuery))
      .notifications[0].readAt,
    readAt.toISOString(),
  );
  assert.equal(
    "readAt" in
      (
        await getUserNotifications(String(seller._id), {
          page: 1,
          limit: 20,
          language: "en",
        })
      ).notifications[0],
    false,
  );
  const changedMessage = await notify(
    request(
      `listings/${id}/notify-farmer`,
      buyerToken,
      "POST",
      { ...input, message: "Different" },
      "cross-village-notify",
    ),
    context(id),
  );
  assert.equal(
    changedMessage.status,
    409,
    "same operation cannot change the staged message",
  );
  const duplicateMessage = await notify(
    request(
      `listings/${id}/notify-farmer`,
      buyerToken,
      "POST",
      { ...input, message: "Different" },
      "changed-message-notify",
    ),
    context(id),
  );
  assert.equal(
    duplicateMessage.status,
    409,
    "24-hour deduplication never silently overwrites a message",
  );
  assert.equal(
    (
      await notify(
        request(
          `listings/${id}/notify-farmer`,
          buyerToken,
          "POST",
          { ...input, message: "a".repeat(501) },
          "long-message-notify",
        ),
        context(id),
      )
    ).status,
    422,
  );
  const sent = await getActivityRequests(String(buyer._id), {
    direction: "sent",
    page: 1,
    limit: 20,
  });
  const received = await getActivityRequests(String(seller._id), {
    direction: "received",
    page: 1,
    limit: 20,
  });
  assert.equal(sent.requests[0].canCall, true);
  assert.equal("mobile" in sent.requests[0].person, false);
  assert.equal("mobile" in received.requests[0].person, false);
  const sentWithMobile = await getActivityRequests(String(buyer._id), {
    direction: "sent",
    page: 1,
    limit: 20,
    includeBuyerMobile: "true",
  });
  assert.equal("mobile" in sentWithMobile.requests[0].person, false);
  assert.equal(
    (
      await getActivityRequests(String(outsider._id), {
        direction: "received",
        page: 1,
        limit: 20,
        includeBuyerMobile: "true",
      })
    ).total,
    0,
  );
  assert.equal(
    "message" in sent.requests[0],
    false,
    "legacy request response shape is unchanged without opt-in",
  );
  assert.equal(received.requests[0].canCall, true);
  assert.equal(
    (await getRequestContact(String(buyer._id), noticeId)).mobile,
    "+919000000002",
  );
  assert.equal(
    (await getRequestContact(String(seller._id), noticeId)).mobile,
    "+919000000001",
  );
  await assert.rejects(getRequestContact(String(outsider._id), noticeId), {
    code: "REQUEST_UNAVAILABLE",
  });
  assert.equal(
    String((await User.findById(buyer._id))?.village),
    String(registered._id),
  );
  assert.equal(await VillageConnection.countDocuments(), 0);
  assert.equal(await Notification.countDocuments(), 1);
  const noCallback = await Listing.create({
    ...base,
    productName: "No callback product",
  });
  const noCallbackId = String(noCallback._id);
  assert.equal(
    (
      await interested(
        request(`listings/${noCallbackId}/interested`, buyerToken, "POST", {}),
        context(noCallbackId),
      )
    ).status,
    200,
  );
  const noCallbackResponse = await notify(
    request(
      `listings/${noCallbackId}/notify-farmer`,
      buyerToken,
      "POST",
      { quantity: 2, callbackConsent: false },
      "no-callback-consent",
    ),
    context(noCallbackId),
  );
  assert.equal(
    noCallbackResponse.status,
    422,
    "explicit false consent is rejected by the existing input contract",
  );
  const legacyNoCallbackResponse = await notify(
    request(
      `listings/${noCallbackId}/notify-farmer`,
      buyerToken,
      "POST",
      {},
      "legacy-no-callback",
    ),
    context(noCallbackId),
  );
  assert.equal(legacyNoCallbackResponse.status, 200);
  assert.equal(sentPush.length, 2, "opted-out and revoked sessions never receive new pushes");
  console.log("PASS: consent, Firebase token registration, private delivery, opt-out, logout, invalid token and replay.");
  const noCallbackNotice = (await legacyNoCallbackResponse.json()).data
    .notificationId;
  await assert.rejects(
    getRequestContact(String(seller._id), noCallbackNotice),
    { code: "CONTACT_PERMISSION_REQUIRED" },
  );
  const noCallbackHistory = await getActivityRequests(String(seller._id), {
    direction: "received",
    includeBuyerMobile: "true",
    page: 1,
    limit: 20,
  });
  assert.equal(
    noCallbackHistory.requests.find((row) => row.id === noCallbackNotice)
      ?.canCall,
    false,
  );
  assert.equal(
    noCallbackHistory.requests.find((row) => row.id === noCallbackNotice)
      ?.person.mobile,
    null,
  );
  await Listing.updateOne({ _id: id }, { $set: { status: "sold" } });
  const unavailableHistory = await getActivityRequests(String(seller._id), {
    direction: "received",
    page: 1,
    limit: 20,
    includeBuyerMobile: "true",
  });
  assert.equal(
    unavailableHistory.requests.find((row) => row.id === noticeId)?.person
      .mobile,
    null,
  );
  await Listing.updateOne({ _id: id }, { $set: { status: "active" } });
  const sellerSentNotice = await Notification.create({
    userId: buyer._id,
    type: "BUYER_TRIED_CONTACT",
    title: "Seller sent request",
    body: "Test",
    data: { buyerId: seller._id, listingId: id },
  });
  const sellerSent = await getActivityRequests(String(seller._id), {
    direction: "sent",
    page: 1,
    limit: 20,
  });
  assert.deepEqual(
    sellerSent.requests.map((row) => row.id),
    [String(sellerSentNotice._id)],
  );
  const sellerReceived = await getActivityRequests(String(seller._id), {
    direction: "received",
    page: 1,
    limit: 20,
  });
  assert.ok(
    sellerReceived.requests.every(
      (row) => row.id !== String(sellerSentNotice._id),
    ),
  );
  // Badge/read updates reuse the same Notify Seller records and recipient IDs.
  await Notification.updateOne({ _id: noticeId }, { $set: { readAt: null } });
  const inbox = async (
    token: string | null,
    query = "includeUnreadCount=true&includeReadState=true&limit=1",
  ) => notificationInbox(request(`notifications?${query}`, token));
  const mark = (token: string | null, ids: string[], extra = {}) =>
    readNotifications(
      request("notifications", token, "PATCH", { ids, ...extra }),
    );
  assert.equal((await inbox(null)).status, 401);
  assert.equal((await mark(null, [noticeId])).status, 401);
  const sellerBefore = await (await inbox(sellerToken)).json();
  assert.equal(
    sellerBefore.data.unreadCount,
    2,
    "unread count is independent of pagination",
  );
  assert.equal((await (await inbox(buyerToken)).json()).data.unreadCount, 1);
  const oldInbox = await (await inbox(sellerToken, "")).json();
  assert.equal(
    "unreadCount" in oldInbox.data,
    false,
    "legacy strict response remains unchanged",
  );
  assert.equal(
    oldInbox.data.notifications.some(
      (row: { readAt?: unknown }) => "readAt" in row,
    ),
    false,
  );
  assert.equal(
    (await mark(buyerToken, [noticeId])).status,
    404,
    "sender cannot read-mark the recipient's record",
  );
  assert.equal(
    (await mark(sellerToken, [String(sellerSentNotice._id)])).status,
    404,
  );
  assert.equal(
    (await mark(sellerToken, [noticeId, String(sellerSentNotice._id)])).status,
    404,
  );
  assert.equal(
    (await Notification.findById(noticeId))?.readAt,
    null,
    "mixed ownership batch rolls back",
  );
  assert.equal((await mark(sellerToken, [])).status, 422);
  assert.equal((await mark(sellerToken, ["invalid"])).status, 422);
  assert.equal(
    (await mark(sellerToken, [noticeId], { userId: String(buyer._id) })).status,
    422,
  );
  const marked = await mark(sellerToken, [noticeId, noticeId.toUpperCase()]);
  assert.equal(marked.status, 200);
  assert.equal(marked.headers.get("cache-control"), "no-store");
  const markedData = (await marked.json()).data;
  assert.equal(markedData.notifications.length, 1);
  assert.equal(markedData.unreadCount, 1);
  const again = await (await mark(sellerToken, [noticeId])).json();
  assert.equal(
    again.data.notifications[0].readAt,
    markedData.notifications[0].readAt,
    "retry preserves original read timestamp",
  );
  const persistedSession = await tokenFor(seller._id);
  assert.equal(
    (await (await inbox(persistedSession)).json()).data.unreadCount,
    1,
    "read state persists across sessions",
  );
  const receivedAfterRead = await getActivityRequests(String(seller._id), {
    direction: "received",
    page: 1,
    limit: 20,
  });
  assert.equal(
    receivedAfterRead.requests.find((row) => row.id === noticeId)?.status,
    "seen",
  );
  assert.equal((await mark(sellerToken, [noCallbackNotice])).status, 200);
  assert.equal((await (await inbox(sellerToken)).json()).data.unreadCount, 0);
  assert.equal(
    (await mark(buyerToken, [String(sellerSentNotice._id)])).status,
    200,
    "buyer recipients can mark their own notifications read",
  );
  assert.equal((await (await inbox(buyerToken)).json()).data.unreadCount, 0);
  const systemNotice = await Notification.create({
    userId: buyer._id,
    type: "COORDINATOR_GRANTED",
    title: "Role changed",
    body: "Role notification",
  });
  assert.equal((await (await inbox(buyerToken)).json()).data.unreadCount, 1);
  assert.equal(
    (await mark(buyerToken, [String(systemNotice._id)])).status,
    200,
  );
  assert.equal((await (await inbox(buyerToken)).json()).data.unreadCount, 0);
  await Notification.deleteMany({
    _id: { $in: [sellerSentNotice._id, systemNotice._id] },
  });
  console.log(
    "PASS: recipient-scoped badge counts, atomic read batches, persisted/idempotent timestamps, buyer/system notices and legacy responses.",
  );
  console.log(
    "PASS: role-compatible sent/received ownership, consented buyer mobile, unavailable-listing privacy, isolated notifications/read state and legacy DTO compatibility.",
  );
  console.log(
    "PASS: Kalamb guest browsing, Narayangaon authenticated contact/Call/Notify/callback, privacy and unchanged profile/connections.",
  );

  for (const patch of [{ isDemo: true }, { status: "reported" }]) {
    const hidden = await Listing.create({ ...base, ...patch });
    assert.equal((await read(buyerToken, String(hidden._id))).status, 404);
  }
  // Sold-out and old listings still show the seller's contact (view only).
  for (const patch of [
    { status: "sold_out", quantity: 0 },
    { expiresAt: new Date(0) },
    { quantity: 0 },
  ]) {
    const old = await Listing.create({ ...base, ...patch });
    assert.equal((await read(buyerToken, String(old._id))).status, 200);
  }
  assert.equal(
    (await read(buyerToken, String(new mongoose.Types.ObjectId()))).status,
    404,
  );
  await User.updateOne({ _id: seller._id }, { $set: { status: "blocked" } });
  assert.equal((await read()).status, 404);
  await User.updateOne({ _id: seller._id }, { $set: { status: "active" } });
  await Village.updateOne({ _id: browsing._id }, { $set: { isActive: false } });
  assert.equal((await read()).status, 404);
  await Village.updateOne({ _id: browsing._id }, { $set: { isActive: true } });
  await Category.updateOne(
    { code: "PERISHABLE" },
    { $set: { status: "INACTIVE" } },
  );
  assert.equal((await read()).status, 404);
  await Category.updateOne(
    { code: "PERISHABLE" },
    { $set: { status: "ACTIVE" } },
  );
  await User.updateOne({ _id: buyer._id }, { $set: { village: null } });
  assert.equal(
    (await read()).status,
    200,
    "registered village is not a contact prerequisite",
  );
  await User.updateOne({ _id: buyer._id }, { $set: { status: "blocked" } });
  assert.equal((await read()).status, 401);
  console.log(
    "PASS: guest/self/demo/sold/expired/reported/zero-stock/missing/inactive-seller/inactive-listing-village/blocked-buyer checks retained.",
  );
} finally {
  globalThis.fetch = originalFetch;
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_contact_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
