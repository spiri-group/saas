'use client';

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, MapPin, Clock } from "lucide-react";

export type BirthChartData = {
    birthDate: string;
    birthTime: string;
    birthTimeUnknown: boolean;
    birthPlace: string;
    birthPlaceCoordinates?: {
        lat: number;
        lng: number;
    };
};

type BirthChartModuleProps = {
    value: BirthChartData;
    onChange: (data: BirthChartData) => void;
    disabled?: boolean;
    showDescription?: boolean;
};

/**
 * Birth Chart intake module for astrology and natal chart readings.
 * Collects birth date, time, and location for accurate chart calculations.
 */
const BirthChartModule: React.FC<BirthChartModuleProps> = ({
    value,
    onChange,
    disabled = false,
    showDescription = true
}) => {
    const handleChange = (field: keyof BirthChartData, fieldValue: string | boolean) => {
        onChange({
            ...value,
            [field]: fieldValue,
        });
    };

    return (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-lg">Birth Chart Information</CardTitle>
                </div>
                {showDescription && (
                    <CardDescription>
                        Your birth details are essential for creating an accurate natal chart reading.
                        The more precise your information, the more detailed your reading can be.
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Birth Date */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <span>Date of Birth</span>
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="date"
                        value={value.birthDate || ""}
                        onChange={(e) => handleChange("birthDate", e.target.value)}
                        disabled={disabled}
                        className="bg-white dark:bg-slate-900"
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>

                {/* Birth Time */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Time of Birth</span>
                    </Label>
                    <div className="flex items-center gap-4">
                        <Input
                            type="time"
                            value={value.birthTimeUnknown ? "" : (value.birthTime || "")}
                            onChange={(e) => handleChange("birthTime", e.target.value)}
                            disabled={disabled || value.birthTimeUnknown}
                            className="bg-white dark:bg-slate-900 flex-1"
                        />
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={value.birthTimeUnknown || false}
                                onChange={(e) => {
                                    handleChange("birthTimeUnknown", e.target.checked);
                                    if (e.target.checked) {
                                        handleChange("birthTime", "");
                                    }
                                }}
                                disabled={disabled}
                                className="rounded"
                            />
                            <span className="text-muted-foreground">Time unknown</span>
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        If you know the exact time, your reading will include Rising Sign and house placements.
                        Check the box if you don&apos;t know your birth time.
                    </p>
                </div>

                {/* Birth Place */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Place of Birth</span>
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="text"
                        placeholder="City, Country (e.g., Los Angeles, USA)"
                        value={value.birthPlace || ""}
                        onChange={(e) => handleChange("birthPlace", e.target.value)}
                        disabled={disabled}
                        className="bg-white dark:bg-slate-900"
                    />
                    <p className="text-xs text-muted-foreground">
                        Enter the city and country where you were born for accurate planetary positions.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default BirthChartModule;

/**
 * Default empty birth chart data
 */
export const defaultBirthChartData: BirthChartData = {
    birthDate: "",
    birthTime: "",
    birthTimeUnknown: false,
    birthPlace: "",
};

/**
 * Validates birth chart data
 */
export function validateBirthChartData(data: BirthChartData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.birthDate) {
        errors.push("Birth date is required");
    }

    if (!data.birthPlace) {
        errors.push("Birth place is required");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
