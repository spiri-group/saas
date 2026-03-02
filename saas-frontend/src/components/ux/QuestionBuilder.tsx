import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Control, useFieldArray, useWatch, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import RatingStarVisualizerComponent from "@/components/ui/ratingstar";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    Eye,
    Minimize2,
    Maximize2,
    Package,
    GripVertical,
    Copy,
    Star,
    SlidersHorizontal,
    ToggleLeft,
    Phone,
    Clock,
} from "lucide-react";
import { getModulesForReadingType } from "./IntakeModules";

// Question type definitions
export type QuestionType =
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "MULTIPLE_CHOICE"
    | "CHECKBOXES"
    | "DROPDOWN"
    | "DATE"
    | "NUMBER"
    | "EMAIL"
    | "RATING"
    | "LINEAR_SCALE"
    | "YES_NO"
    | "PHONE"
    | "TIME";

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
    scaleMax?: number; // For LINEAR_SCALE
};

type QuestionBuilderProps = {
    control: Control<any>;
    name: string;
    dark?: boolean;
    readingType?: string;
};

const QUESTION_TYPES: Array<{ value: QuestionType; label: string; icon: React.ComponentType<any> }> = [
    { value: "SHORT_TEXT", label: "Short Text", icon: AlignLeft },
    { value: "LONG_TEXT", label: "Long Text", icon: AlignLeft },
    { value: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: List },
    { value: "CHECKBOXES", label: "Checkboxes", icon: CheckSquare },
    { value: "DROPDOWN", label: "Dropdown", icon: ChevronDown },
    { value: "DATE", label: "Date", icon: Calendar },
    { value: "NUMBER", label: "Number", icon: Hash },
    { value: "EMAIL", label: "Email", icon: Mail },
    { value: "RATING", label: "Star Rating", icon: Star },
    { value: "LINEAR_SCALE", label: "Linear Scale", icon: SlidersHorizontal },
    { value: "YES_NO", label: "Yes / No", icon: ToggleLeft },
    { value: "PHONE", label: "Phone", icon: Phone },
    { value: "TIME", label: "Time", icon: Clock },
];

// Sortable question card wrapper
function SortableQuestionCard({
    id,
    children,
}: {
    id: string;
    children: (dragHandleProps: Record<string, any>) => React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children({ ...attributes, ...listeners })}
        </div>
    );
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
    control,
    name,
    dark = false,
    readingType,
}) => {
    const { fields, append, remove, move, update } = useFieldArray({
        control,
        name,
    });

    const questions = useWatch({ control, name }) as Question[] | undefined;
    const [allCollapsed, setAllCollapsed] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [addPickerOpen, setAddPickerOpen] = useState(false);

    // Drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Get available modules for the current reading type
    const availableModules = getModulesForReadingType(readingType);

    // Prefill questions from a module
    const prefillFromModule = (moduleType: string) => {
        const module = availableModules.find(m => m.type === moduleType);
        if (!module) return;

        for (const pq of module.prefillQuestions) {
            const newQuestion: Question = {
                id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: pq.type,
                question: pq.question,
                description: pq.description || "",
                required: pq.required,
                options: pq.options ? [...pq.options] : undefined,
            };
            append(newQuestion);
        }
    };

    const addQuestion = (type: QuestionType = "SHORT_TEXT") => {
        const newQuestion: Question = {
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type,
            question: "",
            description: "",
            required: false,
            options: needsOptions(type)
                ? [
                    { id: `opt_${Date.now()}_1`, label: "Option 1" },
                    { id: `opt_${Date.now()}_2`, label: "Option 2" },
                ]
                : undefined,
            scaleMax: type === "LINEAR_SCALE" ? 10 : undefined,
        };
        append(newQuestion);
        setAddPickerOpen(false);
    };

    const duplicateQuestion = (index: number) => {
        const question = questions?.[index];
        if (!question) return;

        const duplicate: Question = {
            ...question,
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            options: question.options
                ? question.options.map(opt => ({
                    ...opt,
                    id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                }))
                : undefined,
        };
        append(duplicate);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((f) => f.id === active.id);
            const newIndex = fields.findIndex((f) => f.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                move(oldIndex, newIndex);
            }
        }
    };

    const needsOptions = (type: QuestionType) => {
        return type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN";
    };

    const addOption = (questionIndex: number) => {
        const question = questions?.[questionIndex];
        if (!question || !question.options) return;

        const newOption: QuestionOption = {
            id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

    // Type picker grid for "Add Question"
    const TypePickerContent = () => (
        <div className="grid grid-cols-2 gap-1.5 p-1">
            {QUESTION_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => addQuestion(type.value)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                            dark
                                ? "hover:bg-slate-700 text-slate-200"
                                : "hover:bg-slate-100 text-slate-700"
                        )}
                    >
                        <TypeIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span>{type.label}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">Pre-Session Questions</h3>
                        <p className="text-sm text-slate-400">
                            Ask clients questions before their session
                        </p>
                    </div>
                    {fields.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {fields.length} {fields.length === 1 ? "question" : "questions"}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {fields.length > 0 && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    for (let i = fields.length - 1; i >= 0; i--) {
                                        remove(i);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPreview(true)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </Button>
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
                        </>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {fields.length === 0 && (
                <div className={cn("text-center py-8 border-2 border-dashed rounded-lg", dark ? "border-slate-600" : "border-slate-300")}>
                    <p className="text-slate-400 mb-4">No questions yet</p>
                    <div className="flex items-center justify-center gap-3">
                        <Popover open={addPickerOpen} onOpenChange={setAddPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Question
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2" align="center">
                                <p className={cn("text-xs font-medium mb-2 px-2", dark ? "text-slate-400" : "text-slate-500")}>
                                    Choose a question type
                                </p>
                                <TypePickerContent />
                            </PopoverContent>
                        </Popover>
                        {availableModules.length > 0 && (
                            <Select
                                dark={dark}
                                onValueChange={(value) => prefillFromModule(value)}
                            >
                                <SelectTrigger className="w-auto gap-2">
                                    <Package className="h-4 w-4" />
                                    <SelectValue placeholder="Prefill with module" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModules.map((module) => (
                                        <SelectItem key={module.type} value={module.type}>
                                            <div className="flex flex-col">
                                                <span>{module.label}</span>
                                                <span className="text-xs text-slate-400">{module.prefillQuestions.length} questions</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            )}

            {/* Question cards with drag-and-drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field, index) => {
                        const question = questions?.[index];
                        if (!question) return null;

                        const typeConfig = QUESTION_TYPES.find(t => t.value === question.type);
                        const Icon = typeConfig?.icon || AlignLeft;

                        return (
                            <SortableQuestionCard key={field.id} id={field.id}>
                                {(dragHandleProps) => (
                                    <Card dark={dark} className="transition-all">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start gap-3">
                                                {/* Drag Handle */}
                                                <div className="flex flex-col items-center gap-1 mt-1">
                                                    <button
                                                        {...dragHandleProps}
                                                        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 flex-shrink-0"
                                                        tabIndex={-1}
                                                        type="button"
                                                    >
                                                        <GripVertical className="h-4 w-4" />
                                                    </button>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                                        Q{index + 1}
                                                    </Badge>
                                                </div>

                                                <div className="flex-grow">
                                                    {!allCollapsed ? (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <Label dark={dark}>Question Text *</Label>
                                                                <Controller
                                                                    control={control}
                                                                    name={`${name}.${index}.question`}
                                                                    render={({ field: questionField }) => (
                                                                        <Input
                                                                            {...questionField}
                                                                            dark={dark}
                                                                            placeholder="e.g., What area of life would you like guidance on?"
                                                                            data-testid={`question-text-input-${index}`}
                                                                        />
                                                                    )}
                                                                />
                                                            </div>

                                                            <div>
                                                                <Label dark={dark}>Description (optional)</Label>
                                                                <Controller
                                                                    control={control}
                                                                    name={`${name}.${index}.description`}
                                                                    render={({ field: descField }) => (
                                                                        <Textarea
                                                                            {...descField}
                                                                            dark={dark}
                                                                            value={descField.value || ""}
                                                                            placeholder="Add helper text or instructions..."
                                                                            rows={2}
                                                                            data-testid={`question-description-input-${index}`}
                                                                        />
                                                                    )}
                                                                />
                                                            </div>

                                                            <div>
                                                                <Label dark={dark}>Question Type</Label>
                                                                <Select dark={dark}
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

                                                                        // Add default scaleMax for LINEAR_SCALE
                                                                        if (value === "LINEAR_SCALE" && !question.scaleMax) {
                                                                            updatedQuestion.scaleMax = 10;
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
                                                                    <Label dark={dark}>Options</Label>
                                                                    {question.options.map((option, optionIndex) => (
                                                                        <div key={option.id} className="flex items-center gap-2">
                                                                            <Controller
                                                                                control={control}
                                                                                name={`${name}.${index}.options.${optionIndex}.label`}
                                                                                render={({ field: optionField }) => (
                                                                                    <Input
                                                                                        {...optionField}
                                                                                        dark={dark}
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

                                                            {/* Scale max config for LINEAR_SCALE */}
                                                            {question.type === "LINEAR_SCALE" && (
                                                                <div>
                                                                    <Label dark={dark}>Scale Maximum</Label>
                                                                    <Select dark={dark}
                                                                        value={String(question.scaleMax || 10)}
                                                                        onValueChange={(value) => {
                                                                            update(index, {
                                                                                ...question,
                                                                                scaleMax: parseInt(value, 10),
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {[5, 7, 10].map((n) => (
                                                                                <SelectItem key={n} value={String(n)}>
                                                                                    1 to {n}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    dark={dark}
                                                                    checked={question.required}
                                                                    onCheckedChange={(checked) => {
                                                                        update(index, {
                                                                            ...question,
                                                                            required: !!checked,
                                                                        });
                                                                    }}
                                                                />
                                                                <Label dark={dark} className="font-normal">Required question</Label>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Collapsed view */
                                                        <div className="flex items-center gap-2 py-2">
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 flex-shrink-0">
                                                                <Icon className="h-3 w-3" />
                                                                {typeConfig?.label}
                                                            </Badge>
                                                            <span className="font-medium truncate">
                                                                {question.question || <span className="text-slate-400 italic">Untitled Question</span>}
                                                            </span>
                                                            {question.required && (
                                                                <span className="text-xs text-red-500 flex-shrink-0">Required</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => duplicateQuestion(index)}
                                                        title="Duplicate question"
                                                    >
                                                        <Copy className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => remove(index)}
                                                        title="Delete question"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                )}
                            </SortableQuestionCard>
                        );
                    })}
                </SortableContext>
            </DndContext>

            {/* Bottom actions */}
            {fields.length > 0 && (
                <div className="flex items-center gap-3">
                    <Popover open={addPickerOpen} onOpenChange={setAddPickerOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="flex-1">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Question
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2" align="start">
                            <p className={cn("text-xs font-medium mb-2 px-2", dark ? "text-slate-400" : "text-slate-500")}>
                                Choose a question type
                            </p>
                            <TypePickerContent />
                        </PopoverContent>
                    </Popover>
                    {availableModules.length > 0 && (
                        <Select
                            dark={dark}
                            onValueChange={(value) => prefillFromModule(value)}
                        >
                            <SelectTrigger className="w-auto gap-2">
                                <Package className="h-4 w-4" />
                                <SelectValue placeholder="Prefill with module" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModules.map((module) => (
                                    <SelectItem key={module.type} value={module.type}>
                                        <div className="flex flex-col">
                                            <span>{module.label}</span>
                                            <span className="text-xs text-slate-400">{module.prefillQuestions.length} questions</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Client Preview - Intake Form</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 p-4">
                        <p className="text-sm text-slate-400">
                            This is how your intake form will appear to clients when they book a session.
                        </p>

                        {/* Questions preview */}
                        {questions && questions.length > 0 ? (
                            questions.map((q, idx) => (
                                <div key={q.id} className="space-y-2">
                                    <Label>
                                        {idx + 1}. {q.question}
                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {q.description && (
                                        <p className="text-sm text-slate-400">{q.description}</p>
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
                                    {q.type === "RATING" && (
                                        <RatingStarVisualizerComponent starSize={24} readOnly />
                                    )}
                                    {q.type === "LINEAR_SCALE" && (
                                        <div className="space-y-2">
                                            <Slider
                                                defaultValue={[Math.ceil((q.scaleMax || 10) / 2)]}
                                                min={1}
                                                max={q.scaleMax || 10}
                                                step={1}
                                                disabled
                                            />
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>1</span>
                                                <span>{q.scaleMax || 10}</span>
                                            </div>
                                        </div>
                                    )}
                                    {q.type === "YES_NO" && (
                                        <div className="flex items-center gap-3">
                                            <Switch disabled />
                                            <span className="text-sm text-slate-400">Yes / No</span>
                                        </div>
                                    )}
                                    {q.type === "PHONE" && (
                                        <Input type="tel" placeholder="+1 (555) 000-0000" disabled />
                                    )}
                                    {q.type === "TIME" && (
                                        <Input type="time" disabled />
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 py-8">
                                No questions added yet
                            </p>
                        )}
                    </div>
                    <div className="p-4 pt-0">
                        <Button type="button" variant="outline" onClick={() => setShowPreview(false)} className="w-full">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QuestionBuilder;
