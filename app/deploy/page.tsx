import { DeployScreen } from "@/app/_components/screens/deploy-screen";
import { enforceAdmin } from "@/lib/page-access";

export default async function DeployPage() {
  // Admin-only control bridge — guests/users are redirected by enforceAdmin.
  await enforceAdmin();
  return <DeployScreen />;
}
