import { ProjectsScreen } from "@/app/_components/screens/projects-screen";
import { enforceAdmin } from "@/lib/page-access";

export default async function ProjectsPage() {
  await enforceAdmin();
  return <ProjectsScreen />;
}
