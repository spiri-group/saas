'use client'

import React from "react"
import UseCaseCategory from "../../../../../../../components/HelpRequest/hooks/UseCaseCategory";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { case_type, choice_option_type, recordref_type } from "@/utils/spiriverse";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { groupBy } from "@/lib/functions";
import { cn } from "@/lib/utils";
import AvailableCase from "./components/AvailableCase";
import UseAvailableCases, { UseAvailableCasesFilter } from "./hooks/UseAvailableCases";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import ComboBox from "@/components/ux/ComboBox";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselScrollToTop } from "@/components/ux/Carousel";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

//TODO: fix clicking the collapsible for testing

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
    className?: string,
    onSelect: (selected: recordref_type) => void,
    onTriggerClicked: () => void
}

const useBL = () => {

    const casesFilter = UseAvailableCasesFilter();
    const availableCases_query = UseAvailableCases(casesFilter.appliedFilters.religion?.id);
    const categories = UseCaseCategory()
    const groupedCases = groupBy<choice_option_type, case_type>(availableCases_query.data ?? [], (item) => item.category)

    return {
        filter: casesFilter,
        availableCases_query: {
            isLoading: availableCases_query.isLoading,
            get: availableCases_query.data ?? [],
            grouped: groupedCases
        },
        categories: categories.data ?? []
    }
}

const AvailableCases : React.FC<Props> = (props) => {
    const bl = useBL()

    return (   
        <Panel className={cn("flex flex-col", props.className)}>
            <PanelHeader>
                <PanelTitle>Available Help Requests</PanelTitle>
                <div className="flex flex-row space-x-1">
                <Popover>
                    <PopoverTrigger asChild className="my-3">
                        <Button type="button" className="w-full"> 
                            {bl.filter.appliedFiltersCount > 0 ? bl.filter.appliedFiltersCount : '' } Filter{bl.filter.appliedFiltersCount > 1 ? 's' : '' } 
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                        <span> Filter by </span>
                        <Form {...bl.filter.form}>
                            <form className={cn("flex flex-col space-y-4 mt-3", props.className)} onSubmit={bl.filter.form.handleSubmit(bl.filter.saveFilters)}>
                                <FormField 
                                    name="religion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <ComboBox
                                                    {...field}
                                                    withSearch={true}
                                                    items={bl.filter.options.religions || []}
                                                    fieldMapping={{
                                                        keyColumn: "id",
                                                        labelColumn: "defaultLabel"
                                                    }}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input {...field} 
                                                    type="number" 
                                                    withButtons={false}
                                                    placeholder="Zip Code" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                <Button className="flex mt-auto"> Confirm </Button>
                            </form>
                        </Form>
                    </PopoverContent>
                </Popover>
                {bl.filter.appliedFiltersCount > 0 ? (
                    <Button onClick={bl.filter.clear} className="my-3"> Clear </Button>
                ) : <></>}
                </div>
            </PanelHeader>
            <PanelContent className='min-h-0'>
            {bl.availableCases_query.isLoading ? (
                    <span className="text-xs">Loading...</span>
                ) : ( 
                    <Carousel 
                        orientation="vertical"
                        plugins={[WheelGesturesPlugin()]}
                        className="h-full min-h-0 space-y-2 flex flex-col">
                        <div className="flex flex-row space-x-3">
                            <CarouselScrollToTop style="RECTANGLE" className="flex-none w-12" />
                            <CarouselPrevious style="RECTANGLE" className="flex-grow" />
                        </div>
                        <CarouselContent outerClassName="flex-grow" className="flex-col space-y-2 h-full w-full">
                        {
                            bl.categories.map((category) => {
                                const cases = bl.availableCases_query.get.filter(x => x.category.id == category.id)
                                if (cases == undefined) throw `Somehow we have no cases for the category ${category.id}`
                                return (
                                    <CarouselItem key={category.id}>
                                        <Collapsible className="flex flex-col w-full">
                                            <CollapsibleTrigger asChild onClick={() => {
                                                props.onTriggerClicked()
                                            }}>
                                                <div className="flex flex-row items-center justify-between space-x-2">
                                                    <div className={cn("flex-none flex items-center justify-center h-8 w-8 rounded-full", cases.length == 0 ? "text-slate-400" : "bg-accent text-white")}>
                                                        {cases.length}
                                                    </div>
                                                    <Button variant="ghost" className="flex flex-row w-full p-2">
                                                        <span className="text-sm text-left flex-grow">{category.defaultLabel}</span>
                                                        { cases.length > 0 && <ChevronsUpDown className="h-4 w-4 flex-none" /> }
                                                    </Button>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="space-y-2 mt-2">
                                                <ul className="flex flex-col flex-grow space-y-2">
                                                    {cases.map((newCase) => {
                                                            return (
                                                                <li key={newCase.id}>
                                                                    <AvailableCase 
                                                                        merchantId={props.merchantId}
                                                                        case={newCase}
                                                                        onSelect={props.onSelect}                                                                 />
                                                                </li> 
                                                            )
                                                        })
                                                    }
                                                </ul>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </CarouselItem> 
                                )   
                            })
                        }
                        </CarouselContent>
                        <CarouselNext style="RECTANGLE" className="flex-none w-full" />
                    </Carousel>
                )}
            </PanelContent>
        </Panel>
    )
}

export default AvailableCases;