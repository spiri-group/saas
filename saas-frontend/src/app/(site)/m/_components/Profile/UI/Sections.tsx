import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@/components/ux/Carousel";
import { addClassName } from "@/lib/functions";
import { vendor_type } from "@/utils/spiriverse";
import Image from "next/image";
import MerchantCard from "./MerchantCard";

type Props = {
    vendor: vendor_type
}

const Sections : React.FC<Props> = ({vendor}) => {
    if (vendor.descriptions == null || vendor.descriptions.length == 0) return <></>

    return (
        <>
            {vendor.descriptions.map((section) => {
                const html_string = addClassName("a", "text-merchant-links hover:underline", section.body)
                return (
                <MerchantCard 
                    key={section.id} 
                    vendor={vendor}
                    className="transition-all duration-200 backdrop-blur-sm"
                    expandable={true}
                    title={section.title}
                    defaultExpanded={false}
                >
                    <Carousel>
                        <CarouselContent>
                        {
                            section.supporting_images
                            .filter(image => image.title != null && image.url != null)    
                            .map((image, idx) => (
                                <CarouselItem key={idx} className="relative w-full aspect-video">
                                    <Image src={image.url as string} alt={image.title as string} className="rounded-t-xl" fill={true} objectFit="cover" />
                                </CarouselItem>
                            ))
                        }
                        </CarouselContent>
                        { section.supporting_images.length > 1 && <CarouselDots className="mt-2" /> }
                    </Carousel>
                    <p className="leading-6 px-2 pt-2" dangerouslySetInnerHTML={{ __html: html_string }} /> 
                </MerchantCard>
            )})}
        </>
    )
}

export default Sections;