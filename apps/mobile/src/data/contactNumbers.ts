import { MAX_PROVIDER_CONTACTS } from "@gaavli/constants";

// The numbers a person or provider shares. The first is the primary one,
// verified by OTP; the rest are alternates. Rules match the server.
export type ContactDraft = {
  label: string;
  mobile: string;
  whatsapp: boolean;
  isPublic: boolean;
};
export const ALTERNATE_LABELS = ["alternate", "office", "emergency", "home"];
export const emptyContact = (label = "alternate"): ContactDraft => ({
  label,
  mobile: "",
  whatsapp: false,
  isPublic: true,
});
export const canAddContact = (list: readonly ContactDraft[]) =>
  list.length < MAX_PROVIDER_CONTACTS;
export function addContact(list: readonly ContactDraft[]) {
  return canAddContact(list) ? [...list, emptyContact()] : [...list];
}
export function removeContact(list: readonly ContactDraft[], index: number) {
  return index === 0 ? [...list] : list.filter((_, i) => i !== index);
}
export function setContact(
  list: readonly ContactDraft[],
  index: number,
  patch: Partial<ContactDraft>,
) {
  return list.map((row, i) => (i === index ? { ...row, ...patch } : row));
}
const digits = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/^91(?=\d{10}$)/, "")
    .slice(0, 10);
export const cleanMobile = digits;
// Errors by row: a number must be 10 digits starting 6-9, and appear once.
export function contactErrors(list: readonly ContactDraft[]) {
  const errors: Record<number, "invalid" | "duplicate"> = {};
  const seen = new Set<string>();
  list.forEach((row, index) => {
    const mobile = digits(row.mobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) errors[index] = "invalid";
    else if (seen.has(mobile)) errors[index] = "duplicate";
    seen.add(mobile);
  });
  return errors;
}
// What the API receives: blank alternates are dropped, the rest cleaned.
export function contactsPayload(list: readonly ContactDraft[]) {
  return list
    .filter((row, index) => index === 0 || row.mobile.trim())
    .map((row) => ({
      label: row.label,
      mobile: digits(row.mobile),
      whatsapp: row.whatsapp,
      isPublic: row.isPublic,
    }));
}
// Drop empty alternate rows before checking, so an unused "Add" row is fine.
export function activeContacts(list: readonly ContactDraft[]) {
  return list.filter((row, index) => index === 0 || row.mobile.trim());
}
export function draftsFromServer(
  rows: readonly {
    label: string;
    mobile: string;
    whatsapp: boolean;
    isPublic: boolean;
  }[],
): ContactDraft[] {
  const sorted = [
    ...rows.filter((row) => row.label === "primary"),
    ...rows.filter((row) => row.label !== "primary"),
  ];
  return sorted.length
    ? sorted.map((row) => ({ ...row }))
    : [emptyContact("primary")];
}
