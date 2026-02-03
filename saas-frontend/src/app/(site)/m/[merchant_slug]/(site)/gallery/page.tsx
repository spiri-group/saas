import { merchantIdFromSlug } from "../../../_hooks/UseMerchantIdFromSlug";
import GalleryUI from "./ui";
import { auth } from "@/lib/auth";

async function GalleryPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
  const slug = (await params).merchant_slug;
  const { merchantId } = await merchantIdFromSlug(slug);

  const session = await auth();
  if (session == null || !session.user) {
    return <></>
  }

  return (
    <GalleryUI 
      merchantId={merchantId}
    />
  );
}

export default GalleryPage;