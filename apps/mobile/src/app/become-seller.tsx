import { Redirect, useRouter } from "expo-router";
import { BecomeSellerDialog } from "../components/BecomeSellerDialog";
import { useAppStore } from "../store";
export default function BecomeSellerScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  if (!session) return <Redirect href="/register" />;
  if (!session.user.village) return <Redirect href="/village" />;
  if (session.user.isSeller) return <Redirect href="/my-listings" />;
  return <BecomeSellerDialog visible onClose={() => router.replace("/home")} />;
}
