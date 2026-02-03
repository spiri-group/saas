import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import UI from "./ui";

async function ProductPage({ params } : { params: Promise<{ merchant_slug: string, productId: string }> }) {
    
    const { merchant_slug, productId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);
    
    return (
        <>
            <UI
              merchantId={merchantId}
              productId={productId}
            />
        </>
    )
}

export default ProductPage;