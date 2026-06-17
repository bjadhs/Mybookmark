import { notFound } from "next/navigation";
import { getAgentById } from "@/lib/db/agents";
import { AgentDetail } from "@/app/_components/screens/agent-detail";
import { enforcePageAccess } from "@/lib/page-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentDetailPage({ params }: PageProps) {
  // Agent details belong to the "agents" page — honor its locked flag.
  await enforcePageAccess("agents");
  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) notFound();
  return <AgentDetail agent={agent} />;
}
