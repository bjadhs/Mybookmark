import { CategoryScreenContainer } from "@/app/_components/screens/category-screen-container";
import { enforcePageAccess } from "@/lib/page-access";

export default async function CategoryPage() {
  await enforcePageAccess("category");
  return <CategoryScreenContainer />;
}
