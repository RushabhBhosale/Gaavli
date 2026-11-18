import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../utils/errors";

const sendResult = z.object({
  success: z.boolean(),
  error: z.string().nullish(),
  recipients: z
    .array(
      z.object({
        local_message_id: z.string().nullish(),
        phone_number: z.string().nullish(),
        target: z.string().nullish(),
        errors: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

export function watiProvider() {
  const host = process.env.WATI_API_HOST?.trim();
  const token = process.env.WATI_API_TOKEN?.trim().replace(/^Bearer\s+/i, "");
  const templateName = process.env.WATI_TEST_TEMPLATE?.trim();
  if (!host || !token || !templateName || !URL.canParse(host)) return undefined;

  const base = new URL(host);
  if (
    base.protocol !== "https:" ||
    !base.hostname.endsWith(".wati.io") ||
    base.username ||
    base.password ||
    base.port ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    /\s/.test(token) ||
    !/^[a-z0-9_]+$/.test(templateName)
  )
    return undefined;
  const url = new URL("/api/ext/v3/messageTemplates/send", base);
  return {
    async sendTestTemplate(internationalNumber: string) {
      const messageId = randomUUID();
      const unknownOutcome = () =>
        new AppError(
          502,
          "WATI_OUTCOME_UNKNOWN",
          "Check WhatsApp and WATI before sending another test.",
        );
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: `gaavli-test-${messageId}`,
          recipients: [
            { phone_number: internationalNumber, local_message_id: messageId },
          ],
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      }).catch(() => {
        throw unknownOutcome();
      });
      if (response.status >= 500) throw unknownOutcome();
      if (response.status === 401 || response.status === 403)
        throw new AppError(
          502,
          "WATI_UNAUTHORIZED",
          "WATI did not authorize the template send.",
        );
      if (response.status === 429)
        throw new AppError(
          429,
          "WATI_RATE_LIMITED",
          "WATI has limited this test send.",
        );
      if (!response.ok)
        throw new AppError(
          502,
          "WATI_REJECTED",
          "WATI rejected the template send.",
        );

      const result = sendResult.safeParse(
        await response.json().catch(() => null),
      );
      if (!result.success) throw unknownOutcome();
      const recipient = result.data.recipients?.find(
        (row) =>
          row.local_message_id === messageId ||
          (!row.local_message_id &&
            [row.phone_number, row.target].some(
              (number) => number?.replace(/^\+/, "") === internationalNumber,
            )),
      );
      if (
        !result.data.success ||
        result.data.error ||
        recipient?.errors?.length
      )
        throw new AppError(
          502,
          "WATI_REJECTED",
          "WATI rejected the template send.",
        );
      if (!recipient) throw unknownOutcome();
    },
  };
}
