'use client';

import { JSX, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import UseSearch from "../SearchBar/_hooks/UseSearch";
import * as NextImage from "next/image";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { convert_color, isNullOrWhitespace } from "@/lib/functions";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Props = {
    frontItems?: JSX.Element[],
}

const CatalogueItems: React.FC<Props> = ({ frontItems }) => {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";

    const listingsQuery = UseSearch("listings", true, searchQuery).query;
    const merchantsQuery = UseSearch("merchants", !isNullOrWhitespace(searchQuery), searchQuery).query;
    const isLoading = listingsQuery.isLoading || merchantsQuery.isLoading;
    const isFetchingNextPage = listingsQuery.isFetchingNextPage || merchantsQuery.isFetchingNextPage;
    const data = [...listingsQuery.data?.pages ?? [], ...merchantsQuery.data?.pages ?? []];
    const hasNextPage = !isLoading && (listingsQuery.hasNextPage || merchantsQuery.hasNextPage);
    const fetchNextPage = () => {
        if (listingsQuery.hasNextPage) {
            listingsQuery.fetchNextPage();
        } else if (merchantsQuery.hasNextPage) {
            merchantsQuery.fetchNextPage();
        }
    }

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

    const dataToRender = data?.flatMap(page => page.results) || [];
    const rounded = "xl";

    return (
        <div className="flex flex-col gap-2">
            <div className="flex-grow grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-8 grid-rows-auto gap-2 m-2">
                {frontItems != null && frontItems.length > 0 ? frontItems : null}
                {dataToRender.map((result, i) => {
                    const panelBgColor = result.thumbnail?.title?.panel?.bgColor;
                    const panelBgOpacity = result.thumbnail?.title?.panel?.bgOpacity ?? 1;
                    const text_panel_bg = `rgba(${panelBgColor ? convert_color(panelBgColor, "hex", "rgb").replace(/ /g, ",") : "255,255,255"}, ${panelBgOpacity})`;
                    const isNearEnd = i === dataToRender.length - 10; // Adjust this number to preload earlier

                    return (
                        <Link
                            ref={isNearEnd && hasNextPage ? sentinelRef : undefined}
                            href={result.link}
                            className={cn("transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-2 hover:shadow-2xl", result.thumbnail?.image?.media.size === 'SQUARE' ? "col-span-1" : "col-span-2")}
                            key={result.id}
                            data-testid={`search-result-${result.id}`}>
                            <div className={cn("flex flex-col w-full h-full shadow-xl", `rounded-${rounded}`)}>
                                {result.thumbnail?.image && (
                                    <div
                                        style={{
                                            background: result.thumbnail?.bgColor === "#ffffff"
                                                ? "linear-gradient(to bottom, #ffffff, #f8fafc, #e2e8f0)" // light theme gradient
                                                : result.thumbnail?.bgColor === "#000000"
                                                ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)" // dark theme gradient
                                                : result.thumbnail?.bgColor ?? "#ffffff" // custom color
                                        }}
                                        className={cn("w-full h-48 relative group overflow-hidden", `rounded-t-${rounded}`)}
                                    >
                                        <NextImage.default
                                            src={result.thumbnail.image.media.url}
                                            className={`rounded-t-${rounded} transition-transform duration-300 ease-out group-hover:scale-110`}
                                            style={{
                                                objectFit: result.thumbnail.image.media.size === "RECTANGLE_HORIZONTAL" ? "cover" : "contain",
                                                transform: `scale(${result.thumbnail.image.zoom || 1})`
                                            }}
                                            fill={true}
                                            alt=""
                                        />
                                        {/* Stamp overlay */}
                                        {result.thumbnail.stamp?.enabled && result.thumbnail.stamp?.text && (
                                            <div 
                                                className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-bold rounded shadow-lg group-hover:opacity-0 transition-opacity duration-200"
                                                style={{ 
                                                    backgroundColor: result.thumbnail.stamp.bgColor || "#dc2626",
                                                    color: result.thumbnail.stamp.textColor || "#ffffff"
                                                }}
                                            >
                                                {result.thumbnail.stamp.text}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`p-2 px-4 h-20 w-full flex flex-col gap-1 rounded-b-${rounded}`}
                                    style={{
                                        backgroundColor: result.thumbnail?.bgColor === "#000000"
                                            ? "rgba(15, 23, 42, 0.55)" // dark theme panel
                                            : result.thumbnail?.bgColor === "#ffffff"
                                            ? "rgba(255, 255, 255, 0.7)" // light theme panel
                                            : text_panel_bg, // custom panel background
                                        border: `1px solid ${result.thumbnail?.bgColor === "#000000" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                                        color: result.thumbnail?.bgColor === "#000000"
                                            ? "#ffffff" // dark theme text
                                            : result.thumbnail?.bgColor === "#ffffff"
                                            ? "#000000" // light theme text
                                            : (result.thumbnail?.title?.panel?.textColor ?? "#000000") // custom text color
                                    }}>
                                    <HoverCard>
                                        <HoverCardTrigger className="text-sm font-bold truncate">
                                            {result.title}
                                        </HoverCardTrigger>
                                        <HoverCardContent className="flex flex-col gap-2">
                                            <h2 className="text-md font-bold">{result.title}</h2>
                                            {result.thumbnail?.moreInfo?.content && !isNullOrWhitespace(result.thumbnail.moreInfo.content) && (
                                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: result.thumbnail.moreInfo.content }} />
                                            )}
                                            <a href={result.link} className="text-sm text-blue-500 hover:underline">View Item</a>
                                        </HoverCardContent>
                                    </HoverCard>
                                    {result.price != undefined && result.price.amount > 0 && (
                                        <CurrencySpan value={result.price} withAnimation={false} className="text-md" />
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
                {isFetchingNextPage && (
                    <div className={cn("h-80 bg-slate-300 animate-pulse", `rounded-${rounded}`)} />
                )}
            </div>
            {!hasNextPage && dataToRender.length > 1 && (
                <div className="flex flex-col items-center mt-6 mb-8">
                    <div className="w-full mx-2 border-t border-border mb-2"></div>
                    <p className="text-muted-foreground text-sm">You’ve reached the end.</p>
                </div>
            )}
        </div>
    );
};

export default CatalogueItems;