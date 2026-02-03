'use client'

import React from "react"
import { recordref_type } from "@/utils/spiriverse";
import ListingRatings from "../../listing/components/ListingRatings";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import NewReview from "../../../../../components/Review/Create/NewReview";
import AllReview from "../../../../../components/Review/Reviews";
import UseProductDetails from "./hooks/UseProductDetails";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ux/Carousel";
import Image from "next/image";
import { isNullOrUndefined } from "@/lib/functions";
import AddToCart from "./hooks/AddToCart";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import { Gem, MapPin, Sparkles, Star, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BLProps = {
    merchantId: string,
    productId: string,
}

type Props = BLProps & {
}

const useBL = (props: BLProps) => {

    const product = UseProductDetails(props.merchantId, props.productId)
    const [selectedVariant, setSelectedVariant] = React.useState<number>(0)
    const vendorBranding = useMerchantTheme(props.merchantId)

    return {
        ref: {
            id: props.productId,
            partition: props.merchantId
        } as recordref_type,
        product: product.data,
        selectedVariant: {
            index: selectedVariant,
            setIndex: setSelectedVariant
        },
        vendorBranding: vendorBranding.data
    }
}

const UI : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const selectedVariant = bl.product?.variants[bl.selectedVariant.index]

    // Don't render until branding data is available
    if (!bl.vendorBranding) return null;

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined;

    return (
       <div className="flex flex-col space-y-2 ml-2 mr-2"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}>
            <MerchantFontLoader fonts={fontConfig} />
            {bl.product != undefined && (
                <Panel className="mt-2" aria-labelledby="product-title"
                       style={{
                           backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                           color: `rgb(var(--merchant-panel-primary-foreground))`,
                           borderColor: `rgb(var(--merchant-primary), 0.2)`,
                           boxShadow: `var(--shadow-merchant-lg)`
                       }}>
                    <PanelHeader className="mb-4">
                        <PanelTitle as="h1" id="product-title" className="text-xl text-merchant-headings-foreground">
                            {bl.product.name}
                        </PanelTitle>
                        <PanelDescription className="flex flex-row gap-1 items-center">
                            <span className="text-merchant-default-foreground/70">Sold by</span>
                            <span className="text-merchant-default-foreground font-bold text-md">{bl.product.vendor.name}</span>
                            <Link href={`/m/${bl.product.vendor.slug}`} className="text-sm text-merchant-links hover:underline">Visit Profile</Link>
                        </PanelDescription>
                    </PanelHeader>
                    <PanelContent className="flex flex-row space-x-3">
                        <>
                        <div className="flex flex-col flex-grow min-w-0">
                            <div className="flex flex-row">
                                <ListingRatings
                                    listingId={props.productId}
                                    merchantId={props.merchantId}
                                    useMerchantTheming={true} />
                                {!isNullOrUndefined(selectedVariant) &&
                                    <Carousel className="flex flex-row w-full h-60 ml-8" orientation="horizontal">
                                        <CarouselPrevious className="h-full" style="RECTANGLE" /> 
                                        <CarouselContent className="w-full h-full flex-grow px-4">
                                            {selectedVariant.images.map((image, index) => (
                                                <CarouselItem key={index} className="relative w-60 aspect-square">
                                                    <Image 
                                                        alt={image.title ?? "Variant image"}
                                                        src={image.url}
                                                        fill={true}
                                                        objectFit="cover"
                                                        />
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselNext className="h-full ml-auto" style="RECTANGLE" />
                                    </Carousel>
                                }
                            </div>
                            {!isNullOrUndefined(selectedVariant) &&
                                <div className="flex flex-row space-x-2">
                                    <div className="flex flex-col p-6">
                                        {/* {bl.product.variants.length == 1 && (
                                            <span className="font-bold text-lg mb-2">
                                                {selectedVariant.name}
                                            </span>
                                        )} */}
                                        <div className="flex flex-col">
                                            <h3 className="flex flex-row gap-2 mb-2">
                                                <span className="text-merchant-default-foreground/70 font-bold">About</span>
                                                {bl.product.variants.length == 1 ? <span className="font-bold text-merchant-headings-foreground">this item</span> : <span className="font-semibold text-merchant-headings-foreground">{`${selectedVariant.name} version`}</span>}
                                            </h3>
                                            <ul className="flex flex-col space-y-1">
                                                <li className="flex flex-row space-x-1 flex-none w-60">
                                                    <span className="text-merchant-default-foreground">
                                                        H: {selectedVariant.dimensions.height} x W: {selectedVariant.dimensions.width} x D: {selectedVariant.dimensions.depth} {selectedVariant.dimensions.uom}
                                                    </span>
                                                    <span className="text-merchant-default-foreground/70">({selectedVariant.weight.amount} {selectedVariant.weight.uom})</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="flex flex-col py-6 w-full">
                                        <Carousel 
                                            opts={{
                                                loop: false,
                                                align: "start",
                                                skipSnaps: false, // must be false to snap to slides
                                                containScroll: "trimSnaps", // prevents scrolling past the ends
                                            }}
                                            className="mb-3" orientation="horizontal">
                                            <CarouselPrevious variant={"default"} className="h-full" style="RECTANGLE" hideIfNotScrollable={true} />
                                            <CarouselContent className="gap-2 py-2">
                                            {bl.product.variants.length > 1 && bl.product.variants.map((variant, index) => (
                                                <CarouselItem key={variant.id}>
                                                    <Button
                                                        variant={"outline"}
                                                        key={index}
                                                        className={cn("flex flex-col items-start gap-2 w-full h-20", index == bl.selectedVariant.index ? "border-merchant-primary" : "border-merchant-primary/20")}
                                                        aria-pressed={index == bl.selectedVariant.index}
                                                        onClick={() => bl.selectedVariant.setIndex(index)}
                                                    >
                                                        <span className="text-sm text-merchant-default-foreground">{variant.name}</span>
                                                        <CurrencySpan className="text-xs text-merchant-default-foreground/70" value={variant.defaultPrice} />
                                                    </Button>
                                                </CarouselItem>
                                            ))}
                                            </CarouselContent>
                                            <CarouselNext variant="default" className="h-full ml-auto" style="RECTANGLE" label="More" hideIfNotScrollable={true} />
                                        </Carousel>
                                        <h3 className="font-semibold mb-2 text-merchant-headings-foreground">More information</h3>
                                        <p className="prose flex-grow w-full max-w-none text-merchant-default-foreground" dangerouslySetInnerHTML={{__html: selectedVariant.description}} />
                                    </div>
                                </div>
                            }
                            
                        </div>
                        <div className="px-4">
                            {!isNullOrUndefined(selectedVariant) &&
                            <div className="flex flex-row w-full">
                                <AddToCart
                                    className="flex flex-col"
                                    productTitle={bl.product.name}
                                    image={selectedVariant.images[0]}
                                    productRef={bl.product.ref}
                                    variant={selectedVariant}
                                    useMerchantTheming={true} />
                            </div>
                            }
                        </div>
                        </>
                    </PanelContent>
                </Panel>
            )}

            {/* Crystal-specific information panel */}
            {bl.product != undefined && bl.product.productType === 'CRYSTAL' && bl.product.typeData?.crystal && (
                <Panel className="mt-2" aria-labelledby="crystal-info-title"
                       style={{
                           backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                           color: `rgb(var(--merchant-panel-primary-foreground))`,
                           borderColor: `rgb(var(--merchant-primary), 0.2)`,
                           boxShadow: `var(--shadow-merchant-lg)`
                       }}>
                    <PanelHeader className="mb-2">
                        <PanelTitle as="h2" id="crystal-info-title" className="flex items-center text-lg text-merchant-headings-foreground">
                            <Gem className="h-5 w-5 mr-2 text-violet-400" />
                            Crystal Properties
                        </PanelTitle>
                    </PanelHeader>
                    <PanelContent className="flex flex-col gap-4">
                        {/* Crystal basics */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="flex items-center gap-1 border-violet-500/30 text-violet-300">
                                <Gem className="h-3 w-3" />
                                {bl.product.typeData.crystal.crystalForm?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </Badge>
                            {bl.product.typeData.crystal.crystalGrade && (
                                <Badge variant="outline" className="flex items-center gap-1 border-amber-500/30 text-amber-300">
                                    <Star className="h-3 w-3" />
                                    Grade: {bl.product.typeData.crystal.crystalGrade}
                                </Badge>
                            )}
                            {bl.product.typeData.crystal.crystalColor && (
                                <Badge variant="outline" className="flex items-center gap-1 border-pink-500/30 text-pink-300">
                                    <Sparkles className="h-3 w-3" />
                                    {bl.product.typeData.crystal.crystalColor.replace(/\b\w/g, c => c.toUpperCase())}
                                </Badge>
                            )}
                            {bl.product.typeData.crystal.crystalLocality && (
                                <Badge variant="outline" className="flex items-center gap-1 border-emerald-500/30 text-emerald-300">
                                    <MapPin className="h-3 w-3" />
                                    {bl.product.typeData.crystal.crystalLocality}
                                </Badge>
                            )}
                        </div>

                        {/* Crystal reference information */}
                        {bl.product.typeData.crystal.crystalRef && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                                {/* Chakras */}
                                {bl.product.typeData.crystal.crystalRef.chakras && bl.product.typeData.crystal.crystalRef.chakras.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-merchant-headings-foreground">
                                            <Sparkles className="h-4 w-4 text-purple-400" />
                                            Chakras
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {bl.product.typeData.crystal.crystalRef.chakras.map((chakra: string) => (
                                                <Badge key={chakra} variant="secondary" className="text-xs capitalize">
                                                    {chakra.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Elements */}
                                {bl.product.typeData.crystal.crystalRef.elements && bl.product.typeData.crystal.crystalRef.elements.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-merchant-headings-foreground">
                                            <Sun className="h-4 w-4 text-orange-400" />
                                            Elements
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {bl.product.typeData.crystal.crystalRef.elements.map((element: string) => (
                                                <Badge key={element} variant="secondary" className="text-xs capitalize">
                                                    {element}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Zodiac Signs */}
                                {bl.product.typeData.crystal.crystalRef.zodiacSigns && bl.product.typeData.crystal.crystalRef.zodiacSigns.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-merchant-headings-foreground">
                                            <Moon className="h-4 w-4 text-blue-400" />
                                            Zodiac
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {bl.product.typeData.crystal.crystalRef.zodiacSigns.map((sign: string) => (
                                                <Badge key={sign} variant="secondary" className="text-xs capitalize">
                                                    {sign}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Crystal description from reference */}
                        {bl.product.typeData.crystal.crystalRef?.description && (
                            <div className="mt-2">
                                <h4 className="text-sm font-semibold mb-2 text-merchant-headings-foreground">
                                    About {bl.product.typeData.crystal.crystalRef.name}
                                </h4>
                                <p className="text-sm text-merchant-default-foreground/80 leading-relaxed">
                                    {bl.product.typeData.crystal.crystalRef.description}
                                </p>
                            </div>
                        )}
                    </PanelContent>
                </Panel>
            )}
            <div className="flex flex-col flex-grow space-y-2 mt-2">
                <Panel id="viewreview" className="flex-grow" aria-labelledby="reviews-title"
                       style={{
                           backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                           color: `rgb(var(--merchant-panel-primary-foreground))`,
                           borderColor: `rgb(var(--merchant-primary), 0.2)`,
                           boxShadow: `var(--shadow-merchant-lg)`
                       }}>
                    <PanelHeader className="flex flex-row">
                        <h1 id="reviews-title" className="font-bold text-sm md:text-xl text-merchant-headings-foreground">Reviews</h1>
                        <NewReview
                            objectId={props.productId}
                            objectPartition={props.merchantId}
                            useMerchantTheming={true} />
                    </PanelHeader>
                    <PanelContent className="flex flex-col min-h-[300px]">
                        <AllReview
                            objectId={props.productId}
                            objectPartition={props.merchantId}
                            ref={bl.ref}
                            useMerchantTheming={true} />
                    </PanelContent>
                </Panel>
            </div>
       </div>
    )
}

export default UI;