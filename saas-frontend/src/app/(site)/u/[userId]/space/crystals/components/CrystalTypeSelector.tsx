'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, Search, Loader2, Gem, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchCrystals } from '../hooks';

export interface CrystalReferenceOption {
  id: string;
  name: string;
  colors?: string[];
}

interface CrystalTypeSelectorProps {
  value?: { id: string | null; name: string } | null;
  onChange: (crystal: { id: string | null; name: string } | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Color mapping for visual indicators
const COLOR_MAP: Record<string, string> = {
  clear: '#E8E8E8',
  white: '#FFFFFF',
  black: '#1A1A1A',
  red: '#DC2626',
  orange: '#EA580C',
  yellow: '#EAB308',
  green: '#16A34A',
  blue: '#2563EB',
  purple: '#9333EA',
  pink: '#EC4899',
  brown: '#92400E',
  gray: '#6B7280',
  gold: '#D97706',
  silver: '#94A3B8',
  multicolor: 'linear-gradient(90deg, #DC2626, #EAB308, #16A34A, #2563EB, #9333EA)',
  iridescent: 'linear-gradient(90deg, #EC4899, #8B5CF6, #3B82F6, #10B981)',
};

const CrystalTypeSelector: React.FC<CrystalTypeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Search crystal type...',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search crystals query
  const { data: searchResults, isLoading } = useSearchCrystals(debouncedQuery, 10);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const handleSelect = useCallback((crystal: CrystalReferenceOption) => {
    onChange({ id: crystal.id, name: crystal.name });
    setSearchQuery('');
    setOpen(false);
  }, [onChange]);

  const handleSelectCustom = useCallback(() => {
    // Custom/unlisted option - use search query as name with null id
    if (searchQuery.trim()) {
      onChange({ id: null, name: searchQuery.trim() });
    }
    setSearchQuery('');
    setOpen(false);
  }, [searchQuery, onChange]);

  const handleClear = useCallback(() => {
    onChange(null);
    setSearchQuery('');
  }, [onChange]);

  const getColorIndicator = (colors?: string[]) => {
    if (!colors || colors.length === 0) return null;
    const primaryColor = colors[0];
    const colorValue = COLOR_MAP[primaryColor] || '#6B7280';

    return (
      <span
        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/30"
        style={{
          background: colorValue.includes('gradient') ? colorValue : colorValue,
        }}
      />
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between bg-white/5 border-white/20 text-white hover:bg-white/10',
            !value && 'text-slate-500',
            className
          )}
          data-testid="crystal-type-selector-trigger"
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <Gem className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="truncate">{value.name}</span>
                {!value.id && (
                  <span className="text-xs text-slate-400">(Custom)</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 bg-slate-900 border-white/20"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command className="bg-transparent">
          {/* Search Input */}
          <div className="flex items-center border-b border-white/10 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search crystals..."
              className="flex-1 border-0 bg-transparent text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
              data-testid="crystal-type-search-input"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          {/* Results */}
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {/* Show search results */}
            {searchResults && searchResults.length > 0 && (
              <>
                {searchResults.map((crystal) => (
                  <CommandItem
                    key={crystal.id}
                    value={crystal.name}
                    onSelect={() => handleSelect(crystal)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer text-white hover:bg-white/10"
                    data-testid={`crystal-option-${crystal.id}`}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        value?.id === crystal.id ? 'opacity-100 text-purple-400' : 'opacity-0'
                      )}
                    />
                    {getColorIndicator(crystal.colors)}
                    <span className="truncate">{crystal.name}</span>
                  </CommandItem>
                ))}
              </>
            )}

            {/* Custom/Unlisted option - show when there's a search query */}
            {searchQuery.trim() && (
              <CommandItem
                value={`custom-${searchQuery}`}
                onSelect={handleSelectCustom}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-white hover:bg-white/10 border-t border-white/10 mt-1"
                data-testid="crystal-option-custom"
              >
                <Plus className="h-4 w-4 flex-shrink-0 text-purple-400" />
                <span className="truncate">
                  Use &quot;{searchQuery.trim()}&quot; (not in database)
                </span>
              </CommandItem>
            )}

            {/* Empty state */}
            {!isLoading && debouncedQuery && (!searchResults || searchResults.length === 0) && !searchQuery.trim() && (
              <CommandEmpty className="py-4 text-center text-sm text-slate-400">
                No crystals found. Type to add a custom crystal.
              </CommandEmpty>
            )}

            {/* Initial state hint */}
            {!searchQuery && !value && (
              <div className="py-4 px-3 text-center text-sm text-slate-400">
                Start typing to search our crystal database
              </div>
            )}
          </CommandGroup>

          {/* Clear selection */}
          {value && (
            <div className="border-t border-white/10 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full text-slate-400 hover:text-white hover:bg-white/10"
                data-testid="crystal-type-clear-btn"
              >
                Clear selection
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CrystalTypeSelector;
