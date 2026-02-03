'use client' 

import React from "react";
import { teamMember_type, vendor_type } from "@/utils/spiriverse";
import { z } from "zod";
import { teamMemberSchema } from "../Edit/TeamMembers/components/AddTeamMembers";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel";
import Autoplay from 'embla-carousel-autoplay'
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image"
import { cn } from "@/lib/utils";
import { escape_key } from "@/lib/functions";
import MerchantCard from "./MerchantCard";
import MerchantAccentText, { MerchantTagline } from "../../MerchantAccentText";

type UIProps = {
    vendor: vendor_type,
    data: teamMember_type[] | z.infer<typeof teamMemberSchema>[],
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
}

export const VendorTeamMembersUI : React.FC<UIProps> = ({ data, vendor, visibility }) => {
    
    const [aboutMemberId, setAboutMemberId] = React.useState<string | null>(null);
    
    const handleClick = (teamMemberId: string) => {
        setAboutMemberId(teamMemberId);
    }

    if (data == null || data.length == 0) {
        return <></>
    }

    // Hide completely if visibility is explicitly null (customer view + not visible)
    if (visibility === null) {
        return <></>;
    }
    
    const selectedTeamMember = data.find(member => member.id == aboutMemberId);
    const selectedTeamMemberIndex = data.findIndex(member => member.id == aboutMemberId);

    return (
            <>
            <MerchantCard vendor={vendor} visibility={visibility} title="Team Members">
                <div className="flex flex-col space-y-2">
                    {data != null ? (
                        <div className="flex flex-col gap-2">
                    <Carousel 
                    plugins={[
                        Autoplay({ playOnInit: false, delay: 3000 })
                    ]}>
                    <CarouselContent>
                        {data.map((teamMember : teamMember_type | z.infer<typeof teamMemberSchema>) => (
                            <CarouselItem key={teamMember.id} className="flex flex-col w-auto mr-3">
                                <button 
                                    onClick={() => handleClick(teamMember.id)}
                                    className="flex flex-col space-y-2 w-auto items-center w-16">
                                    {
                                        teamMember.image != undefined && (
                                            <div className="relative flex-none w-16 h-16 rounded-full overflow-hidden">
                                                <Image src={teamMember.image.url} alt={teamMember.name} objectFit="cover" fill={true} />
                                            </div>
                                        )
                                    }
                                    {
                                        teamMember.image == undefined && (
                                            <div className="relative flex w-16 h-16 rounded-full text-sm overflow-hidden bg-merchant-primary text-merchant-primary-foreground items-center justify-center">
                                                <span>{teamMember.name.split(" ").map(word => word.charAt(0).toUpperCase()).join("")}</span>
                                            </div>
                                        )
                                    }
                                    <MerchantAccentText className="text-sm">
                                        {teamMember.name.split(" ")[0]}
                                    </MerchantAccentText>
                                </button>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    </Carousel>
                    <div className="pl-2 flex flex-row text-xs items-center justify-between">
                        <span>{data.length > 1000 ? '1,000+' : data.length} member{data.length > 1 ? "s" : ""}</span>
                        <Button 
                            variant="link" 
                            type="button"
                            className={cn("pb-0", "text-merchant-links")}
                            onClick={() => handleClick(data[0].id)}
                            >
                                Learn more about us
                            </Button>
                    </div>
                        </div>
                    ) : (  <></>
                    )}
                </div>
            </MerchantCard>
            <Dialog open={aboutMemberId != null} onOpenChange={() => setAboutMemberId(null)}>
                <DialogContent>
                    <Carousel opts={{ startIndex: selectedTeamMemberIndex }}>
                        <CarouselContent className="pb-">
                            {data.map((teamMember : teamMember_type | z.infer<typeof teamMemberSchema>) => (
                                 <CarouselItem key={teamMember.id} className="flex flex-col min-w-full max-w-full">
                                  <h1 className="font-bold text-lg">About {teamMember.name}</h1>
                                  <div className="flex items-start space-x-4">
                                    {teamMember.image && (
                                      <div className="relative flex-none w-56 h-56 rounded-full overflow-hidden">
                                      <Image 
                                        src={teamMember.image.url} alt={teamMember.name} 
                                        objectFit="cover" fill={true} />
                                      </div>
                                    )}
                                    <div className={cn("mt-2 flex flex-col justify-center")}>
                                      {teamMember.tagline && (
                                        <div className="max-h-max mb-2 bg-muted p-3 rounded-xl">
                                            <span className="text-sm italic">Better known as the </span>
                                            <MerchantTagline className="block px-2 pt-2 text-md">
                                                {teamMember.tagline}
                                            </MerchantTagline>
                                        </div>
                                      )}
                                      {teamMember.bio && (
                                        <div className="h-[345px] p-2 overflow-y-auto" dangerouslySetInnerHTML={{ __html: teamMember.bio }} />
                                      )}
                                    </div>
                                  </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                    { data.length > 1 &&
                        <Carousel className="flex flex-row items-center">
                            <CarouselPrevious />
                            <CarouselContent className="flex-grow px-4">
                            {
                                data.map((teamMember : teamMember_type | z.infer<typeof teamMemberSchema>) => (
                                    <button
                                        onClick={() => handleClick(teamMember.id)}
                                        className={cn(
                                            "relative flex-none mr-3 w-28 h-28 rounded-full", 
                                            teamMember.image == undefined ? "bg-primary text-primary-foreground" : "",
                                            selectedTeamMember != undefined && teamMember.id == selectedTeamMember.id ? "" : "opacity-50")}
                                        key={teamMember.id}>
                                        {teamMember.image != undefined
                                            ? <Image src={teamMember.image.url} alt={teamMember.name} objectFit="cover" fill={true} className="rounded-full" />
                                            : <span>{teamMember.name.split(" ").map(word => word.charAt(0).toUpperCase()).join("")}</span>
                                        }
                                    </button>
                                ))
                            }
                            </CarouselContent>
                            <CarouselNext />
                        </Carousel>
                    }
                    <DialogFooter>
                        <Button 
                            className="w-full"
                            variant="link"
                            onClick={escape_key}>
                                Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
      )
}
