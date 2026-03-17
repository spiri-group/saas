'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useDebounce from '@/components/ux/UseDebounce';
import { isNullOrWhitespace } from '@/lib/functions';
import BouncingDots from '@/icons/BouncingDots';
import Link from 'next/link';
import UseSearch from './_hooks/UseSearch';

type Props = {
  className?: string;
};

const formatAdditionalInfo = (info?: string) => {
  if (!info) return null;
  return info.charAt(0).toUpperCase() + info.slice(1);
};

const SearchSuggestions: React.FC<{
  searchTerm: string;
  activeIndex: number;
  onClear: () => void;
  onSelect: (term: string) => void;
  onLoaded: (count: number) => void;
}> = ({ searchTerm, activeIndex, onClear, onSelect, onLoaded }) => {
  const allQuery = UseSearch('all', true, searchTerm).query;
  const isLoading = allQuery.isLoading;
  const data = useMemo(() =>
    (allQuery.data?.pages.flatMap((item) => item.results) ?? []).filter((item) => item.link),
    [allQuery.data]
  );

  const directResults = useMemo(() => data.slice(0, 5), [data]);
  const remainingTitles = useMemo(() =>
    data.length > 5
      ? [...new Set(data.slice(5).map((item) => item.title))].slice(0, 3)
      : [],
    [data]
  );

  const totalItems = directResults.length + remainingTitles.length;

  // Report total item count to parent for keyboard navigation bounds
  useEffect(() => {
    onLoaded(totalItems);
  }, [totalItems]);

  if (isLoading) {
    return (
      <div
        role="listbox"
        aria-label="Search suggestions"
        className="absolute top-full mt-2 rounded-xl left-0 w-full bg-white border border-gray-300 shadow-md z-10 overflow-y-auto max-h-60 flex items-center justify-center"
      >
        <BouncingDots className="h-12 flex items-center justify-center" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        role="listbox"
        aria-label="Search suggestions"
        className="absolute top-full mt-2 rounded-xl left-0 w-full bg-white border border-gray-300 shadow-md z-10 p-4 text-center"
      >
        <p className="text-sm text-gray-500">No results found for &quot;{searchTerm}&quot;</p>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-full mt-2 rounded-xl left-0 w-full bg-white border border-gray-300 shadow-md z-10 overflow-y-auto max-h-60 flex flex-col gap-0.5 p-2"
    >
      {directResults.map((item, index) => (
        <Link
          href={item.link!}
          className="w-full"
          key={`${item.id}-${index}`}
          role="option"
          aria-selected={activeIndex === index}
          onClick={onClear}
        >
          <div className={cn(
            'p-2 cursor-pointer rounded-lg',
            activeIndex === index ? 'bg-gray-100' : 'hover:bg-gray-100'
          )}>
            <div className="flex flex-row items-center justify-between">
              <span className="font-bold text-sm truncate">{item.title}</span>
              {item.additionalInfo && (
                <span className="text-xs text-gray-500 ml-2 shrink-0">
                  {formatAdditionalInfo(item.additionalInfo)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
      {remainingTitles.length > 0 && (
        <>
          <div className="border-t border-gray-200 my-1" />
          {remainingTitles.map((name, index) => {
            const itemIndex = directResults.length + index;
            return (
              <Link
                href={`/?search=${encodeURIComponent(name)}`}
                className="w-full"
                key={`title-${index}`}
                role="option"
                aria-selected={activeIndex === itemIndex}
                onClick={() => onSelect(name)}
              >
                <div className={cn(
                  'p-2 cursor-pointer rounded-lg',
                  activeIndex === itemIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                )}>
                  <div className="flex flex-row items-center justify-between">
                    <span className="text-sm text-gray-700">Search for &quot;{name}&quot;</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
};

const SearchBar: React.FC<Props> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const showingSuggestions = !isNullOrWhitespace(debouncedSearchTerm) && !hideSuggestions;

  useEffect(() => {
    if (!searchParams.has('search')) {
      setSearchTerm('');
      return;
    }
  }, [searchParams]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHideSuggestions(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset active index when search term changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedSearchTerm]);

  const handleSearch = () => {
    if (!searchTerm || isNullOrWhitespace(searchTerm)) {
      router.push('/');
      return;
    }
    setHideSuggestions(true);
    setActiveIndex(-1);
    router.push(`?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setHideSuggestions(true);
      setActiveIndex(-1);
      return;
    }

    // Arrow navigation only when suggestions are showing
    if (showingSuggestions && suggestionCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestionCount - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestionCount - 1));
        return;
      }
      // Enter with an active selection — let the Link handle it via click simulation
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        // Click the active suggestion link
        const activeLink = containerRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
        if (activeLink) {
          activeLink.click();
          setHideSuggestions(true);
          setActiveIndex(-1);
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      handleSearch();
    } else {
      setHideSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('flex flex-row gap-2 relative', className)} role="search">
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setHideSuggestions(false)}
        placeholder="Search..."
        aria-label="Search"
        aria-expanded={showingSuggestions}
        aria-haspopup="listbox"
      />
      <Button type="button" onClick={handleSearch}>
        Search
      </Button>
      {showingSuggestions && (
        <SearchSuggestions
          searchTerm={debouncedSearchTerm}
          activeIndex={activeIndex}
          onClear={() => {
            setSearchTerm('');
            setActiveIndex(-1);
          }}
          onSelect={(term) => {
            setSearchTerm(term);
            setHideSuggestions(true);
            setActiveIndex(-1);
          }}
          onLoaded={setSuggestionCount}
        />
      )}
    </div>
  );
};

export default SearchBar;
