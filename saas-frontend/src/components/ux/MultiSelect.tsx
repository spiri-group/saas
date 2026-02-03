'use client';

import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { X } from "lucide-react";
import React from "react";
import { Badge } from "../ui/badge";
import { Command as CommandPrimitive } from "cmdk";

interface ComboBoxProps<T> {
    "aria-label"?: string,
    className?: string,
    name?: string,
    items: T[],
    value: T[],
    onChange: (items: T[]) => void,
    objectName?: string,
    fieldMapping?: {
        labelColumn: string,
        keyColumn: string
    },
    includeAllOnOption?: boolean // Add new parameter
}

const MultiSelectComboBox = <T,>({ objectName, items, fieldMapping, onChange, value, includeAllOnOption } : ComboBoxProps<T>) => {

    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
        
    if (fieldMapping == null && items.length > 0 && typeof items[0] == "object") {
        throw new Error("fieldMapping must be defined for object items");
    }
    if (fieldMapping != null && (fieldMapping.labelColumn == null || fieldMapping.keyColumn == null)) {
        throw new Error("fieldMapping must have both labelColumn and keyColumn");
    }

    const matches = (a: T, b: T) => {
        if (fieldMapping != null) {
            return a[fieldMapping.labelColumn].toLowerCase().includes(b[fieldMapping.labelColumn].toLowerCase());
        }

        return a == b;
    }

    const selected: T[] = value == null || items.length == 0 ? [] : value.map((item: T) => {
        if (fieldMapping != null) {
            const record = items.find((i) => matches(i, item))
            if (record == null) throw new Error(`Could not find record with key ${item}`)
            return record as T
        }
        return item as T
    });
    const selectables = items.filter(item => !selected.some(s => matches(s, item)));

    const handleSelect = (item: T) => {
        setInputValue("")
        onChange([...value ?? [], item])
    };

    const handleUnselect = (item: T) => {
        setInputValue("")
        onChange(value.filter(i => !matches(i, item)))
    };

    const handleSelectAll = () => {
        setInputValue("");
        onChange(items);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current
        if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
            if (input.value === "") {
                handleUnselect(selected[selected.length - 1])
            }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
            input.blur();
        }
        }
    };

    return (
        <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
            <div className="group border w-full border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex gap-1 flex-wrap">
                {selected.map((item: T) => {
                    const {key, label} = {
                        key: fieldMapping != null ? item[fieldMapping.keyColumn] : item,
                        label: fieldMapping != null ? item[fieldMapping.labelColumn] : item,
                    }
                    return (
                    <Badge key={key} variant={"default"} 
                        onClick={() => handleUnselect(item)}
                        className="bg-accent cursor-pointer text-accent-foreground">
                        {label}
                        <button
                        type="button"
                        title={"Remove " + label}
                        name={"Remove " + label}
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleUnselect(item);
                            }
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        >
                        <X className="h-3 w-3 text-accent-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                    )
                })}
                {/* Avoid having the "Search" Icon */}
                <CommandPrimitive.Input
                    ref={inputRef}
                    value={inputValue}
                    onValueChange={setInputValue}
                    onBlur={() => setOpen(false)}
                    onFocus={() => setOpen(true)}
                    placeholder={selected.length > 0 ? "" : `${objectName == null || objectName == undefined ? '' : objectName }`}
                    className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                />
                </div>
            </div>
            <div className="relative mt-2">
                {open && selectables.length > 0 ? (
                    <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandGroup className="h-full overflow-auto">
                            {includeAllOnOption && (
                                <CommandItem
                                    className="cursor-pointer text-accent px-3 text-sm"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onSelect={handleSelectAll}
                                >
                                    All
                                </CommandItem>
                            )}
                            {selectables.map((item) => {
                                const { key, label } = {
                                    key: fieldMapping != null ? item[fieldMapping.keyColumn] : item,
                                    label: fieldMapping != null ? item[fieldMapping.labelColumn] : item,
                                };
                                return (
                                    <CommandItem
                                        key={key}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onSelect={() => {
                                            handleSelect(item);
                                        }}
                                        className={"cursor-pointer px-3 text-sm"}
                                    >
                                        {label}
                                    </CommandItem>
                                );
                            })}
                            <CommandItem
                                className="cursor-pointer text-primary px-3 text-sm pb-2"
                                onSelect={() => {
                                    setOpen(false);
                                }}
                            >
                                Close
                            </CommandItem>
                        </CommandGroup>
                    </div>
                ) : null}
            </div>
        </Command>
    );
};   

MultiSelectComboBox.displayName = "MultiSelectComboBox";

export default MultiSelectComboBox;