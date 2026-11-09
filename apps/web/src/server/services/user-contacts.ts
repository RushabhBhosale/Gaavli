import "server-only";
import type { z } from "zod";
import type { accountContactsSchema } from "@gaavli/validation";
import { connectDb } from "../db/connect";
import { User, type UserRecord } from "../models";
import { AppError } from "../utils/errors";

export async function getAccountContacts(user: UserRecord) {
  await connectDb();
  const row = await User.findById(user._id).lean();
  const saved = row?.contacts ?? [];
  const contacts = saved.length
    ? saved
    : [
        {
          label: "primary",
          mobile: row?.mobile ?? "",
          whatsapp: false,
          isPublic: true,
          verified: true,
        },
      ];
  return {
    contacts: contacts.map((contact) => ({
      label: contact.label ?? "alternate",
      mobile: contact.mobile ?? "",
      whatsapp: !!contact.whatsapp,
      isPublic: contact.isPublic !== false,
      verified: contact.label === "primary",
    })),
    email: row?.email ?? null,
    promoWhatsapp: !!row?.promoWhatsapp,
  };
}
export async function saveAccountContacts(
  user: UserRecord,
  input: z.infer<typeof accountContactsSchema>,
) {
  await connectDb();
  const primary = input.contacts.find((row) => row.label === "primary");
  if (!primary || primary.mobile !== user.mobile)
    throw new AppError(
      422,
      "PRIMARY_NUMBER_MISMATCH",
      "The primary number is the one verified for your account.",
    );
  const alternates = input.contacts.filter((row) => row.label !== "primary");
  const update: Record<string, unknown> = {
    contacts: input.contacts.map((row) => ({
      ...row,
      verified: row.label === "primary",
    })),
    alternativeMobile: alternates[0]?.mobile ?? null,
  };
  if (input.promoWhatsapp !== undefined)
    update.promoWhatsapp = input.promoWhatsapp;
  if (input.email !== undefined) update.email = input.email ?? undefined;
  try {
    await User.updateOne(
      { _id: user._id },
      input.email === null
        ? { $set: update, $unset: { email: 1 } }
        : { $set: update },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(409, "EMAIL_TAKEN", "That email is already in use.");
    throw error;
  }
  return getAccountContacts(user);
}
