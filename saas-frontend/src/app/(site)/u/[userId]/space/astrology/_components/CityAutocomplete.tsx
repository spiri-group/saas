'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchCities, CitySearchResult } from '../_hooks/useBirthChart';
import { debounce } from '@/lib/functions';

interface Props {
  value?: CitySearchResult | null;
  onChange: (city: CitySearchResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CityAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Search for your birth city...",
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: cities, isLoading } = useSearchCities(debouncedQuery);

  // Debounce the search query
  useEffect(() => {
    const debouncedSetQuery = debounce((q: string) => {
      setDebouncedQuery(q);
    }, 300);

    debouncedSetQuery(query);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: CitySearchResult) => {
    onChange(city);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        // Selected city display
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 border border-white/20 rounded-lg">
          <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <div className="text-white font-medium truncate">
              {value.city}
            </div>
            <div className="text-slate-400 text-sm truncate">
              {value.adminRegion ? `${value.adminRegion}, ` : ''}{value.country}
            </div>
            <div className="text-slate-500 text-xs">
              {value.timezone}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              data-testid="clear-city-btn"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      ) : (
        // Search input
        <>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="pl-10 bg-slate-800/50 border-white/20 text-white placeholder:text-slate-500"
              data-testid="city-search-input"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Dropdown */}
          {isOpen && cities && cities.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-start gap-3 border-b border-white/10 last:border-b-0"
                  data-testid={`city-option-${city.id}`}
                >
                  <MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="text-white font-medium">
                      {city.city}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {city.adminRegion ? `${city.adminRegion}, ` : ''}{city.country}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {city.timezone}
                    </div>
                  </div>
                  {city.population && city.population > 100000 && (
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                      {(city.population / 1000000).toFixed(1)}M
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {isOpen && !isLoading && cities && cities.length === 0 && query.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl p-4">
              <p className="text-slate-400 text-sm text-center">
                No cities found for &quot;{query}&quot;
              </p>
              <p className="text-slate-500 text-xs text-center mt-1">
                Try searching for a nearby larger city
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CityAutocomplete;
