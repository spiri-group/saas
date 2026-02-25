import * as React from "react"
import { cn } from "@/lib/utils"

type Step = {
    label: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (step: number) => void;
    dark?: boolean;
    glass?: boolean;
    className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
    steps,
    currentStep,
    onStepClick,
    dark = false,
    glass = false,
    className,
}) => {
    return (
        <div className={cn("flex flex-1 items-center gap-4 pr-4", className)}>
            {steps.map(({ label }, index) => {
                const step = index + 1;
                const isActive = currentStep >= step;
                const isCurrent = currentStep === step;
                const isClickable = !!onStepClick;

                return (
                    <button
                        key={step}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => onStepClick?.(step)}
                        className={cn(
                            "flex flex-1 items-center gap-2 bg-transparent border-none p-0 text-left",
                            isClickable && "cursor-pointer",
                            isClickable && !isCurrent && "opacity-80 hover:opacity-100"
                        )}
                    >
                        <div
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                isActive
                                    ? dark
                                        ? "bg-purple-500"
                                        : glass
                                            ? "bg-primary/80"
                                            : "bg-primary"
                                    : dark
                                        ? "bg-slate-700"
                                        : glass
                                            ? "bg-white/20"
                                            : "bg-muted"
                            )}
                        />
                        <span
                            className={cn(
                                "text-xs font-medium transition-colors whitespace-nowrap",
                                isCurrent
                                    ? dark
                                        ? "text-white font-semibold"
                                        : "text-foreground font-semibold"
                                    : dark
                                        ? "text-slate-400"
                                        : "text-muted-foreground"
                            )}
                        >
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export { StepIndicator };
export type { StepIndicatorProps, Step };
