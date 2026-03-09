'use client'

import React, { useRef, useState } from "react"
import { recordref_type } from "@/utils/spiriverse"
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel"
import NewReview from "../../../../../components/Review/Create/NewReview"
import AllReview from "../../../../../components/Review/Reviews"
import UseJourneyDetails, { JourneyTrackType } from "./hooks/UseJourneyDetails"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme"
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader"
import { Badge } from "@/components/ui/badge"
import { useUnifiedCart } from "@/app/(site)/components/Catalogue/components/ShoppingCart/useUnifiedCart"
import {
    Clock,
    Gem,
    Layers,
    Lock,
    Music,
    Package,
    Pause,
    Play,
    ShoppingCart,
    Sparkles,
    Target,
    Wrench,
} from "lucide-react"
import { decodeAmountFromSmallestUnit } from "@/lib/functions"

type Props = {
    merchantId: string
    journeyId: string
}

function formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`
    }
    return `${seconds}s`
}

function formatTrackDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function difficultyLabel(difficulty: string | undefined): string {
    if (!difficulty) return ''
    return difficulty.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function structureLabel(structure: string): string {
    switch (structure) {
        case 'SINGLE_TRACK': return 'Single Track'
        case 'COLLECTION': return 'Collection'
        case 'SERIES': return 'Series'
        default: return structure.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }
}

// Inline audio preview player
const TrackPreviewPlayer: React.FC<{ track: JourneyTrackType }> = ({ track }) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)

    if (!track.audioFile?.url || !track.previewDurationSeconds) return null

    const handlePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            audio.play()
            setIsPlaying(true)
        }
    }

    const handleTimeUpdate = () => {
        const audio = audioRef.current
        if (!audio || !track.previewDurationSeconds) return

        const currentProgress = (audio.currentTime / track.previewDurationSeconds) * 100
        setProgress(Math.min(currentProgress, 100))

        if (audio.currentTime >= track.previewDurationSeconds) {
            audio.pause()
            audio.currentTime = 0
            setIsPlaying(false)
            setProgress(0)
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
        setProgress(0)
    }

    return (
        <div className="flex items-center gap-2" data-testid={`track-preview-${track.id}`}>
            <audio
                ref={audioRef}
                src={track.audioFile.url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                preload="none"
            />
            <button
                onClick={handlePlayPause}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handlePlayPause(); } }}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                style={{
                    backgroundColor: 'rgb(var(--merchant-primary))',
                    color: 'rgb(var(--merchant-primary-foreground))',
                }}
                data-testid={`track-play-btn-${track.id}`}
                aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                aria-pressed={isPlaying}
            >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/10 min-w-[60px]">
                <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: 'rgb(var(--merchant-primary))',
                    }}
                />
            </div>
            <span className="text-xs text-merchant-default-foreground/50 whitespace-nowrap">
                {formatTrackDuration(track.previewDurationSeconds)}
            </span>
        </div>
    )
}

const useBL = (props: Props) => {
    const journey = UseJourneyDetails(props.merchantId, props.journeyId)
    const vendorBranding = useMerchantTheme(props.merchantId)
    const cart = useUnifiedCart()

    return {
        ref: {
            id: props.journeyId,
            partition: props.merchantId
        } as recordref_type,
        journey: journey.data,
        isLoading: journey.isLoading,
        vendorBranding: vendorBranding.data,
        cart,
        addToCart: () => cart.addJourney(props.journeyId),
        addRentalToCart: () => cart.addJourney(props.journeyId, 'RENTAL'),
        isAddingToCart: cart.isAddingJourney,
    }
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.vendorBranding) return null

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined

    const journey = bl.journey
    const thumbnailUrl = journey?.thumbnail?.image?.media?.url

    const sortedTracks = journey?.tracks
        ? [...journey.tracks].sort((a, b) => a.trackNumber - b.trackNumber)
        : []

    return (
        <div
            className="flex flex-col space-y-2 mx-2"
            data-testid="journey-storefront-page"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}
        >
            <MerchantFontLoader fonts={fontConfig} />

            {bl.isLoading && (
                <div className="flex items-center justify-center min-h-[400px]" data-testid="journey-loading">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(var(--merchant-primary))', borderTopColor: 'transparent' }} />
                </div>
            )}

            {journey !== undefined && (
                <>
                    {/* Hero Section */}
                    <div className="relative w-full h-72 md:h-96 rounded-b-2xl overflow-hidden mt-0" data-testid="journey-hero">
                        {thumbnailUrl ? (
                            <Image
                                alt={journey.name}
                                src={thumbnailUrl}
                                fill={true}
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{
                                    background: journey.thumbnail?.bgColor
                                        ? journey.thumbnail.bgColor
                                        : 'linear-gradient(135deg, rgb(var(--merchant-primary), 0.3), rgb(var(--merchant-primary), 0.1))'
                                }}
                            />
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        {/* Hero content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                            <h1
                                className="text-2xl md:text-4xl font-bold text-white mb-2 font-merchant-headings"
                                data-testid="journey-title"
                            >
                                {journey.name}
                            </h1>
                            {journey.vendor && (
                                <div className="flex items-center gap-2 text-white/80">
                                    <span>by</span>
                                    <Link
                                        href={`/m/${journey.vendor.slug}`}
                                        className="font-semibold hover:underline text-white"
                                        data-testid="journey-vendor-link"
                                    >
                                        {journey.vendor.name}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Info Bar */}
                    <Panel
                        className="mt-2"
                        aria-labelledby="journey-info"
                        style={{
                            backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                            color: `rgb(var(--merchant-panel-primary-foreground))`,
                            borderColor: `rgb(var(--merchant-primary), 0.2)`,
                            boxShadow: `var(--shadow-merchant-lg)`
                        }}
                    >
                        <PanelContent>
                            <div
                                className="flex flex-wrap items-center justify-between gap-4 py-2"
                                data-testid="journey-info-bar"
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge
                                        variant="outline"
                                        className="flex items-center gap-1.5 px-3 py-1.5 border-merchant-primary/30 text-merchant-default-foreground"
                                    >
                                        <Music className="h-3.5 w-3.5" />
                                        {journey.trackCount} {journey.trackCount === 1 ? 'Track' : 'Tracks'}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="flex items-center gap-1.5 px-3 py-1.5 border-merchant-primary/30 text-merchant-default-foreground"
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                        {formatDuration(journey.totalDurationSeconds)}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="flex items-center gap-1.5 px-3 py-1.5 border-merchant-primary/30 text-merchant-default-foreground"
                                    >
                                        <Layers className="h-3.5 w-3.5" />
                                        {structureLabel(journey.journeyStructure)}
                                    </Badge>
                                    {journey.difficulty && (
                                        <Badge
                                            variant="outline"
                                            className="flex items-center gap-1.5 px-3 py-1.5 border-merchant-primary/30 text-merchant-default-foreground"
                                        >
                                            <Target className="h-3.5 w-3.5" />
                                            {difficultyLabel(journey.difficulty)}
                                        </Badge>
                                    )}
                                    {journey.modalities && journey.modalities.length > 0 && journey.modalities.map((modality) => (
                                        <Badge
                                            key={modality}
                                            variant="secondary"
                                            className="px-3 py-1.5 text-xs"
                                        >
                                            {modality.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right" data-testid="journey-price">
                                        <CurrencySpan
                                            className="text-2xl font-bold text-merchant-headings-foreground"
                                            value={journey.pricing.collectionPrice}
                                        />
                                        {journey.pricing.allowSingleTrackPurchase && journey.pricing.singleTrackPrice && (
                                            <div className="text-xs text-merchant-default-foreground/60 mt-0.5">
                                                or <CurrencySpan
                                                    className="text-merchant-default-foreground/60"
                                                    value={journey.pricing.singleTrackPrice}
                                                /> per track
                                            </div>
                                        )}
                                        {journey.pricing.allowRental && journey.pricing.rentalPrice && (
                                            <div className="text-xs text-merchant-default-foreground/60 mt-0.5">
                                                or rent for <CurrencySpan
                                                    className="text-merchant-default-foreground/60"
                                                    value={journey.pricing.rentalPrice}
                                                /> ({journey.pricing.rentalDurationDays || 30} days)
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            onClick={bl.addToCart}
                                            disabled={bl.isAddingToCart}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
                                            style={{
                                                backgroundColor: 'rgb(var(--merchant-primary))',
                                                color: 'rgb(var(--merchant-primary-foreground))',
                                            }}
                                            data-testid="journey-add-to-cart-btn"
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                            {bl.isAddingToCart ? 'Adding...' : 'Buy'}
                                        </Button>
                                        {journey.pricing.allowRental && journey.pricing.rentalPrice && (
                                            <Button
                                                onClick={bl.addRentalToCart}
                                                disabled={bl.isAddingToCart}
                                                variant="outline"
                                                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm transition-all border-merchant-primary/30 text-merchant-default-foreground hover:bg-merchant-primary/10"
                                                data-testid="journey-rent-btn"
                                            >
                                                <Clock className="h-4 w-4" />
                                                Rent
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </PanelContent>
                    </Panel>

                    {/* Description & Intention */}
                    <Panel
                        className="mt-2"
                        aria-labelledby="journey-description-title"
                        style={{
                            backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                            color: `rgb(var(--merchant-panel-primary-foreground))`,
                            borderColor: `rgb(var(--merchant-primary), 0.2)`,
                            boxShadow: `var(--shadow-merchant-lg)`
                        }}
                    >
                        <PanelHeader>
                            <PanelTitle as="h2" id="journey-description-title" className="text-lg text-merchant-headings-foreground">
                                About this Journey
                            </PanelTitle>
                        </PanelHeader>
                        <PanelContent className="flex flex-col gap-6">
                            <p
                                className="prose max-w-none text-merchant-default-foreground leading-relaxed whitespace-pre-line"
                                data-testid="journey-description"
                            >
                                {journey.description}
                            </p>

                            {journey.intention && (
                                <div
                                    className="relative pl-6 py-4 rounded-r-lg"
                                    style={{
                                        borderLeft: '3px solid rgb(var(--merchant-primary))',
                                        backgroundColor: 'rgb(var(--merchant-primary), 0.05)',
                                    }}
                                    data-testid="journey-intention"
                                >
                                    <Sparkles className="absolute top-4 left-2 h-4 w-4 text-merchant-primary/60 -translate-x-1/2" />
                                    <p className="italic text-merchant-default-foreground/90 ml-2">
                                        &ldquo;{journey.intention}&rdquo;
                                    </p>
                                    <span className="text-xs text-merchant-default-foreground/50 ml-2 mt-1 block">
                                        Journey Intention
                                    </span>
                                </div>
                            )}

                            {/* Spiritual Interests */}
                            {journey.spiritualInterests && journey.spiritualInterests.length > 0 && (
                                <div className="flex flex-wrap gap-2" data-testid="journey-spiritual-interests">
                                    {journey.spiritualInterests.map((interest) => (
                                        <Badge
                                            key={interest}
                                            variant="outline"
                                            className="px-3 py-1 text-xs border-merchant-primary/20 text-merchant-default-foreground/80"
                                        >
                                            {interest.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </PanelContent>
                    </Panel>

                    {/* Track Listing */}
                    {sortedTracks.length > 0 && (
                        <Panel
                            className="mt-2"
                            aria-labelledby="journey-tracks-title"
                            style={{
                                backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                                color: `rgb(var(--merchant-panel-primary-foreground))`,
                                borderColor: `rgb(var(--merchant-primary), 0.2)`,
                                boxShadow: `var(--shadow-merchant-lg)`
                            }}
                        >
                            <PanelHeader>
                                <PanelTitle as="h2" id="journey-tracks-title" className="text-lg text-merchant-headings-foreground">
                                    Tracks
                                </PanelTitle>
                            </PanelHeader>
                            <PanelContent>
                                <div className="flex flex-col divide-y divide-merchant-primary/10" data-testid="journey-track-list">
                                    {sortedTracks.map((track) => (
                                        <div
                                            key={track.id}
                                            className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                                            data-testid={`journey-track-${track.id}`}
                                        >
                                            {/* Track number */}
                                            <div
                                                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-bold"
                                                style={{
                                                    backgroundColor: 'rgb(var(--merchant-primary), 0.1)',
                                                    color: 'rgb(var(--merchant-primary))',
                                                }}
                                            >
                                                {track.trackNumber}
                                            </div>

                                            {/* Track info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-merchant-headings-foreground truncate">
                                                        {track.title}
                                                    </h3>
                                                    {!track.audioFile?.url && !track.previewDurationSeconds && (
                                                        <Lock className="h-3.5 w-3.5 text-merchant-default-foreground/40 shrink-0" />
                                                    )}
                                                </div>
                                                {track.description && (
                                                    <p className="text-sm text-merchant-default-foreground/70 line-clamp-2 mb-2">
                                                        {track.description}
                                                    </p>
                                                )}
                                                {track.previewDurationSeconds && track.audioFile?.url && (
                                                    <TrackPreviewPlayer track={track} />
                                                )}
                                                {track.linkedProducts && track.linkedProducts.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2" data-testid={`track-products-${track.id}`}>
                                                        {track.linkedProducts.map((product) => {
                                                            const sku = product.skus?.[0]
                                                            const thumbUrl = product.thumbnail?.image?.media?.url
                                                            return (
                                                                <div
                                                                    key={product.id}
                                                                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                                                                    style={{
                                                                        backgroundColor: 'rgb(var(--merchant-primary), 0.05)',
                                                                        border: '1px solid rgb(var(--merchant-primary), 0.15)',
                                                                    }}
                                                                    data-testid={`storefront-product-${product.id}`}
                                                                >
                                                                    {thumbUrl ? (
                                                                        <Image src={thumbUrl} alt={product.name} width={20} height={20} className="rounded object-cover" />
                                                                    ) : (
                                                                        <Package className="w-4 h-4 text-merchant-default-foreground/40" />
                                                                    )}
                                                                    <span className="text-merchant-default-foreground/80">{product.name}</span>
                                                                    {sku?.price && (
                                                                        <span className="text-merchant-default-foreground/50">
                                                                            ${decodeAmountFromSmallestUnit(sku.price.amount, sku.price.currency)}
                                                                        </span>
                                                                    )}
                                                                    {sku && product.ref && (
                                                                        <button
                                                                            onClick={() => bl.cart.addProduct({
                                                                                productRef: product.ref!,
                                                                                variantId: sku.id,
                                                                                descriptor: product.name,
                                                                                quantity: 1,
                                                                                price: sku.price,
                                                                                imageUrl: thumbUrl,
                                                                            })}
                                                                            className="ml-1 flex items-center gap-0.5 font-medium"
                                                                            style={{ color: 'rgb(var(--merchant-primary))' }}
                                                                            data-testid={`add-storefront-product-${product.id}`}
                                                                        >
                                                                            <ShoppingCart className="w-3 h-3" />
                                                                            Add
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Duration */}
                                            <div className="text-sm text-merchant-default-foreground/60 whitespace-nowrap shrink-0">
                                                {formatTrackDuration(track.durationSeconds)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </PanelContent>
                        </Panel>
                    )}

                    {/* Recommended Crystals & Tools */}
                    {((journey.recommendedCrystals && journey.recommendedCrystals.length > 0) ||
                      (journey.recommendedTools && journey.recommendedTools.length > 0)) && (
                        <Panel
                            className="mt-2"
                            aria-labelledby="journey-recommendations-title"
                            style={{
                                backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                                color: `rgb(var(--merchant-panel-primary-foreground))`,
                                borderColor: `rgb(var(--merchant-primary), 0.2)`,
                                boxShadow: `var(--shadow-merchant-lg)`
                            }}
                        >
                            <PanelHeader>
                                <PanelTitle as="h2" id="journey-recommendations-title" className="text-lg text-merchant-headings-foreground">
                                    Recommended for this Journey
                                </PanelTitle>
                            </PanelHeader>
                            <PanelContent className="flex flex-col gap-4">
                                {journey.recommendedCrystals && journey.recommendedCrystals.length > 0 && (
                                    <div data-testid="journey-recommended-crystals">
                                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-merchant-headings-foreground">
                                            <Gem className="h-4 w-4 text-violet-400" />
                                            Crystals
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {journey.recommendedCrystals.map((crystal) => (
                                                <Badge
                                                    key={crystal}
                                                    variant="outline"
                                                    className="px-3 py-1.5 border-violet-500/30 text-merchant-default-foreground"
                                                >
                                                    {crystal}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {journey.recommendedTools && journey.recommendedTools.length > 0 && (
                                    <div data-testid="journey-recommended-tools">
                                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-merchant-headings-foreground">
                                            <Wrench className="h-4 w-4 text-amber-400" />
                                            Tools
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {journey.recommendedTools.map((tool) => (
                                                <Badge
                                                    key={tool}
                                                    variant="outline"
                                                    className="px-3 py-1.5 border-amber-500/30 text-merchant-default-foreground"
                                                >
                                                    {tool}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </PanelContent>
                        </Panel>
                    )}

                    {/* Mobile Add to Cart (sticky bottom) */}
                    <div
                        className="fixed bottom-0 left-0 right-0 p-4 md:hidden z-50"
                        style={{
                            backgroundColor: `rgba(var(--merchant-panel), 0.95)`,
                            backdropFilter: 'blur(12px)',
                            borderTop: '1px solid rgb(var(--merchant-primary), 0.15)',
                        }}
                        data-testid="journey-mobile-cart"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CurrencySpan
                                    className="text-xl font-bold text-merchant-headings-foreground"
                                    value={journey.pricing.collectionPrice}
                                />
                                {journey.pricing.allowRental && journey.pricing.rentalPrice && (
                                    <div className="text-xs text-merchant-default-foreground/60 mt-0.5">
                                        or rent <CurrencySpan
                                            className="text-merchant-default-foreground/60"
                                            value={journey.pricing.rentalPrice}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={bl.addToCart}
                                    disabled={bl.isAddingToCart}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold"
                                    style={{
                                        backgroundColor: 'rgb(var(--merchant-primary))',
                                        color: 'rgb(var(--merchant-primary-foreground))',
                                    }}
                                    data-testid="journey-mobile-add-to-cart-btn"
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    {bl.isAddingToCart ? 'Adding...' : 'Buy'}
                                </Button>
                                {journey.pricing.allowRental && journey.pricing.rentalPrice && (
                                    <Button
                                        onClick={bl.addRentalToCart}
                                        disabled={bl.isAddingToCart}
                                        variant="outline"
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border-merchant-primary/30 text-merchant-default-foreground"
                                        data-testid="journey-mobile-rent-btn"
                                    >
                                        <Clock className="h-4 w-4" />
                                        Rent
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="flex flex-col flex-grow space-y-2 mt-2 pb-20 md:pb-2">
                        <Panel
                            id="viewreview"
                            className="flex-grow"
                            aria-labelledby="journey-reviews-title"
                            style={{
                                backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                                color: `rgb(var(--merchant-panel-primary-foreground))`,
                                borderColor: `rgb(var(--merchant-primary), 0.2)`,
                                boxShadow: `var(--shadow-merchant-lg)`
                            }}
                        >
                            <PanelHeader className="flex flex-row">
                                <h2 id="journey-reviews-title" className="font-bold text-sm md:text-xl text-merchant-headings-foreground">
                                    Reviews
                                </h2>
                                <NewReview
                                    objectId={props.journeyId}
                                    objectPartition={props.merchantId}
                                    useMerchantTheming={true}
                                />
                            </PanelHeader>
                            <PanelContent className="flex flex-col min-h-[300px]">
                                <AllReview
                                    objectId={props.journeyId}
                                    objectPartition={props.merchantId}
                                    ref={bl.ref}
                                    useMerchantTheming={true}
                                />
                            </PanelContent>
                        </Panel>
                    </div>
                </>
            )}
        </div>
    )
}

export default UI
