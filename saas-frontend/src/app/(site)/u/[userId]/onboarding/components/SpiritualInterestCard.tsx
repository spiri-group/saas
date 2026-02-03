'use client';

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { SpiritualInterestOption } from "../types";

interface SpiritualInterestCardProps {
  interest: SpiritualInterestOption;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  testId?: string;
  spanFullWidth?: boolean;
}

const SpiritualInterestCard: React.FC<SpiritualInterestCardProps> = ({
  interest,
  isSelected,
  onSelect,
  disabled = false,
  testId,
  spanFullWidth = false
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "relative w-full p-5 rounded-xl border-2 text-left transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500/50",
        isSelected
          ? "border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/20"
          : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none",
        spanFullWidth && "md:col-span-2"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
          isSelected
            ? "border-purple-500 bg-purple-500"
            : "border-white/40 bg-transparent"
        )}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className="pr-8">
        <h3 className={cn(
          "text-lg font-medium mb-1 transition-colors duration-300",
          isSelected ? "text-purple-200" : "text-white"
        )}>
          {interest.label}
        </h3>
        <p className="text-sm text-slate-400">
          {interest.supportingText}
        </p>
      </div>
    </button>
  );
};

export default SpiritualInterestCard;
