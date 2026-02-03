import { merchantIdFromSlug } from "../../../_hooks/UseMerchantIdFromSlug";
import TeamPageUI from "./ui";

async function TeamPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
  const slug = (await params).merchant_slug;
  const { merchantId } = await merchantIdFromSlug(slug);

  return (
    <TeamPageUI 
      merchantId={merchantId}
    />
  );
}

export default TeamPage;
