import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsAndConditions } from "@/content/legal/terms-and-conditions";

export const metadata: Metadata = {
  title: "Terms & Conditions · Gaavli",
  description: "The terms that govern your use of the Gaavli platform.",
};

export default function TermsAndConditionsPage() {
  return <LegalPage document={termsAndConditions} />;
}
