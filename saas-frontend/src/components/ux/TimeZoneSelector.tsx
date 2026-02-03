'use client';

import { listCountries, listTimeZones } from "@/lib/functions";
import { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl } from "../ui/form";
import { Input } from "../ui/input";
import { useEffect } from "react";
import { z } from "zod";
import ComboBox from "./ComboBox";

type Props = {
    form: UseFormReturn<any>,
    fieldNames: { control: "country" | "timezone", fieldName: string }[]
}

export const CountrySchema = z.object({
    code: z.string(),
    name: z.string()
})

export const TimezoneSchema = z.object({
    id: z.string(),
    name: z.string()
})

const TimeZoneSelector : React.FC<Props> = (props) => {
    if (props.fieldNames.length != 2) throw new Error("fieldNames must list country and timezone");

    const countryField = props.fieldNames.find((field) => field.control == "country");
    const timezoneField = props.fieldNames.find((field) => field.control == "timezone");

    if (countryField == null || timezoneField == null) throw new Error("fieldNames must list country and timezone");

    const values = props.form.getValues();

    useEffect(() => {
        props.form.watch(countryField.fieldName);
    }, [props.form, countryField.fieldName])

    return (
        <div className="grid grid-cols-2 space-x-2">
        <FormField
            name={countryField.fieldName}
            render={({field}) => {
                return (
                    <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                            <ComboBox
                                {...field}
                                withSearch={true}
                                fieldMapping={{
                                    keyColumn: "code",
                                    labelColumn: "name"
                                }}
                                items={listCountries()}
                            />
                        </FormControl>
                    </FormItem>
                )
            }} />
        <FormField
            name={timezoneField.fieldName}
            render={({field}) => {
                return (
                    <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                            {values[countryField.fieldName]
                                == null ? <Input disabled={true} /> :
                                <ComboBox
                                    {...field}
                                    withSearch={true}
                                    fieldMapping={{
                                        keyColumn: "id",
                                        labelColumn: "name"
                                    }}
                                    items={listTimeZones(values[countryField.fieldName].code)} />
                                }
                        </FormControl>
                    </FormItem>
                )
            }} />
        </div>
    )
}

export default TimeZoneSelector;