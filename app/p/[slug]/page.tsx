import { notFound } from "next/navigation";
import { CustomPage } from "@/app/_components/screens/custom-page";
import { enforcePageAccess } from "@/lib/page-access";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ManagedPageRoute({ params }: PageProps) {
  const { slug } = await params;
  // enforcePageAccess redirects locked pages for guests; for a missing or
  // built-in slug it returns no page and we 404.
  const { page } = await enforcePageAccess(slug);
  if (!page || page.builtin) notFound();
  return <CustomPage page={page} />;
}
