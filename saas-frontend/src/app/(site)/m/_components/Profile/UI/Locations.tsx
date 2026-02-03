import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselDots } from "@/components/ux/Carousel";
import { cn } from "@/lib/utils";
import { vendor_type } from "@/utils/spiriverse";
import { MapIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Autoplay from "embla-carousel-autoplay";
import MerchantCard from "./MerchantCard";
import { MerchantLocationTitle } from "../../MerchantAccentText";

type Props = {
    vendor: vendor_type;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
}

const Locations : React.FC<Props> = ({vendor, visibility}) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        if (copiedId != null) {
            setTimeout(() => {
                setCopiedId(null)
            }, 2000)
        }
    }, [copiedId])

    // Hide completely if visibility is explicitly null (customer view + not visible)
    if (visibility === null) {
        return <></>;
    }

    if (vendor.locations == null || vendor.locations.length == 0) {
        return <></>
    }

    if (vendor.locations != null && vendor.locations.length == 1) {
        return (
            <MerchantCard vendor={vendor} visibility={visibility} title="Location">
                <div className="flex flex-col space-y-2 w-full">
                <ul className="flex flex-col space-y-2 flex-grow">
                    {vendor.locations.map((location) => (
                        <li key={location.id} className="flex flex-col">
                            <div className="flex flex-row space-x-3">
                                <MapIcon 
                                    color={vendor.colors != null ? vendor.colors.primary.background : "var(--primary)"}
                                    className="flex-none mt-2" size={16} />
                                <div className="flex flex-row space-x-3 w-full">
                                    <MerchantLocationTitle>
                                        {location.title}
                                    </MerchantLocationTitle>
                                    <CopyToClipboard 
                                        text={location.address.formattedAddress}
                                        onCopy={() => {
                                            setCopiedId(location.id)
                                        }}>
                                        <span 
                                            className={cn("flex-grow text-left", copiedId == location.id ? "" : "cursor-pointer")}
                                            >{copiedId == location.id ? "Copied" : location.address.formattedAddress}</span>
                                    </CopyToClipboard>
                                </div>
                            </div>
                            {location.services != null &&
                                <Carousel className="w-full flex flex-row items-center" orientation="horizontal">
                                    <CarouselPrevious variant="ghost" className="flex-none text-merchant-primary" />
                                    <CarouselNext variant="ghost" className="flex-none text-merchant-primary mr-2" />
                                    <CarouselContent className="flex-grow">
                                        {location.services.map((service, idx) => (
                                            <CarouselItem key={`${service}-${idx}`} className="flex-none mr-3 w-auto">
                                                {service} 
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            }
                        </li>
                    ))}
                </ul>
                </div>
            </MerchantCard>
        )
    }

    // otherwise, we just render the titles in a carousel with a learn more about our services button
    return (
        <>
            <MerchantCard vendor={vendor} visibility={visibility} title="Locations">
                <div className="flex flex-col space-y-2 w-full">
                    <Carousel>
                        <CarouselContent className="pl-2">
                            {vendor.locations.map((location) => (
                                <CarouselItem key={location.id}>
                                    <MerchantLocationTitle className="mr-3">
                                        {location.title}
                                    </MerchantLocationTitle>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                <div className="flex flex-row justify-between items-center">
                    <span className="text-xs">{vendor.locations.length} locations</span>
                    <Button 
                        variant="link"
                        type="button"
                        className={cn("p-0 pr-2 justify-end", "text-merchant-links")}
                        onClick={() => setShowDialog(true)}
                        >
                            Learn location services
                    </Button>
                </div>
                </div>
            </MerchantCard>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="min-w-auto max-w-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Our Locations
                        </DialogTitle>
                        <DialogDescription>
                            Across our locations we offer the following services.
                        </DialogDescription>
                    </DialogHeader>
                    <Carousel 
                        plugins={[
                            Autoplay({ playOnInit: false, delay: 3000 })
                        ]}>
                        <CarouselContent className="w-[600px]">
                            {vendor.locations.map((location) => (
                                <CarouselItem key={location.id} className="flex-none flex flex-col w-[200px] mr-3">
                                    <div className="flex flex-col space-y-2 w-auto items-center">
                                        <div className="flex flex-row space-x-3 items-center">
                                            <MapIcon 
                                                className="flex-none text-primary" size={16} />
                                            <span className="text-sm">{location.title}</span>
                                        </div>
                                        <CopyToClipboard
                                            text={location.address.formattedAddress}
                                            onCopy={() => {
                                                setCopiedId(location.id)
                                            }}>
                                            <span className={cn("text-left text-xs", copiedId == location.id ? "" : "cursor-pointer hover:underline text-primary")}>
                                                {copiedId == location.id ? "Copied" : location.address.formattedAddress}
                                            </span>
                                        </CopyToClipboard>
                                        <ul className="flex flex-row justify-center flex-wrap text-center max-h-[200px] overflow-y-auto">
                                            {location.services.map((service, index) => (
                                                <li key={index} className="mr-3 py-1">
                                                    {service}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="mt-4 flex flex-row justify-between items-center">
                            <CarouselPrevious className="flex-none" />
                            <CarouselDots />
                            <CarouselNext className="flex-none" />
                        </div>
                        <DialogFooter className="w-full">
                            <Button 
                                variant="link" 
                                type="button"
                                className={cn("pb-0 w-full")}
                                onClick={() => setShowDialog(false)}
                                >
                                    Close
                            </Button>
                        </DialogFooter>
                    </Carousel>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Locations;