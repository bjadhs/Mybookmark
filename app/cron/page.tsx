import { CronScreen } from "@/app/_components/screens/cron-screen";
import { enforceAdmin } from "@/lib/page-access";

export default async function CronPage() {
  await enforceAdmin();
  return <CronScreen />;
}
