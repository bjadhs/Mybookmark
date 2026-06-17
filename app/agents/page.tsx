import { AgentsScreen } from "@/app/_components/screens/agents-screen";
import { enforcePageAccess } from "@/lib/page-access";

export default async function AgentsPage() {
  await enforcePageAccess("agents");
  return <AgentsScreen />;
}
