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
import type DomPurifyType from "dompurify";

type Props = {
    frontItems?: JSX.Element[],
}

const sanitize = (html: string) => {
    if (typeof window === 'undefined') return html;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DomPurify = require('dompurify') as typeof DomPurifyType;
    return DomPurify.sanitize(html);
};

const formatViewLabel = (additionalInfo?: string) => {
    if (!additionalInfo) return 'View';
    const label = additionalInfo.charAt(0).toUpperCase() + additionalInfo.slice(1);
    return `View ${label}`;
};

const CatalogueItems: React.FC<Props> = ({ frontItems }) => {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";

    const isSearching = !isNullOrWhitespace(searchQuery);
    const browseQuery = UseSearch("listings", !isSearching, searchQuery).query;
    const searchAllQuery = UseSearch("all", isSearching, searchQuery).query;
    const activeQuery = isSearching ? searchAllQuery : browseQuery;
    const isLoading = activeQuery.isLoading;
    const isFetchingNextPage = activeQuery.isFetchingNextPage;
    const data = activeQuery.data?.pages ?? [];
    const hasNextPage = !isLoading && activeQuery.hasNextPage;
    const fetchNextPage = () => {
        if (activeQuery.hasNextPage) {
            activeQuery.fetchNextPage();
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
            { threshold: 0.5 }
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [hasNextPage, fetchNextPage, data]);

    const dataToRender = (data?.flatMap(page => page.results).filter((r): r is typeof r & { link: string } => !!r.link)) || [];
    const rounded = "xl";

    if (!isLoading && dataToRender.length === 0 && !isNullOrWhitespace(searchQuery)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <p className="text-lg font-medium text-gray-600 mb-2">No results found</p>
                <p className="text-sm text-muted-foreground max-w-md text-center">
                    We couldn&apos;t find anything matching &quot;{searchQuery}&quot;. Try a different search term or browse our catalogue.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex-grow grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-8 grid-rows-auto gap-2 m-2">
                {frontItems != null && frontItems.length > 0 ? frontItems : null}
                {dataToRender.map((result, i) => {
                    const panelBgColor = result.thumbnail?.title?.panel?.bgColor;
                    const panelBgOpacity = result.thumbnail?.title?.panel?.bgOpacity ?? 1;
                    const text_panel_bg = `rgba(${panelBgColor ? convert_color(panelBgColor, "hex", "rgb").replace(/ /g, ",") : "255,255,255"}, ${panelBgOpacity})`;
                    const isNearEnd = i === dataToRender.length - 10;

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
                                                ? "linear-gradient(to bottom, #ffffff, #f8fafc, #e2e8f0)"
                                                : result.thumbnail?.bgColor === "#000000"
                                                ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)"
                                                : result.thumbnail?.bgColor ?? "#ffffff"
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
                                            ? "rgba(15, 23, 42, 0.55)"
                                            : result.thumbnail?.bgColor === "#ffffff"
                                            ? "rgba(255, 255, 255, 0.7)"
                                            : text_panel_bg,
                                        border: `1px solid ${result.thumbnail?.bgColor === "#000000" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                                        color: result.thumbnail?.bgColor === "#000000"
                                            ? "#ffffff"
                                            : result.thumbnail?.bgColor === "#ffffff"
                                            ? "#000000"
                                            : (result.thumbnail?.title?.panel?.textColor ?? "#000000")
                                    }}>
                                    <HoverCard>
                                        <HoverCardTrigger className="text-sm font-bold truncate">
                                            {result.title}
                                        </HoverCardTrigger>
                                        <HoverCardContent className="flex flex-col gap-2">
                                            <h2 className="text-md font-bold">{result.title}</h2>
                                            {result.thumbnail?.moreInfo?.content && !isNullOrWhitespace(result.thumbnail.moreInfo.content) && (
                                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: sanitize(result.thumbnail.moreInfo.content) }} />
                                            )}
                                            <a href={result.link} className="text-sm text-blue-500 hover:underline">{formatViewLabel(result.additionalInfo)}</a>
                                        </HoverCardContent>
                                    </HoverCard>
                                    <div className="flex items-center justify-between">
                                        {result.price != undefined && result.price.amount > 0 ? (
                                            <CurrencySpan value={result.price} withAnimation={false} className="text-md" />
                                        ) : (
                                            <span />
                                        )}
                                        {result.additionalInfo && (
                                            <span className="text-xs opacity-60 capitalize">{result.additionalInfo}</span>
                                        )}
                                    </div>
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
                    <p className="text-muted-foreground text-sm">You&apos;ve reached the end.</p>
                </div>
            )}
        </div>
    );
};

export default CatalogueItems;
