'use client';

import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/ui/email-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import RatingStarVisualizerComponent from "@/components/ui/ratingstar";
import { Camera, Upload } from "lucide-react";

type QuestionType =
    | "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT"
    | "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN"
    | "DATE" | "NUMBER" | "EMAIL" | "RATING" | "LINEAR_SCALE" | "YES_NO"
    | "PHONE" | "TIME" | "PHOTO";

export type QuestionnaireQuestion = {
    id: string;
    question: string;
    type: QuestionType;
    required: boolean;
    options?: string[];
    description?: string;
    scaleMax?: number;
    placeholder?: string;
};

type QuestionnaireResponses = Record<string, string | string[]>;

type Props = {
    questions: QuestionnaireQuestion[];
    responses: QuestionnaireResponses;
    onResponseChange: (questionId: string, value: string | string[]) => void;
};

export default function QuestionnaireRenderer({ questions, responses, onResponseChange }: Props) {
    return (
        <div className="space-y-4">
            {questions.map((q) => (
                <QuestionField
                    key={q.id}
                    question={q}
                    value={responses[q.id]}
                    onChange={(value) => onResponseChange(q.id, value)}
                />
            ))}
        </div>
    );
}

function QuestionField({
    question: q,
    value,
    onChange,
}: {
    question: QuestionnaireQuestion;
    value: string | string[] | undefined;
    onChange: (value: string | string[]) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stringValue = (typeof value === 'string' ? value : '') as string;
    const arrayValue = (Array.isArray(value) ? value : []) as string[];

    return (
        <div className="space-y-2">
            <Label htmlFor={q.id}>
                {q.question}
                {q.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {q.description && (
                <p className="text-sm text-muted-foreground">{q.description}</p>
            )}

            {/* Short text inputs */}
            {(q.type === "TEXT" || q.type === "SHORT_TEXT") && (
                <Input
                    id={q.id}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    placeholder={q.placeholder}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Long text inputs */}
            {(q.type === "TEXTAREA" || q.type === "LONG_TEXT") && (
                <Textarea
                    id={q.id}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    placeholder={q.placeholder}
                    rows={4}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Single select dropdown */}
            {(q.type === "SELECT" || q.type === "DROPDOWN") && q.options && (
                <Select
                    value={stringValue}
                    onValueChange={(v) => onChange(v)}
                >
                    <SelectTrigger id={q.id} data-testid={`questionnaire-${q.id}`}>
                        <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                        {q.options.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Multi-select checkboxes */}
            {(q.type === "MULTISELECT" || q.type === "CHECKBOXES") && q.options && (
                <div className="space-y-2">
                    {q.options.map((option) => (
                        <div key={option} className="flex items-center gap-2">
                            <Checkbox
                                id={`${q.id}-${option}`}
                                checked={arrayValue.includes(option)}
                                onCheckedChange={(checked) => {
                                    const updated = checked
                                        ? [...arrayValue, option]
                                        : arrayValue.filter(x => x !== option);
                                    onChange(updated);
                                }}
                                data-testid={`questionnaire-${q.id}-${option}`}
                            />
                            <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                                {option}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            {/* Multiple choice (radio-style — single selection) */}
            {q.type === "MULTIPLE_CHOICE" && q.options && (
                <div className="space-y-2">
                    {q.options.map((option) => (
                        <div key={option} className="flex items-center gap-2">
                            <input
                                type="radio"
                                id={`${q.id}-${option}`}
                                name={q.id}
                                value={option}
                                checked={stringValue === option}
                                onChange={() => onChange(option)}
                                className="h-4 w-4 text-indigo-600"
                                data-testid={`questionnaire-${q.id}-${option}`}
                            />
                            <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                                {option}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            {/* Date */}
            {q.type === "DATE" && (
                <Input
                    id={q.id}
                    type="date"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Number */}
            {q.type === "NUMBER" && (
                <Input
                    id={q.id}
                    type="number"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    placeholder={q.placeholder || "0"}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Email */}
            {q.type === "EMAIL" && (
                <EmailInput
                    id={q.id}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    placeholder={q.placeholder || "email@example.com"}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Phone */}
            {q.type === "PHONE" && (
                <Input
                    id={q.id}
                    type="tel"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    placeholder={q.placeholder || "+1 (555) 000-0000"}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Time */}
            {q.type === "TIME" && (
                <Input
                    id={q.id}
                    type="time"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    required={q.required}
                    data-testid={`questionnaire-${q.id}`}
                />
            )}

            {/* Star Rating */}
            {q.type === "RATING" && (
                <div data-testid={`questionnaire-${q.id}`}>
                    <RatingStarVisualizerComponent
                        starSize={28}
                        value={stringValue ? parseInt(stringValue) : 0}
                        onSelect={(rating) => onChange(String(rating))}
                    />
                </div>
            )}

            {/* Linear Scale */}
            {q.type === "LINEAR_SCALE" && (
                <div className="space-y-2" data-testid={`questionnaire-${q.id}`}>
                    <Slider
                        value={[stringValue ? parseInt(stringValue) : 1]}
                        onValueChange={([v]) => onChange(String(v))}
                        min={1}
                        max={q.scaleMax || 10}
                        step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>{stringValue || "—"}</span>
                        <span>{q.scaleMax || 10}</span>
                    </div>
                </div>
            )}

            {/* Yes/No */}
            {q.type === "YES_NO" && (
                <div className="flex items-center gap-3" data-testid={`questionnaire-${q.id}`}>
                    <Switch
                        checked={stringValue === "Yes"}
                        onCheckedChange={(checked) => onChange(checked ? "Yes" : "No")}
                    />
                    <span className="text-sm">{stringValue || "No"}</span>
                </div>
            )}

            {/* Photo Upload */}
            {q.type === "PHOTO" && (
                <div data-testid={`questionnaire-${q.id}`}>
                    {stringValue ? (
                        <div className="relative">
                            <img
                                src={stringValue}
                                alt="Uploaded photo"
                                className="max-h-48 rounded-lg border object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <Camera className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-500">Click to upload a photo</p>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    onChange(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
