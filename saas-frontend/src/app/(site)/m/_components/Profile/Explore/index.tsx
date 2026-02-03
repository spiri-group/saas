import React from "react"
import { vendor_type } from "@/utils/spiriverse"
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@/components/ux/Carousel"
import { addClassName } from "@/lib/functions"
import Image from "next/image"
import MerchantCard from "../UI/MerchantCard"

type Props = {
    vendor: vendor_type
}

const ExploreTab: React.FC<Props> = ({ vendor }) => {
    if (vendor.descriptions == null || vendor.descriptions.length == 0) return null

    return (
        <div className="space-y-4 p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-merchant-headings-foreground">
                    Explore
                </h2>
                <p className="text-merchant-default-foreground/70 mb-6">
                    Learn more about our story, values, and what makes us unique.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {vendor.descriptions.map((section) => {
                        const html_string = addClassName("a", "text-merchant-links hover:underline", section.body)
                        return (
                            <MerchantCard
                                key={section.id}
                                vendor={vendor}
                                className="hover:-translate-y-2 cursor-pointer"
                                expandable={false}
                                title={section.title}
                            >
                                <Carousel>
                                    <CarouselContent>
                                        {section.supporting_images
                                            .filter(image => image.title != null && image.url != null)
                                            .map((image, idx) => (
                                                <CarouselItem key={idx} className="relative w-full aspect-video">
                                                    <Image
                                                        src={image.url as string}
                                                        alt={image.title as string}
                                                        className="rounded-t-xl"
                                                        fill={true}
                                                        style={{ objectFit: "cover" }} />
                                                </CarouselItem>
                                            ))
                                        }
                                    </CarouselContent>
                                    {section.supporting_images.length > 1 && <CarouselDots className="mt-2" />}
                                </Carousel>
                                <p className="leading-6 px-2 pt-2 text-merchant-default-foreground" dangerouslySetInnerHTML={{ __html: html_string }} />
                            </MerchantCard>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ExploreTab
