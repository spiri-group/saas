import PosUI from "./ui";
import { merchantIdFromSlug } from "../../../../_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";

async function PosPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
  const slug = (await params).merchant_slug;
  const { merchantId } = await merchantIdFromSlug(slug);

  const session = await auth();
  if (session == null || !session.user) {
    return <></>;
  }

  const merchant = session.user.vendors.find((v: any) => v.id === merchantId);

  return (
    <PosUI
      merchantId={merchantId}
      merchantName={merchant?.name || ""}
      merchantCurrency={merchant?.currency || "USD"}
    />
  );
}

export default PosPage;
