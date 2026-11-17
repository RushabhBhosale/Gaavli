// Real routes and MongoDB; all writes stay in this isolated randomly named DB.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { providerMasterSeedSchema } from "@gaavli/validation";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const databaseName = `gaavli_prov_${randomBytes(6).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
process.env.NODE_ENV = "development";
mongoose.set("maxTimeMS", 15000);
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village } = await import("../src/server/models");
const { Service } = await import("../src/server/models/service");
const { ProviderMaster } = await import("../src/server/models/provider-master");
const { ProviderProfile, ProviderLink, ProviderClaim } =
  await import("../src/server/models/provider-profile");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { seedProviderMasters } =
  await import("../src/server/repositories/provider-masters");
const profilesRoute = await import("../src/app/api/v1/provider-profiles/route");
const oneRoute = await import("../src/app/api/v1/provider-profiles/[id]/route");
const statusRoute =
  await import("../src/app/api/v1/provider-profiles/[id]/status/route");
const linksRoute =
  await import("../src/app/api/v1/provider-profiles/[id]/links/route");
const claimRoute =
  await import("../src/app/api/v1/provider-profiles/[id]/claim/route");
const linkAnswerRoute =
  await import("../src/app/api/v1/provider-profiles/links/[linkId]/route");
const checkRoute =
  await import("../src/app/api/v1/provider-profiles/check/route");
const searchRoute =
  await import("../src/app/api/v1/provider-profiles/search/route");
const directoryRoute = await import("../src/app/api/v1/directory/route");
const summaryRoute = await import("../src/app/api/v1/directory/summary/route");
const dashboardRoute = await import("../src/app/api/v1/dashboard/route");
const contactsRoute = await import("../src/app/api/v1/users/me/contacts/route");

try {
  await connectMobileDb();
  await Promise.all([
    ProviderProfile.init(),
    Service.init(),
    ProviderMaster.init(),
  ]);
  const rows = providerMasterSeedSchema.parse(
    JSON.parse(
      await readFile(
        new URL(
          "../data/gaavli_provider_master_seed_simple_en_mr_hi.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  await seedProviderMasters(rows);
  const [village, other] = await Village.create([
    { nameEn: "Kalamb", nameMr: "कळंब" },
    { nameEn: "Other", nameMr: "इतर" },
  ]);
  const [alice, bob, carol] = await User.create([
    { name: "Alice", mobile: "9876500001", village: village._id },
    { name: "Bob", mobile: "9876500002", village: village._id },
    { name: "Carol", mobile: "9876500003", village: village._id },
  ]);
  const tokens: Record<string, string> = {};
  for (const user of [alice, bob, carol]) {
    const token = randomBytes(32).toString("hex");
    tokens[String(user._id)] = token;
    await MobileSession.create({
      user: user._id,
      provider: "test",
      accessHash: hashToken(token),
      refreshHash: hashToken(randomBytes(32).toString("hex")),
      accessExpiresAt: new Date(Date.now() + 900000),
      expiresAt: new Date(Date.now() + 86400000),
    });
  }
  const as = (user: { _id: unknown }) => ({
    Authorization: `Bearer ${tokens[String(user._id)]}`,
    "Content-Type": "application/json",
  });
  const call = async (
    handler: (r: Request, c?: never) => Promise<Response>,
    user: { _id: unknown },
    method: string,
    path: string,
    body?: unknown,
    context?: unknown,
  ) => {
    const response = await handler(
      new Request(`http://localhost/api/v1/${path}`, {
        method,
        headers: as(user),
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      context as never,
    );
    return { status: response.status, data: (await response.json()).data };
  };
  const failure = async (
    handler: (r: Request, c?: never) => Promise<Response>,
    user: { _id: unknown },
    method: string,
    body: unknown,
  ) => {
    const response = await handler(
      new Request("http://localhost/api/v1/provider-profiles", {
        method,
        headers: as(user),
        body: JSON.stringify(body),
      }),
    );
    const json = await response.json();
    return { status: response.status, code: json.error?.code as string };
  };
  const params = (id: string, key = "id") => ({
    params: Promise.resolve({ [key]: id }),
  });
  const vid = String(village._id);
  const contacts = (mobile: string, extra: object[] = []) => [
    { label: "primary", mobile, whatsapp: true, isPublic: true },
    ...extra,
  ];
  const shop = (name = "Patil Kirana", mobile = "9876500001") => ({
    providerType: "SHOP_BUSINESS",
    name,
    villageId: vid,
    contacts: contacts(mobile, [
      {
        label: "office",
        mobile: "9876511111",
        whatsapp: false,
        isPublic: true,
      },
    ]),
    details: { shopType: "GROCERY", items: "Rice, dal", homeDelivery: true },
  });

  // ---- Validation ------------------------------------------------------------
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...shop(),
        details: {},
      })
    ).status,
    422,
    "required shop type is enforced",
  );
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...shop(),
        details: { shopType: "NOT_A_REAL_ONE" },
      })
    ).code,
    "INVALID_MASTER_OPTION",
    "select values must be options the admin manages",
  );
  assert.equal(
    (
      await failure(
        profilesRoute.POST,
        alice,
        "POST",
        shop("X Shop", "9876599999"),
      )
    ).code,
    "PRIMARY_NUMBER_MISMATCH",
    "the primary number is the verified account number",
  );
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...shop(),
        contacts: Array.from({ length: 6 }, (_, i) => ({
          label: i ? "alternate" : "primary",
          mobile: i ? `98765000${i}0` : "9876500001",
        })),
      })
    ).status,
    422,
    "at most five numbers",
  );
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...shop(),
        contacts: contacts("9876500001", [
          { label: "home", mobile: "9876500001" },
        ]),
      })
    ).status,
    422,
    "the same number cannot be added twice",
  );
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...shop(),
        providerType: "NOPE",
      })
    ).status,
    422,
  );

  // ---- Create a shop; it appears in the directory with public numbers --------
  const created = await call(
    profilesRoute.POST,
    alice,
    "POST",
    "provider-profiles",
    shop(),
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.profile.mine, true);
  assert.equal(created.data.profile.contacts[0].verified, true);
  assert.equal(created.data.profile.contacts[1].verified, false);
  assert.equal(
    (await User.findById(alice._id).lean())!.roles.includes("service_provider"),
    true,
  );
  const listed = async (user: { _id: unknown }, query = "module=services") => {
    const response = await directoryRoute.GET(
      new Request(
        `http://localhost/api/v1/directory?sourceVillageId=${vid}&${query}`,
        { headers: as(user) },
      ),
    );
    return (await response.json()).data;
  };
  const asBob = await listed(bob);
  const entry = asBob.entries.find(
    (row: { name: string }) => row.name === "Patil Kirana",
  );
  assert.ok(entry, "a registered shop shows in the directory");
  assert.deepEqual(
    entry.contacts.map((c: { mobile: string }) => c.mobile),
    ["9876500001", "9876511111"],
    "public numbers in the order villagers should try them",
  );
  assert.equal(entry.providerType, "SHOP_BUSINESS");
  assert.equal(entry.mine, false, "other people's entries are not marked mine");
  const asOwner = (await listed(alice)).entries.find(
    (row: { name: string }) => row.name === "Patil Kirana",
  );
  assert.ok(asOwner, "owners find their own entry when they search");
  assert.equal(asOwner.mine, true);
  const hidden = await call(
    oneRoute.PATCH,
    alice,
    "PATCH",
    `provider-profiles/${created.data.profile.id}`,
    {
      contacts: [
        {
          label: "primary",
          mobile: "9876500001",
          whatsapp: true,
          isPublic: false,
        },
        { label: "office", mobile: "9876511111", isPublic: true },
      ],
      version: created.data.profile.version,
    },
    params(created.data.profile.id),
  );
  assert.equal(hidden.status, 200);
  const afterHide = (await listed(bob)).entries.find(
    (r: { name: string }) => r.name === "Patil Kirana",
  );
  assert.deepEqual(
    afterHide.contacts.map((c: { mobile: string }) => c.mobile),
    ["9876511111"],
    "numbers marked private are not shown",
  );
  const stale = await call(
    oneRoute.PATCH,
    alice,
    "PATCH",
    `provider-profiles/${created.data.profile.id}`,
    { name: "New name", version: 0 },
    params(created.data.profile.id),
  );
  assert.equal(stale.status, 409, "stale edits are refused");

  // ---- Photos: at most two, only the owner's own uploads ----------------------
  const { ListingPhoto } = await import("../src/server/models/listing-photo");
  const photoKey = (owner: unknown, n: number) =>
    `listings/${String(owner)}/uploads/${String(n).padStart(64, "0")}.webp`;
  for (const [owner, n] of [
    [alice._id, 1],
    [alice._id, 2],
    [alice._id, 3],
    [bob._id, 4],
  ] as const)
    await ListingPhoto.create({
      _id: photoKey(owner, n),
      owner,
      fileId: new mongoose.Types.ObjectId(),
      digest: "x",
    });
  const editImages = async (images: string[]) =>
    call(
      oneRoute.PATCH,
      alice,
      "PATCH",
      `provider-profiles/${created.data.profile.id}`,
      {
        images,
        version: (
          await call(
            oneRoute.GET,
            alice,
            "GET",
            `provider-profiles/${created.data.profile.id}`,
            undefined,
            params(created.data.profile.id),
          )
        ).data.profile.version,
      },
      params(created.data.profile.id),
    );
  assert.equal(
    (
      await editImages([
        photoKey(alice._id, 1),
        photoKey(alice._id, 2),
        photoKey(alice._id, 3),
      ])
    ).status,
    422,
    "more than two photos are refused",
  );
  assert.equal(
    (await editImages([photoKey(bob._id, 4)])).status,
    422,
    "someone else's upload cannot be attached",
  );
  assert.equal(
    (await editImages([photoKey(alice._id, 1), photoKey(alice._id, 1)])).status,
    422,
    "the same photo twice is refused",
  );
  const withImages = await editImages([
    photoKey(alice._id, 1),
    photoKey(alice._id, 2),
  ]);
  assert.equal(withImages.status, 200);
  assert.equal(withImages.data.profile.images.length, 2);
  assert.match(withImages.data.profile.images[0].url, /^\/listing-photos\//);
  const shown = (await listed(bob)).entries.find(
    (r: { name: string }) => r.name === "Patil Kirana",
  );
  assert.equal(shown.images.length, 2, "photos show in the directory");
  const { deleteUnusedListingPhoto } =
    await import("../src/server/services/listing-photo-storage");
  const inUse = await ListingPhoto.findById(photoKey(alice._id, 1)).lean();
  await assert.rejects(
    deleteUnusedListingPhoto(String(alice._id), String(inUse!.fileId)),
    (error: unknown) =>
      !!error && (error as { code?: string }).code === "PHOTO_IN_USE",
    "a photo in use by a profile cannot be deleted",
  );
  const cleared = await editImages([]);
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.profile.images.length, 0);
  assert.equal(
    (await listed(bob)).entries.find(
      (r: { name: string }) => r.name === "Patil Kirana",
    ).images.length,
    0,
  );

  // ---- Duplicate check --------------------------------------------------------
  const dup = await call(
    checkRoute.POST,
    bob,
    "POST",
    "provider-profiles/check",
    {
      providerType: "SHOP_BUSINESS",
      villageId: vid,
      name: "Patil Kirana Store",
      mobiles: ["9876511111"],
    },
  );
  assert.equal(dup.data.matches[0].reason, "same_number");
  assert.equal(dup.data.matches[0].maskedMobile, "98xxxx1111");
  assert.equal(dup.data.matches[0].mine, false);
  const similar = await call(
    checkRoute.POST,
    bob,
    "POST",
    "provider-profiles/check",
    {
      providerType: "SHOP_BUSINESS",
      villageId: vid,
      name: "Patil Kiraana",
      mobiles: [],
    },
  );
  assert.equal(similar.data.matches[0].reason, "similar_name");
  const none = await call(
    checkRoute.POST,
    bob,
    "POST",
    "provider-profiles/check",
    {
      providerType: "SHOP_BUSINESS",
      villageId: String(other._id),
      name: "Patil Kirana",
      mobiles: ["9876511111"],
    },
  );
  assert.equal(none.data.matches.length, 0, "matches stay inside the village");

  // ---- Facility and doctors ---------------------------------------------------
  const clinic = await call(
    profilesRoute.POST,
    bob,
    "POST",
    "provider-profiles",
    {
      providerType: "MEDICAL_FACILITY",
      name: "Sai Clinic",
      villageId: vid,
      contacts: contacts("9876500002"),
      details: {
        facilityType: "CLINIC",
        servicesAvailable: "General checkup",
        operatingHours: "9 AM to 8 PM",
        location: "Main road",
      },
    },
  );
  assert.equal(clinic.status, 201);
  // A doctor does not need a registration number.
  const noRegNumber = await call(
    profilesRoute.POST,
    alice,
    "POST",
    "provider-profiles",
    {
      providerType: "HEALTHCARE_PROFESSIONAL",
      name: "Dr. B. Kale",
      villageId: vid,
      contacts: [{ label: "primary", mobile: "9876500001", isPublic: true }],
      details: {
        specialization: "GENERAL_PHYSICIAN",
        qualification: "MBBS",
        consultationHours: JSON.stringify({
          v: 1,
          slots: [{ open: "10:00", close: "14:00" }],
          off: [0],
        }),
      },
      practice: { mode: "home_visits" },
    },
  );
  assert.equal(noRegNumber.status, 201);
  const withHours = (await listed(bob)).entries.find(
    (row: { name: string }) => row.name === "Dr. B. Kale",
  );
  assert.ok(
    withHours?.hours?.includes('"off":[0]'),
    "opening hours reach the directory",
  );
  const doctorBody = (practice: object, name = "Dr. A. Patil") => ({
    providerType: "HEALTHCARE_PROFESSIONAL",
    name,
    villageId: vid,
    contacts: [{ label: "primary", mobile: "9876500001", isPublic: false }],
    details: {
      specialization: "GENERAL_PHYSICIAN",
      qualification: "MBBS",
      registrationNumber: "MH-1234",
      consultationHours: "10 AM to 2 PM",
    },
    practice,
  });
  assert.equal(
    (
      await failure(profilesRoute.POST, alice, "POST", {
        ...doctorBody({ mode: "existing_facility" }),
      })
    ).status,
    422,
    "linking to a facility needs a facility",
  );
  const found = await call(
    searchRoute.GET,
    alice,
    "GET",
    `provider-profiles/search?villageId=${vid}&providerType=MEDICAL_FACILITY&q=sai`,
  );
  assert.equal(found.data.results[0].name, "Sai Clinic");
  const doctor = await call(
    profilesRoute.POST,
    alice,
    "POST",
    "provider-profiles",
    doctorBody({
      mode: "existing_facility",
      facilityId: clinic.data.profile.id,
    }),
  );
  assert.equal(doctor.status, 201);
  assert.equal(doctor.data.profile.practice.facility.status, "PENDING");
  const bobs = await call(profilesRoute.GET, bob, "GET", "provider-profiles");
  const pending = bobs.data.links.find(
    (l: { needsMyAnswer: boolean }) => l.needsMyAnswer,
  );
  assert.ok(pending, "the clinic owner is asked to confirm");
  assert.equal(pending.doctor.name, "Dr. A. Patil");
  assert.equal(
    (
      await call(
        linkAnswerRoute.PATCH,
        alice,
        "PATCH",
        `provider-profiles/links/${pending.id}`,
        { action: "confirm" },
        params(pending.id, "linkId"),
      )
    ).status,
    403,
    "the doctor cannot confirm their own request",
  );
  const confirmed = await call(
    linkAnswerRoute.PATCH,
    bob,
    "PATCH",
    `provider-profiles/links/${pending.id}`,
    { action: "confirm" },
    params(pending.id, "linkId"),
  );
  assert.equal(confirmed.status, 200);
  assert.equal(
    confirmed.data.links.find((l: { id: string }) => l.id === pending.id)
      .status,
    "CONFIRMED",
  );
  const doctorEntry = (await listed(carol)).entries.find(
    (r: { name: string }) => r.name === "Dr. A. Patil",
  );
  assert.ok(doctorEntry);
  assert.deepEqual(
    doctorEntry.contacts.map((c: { mobile: string }) => c.mobile),
    ["9876500002"],
    "a doctor with no public number shows the clinic's",
  );
  const own = await call(
    profilesRoute.POST,
    carol,
    "POST",
    "provider-profiles",
    {
      ...doctorBody({ mode: "own_clinic" }, "Dr. S. Kale"),
      contacts: [{ label: "primary", mobile: "9876500003", isPublic: true }],
    },
  );
  assert.equal(own.status, 201);
  assert.equal(own.data.facility.providerType, "MEDICAL_FACILITY");
  assert.equal(
    own.data.profile.practice.facility.status,
    "CONFIRMED",
    "my own clinic links both at once",
  );
  assert.equal(
    (
      await call(
        linksRoute.POST,
        carol,
        "POST",
        `provider-profiles/${own.data.facility.id}/links`,
        { otherProfileId: own.data.profile.id },
        params(own.data.facility.id),
      )
    ).status,
    409,
    "already linked",
  );

  // ---- Claims ---------------------------------------------------------------
  const claim = await call(
    claimRoute.POST,
    alice,
    "POST",
    `provider-profiles/${clinic.data.profile.id}/claim`,
    { note: "I run this clinic" },
    params(clinic.data.profile.id),
  );
  assert.equal(claim.status, 202);
  const again = await call(
    claimRoute.POST,
    alice,
    "POST",
    `provider-profiles/${clinic.data.profile.id}/claim`,
    {},
    params(clinic.data.profile.id),
  );
  assert.equal(
    again.data.id,
    claim.data.id,
    "a second claim reuses the open one",
  );
  assert.equal(await ProviderClaim.countDocuments(), 1);
  assert.equal(
    (
      await call(
        claimRoute.POST,
        bob,
        "POST",
        `provider-profiles/${clinic.data.profile.id}/claim`,
        {},
        params(clinic.data.profile.id),
      )
    ).status,
    409,
    "you cannot claim your own profile",
  );

  // ---- Other service kinds, tiles and Home ------------------------------------
  const party = await call(
    profilesRoute.POST,
    carol,
    "POST",
    "provider-profiles",
    {
      providerType: "POLITICAL_OFFICE",
      name: "Karyalay",
      villageId: vid,
      contacts: contacts("9876500003"),
      details: {
        partyName: "Some Party",
        officeType: "PARTY_OFFICE",
        officeHours: "10 to 5",
        publicServices: "Help desk",
      },
    },
  );
  assert.equal(party.status, 201);
  const ngo = await call(
    profilesRoute.POST,
    carol,
    "POST",
    "provider-profiles",
    {
      providerType: "COMMUNITY_ORGANISATION",
      name: "Gram Mitra",
      villageId: vid,
      contacts: contacts("9876500003"),
      details: {
        organisationType: "NGO",
        mainActivity: "Education",
        whoWeHelp: "Children",
        servicesOffered: "Tuition",
        serviceArea: "Kalamb",
        acceptsVolunteers: true,
      },
    },
  );
  assert.equal(ngo.status, 201);
  const tiles = await (async () => {
    const response = await summaryRoute.GET(
      new Request(
        `http://localhost/api/v1/directory/summary?sourceVillageId=${vid}&module=services`,
        { headers: as(alice) },
      ),
    );
    const data = (await response.json()).data;
    return Object.fromEntries(
      data.groups.map((g: { id: string; count: number }) => [g.id, g.count]),
    );
  })();
  assert.equal(tiles.political, 1);
  assert.equal(tiles.community, 1);
  assert.ok(tiles.health >= 2);
  const home = await dashboardRoute.GET(
    new Request(`http://localhost/api/v1/dashboard?sourceVillageId=${vid}`, {
      headers: as(alice),
    }),
  );
  const feed = (await home.json()).data.services.entries.map(
    (r: { name: string }) => r.name,
  );
  assert.ok(
    !feed.includes("Karyalay"),
    "party offices are not featured on Home",
  );
  assert.equal(
    (await listed(alice, "module=services&category=political")).total,
    1,
    "but they have their own tile",
  );

  // ---- Deactivate -------------------------------------------------------------
  const detail = await call(
    oneRoute.GET,
    alice,
    "GET",
    `provider-profiles/${created.data.profile.id}`,
    undefined,
    params(created.data.profile.id),
  );
  const off = await call(
    statusRoute.PATCH,
    alice,
    "PATCH",
    `provider-profiles/${created.data.profile.id}/status`,
    { status: "INACTIVE", version: detail.data.profile.version },
    params(created.data.profile.id),
  );
  assert.equal(off.data.profile.status, "INACTIVE");
  assert.ok(
    !(await listed(bob)).entries.some(
      (r: { name: string }) => r.name === "Patil Kirana",
    ),
    "deactivated profiles leave the directory",
  );
  assert.equal(
    (
      await call(
        oneRoute.GET,
        bob,
        "GET",
        `provider-profiles/${created.data.profile.id}`,
        undefined,
        params(created.data.profile.id),
      )
    ).status,
    404,
    "only the owner can open a profile",
  );
  assert.equal(await ProviderLink.countDocuments(), 2);
  console.log(
    "PASS: provider profiles: validation against admin-managed options, primary-number rule, directory projection with public numbers, duplicate check, doctor-clinic linking and confirmation, own-clinic one-step creation, claims, new service kinds with tiles, Home exclusion for party offices and deactivation.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_prov_[a-f0-9]{12}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
