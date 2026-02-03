import classNames from "classnames"
import { FormControl } from "./form"
import { UseFormReturn } from "react-hook-form"
import { Check } from "lucide-react"
import React from "react"

type Props<T> = {
    form: UseFormReturn<any>
    items: T[],
    field: { value: any | any[], name: any },
    fieldMapping?: {
        labelColumn: string,
        keyColumn: string
    }
}

function cardselector<T>(): React.FC<Props<T>> {
    const Component = ({ form, items, field, fieldMapping }) => {
        return (
            <FormControl>
                <div className="flex flex-row space-x-3">
                    {items.map((item) => {
                        const isSelected = fieldMapping != null ? field.value?.includes(item[fieldMapping.keyColumn]) : field.value?.includes(item)
                        return (
                            <div
                                key={fieldMapping != null ? item[fieldMapping.keyColumn] : item}
                                onClick={() => {
                                    if (fieldMapping != null) {
                                        if (field.value == null) {
                                            form.setValue(field.name, [item[fieldMapping.keyColumn]])
                                        } else {
                                            if (field.value.includes(item[fieldMapping.keyColumn])) {
                                                form.setValue(field.name, field.value.filter((value) => value != item[fieldMapping.keyColumn]))
                                            } else {
                                                form.setValue(field.name, [...field.value, item[fieldMapping.keyColumn]])
                                            }
                                        }
                                    } else {
                                        if (field.value == null) {
                                            form.setValue(field.name, [item])
                                        } else {
                                            if (field.value.includes(item)) {
                                                form.setValue(field.name, field.value.filter((value) => value != item))
                                            } else {
                                                form.setValue(field.name, [...field.value, item])
                                            }
                                        }
                                    }

                                }} 
                                className={classNames("cursor-pointer group items-center flex flex-row space-x-3 rounded-md p-4 group-hover:bg-opacity-20", field.value != null && isSelected ? "bg-accent text-white" : "border border-inactive")}>
                                <div className={classNames("flex-none h-8 w-8 rounded-full bg-white")}>
                                   {field.value != null && isSelected && <Check className={classNames("h-8 w-8 p-2 text-accent")} /> }
                                </div>
                                <span>
                                {fieldMapping != null ?
                                    item[fieldMapping.labelColumn]
                                    :
                                    item
                                }
                                </span>
                            </div>
                        )

                    })}
                </div>
            </FormControl>
        )
    }
    return Component
}

export default cardselector