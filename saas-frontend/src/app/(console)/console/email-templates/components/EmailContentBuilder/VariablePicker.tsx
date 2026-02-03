"use client";

import { useState } from "react";
import { Search, Braces, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ALL_VARIABLE_CATEGORIES,
  VariableDefinition,
  VariableCategory,
  searchVariables,
} from "./variableSchemas";

interface VariablePickerProps {
  onInsert: (variable: string) => void;
  trigger?: React.ReactNode;
  size?: "sm" | "default";
}

export default function VariablePicker({
  onInsert,
  trigger,
  size = "default"
}: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleInsert = (variableKey: string) => {
    onInsert(`{{ ${variableKey} }}`);
    setOpen(false);
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const filteredCategories = searchQuery
    ? null
    : selectedCategory
    ? ALL_VARIABLE_CATEGORIES.filter(cat => cat.category === selectedCategory)
    : ALL_VARIABLE_CATEGORIES;

  const searchResults = searchQuery ? searchVariables(searchQuery) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="outline"
            size={size}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Braces className={cn("mr-2", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
            {size === "sm" ? "Insert" : "Insert Variable"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[480px] bg-slate-900 border-slate-700 p-0" align="start">
        <div className="flex flex-col h-[500px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Braces className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Insert Variable</h3>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {!searchQuery && selectedCategory && (
            <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                All Categories
              </button>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-sm text-white">{selectedCategory}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Search Results */}
            {searchResults && (
              <div className="p-2">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((variable) => (
                      <VariableItem
                        key={variable.key}
                        variable={variable}
                        onSelect={() => handleInsert(variable.key)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-500">No variables found</p>
                    <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            )}

            {/* Category View */}
            {!searchQuery && !selectedCategory && (
              <div className="p-2">
                <p className="text-xs text-slate-500 px-2 py-2 mb-1">Select a category</p>
                <div className="space-y-1">
                  {ALL_VARIABLE_CATEGORIES.map((category) => (
                    <CategoryCard
                      key={category.category}
                      category={category}
                      onSelect={() => setSelectedCategory(category.category)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Variables in Category */}
            {!searchQuery && selectedCategory && filteredCategories && (
              <div className="p-2">
                {filteredCategories.map((category) => (
                  <div key={category.category}>
                    <p className="text-xs text-slate-500 px-2 py-2 mb-1">{category.description}</p>
                    <div className="space-y-1">
                      {category.variables.map((variable) => (
                        <VariableItem
                          key={variable.key}
                          variable={variable}
                          onSelect={() => handleInsert(variable.key)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Help */}
          <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-start gap-2">
              <Braces className="h-3 w-3 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                Variables are automatically wrapped in <code className="text-purple-400">{'{{ }}'}</code> syntax
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CategoryCard({
  category,
  onSelect
}: {
  category: VariableCategory;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-3 rounded-lg text-left transition-all group",
        "bg-slate-800 border border-slate-700",
        "hover:border-purple-500 hover:bg-purple-500/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
            {category.category}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {category.description}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {category.variables.length} variable{category.variables.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0 ml-2" />
      </div>
    </button>
  );
}

function VariableItem({
  variable,
  onSelect
}: {
  variable: VariableDefinition;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-2.5 rounded-lg text-left transition-all group",
        "bg-slate-800 border border-slate-700",
        "hover:border-purple-500 hover:bg-purple-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
              {variable.label}
            </p>
            {variable.type && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
                {variable.type}
              </span>
            )}
          </div>
          <p className="text-xs text-purple-400 font-mono mt-1">
            {'{{ '}{variable.key}{' }}'}
          </p>
          {variable.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              {variable.description}
            </p>
          )}
          {variable.example && (
            <p className="text-xs text-slate-600 mt-1">
              Example: <span className="text-slate-500">{variable.example}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
