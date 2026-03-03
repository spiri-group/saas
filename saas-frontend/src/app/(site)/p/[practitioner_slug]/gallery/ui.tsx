'use client';

import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { GalleryTile } from "@/components/ux/GalleryTiles";
import { gallery_item_type } from "@/utils/spiriverse";

const usePractitionerGallery = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-gallery', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                catalogueGalleryItems: gallery_item_type[];
            }>(`
                query GetPractitionerGallery($merchantId: ID!, $limit: Int) {
                    catalogueGalleryItems(merchantId: $merchantId, limit: $limit) {
                        id
                        type
                        title
                        description
                        url
                        thumbnailUrl
                        layout
                        groupId
                        categoryId
                        linkedProducts {
                            id
                            title
                            thumbnailUrl
                            price {
                                amount
                                currency
                            }
                        }
                        tags
                        ref {
                            id
                            partition
                            container
                        }
                        createdAt
                    }
                }
            `, { merchantId: practitionerId, limit: 300 });
            return response.catalogueGalleryItems || [];
        },
        enabled: !!practitionerId,
    });
};

interface PractitionerGalleryPageProps {
    practitionerId: string;
    slug: string;
}

export default function PractitionerGalleryPage({ practitionerId, slug }: PractitionerGalleryPageProps) {
    const { data: galleryItems, isLoading } = usePractitionerGallery(practitionerId);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
            {/* Compact header */}
            {/* Content */}
            <div className="mx-auto px-4 md:px-8 lg:px-12 relative z-10 pb-16">
                <Card className="backdrop-blur-xl bg-indigo-50/70 shadow-2xl border border-white/20">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/p/${slug}`}
                                className="flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900 transition-colors"
                                data-testid="gallery-back-link"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to profile
                            </Link>
                        </div>
                        <CardTitle className="flex items-center gap-2 text-lg mt-2">
                            <ImageIcon className="w-5 h-5 text-indigo-600" />
                            Gallery
                            {galleryItems && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({galleryItems.length} item{galleryItems.length !== 1 ? 's' : ''})
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl bg-muted/50 animate-pulse" />
                                ))}
                            </div>
                        ) : galleryItems && galleryItems.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {galleryItems.map((item) => (
                                    <div key={item.id} data-testid={`gallery-item-${item.id}`}>
                                        <GalleryTile
                                            item={item}
                                            merchantId={practitionerId}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No gallery items yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
