import React, { useState } from "react";
import { Control, useFieldArray, useWatch, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Trash2,
    Plus,
    AlignLeft,
    List,
    CheckSquare,
    Calendar,
    Hash,
    Mail,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    Eye,
    Minimize2,
    Maximize2,
    Star,
    MapPin,
    Camera,
    Heart,
    Activity,
    Sparkles,
    Layers,
    Package
} from "lucide-react";
import { BirthChartModule, defaultBirthChartData, INTAKE_MODULES } from "./IntakeModules";

// Question type definitions
export type QuestionType = 
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "MULTIPLE_CHOICE"
    | "CHECKBOXES"
    | "DROPDOWN"
    | "DATE"
    | "NUMBER"
    | "EMAIL";

export type QuestionOption = {
    id: string;
    label: string;
};

export type Question = {
    id: string;
    type: QuestionType;
    question: string;
    description?: string;
    required: boolean;
    options?: QuestionOption[]; // For multiple choice, checkboxes, dropdown
};

// Module enabled state type
export type EnabledModules = {
    birthChart?: boolean;
    currentLocation?: boolean;
    photoUpload?: boolean;
    relationshipInfo?: boolean;
    healthIntake?: boolean;
    spiritualBackground?: boolean;
    deckPreference?: boolean;
};

type QuestionBuilderProps = {
    control: Control<any>;
    name: string;
    enabledModules?: EnabledModules;
    onModuleToggle?: (moduleKey: keyof EnabledModules, enabled: boolean) => void;
    serviceCategory?: "READING" | "HEALING" | "COACHING";
    showModules?: boolean;
};

// Icon map for modules
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Star,
    MapPin,
    Camera,
    Heart,
    Activity,
    Sparkles,
    Layers,
};

const QUESTION_TYPES: Array<{ value: QuestionType; label: string; icon: React.ComponentType<any> }> = [
    { value: "SHORT_TEXT", label: "Short Text", icon: AlignLeft },
    { value: "LONG_TEXT", label: "Long Text (Paragraph)", icon: AlignLeft },
    { value: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: List },
    { value: "CHECKBOXES", label: "Checkboxes", icon: CheckSquare },
    { value: "DROPDOWN", label: "Dropdown", icon: ChevronDown },
    { value: "DATE", label: "Date", icon: Calendar },
    { value: "NUMBER", label: "Number", icon: Hash },
    { value: "EMAIL", label: "Email", icon: Mail },
];

// Map module types to field names
const MODULE_FIELD_MAP: Record<string, keyof EnabledModules> = {
    'BIRTH_CHART': 'birthChart',
    'CURRENT_LOCATION': 'currentLocation',
    'PHOTO_UPLOAD': 'photoUpload',
    'RELATIONSHIP_INFO': 'relationshipInfo',
    'HEALTH_INTAKE': 'healthIntake',
    'SPIRITUAL_BACKGROUND': 'spiritualBackground',
    'DECK_PREFERENCE': 'deckPreference',
};

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
    control,
    name,
    enabledModules,
    onModuleToggle,
    serviceCategory,
    showModules = true
}) => {
    const { fields, append, remove, move, update } = useFieldArray({
        control,
        name,
    });

    const questions = useWatch({ control, name }) as Question[] | undefined;
    const [allCollapsed, setAllCollapsed] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Get available modules based on service category
    const availableModules = INTAKE_MODULES.filter(m =>
        m.implemented && (!serviceCategory || m.category === serviceCategory || m.category === "ALL")
    );

    // Toggle a module on/off
    const toggleModule = (moduleType: string) => {
        const key = MODULE_FIELD_MAP[moduleType];
        if (key && onModuleToggle) {
            const currentValue = enabledModules?.[key] ?? false;
            onModuleToggle(key, !currentValue);
        }
    };

    const addQuestion = (type: QuestionType = "SHORT_TEXT") => {
        const newQuestion: Question = {
            id: `q_${Date.now()}`,
            type,
            question: "",
            description: "",
            required: false,
            options: type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN" 
                ? [
                    { id: `opt_${Date.now()}_1`, label: "Option 1" },
                    { id: `opt_${Date.now()}_2`, label: "Option 2" },
                ]
                : undefined,
        };
        append(newQuestion);
    };

    const moveUp = (index: number) => {
        if (index > 0) {
            move(index, index - 1);
        }
    };

    const moveDown = (index: number) => {
        if (index < fields.length - 1) {
            move(index, index + 1);
        }
    };

    const needsOptions = (type: QuestionType) => {
        return type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN";
    };

    const addOption = (questionIndex: number) => {
        const question = questions?.[questionIndex];
        if (!question || !question.options) return;

        const newOption: QuestionOption = {
            id: `opt_${Date.now()}`,
            label: `Option ${question.options.length + 1}`,
        };

        const updatedQuestion = {
            ...question,
            options: [...question.options, newOption],
        };
        
        update(questionIndex, updatedQuestion);
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const question = questions?.[questionIndex];
        if (!question || !question.options || question.options.length <= 2) return;

        const updatedQuestion = {
            ...question,
            options: question.options.filter((_, i) => i !== optionIndex),
        };
        
        update(questionIndex, updatedQuestion);
    };

    return (
        <div className="space-y-6">
            {/* Intake Modules Section */}
            {showModules && availableModules.length > 0 && (
                <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <CardTitle className="text-lg">Intake Modules</CardTitle>
                        </div>
                        <CardDescription>
                            Add specialized data collection modules to your questionnaire.
                            Enable multiple modules to gather different types of information from clients.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableModules.map((module) => {
                                const IconComponent = MODULE_ICONS[module.icon] || Star;
                                const key = MODULE_FIELD_MAP[module.type];
                                const isEnabled = key ? enabledModules?.[key] ?? false : false;

                                return (
                                    <div
                                        key={module.type}
                                        className={`
                                            flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                            ${isEnabled
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'}
                                        `}
                                        onClick={() => toggleModule(module.type)}
                                    >
                                        <Checkbox
                                            checked={isEnabled}
                                            onCheckedChange={() => toggleModule(module.type)}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <IconComponent className={`h-4 w-4 ${isEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`} />
                                                <span className={`font-medium ${isEnabled ? 'text-purple-900 dark:text-purple-100' : ''}`}>
                                                    {module.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {module.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Custom Questions Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Custom Questions</h3>
                    <p className="text-sm text-muted-foreground">
                        Ask clients additional questions before their session
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    {fields.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAllCollapsed(!allCollapsed)}
                        >
                            {allCollapsed ? (
                                <><Maximize2 className="h-4 w-4 mr-2" />Expand All</>
                            ) : (
                                <><Minimize2 className="h-4 w-4 mr-2" />Collapse All</>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {fields.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No questions yet</p>
                    <Button type="button" onClick={() => addQuestion()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Question
                    </Button>
                </div>
            )}

            {fields.map((field, index) => {
                const question = questions?.[index];
                if (!question) return null;

                const Icon = QUESTION_TYPES.find(t => t.value === question.type)?.icon || AlignLeft;

                return (
                    <Card 
                        key={field.id}
                        className="transition-all"
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                {/* Move Up/Down Buttons */}
                                <div className="flex flex-col gap-1 mt-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => moveUp(index)}
                                        disabled={index === 0}
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => moveDown(index)}
                                        disabled={index === fields.length - 1}
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex-grow">
                                    {!allCollapsed ? (
                                        <div className="space-y-3">
                                            <div>
                                                <Label>Question Text *</Label>
                                                <Controller
                                                    control={control}
                                                    name={`${name}.${index}.question`}
                                                    render={({ field: questionField }) => (
                                                        <Input
                                                            {...questionField}
                                                            placeholder="e.g., What area of life would you like guidance on?"
                                                            data-testid={`question-text-input-${index}`}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <Label>Description (optional)</Label>
                                                <Controller
                                                    control={control}
                                                    name={`${name}.${index}.description`}
                                                    render={({ field: descField }) => (
                                                        <Textarea
                                                            {...descField}
                                                            value={descField.value || ""}
                                                            placeholder="Add helper text or instructions..."
                                                            rows={2}
                                                            data-testid={`question-description-input-${index}`}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <Label>Question Type</Label>
                                                <Select
                                                    value={question.type}
                                                    onValueChange={(value: QuestionType) => {
                                                        const updatedQuestion: Question = {
                                                            ...question,
                                                            type: value,
                                                        };
                                                        
                                                        // Add default options if switching to a type that needs them
                                                        if (needsOptions(value) && !question.options) {
                                                            updatedQuestion.options = [
                                                                { id: `opt_${Date.now()}_1`, label: "Option 1" },
                                                                { id: `opt_${Date.now()}_2`, label: "Option 2" },
                                                            ];
                                                        }
                                                        
                                                        update(index, updatedQuestion);
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {QUESTION_TYPES.map((type) => {
                                                            const TypeIcon = type.icon;
                                                            return (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    <div className="flex items-center">
                                                                        <TypeIcon className="h-4 w-4 mr-2" />
                                                                        {type.label}
                                                                    </div>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Options for multiple choice, checkboxes, dropdown */}
                                            {needsOptions(question.type) && question.options && (
                                                <div className="space-y-2">
                                                    <Label>Options</Label>
                                                    {question.options.map((option, optionIndex) => (
                                                        <div key={option.id} className="flex items-center gap-2">
                                                            <Controller
                                                                control={control}
                                                                name={`${name}.${index}.options.${optionIndex}.label`}
                                                                render={({ field: optionField }) => (
                                                                    <Input
                                                                        {...optionField}
                                                                        placeholder={`Option ${optionIndex + 1}`}
                                                                        data-testid={`question-${index}-option-${optionIndex}-input`}
                                                                    />
                                                                )}
                                                            />
                                                            {question.options!.length > 2 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeOption(index, optionIndex)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addOption(index)}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Option
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    checked={question.required}
                                                    onCheckedChange={(checked) => {
                                                        update(index, {
                                                            ...question,
                                                            required: !!checked,
                                                        });
                                                    }}
                                                />
                                                <Label className="font-normal">Required question</Label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 py-2">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {question.question || <span className="text-muted-foreground italic">Untitled Question</span>}
                                            </span>
                                            {question.required && (
                                                <span className="text-xs text-red-500">*</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Delete Button */}
                                <div className="flex items-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                );
            })}

            {fields.length > 0 && (
                <Button type="button" variant="outline" onClick={() => addQuestion()} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                </Button>
            )}

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Client Preview - Intake Form</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 p-4">
                        <p className="text-sm text-muted-foreground">
                            This is how your intake form will appear to clients when they book a session.
                        </p>

                        {/* Preview enabled modules */}
                        {enabledModules?.birthChart && (
                            <BirthChartModule
                                value={defaultBirthChartData}
                                onChange={() => {}}
                                disabled={true}
                                showDescription={true}
                            />
                        )}

                        {/* Custom questions preview */}
                        {questions && questions.length > 0 ? (
                            questions.map((q, idx) => (
                                <div key={q.id} className="space-y-2">
                                    <Label>
                                        {idx + 1}. {q.question}
                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {q.description && (
                                        <p className="text-sm text-muted-foreground">{q.description}</p>
                                    )}
                                    
                                    {/* Preview input based on type */}
                                    {q.type === "SHORT_TEXT" && (
                                        <Input placeholder="Client's answer..." disabled />
                                    )}
                                    {q.type === "LONG_TEXT" && (
                                        <Textarea placeholder="Client's answer..." rows={3} disabled />
                                    )}
                                    {q.type === "MULTIPLE_CHOICE" && q.options && (
                                        <div className="space-y-2">
                                            {q.options.map((opt) => (
                                                <div key={opt.id} className="flex items-center space-x-2">
                                                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                                    <span>{opt.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {q.type === "CHECKBOXES" && q.options && (
                                        <div className="space-y-2">
                                            {q.options.map((opt) => (
                                                <div key={opt.id} className="flex items-center space-x-2">
                                                    <Checkbox disabled />
                                                    <span>{opt.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {q.type === "DROPDOWN" && q.options && (
                                        <Select disabled>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an option..." />
                                            </SelectTrigger>
                                        </Select>
                                    )}
                                    {q.type === "DATE" && (
                                        <Input type="date" disabled />
                                    )}
                                    {q.type === "NUMBER" && (
                                        <Input type="number" placeholder="0" disabled />
                                    )}
                                    {q.type === "EMAIL" && (
                                        <Input type="email" placeholder="email@example.com" disabled />
                                    )}
                                </div>
                            ))
                        ) : null}

                        {/* Empty state - no modules or questions */}
                        {!enabledModules?.birthChart && (!questions || questions.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">
                                No intake modules or questions added yet
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QuestionBuilder;
