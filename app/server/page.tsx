import { ServerScreen } from "@/app/_components/screens/server-screen";
import { enforcePageAccess } from "@/lib/page-access";

export default async function ServerPage() {
  await enforcePageAccess("server");
  return <ServerScreen />;
}
