"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { UseFormReturn } from "react-hook-form";
import { FormControl } from "./form";

type multiselectProps<T> = {
    form: UseFormReturn<any>,
    field: { value: string[], name: any },
    onSelect?: (item: T) => void,
    objectName?: string,
    items: T[],
    fieldMapping?: {
        labelColumn: string,
        keyColumn: string
    }
}

function Multiselect<T>(): React.FC<multiselectProps<T>> {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const component = ({ form, field, onSelect, items, fieldMapping, objectName }) => {

        const selected = field.value == null || items.length == 0 ? [] : field.value.map((item: string) => {
            if (fieldMapping != null) {
                const record = items.find((i) => i[fieldMapping.keyColumn] === item)
                if (record == null) throw new Error(`Could not find record with key ${item}`)
                return record as T
            }
            return item as T
        });
        const selectables = items.filter(item => !selected.some(s => s == item));

        const handleSelect = (item: T) => {
            const itemId = fieldMapping != null ? item[fieldMapping.keyColumn] : item
            setInputValue("")
            form.setValue(field.name, [...field.value ?? [], itemId])
            if (onSelect) {
                onSelect(item)
            }
        };

        const handleUnselect = (item: T) => {
            const itemId = fieldMapping != null ? item[fieldMapping.keyColumn] : item
            form.setValue(field.name, field.value.filter(item => item != itemId));
            form.clearErrors(field.name)
            if (onSelect) {
                onSelect(item)
            }
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
            <FormControl>
                <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
                    <div className="group border w-full border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <div className="flex gap-1 flex-wrap">
                        {selected.map((item: T) => {
                            const {key, label} = {
                                key: fieldMapping != null ? item[fieldMapping.keyColumn] : item,
                                label: fieldMapping != null ? item[fieldMapping.labelColumn] : item,
                            }
                            return (
                            <Badge key={key} variant={"default"} className="bg-accent">
                                {label}
                                <button
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
                                onClick={() => handleUnselect(item)}
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
                        {open && selectables.length > 0 ?
                        <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                            <CommandGroup className="h-full overflow-auto">
                            {selectables.map((item) => {
                                const {key, label} = {
                                    key: fieldMapping != null ? item[fieldMapping.keyColumn] : item,
                                    label: fieldMapping != null ? item[fieldMapping.labelColumn] : item,
                                }
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
                                    className={"cursor-pointer"}
                                >
                                    {label}
                                </CommandItem>
                                );
                            })}
                            <CommandItem
                                className="cursor-pointer text-primary"
                                onSelect={() => {
                                    setOpen(false);
                                }}
                            >
                                Close
                            </CommandItem>
                            </CommandGroup>
                        </div>
                        : null}
                    </div>
                </Command>
            </FormControl>
        );
    }
    component.displayName = "Multiselect";
    return component;
}

export default Multiselect;