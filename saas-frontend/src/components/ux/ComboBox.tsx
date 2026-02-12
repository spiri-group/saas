'use client';

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { ChevronsUpDown, Check, Search, KeyboardIcon } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import React from "react"
import { Input } from "../ui/input";
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";

interface ComboBoxProps<T> {
    className?: string,
    disabled?: boolean,
    name?: string,
    items: T[],
    value?: T | undefined | null,
    defaultOpen?: boolean,
    onChange: (item: T) => void,
    placeholder?: string,
    objectName?: string,
    actionVerb?: string,
    withSearch?: boolean,
    fieldMapping?: {
        labelColumn: string,
        keyColumn: string
    },
    createItem?: (value: string) => void,
    actionOnNoResults?: (searchTerm: string) => void,
    actionOnNoResultsLabel?: string,
    actionOnBackSpaceNoResults?: () => void,
    "data-testid"?: string
}

const ComboBox = <T,>({ objectName, placeholder, actionVerb, items, fieldMapping, onChange, withSearch = false, name, value, ...props } : ComboBoxProps<T>) => {

    const [open, setOpen] = React.useState(false);
        
    if (fieldMapping == null && items.length >0 && typeof items[0] == "object") {
        throw new Error("fieldMapping must be defined for object items")
    }
    if (fieldMapping != null && (fieldMapping.labelColumn == null || fieldMapping.keyColumn == null)) throw new Error("fieldMapping must have both labelColumn and keyColumn")

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [buttonWidth, setButtonWidth] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        if (buttonRef.current != null) {
            setButtonWidth(buttonRef.current.offsetWidth);
        }
    }, [buttonRef]);

    useEffect(() => {
        if (props.defaultOpen && isNullOrUndefined(value)) {
            setOpen(true);
            if (inputRef.current != null) {
                setTimeout(() => {
                    inputRef.current!.focus();
                }, 0);
            }
        }
    }, [props.defaultOpen, withSearch]);

    const filteredItems = !isNullOrWhitespace(searchTerm) ? items.filter((item) => {
         if (fieldMapping != null) {
            return item[fieldMapping.labelColumn].toLowerCase().includes(searchTerm.toLowerCase())
         } else {
            return (item as string).includes(searchTerm.toLowerCase())
         }
    }) : items;

    // Function to handle Enter key press when there's only one item
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        
        if (event.key === "Backspace") {
            if (searchTerm.length === 0) {
                if (props.actionOnBackSpaceNoResults) {
                    props.actionOnBackSpaceNoResults()
                    setOpen(false);
                }
            }
        }

        if (event.key === "Enter" && filteredItems.length === 0) {
            if (props.actionOnNoResults) {
                props.actionOnNoResults(searchTerm)
                setOpen(false);
            }
        }

        if (event.key == "Enter" && filteredItems.length == 1) {
            onChange(filteredItems[0])
            setOpen(false)
        }
    };

    const placeholder_string = placeholder ? placeholder : `Select ${actionVerb == null || actionVerb == undefined ? "" : actionVerb}${objectName == null || objectName == undefined ? name : objectName }`

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger aria-label={`${props["aria-label"]}-trigger`} asChild >
                <Button
                    ref={buttonRef}
                    disabled={props.disabled}
                    variant="outline"
                    role="combobox"
                    data-testid={props["data-testid"]}
                    className={cn(
                        "w-full justify-between text-foreground",
                        !value && "text-muted-foreground",
                        props.className
                    )}
                >   
                    <span className="truncate pr-3 text-inherit">
                    {!isNullOrUndefined(value) ? 
                        (fieldMapping != null ? value[fieldMapping.labelColumn] : value) 
                        : placeholder_string }
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={0} className="w-full mt-2 max-h-[300px] overflow-y-auto p-0 pb-3" style={{ width: buttonWidth ?? "auto" }}>
                <Command>
                    { withSearch && (
                        <>
                        <div className="flex flex-rows items-center p-2 border-b border-input">
                            <Search className="flex-none h-4 w-4 mr-2 opacity-50" />
                            <Input
                                className="focus-visible:ring-0 rounded-md"
                                aria-label={`${props["aria-label"]}-search`}
                                data-testid={props["data-testid"] ? `${props["data-testid"].replace('-trigger', '')}-search` : undefined}
                                placeholder={`Search ...`}
                                ref={inputRef}
                                onKeyDown={handleKeyDown}
                                onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {filteredItems.length == 0 && (
                            <CommandEmpty aria-label={`${props["aria-label"]}-no-results`}>
                                No results found
                                {props.createItem && (
                                    <Button variant="link" className="text-wrap mt-2 pb-1" onClick={() => {
                                        if (props.createItem) props.createItem(searchTerm);
                                        setOpen(false);
                                    }}>Click or press enter to Add New</Button>
                                )}
                                {props.actionOnNoResults && 
                                 props.actionOnNoResultsLabel && (
                                    <Button variant="link" className="text-wrap mt-2 pb-1" onClick={() => {
                                        props.actionOnNoResults!(searchTerm);
                                        setOpen(false);
                                    }}>{props["aria-label"]}</Button>
                                )}
                                {props.actionOnNoResults && !props["aria-label"] && (
                                    <span className="text-red-500 mt-2">Error: No label provided for actionOnNoResults</span>
                                )}
                            </CommandEmpty>
                        )}
                        </>
                    )}
                    <CommandGroup aria-label={`${props["aria-label"]}-results`}>
                        {filteredItems.length > 0 && withSearch && (
                        <div className="flex flex-row items-center mb-2">
                            <KeyboardIcon className="flex-none ml-2 mr-2 h-4 w-4 opacity-50" />
                            <span className="opacity-80">Enter to select</span>
                        </div>
                        )}
                        {filteredItems.map((item) => {
                            const selected = 
                            isNullOrUndefined(value) ? false :
                                (fieldMapping != null 
                                    ? value != null && value[fieldMapping.keyColumn] == item[fieldMapping.keyColumn] 
                                    : value != null && value == item)
                            const itemKey = fieldMapping != null ? item[fieldMapping.keyColumn] : item;
                            return (
                            <CommandItem
                                tabIndex={withSearch ? undefined : 0}
                                aria-label={`${props["aria-label"]}-result`}
                                data-testid={props["data-testid"] ? `${props["data-testid"].replace('-trigger', '')}-result` : undefined}
                                title={`${props["aria-label"]}-${itemKey}`}
                                value={fieldMapping != null ? item[fieldMapping.keyColumn] : item }
                                key={itemKey}
                                onSelect={() => {
                                    onChange(item)
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selected ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {fieldMapping != null ? item[fieldMapping.labelColumn] : item}
                            </CommandItem>
                            )
                    })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}   
ComboBox.displayName = "Combobox"

export default ComboBox;