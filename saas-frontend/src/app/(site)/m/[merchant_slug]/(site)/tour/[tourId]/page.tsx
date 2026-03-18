import { merchantIdFromSlug } from "@/app/(site)/m/_hooks/UseMerchantIdFromSlug";
import { gql } from "@/lib/services/gql";
import { Metadata } from "next";
import UI from "./ui";

type TourMeta = {
    tour: {
        name: string;
        description: string;
        thumbnail: {
            image: {
                media: { url: string } | null;
            } | null;
        } | null;
    } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ merchant_slug: string, tourId: string }> }): Promise<Metadata> {
    const { merchant_slug, tourId } = await params;

    try {
        const { merchantId } = await merchantIdFromSlug(merchant_slug);
        const resp = await gql<TourMeta>(`
            query($id: ID!, $vendorId: ID!) {
                tour(id: $id, vendorId: $vendorId) {
                    name
                    description
                    thumbnail { image { media { url } } }
                }
            }
        `, { id: tourId, vendorId: merchantId });

        const tour = resp.tour;
        if (!tour) return { title: 'Tour | SpiriVerse' };

        const plainDescription = tour.description?.replace(/<[^>]*>/g, '').slice(0, 160) || '';
        const imageUrl = tour.thumbnail?.image?.media?.url;

        return {
            title: `${tour.name} | SpiriVerse`,
            description: plainDescription,
            openGraph: {
                title: tour.name,
                description: plainDescription,
                type: 'website',
                ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
            },
        };
    } catch {
        return { title: 'Tour | SpiriVerse' };
    }
}

async function TourPage({ params } : { params: Promise<{ merchant_slug: string, tourId: string }> }) {

    const { merchant_slug, tourId } = await params;
    const { merchantId } = await merchantIdFromSlug(merchant_slug);

    return (
        <>
            <UI
              merchantId={merchantId}
              tourId={tourId}
            />
        </>
    )
}

export default TourPage;
