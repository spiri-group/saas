'use client';

import { Country, listCountries } from "@/lib/functions";
import ComboBox from "./ComboBox";
import React from "react";

const countries = listCountries();

import { z } from "zod";
export const CountrySchema = z.enum(
    countries.map((country) => country.code) as [string, ...string[]] // Assert as a non-empty tuple
);
type CountrySchema = z.infer<typeof CountrySchema>;

type Props = {
    withSearch?: boolean;
    placeholder?: string;
    defaultValue?: CountrySchema;
    onChange: (value: CountrySchema) => void;
    onlyInclude?: Country[];
}

const CountryInput: React.FC<Props> = ({ placeholder, defaultValue, onChange, onlyInclude, withSearch = true }) => {
    const scopedCountries = onlyInclude ? countries.filter((country) => onlyInclude?.includes(country)) : countries;

    const [selectedCountry, setSelectedCountry] = React.useState<Country | undefined | null>(
        defaultValue ? undefined : scopedCountries.find((country) => country.code === defaultValue) as Country | undefined
    );

    return (
        <ComboBox
            withSearch={withSearch}
            placeholder={placeholder || "Select a country"}
            items={scopedCountries}
            fieldMapping={{
                keyColumn: "code",
                labelColumn: "name",
            }}
            value={selectedCountry}
            onChange={(selected) => {
                if (onChange) {
                    onChange(selected.code);
                }
                setSelectedCountry(selected as Country);
            }}
        />
    )

};

export default CountryInput;