import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacyPolicy } from "@/content/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy · Gaavli",
  description:
    "How Gaavli collects, uses, protects and retains personal information.",
};

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} current="privacy" />;
}
