'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ux/Carousel";
import CopyButton from "@/components/ux/CopyButton";
import useDebounce from "@/components/ux/UseDebounce";
import { escape_key } from "@/lib/functions";
import { searchHsCodes } from "@/lib/services/harmonized-system";
import { HarmonizedSystemCode } from "@/lib/services/harmonized-system/types";
import { cn } from "@/lib/utils";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

type Props = {
    productName: string | null;
    defaultValue?: HarmonizedSystemCode | null;
    onChange: (value: HarmonizedSystemCode | null) => void;
    renderAsContent?: boolean; // If true, renders just content without Dialog wrapper
}

const HSCodePicker: React.FC<Props> = ({
    productName, defaultValue, onChange, renderAsContent = false
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedHSCode, setSelectedHSCode] = useState<HarmonizedSystemCode | null>(defaultValue ?? null)
    const [hsCodeList, setHsCodeList] = useState<HarmonizedSystemCode[]>([])

    const [searchValue, setSearchValue] = useState<string | null>(null)
    const debouncedSearchValue = useDebounce(searchValue ?? productName?.substring(0,5), 500)

    const gptPrompt = `You are a customs classification expert.

        Given a product name, your task is to determine the most accurate 6-digit Harmonized System (HS) code according to the World Customs Organization's standard HS codes.

        Respond with only the 6-digit HS code and a short description of the classification.

        If the product name is unclear, make the best reasonable guess based on typical usage. Do not invent non-existent codes.

        Output format (strict):
        HS Code: [6-digit code]
        Classification: [short classification description]

        Product Name: ${productName}
    `
    
    const googleQuery = `${productName} 6-digit harmonized system code`

    useEffect(() => {
        const fetchHsCodes = async () => {
            if (debouncedSearchValue) {
                try {
                    const codes = await searchHsCodes(debouncedSearchValue);
                    setHsCodeList(codes.map(code => code.item));
                } catch (error) {
                    console.error("Error fetching HS codes:", error);
                }
            } else {
                // Handle case when search value is empty or null
                console.log("No search value provided.");
            }
        };

        fetchHsCodes();
    }, [debouncedSearchValue])

    const button_string = selectedHSCode ? 
        `${selectedHSCode.formattedHsCode} : ${selectedHSCode.description.substring(0, 50)}` : "Select HS Code"

    // Always return a JSX element
    if (!productName) {
        return null;
    }

    // Content component (used inside a Dialog from parent)
    const pickerContent = (
        <>
            <div className="grid grid-cols-2 gap-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="default">GPT Prompt</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px]">
                       <p
                        dangerouslySetInnerHTML={{ __html: gptPrompt.replace(/\n/g, '<br />') }}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <CopyButton textToCopy={gptPrompt}>
                                Copy Prompt
                            </CopyButton>
                            <Button type="button" variant="link" onClick={escape_key}>Close</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="default">Google query</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                        <p>{googleQuery}</p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <CopyButton textToCopy={googleQuery}>
                                Copy Query
                            </CopyButton>
                            <Button type="button" variant="link" onClick={escape_key}>Close</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            <Input 
                type="text"
                value={searchValue || ""}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search HS Codes..."
                />
            <Carousel className="flex-grow min-h-0" orientation="vertical">
                <CarouselContent contentAsGrid outerClassName="flex-grow min-h-0" className="grid-cols-3 gap-3 grid-rows-auto">
                    {hsCodeList.map((code, index) => (
                        <CarouselItem className={cn("flex flex-col p-4 cursor-pointer", selectedHSCode == code ? "border border-primary rounded-xl" : "")} onClick={() => {
                            setSelectedHSCode(code)
                            onChange(code)
                        }} key={index}>
                            <span className="text-slate-500">{code.formattedHsCode}</span>
                            <span className="text-slate-900 text-sm">{code.description}</span> 
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button variant="outline" onClick={() => {
                        setSelectedHSCode(null)
                        onChange(null)
                        escape_key()
                    }}>Clear Selection</Button>
                    <Button onClick={() => {
                        setIsOpen(false)
                        onChange(selectedHSCode)
                        escape_key()
                    }}>Confirm and Close</Button>
                </div>
            </Carousel>
        </>
    )

    // Render as content only (when used inside another Dialog)
    if (renderAsContent) {
        return <div className="h-[600px] w-full flex flex-col space-y-3">{pickerContent}</div>
    }

    // Render with its own Dialog wrapper (legacy behavior)
    return (
        <Dialog open={isOpen}>
            <DialogTrigger className="w-full" asChild>
                <Button variant="outline" 
                    className={cn(selectedHSCode ? "" : "text-muted-foreground")}
                    onClick={() => setIsOpen(true)}>
                    <span className="truncate">{button_string}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="h-[600px] w-[900px] flex flex-col">
                <DialogTitle>HS Code Picker</DialogTitle>
                <div className="flex flex-col flex-grow space-y-3">
                    {pickerContent}
                </div>
            </DialogContent>
        </Dialog>
    )

}

export default HSCodePicker