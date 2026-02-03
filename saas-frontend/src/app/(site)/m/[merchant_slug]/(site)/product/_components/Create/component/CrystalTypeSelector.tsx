"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSearchCrystals, CrystalReference } from "../hooks/UseCrystalReferences";

type CrystalTypeSelectorProps = {
  value?: string;
  selectedCrystal?: CrystalReference | null;
  onSelect: (crystal: CrystalReference) => void;
  disabled?: boolean;
};

const CrystalTypeSelector: React.FC<CrystalTypeSelectorProps> = ({
  value,
  selectedCrystal,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: crystals, isLoading } = useSearchCrystals(searchQuery);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
          data-testid="crystal-type-selector"
        >
          {selectedCrystal ? (
            <div className="flex items-center gap-2">
              {selectedCrystal.thumbnail && (
                <img
                  src={selectedCrystal.thumbnail}
                  alt={selectedCrystal.name}
                  className="w-6 h-6 rounded object-cover"
                />
              )}
              <span>{selectedCrystal.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a crystal type...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search crystals..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            data-testid="crystal-search-input"
          />
          <CommandList>
            {isLoading && searchQuery.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isLoading && searchQuery.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                Type at least 2 characters to search
              </div>
            )}
            {!isLoading && searchQuery.length >= 2 && (!crystals || crystals.length === 0) && (
              <CommandEmpty>No crystals found.</CommandEmpty>
            )}
            {crystals && crystals.length > 0 && (
              <CommandGroup>
                {crystals.map((crystal) => (
                  <CommandItem
                    key={crystal.id}
                    value={crystal.id}
                    onSelect={() => {
                      onSelect(crystal);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer"
                    data-testid={`crystal-option-${crystal.id}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {crystal.thumbnail ? (
                        <img
                          src={crystal.thumbnail}
                          alt={crystal.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">?</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{crystal.name}</span>
                        {crystal.alternateNames.length > 0 && (
                          <span className="text-xs text-muted-foreground truncate">
                            Also: {crystal.alternateNames.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4 flex-shrink-0",
                          value === crystal.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CrystalTypeSelector;
