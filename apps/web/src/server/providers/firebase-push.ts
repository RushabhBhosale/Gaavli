import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";
import { AppError } from "../utils/errors";

type PushMessage = {
  token: string;
  body: string;
  kind?: "firebase-test";
};
export interface PushProvider {
  send(message: PushMessage): Promise<"sent" | "unregistered">;
}

const credentialsSchema = z.object({
  project_id: z.string().regex(/^[a-z0-9-]+$/),
  client_email: z.email(),
  private_key: z.string().min(1),
});
const oauthUrl = "https://oauth2.googleapis.com/token";
const oauthSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});
const fcmErrorSchema = z.object({
  error: z.object({
    details: z.array(z.object({ errorCode: z.string().optional() })).optional(),
  }),
});

function createFirebasePushProvider(
  credentials: z.infer<typeof credentialsSchema>,
): PushProvider {
  let bearer: { token: string; expiresAt: number } | undefined;
  let refreshing: Promise<string> | undefined;

  async function getAccessToken() {
    if (bearer && bearer.expiresAt > Date.now() + 60_000) return bearer.token;
    refreshing ??= (async () => {
      const privateKey = await importPKCS8(
        credentials.private_key,
        "RS256",
      ).catch(() => {
        throw new AppError(
          503,
          "FCM_CONFIG_INVALID",
          "The configured Firebase private key is invalid.",
        );
      });
      const assertion = await new SignJWT({
        scope: "https://www.googleapis.com/auth/firebase.messaging",
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer(credentials.client_email)
        .setAudience(oauthUrl)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);
      const response = await fetch(oauthUrl, {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok)
        throw new AppError(
          502,
          "FCM_AUTH_FAILED",
          "Google rejected the Firebase service account authorization.",
        );
      const auth = oauthSchema.parse(await response.json());
      bearer = {
        token: auth.access_token,
        expiresAt: Date.now() + auth.expires_in * 1000,
      };
      return bearer.token;
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }

  return {
    async send({ token, body, kind = "seller-request" }) {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: "Gaavli", body },
              data: { kind },
              android: {
                ttl: "3600s",
                priority: "HIGH",
                notification: { channel_id: "seller-requests" },
              },
              apns: {
                headers: {
                  "apns-expiration": String(
                    Math.floor(Date.now() / 1000) + 3600,
                  ),
                },
                payload: { aps: { sound: "default" } },
              },
            },
          }),
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) return "sent";
      if (response.status === 404) {
        const error = fcmErrorSchema.safeParse(await response.json());
        if (
          error.success &&
          error.data.error.details?.some(
            ({ errorCode }) => errorCode === "UNREGISTERED",
          )
        )
          return "unregistered";
      }
      const message =
        response.status === 403
          ? "Firebase denied permission to send. Check the project and service account permissions."
          : `Firebase rejected the message (HTTP ${response.status}).`;
      throw new AppError(502, "FCM_SEND_FAILED", message);
    },
  };
}

let provider: PushProvider | undefined;
export function firebasePushProvider(): PushProvider | undefined {
  if (!process.env.FCM_SERVICE_ACCOUNT_JSON) return undefined;
  if (!provider) {
    try {
      provider = createFirebasePushProvider(
        credentialsSchema.parse(
          JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON),
        ),
      );
    } catch {
      throw new AppError(
        503,
        "FCM_CONFIG_INVALID",
        "FCM_SERVICE_ACCOUNT_JSON must contain a valid Firebase service account JSON.",
      );
    }
  }
  return provider;
}
