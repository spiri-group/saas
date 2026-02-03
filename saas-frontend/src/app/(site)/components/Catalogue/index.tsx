'use client'

import CatalogueItem from "./components/CatalogueItem";
import { cn } from "@/lib/utils";
import UseCatalogue from "./hooks/UseCatalogue";
import { Dialog } from "@/components/ui/dialog";
import { listing_type, recordref_type, thumbnail_type } from "@/utils/spiriverse";
import { useEffect, useRef, useState } from "react";
import EditThumbnail from "@/app/(site)/m/[merchant_slug]/(site)/listing/components/EditThumbnail";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { useQueryClient } from "@tanstack/react-query";
import { Session } from "next-auth";

type Props = {
    session: Session | null,
    className?: string,
    merchantId?: string,
    merchantBranding?: any
}

const Catalogue : React.FC<Props> = (props) => {

    const queryClient = useQueryClient();
    const catalogueQuery = UseCatalogue(props.merchantId);
    const data = catalogueQuery.query.data;
    const {
        hasNextPage,
        fetchNextPage,
    } = catalogueQuery.query;

    const [thumbnail, setThumbnail] = useState<{
        forObject: recordref_type,
        thumbnail: thumbnail_type
    } | null>(null);

    const sentinelRef = useRef<HTMLAnchorElement | null>(null);
    
    useEffect(() => {
        if (!hasNextPage || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                    if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.5 } // Trigger when 50% of the sentinel is visible
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, data]);

    const dataToRender = data?.pages.flatMap(page => page.listings) || [];

    return (
        <>
        <div className={cn(props.className)}>
            {dataToRender != null ? (
                <div 
                    className="rounded-xl transition-all duration-300"
                    style={{
                        backgroundColor: props.merchantBranding ? `rgba(var(--merchant-brand), 0.03)` : 'transparent'
                    }}
                >
                    <ul className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-8 gap-2">
                        {
                            dataToRender.map((product, i) => {
                                const isNearEnd = i === dataToRender.length - 10; // Adjust this number to preload earlier

                                return (
                                    <CatalogueItem
                                        ref={isNearEnd && hasNextPage ? sentinelRef : undefined}
                                        session={props.session}
                                        key={product.id}
                                        listing={product}
                                        openEditThumbnail={() => {
                                            setThumbnail({
                                                forObject: product.ref,
                                                thumbnail: product.thumbnail as thumbnail_type
                                            });
                                        }} />
                                )
                            })
                        }
                    </ul>
                </div>
            ) : <></>}
            {!hasNextPage && dataToRender.length > 1 ? (
                <div className="flex flex-col items-center mt-6 mb-8">
                    <div className="w-full mx-2 border-t border-border mb-2"></div>
                    <p className="text-muted-foreground text-sm">You&apos;ve reached the end.</p>
                </div>
            ) : <></>}
        </div>
        { thumbnail != null && 
            <Dialog open={thumbnail != null}>
                <EditThumbnail
                    withPrice={true}
                    thumbnailType="square"
                    forObject={thumbnail.forObject}
                    existingThumbnail={thumbnail.thumbnail as ThumbnailSchema}
                    onCancel={() => setThumbnail(null)}
                    onSuccess={(values) => {
                        setThumbnail(null);
                        
                        queryClient.setQueryData(catalogueQuery.key, (oldData: any) => {
                            if (oldData == null || !oldData.pages) {
                                return oldData;
                            }
                            
                            return {
                                ...oldData,
                                pages: oldData.pages.map((page: any) => ({
                                    ...page,
                                    listings: page.listings.map((listing: listing_type) => {
                                        if (listing.ref.id == thumbnail?.forObject.id) {
                                            return {
                                                ...listing,
                                                thumbnail: values as thumbnail_type
                                            }
                                        } else {
                                            return listing;
                                        }
                                    })
                                }))
                            }
                        })

                    }}
                />
            </Dialog>
        }
        </>
    )
}

export default Catalogue;