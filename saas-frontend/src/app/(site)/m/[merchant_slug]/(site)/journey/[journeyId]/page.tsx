import { Metadata } from "next";
import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { queryFn } from "./hooks/UseJourneyDetails";
import UI from "./ui";

export async function generateMetadata({ params }: { params: Promise<{ merchant_slug: string, journeyId: string }> }): Promise<Metadata> {
    const { merchant_slug, journeyId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    try {
        const journey = await queryFn(merchantId, journeyId);
        if (!journey) {
            return { title: "Journey Not Found | SpiriVerse" };
        }

        const title = `${journey.name} | ${journey.vendor?.name || "SpiriVerse"}`;
        const description = journey.description?.slice(0, 160) || `Guided journey by ${journey.vendor?.name}`;
        const imageUrl = journey.thumbnail?.image?.media?.url;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "website",
                ...(imageUrl ? { images: [{ url: imageUrl, alt: journey.name }] } : {}),
            },
            twitter: {
                card: imageUrl ? "summary_large_image" : "summary",
                title,
                description,
                ...(imageUrl ? { images: [imageUrl] } : {}),
            },
        };
    } catch {
        return { title: "Journey | SpiriVerse" };
    }
}

async function JourneyPage({ params }: { params: Promise<{ merchant_slug: string, journeyId: string }> }) {

    const { merchant_slug, journeyId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    return (
        <>
            <UI
              merchantId={merchantId}
              journeyId={journeyId}
            />
        </>
    )
}

export default JourneyPage;
