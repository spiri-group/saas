import { Metadata } from "next";
import ExplorePageContent from "./ExplorePageContent";
import { merchantIdFromSlug } from "../../../_hooks/UseMerchantIdFromSlug";

export const metadata: Metadata = {
  title: "Explore",
};

export default async function ExplorePage({ params }: { params: Promise<{ merchant_slug: string }> }) {
  const slug = (await params).merchant_slug;
  const { merchantId } = await merchantIdFromSlug(slug);

  return <ExplorePageContent merchantId={merchantId} />;
}
