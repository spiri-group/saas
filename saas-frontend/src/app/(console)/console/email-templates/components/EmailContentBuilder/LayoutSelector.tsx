"use client";

import { LayoutDefinition, LayoutType, getSuggestedLayouts } from "./types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LayoutSelectorProps {
  blockCount: number;
  selectedLayout?: LayoutType;
  onSelectLayout: (layout: LayoutType) => void;
}

export default function LayoutSelector({
  blockCount,
  selectedLayout,
  onSelectLayout
}: LayoutSelectorProps) {
  const suggestedLayouts = getSuggestedLayouts(blockCount);

  if (blockCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Create some content blocks first</p>
        <p className="text-xs text-slate-500 mt-2">
          Layouts will be suggested based on the number of blocks you create
        </p>
      </div>
    );
  }

  if (suggestedLayouts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">
          No layouts available for {blockCount} block{blockCount !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Try adding or removing blocks to see layout options
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">
          Suggested Layouts ({blockCount} block{blockCount !== 1 ? 's' : ''})
        </h3>
        <p className="text-xs text-slate-500">
          {suggestedLayouts.length} option{suggestedLayouts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {suggestedLayouts.map((layout) => (
          <button
            key={layout.type}
            onClick={() => onSelectLayout(layout.type)}
            className={cn(
              "relative p-4 rounded-lg border transition-all text-left",
              selectedLayout === layout.type
                ? "bg-purple-600/20 border-purple-600"
                : "bg-slate-800 border-slate-700 hover:border-slate-600"
            )}
          >
            {selectedLayout === layout.type && (
              <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            <div className="mb-3">
              <LayoutPreview layout={layout} />
            </div>

            <div>
              <p className="text-sm font-medium text-white mb-1">{layout.name}</p>
              <p className="text-xs text-slate-400">{layout.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LayoutPreview({ layout }: { layout: LayoutDefinition }) {
  // Visual representation of the layout
  const renderSlotVisual = () => {
    switch (layout.type) {
      case "single-full":
        return <div className="w-full h-16 bg-purple-500/30 rounded" />;

      case "two-column":
        return (
          <div className="flex gap-2">
            <div className="flex-1 h-16 bg-purple-500/30 rounded" />
            <div className="flex-1 h-16 bg-purple-500/30 rounded" />
          </div>
        );

      case "two-stacked":
        return (
          <div className="space-y-2">
            <div className="w-full h-6 bg-purple-500/30 rounded" />
            <div className="w-full h-6 bg-purple-500/30 rounded" />
          </div>
        );

      case "three-column":
        return (
          <div className="flex gap-2">
            <div className="flex-1 h-16 bg-purple-500/30 rounded" />
            <div className="flex-1 h-16 bg-purple-500/30 rounded" />
            <div className="flex-1 h-16 bg-purple-500/30 rounded" />
          </div>
        );

      case "three-stacked":
        return (
          <div className="space-y-2">
            <div className="w-full h-6 bg-purple-500/30 rounded" />
            <div className="w-full h-6 bg-purple-500/30 rounded" />
            <div className="w-full h-6 bg-purple-500/30 rounded" />
          </div>
        );

      case "hero-two-column":
        return (
          <div className="space-y-2">
            <div className="w-full h-8 bg-purple-500/30 rounded" />
            <div className="flex gap-2">
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
            </div>
          </div>
        );

      case "two-top-stacked":
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
            </div>
            <div className="w-full h-8 bg-purple-500/30 rounded" />
          </div>
        );

      case "four-grid":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="h-6 bg-purple-500/30 rounded" />
            <div className="h-6 bg-purple-500/30 rounded" />
            <div className="h-6 bg-purple-500/30 rounded" />
            <div className="h-6 bg-purple-500/30 rounded" />
          </div>
        );

      case "hero-three-column":
        return (
          <div className="space-y-2">
            <div className="w-full h-8 bg-purple-500/30 rounded" />
            <div className="flex gap-2">
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
              <div className="flex-1 h-6 bg-purple-500/30 rounded" />
            </div>
          </div>
        );

      default:
        return <div className="w-full h-16 bg-purple-500/30 rounded" />;
    }
  };

  return <div className="w-full">{renderSlotVisual()}</div>;
}
