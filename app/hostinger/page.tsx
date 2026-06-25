import { HostingerScreen } from "@/app/_components/screens/hostinger-screen";
import { enforceAdmin } from "@/lib/page-access";

export default async function HostingerPage() {
  // Operations handbook with access + security details — admin-only.
  await enforceAdmin();
  return <HostingerScreen />;
}
