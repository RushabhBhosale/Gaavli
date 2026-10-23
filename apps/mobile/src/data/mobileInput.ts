// Keeps a typed or pasted mobile value to 10 digits. A leading 91 country code
// is removed only when extra digits were included with it.
export function limitIndianMobileInput(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  return digits.slice(0, 10);
}
