'use client';

import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { FormControl, FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

/**
 * Target markets/regions for service offerings
 * Organized by major geographical regions
 */
const TARGET_REGIONS = [
  {
    category: 'North America',
    regions: [
      { label: 'East Coast (NY, Boston, Miami)', value: 'America/New_York', flag: '🇺🇸' },
      { label: 'Central (Chicago, Dallas)', value: 'America/Chicago', flag: '🇺🇸' },
      { label: 'Mountain (Denver, Phoenix)', value: 'America/Denver', flag: '🇺🇸' },
      { label: 'West Coast (LA, SF, Seattle)', value: 'America/Los_Angeles', flag: '🇺🇸' },
      { label: 'Canada (Toronto, Montreal)', value: 'America/Toronto', flag: '🇨🇦' },
    ]
  },
  {
    category: 'Europe',
    regions: [
      { label: 'UK & Ireland', value: 'Europe/London', flag: '🇬🇧' },
      { label: 'Central Europe (Paris, Berlin)', value: 'Europe/Paris', flag: '🇫🇷' },
      { label: 'Southern Europe (Rome, Madrid)', value: 'Europe/Rome', flag: '🇮🇹' },
      { label: 'Nordic (Stockholm, Oslo)', value: 'Europe/Stockholm', flag: '🇸🇪' },
      { label: 'Eastern Europe (Istanbul, Athens)', value: 'Europe/Istanbul', flag: '🇹🇷' },
    ]
  },
  {
    category: 'Asia Pacific',
    regions: [
      { label: 'India & South Asia', value: 'Asia/Kolkata', flag: '🇮🇳' },
      { label: 'Southeast Asia (Singapore, Bangkok)', value: 'Asia/Singapore', flag: '🇸🇬' },
      { label: 'China & Hong Kong', value: 'Asia/Shanghai', flag: '🇨🇳' },
      { label: 'Japan & Korea', value: 'Asia/Tokyo', flag: '🇯🇵' },
      { label: 'Australia (Sydney, Melbourne)', value: 'Australia/Sydney', flag: '🇦🇺' },
      { label: 'New Zealand', value: 'Pacific/Auckland', flag: '🇳🇿' },
    ]
  },
  {
    category: 'Middle East & Africa',
    regions: [
      { label: 'Middle East (Dubai, Abu Dhabi)', value: 'Asia/Dubai', flag: '🇦🇪' },
      { label: 'Israel', value: 'Asia/Jerusalem', flag: '🇮🇱' },
      { label: 'South Africa', value: 'Africa/Johannesburg', flag: '🇿🇦' },
      { label: 'West Africa (Lagos, Accra)', value: 'Africa/Lagos', flag: '🇳🇬' },
      { label: 'East Africa (Nairobi, Cairo)', value: 'Africa/Nairobi', flag: '🇰🇪' },
    ]
  },
  {
    category: 'South America',
    regions: [
      { label: 'Brazil (São Paulo, Rio)', value: 'America/Sao_Paulo', flag: '🇧🇷' },
      { label: 'Argentina (Buenos Aires)', value: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
      { label: 'Chile (Santiago)', value: 'America/Santiago', flag: '🇨🇱' },
    ]
  }
];

interface TargetTimezoneSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  className?: string;
}

/**
 * Multi-select dropdown for choosing target customer regions
 * Shows flags, organized by continent, with visual feedback
 */
const TargetTimezoneSelector: React.FC<TargetTimezoneSelectorProps> = ({
  value = [],
  onChange,
  className = ''
}) => {
  const [open, setOpen] = useState(false);

  const toggleRegion = (regionValue: string) => {
    const newValue = value.includes(regionValue)
      ? value.filter(v => v !== regionValue)
      : [...value, regionValue];
    onChange?.(newValue);
  };

  const getSelectedLabels = () => {
    const allRegions = TARGET_REGIONS.flatMap(cat => cat.regions);
    return value.map(v => {
      const region = allRegions.find(r => r.value === v);
      return region ? `${region.flag} ${region.label}` : v;
    });
  };

  const isAllSelected = () => {
    const allValues = TARGET_REGIONS.flatMap(cat => cat.regions.map(r => r.value));
    return allValues.every(v => value.includes(v));
  };

  const selectAll = () => {
    const allValues = TARGET_REGIONS.flatMap(cat => cat.regions.map(r => r.value));
    onChange?.(allValues);
  };

  const clearAll = () => {
    onChange?.([]);
  };

  return (
    <FormItem className={className}>
      <FormLabel className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        Target Customer Regions
      </FormLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                value.length === 0 && "text-muted-foreground"
              )}
            >
              <span className="truncate">
                {value.length === 0
                  ? "Select target regions..."
                  : `${value.length} region${value.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search regions..." />
            <CommandEmpty>No region found.</CommandEmpty>

            {/* Quick actions */}
            <div className="flex gap-2 p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={isAllSelected()}
                className="flex-1 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={value.length === 0}
                className="flex-1 text-xs"
              >
                Clear All
              </Button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {TARGET_REGIONS.map((category) => (
                <CommandGroup key={category.category} heading={category.category}>
                  {category.regions.map((region) => {
                    const isSelected = value.includes(region.value);
                    return (
                      <CommandItem
                        key={region.value}
                        value={region.value}
                        onSelect={() => toggleRegion(region.value)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-xl">{region.flag}</span>
                          <span className="flex-1">{region.label}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected regions display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {getSelectedLabels().map((label, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs"
              onClick={() => {
                const regionValue = value[index];
                toggleRegion(regionValue);
              }}
            >
              {label}
              <span className="ml-1 cursor-pointer hover:text-destructive">×</span>
            </Badge>
          ))}
        </div>
      )}

      <FormDescription>
        Select regions where you want to attract customers. We&apos;ll show you the best times to be available.
      </FormDescription>
    </FormItem>
  );
};

export default TargetTimezoneSelector;
