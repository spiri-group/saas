'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useDebounce from '@/components/ux/UseDebounce';
import { distinct, isNullOrWhitespace } from '@/lib/functions';
import BouncingDots from '@/icons/BouncingDots';
import Link from 'next/link';
import UseSearch from './_hooks/UseSearch';

type Props = {
  className?: string;
};

const SearchSuggestions: React.FC<{
  searchTerm: string;
  onSelect: (term: string) => void;
  clear: () => void;
}> = ({ searchTerm, onSelect, clear }) => {
  const listingsQuery = UseSearch('listings', true, searchTerm).query;
  const merchantsQuery = UseSearch('merchants', true, searchTerm).query;
  const isLoading = listingsQuery.isLoading || merchantsQuery.isLoading;
  const data = [
    ...(listingsQuery.data?.pages.flatMap((item) => item.results) ?? []),
    ...(merchantsQuery.data?.pages.flatMap((item) => item.results) ?? []),
  ];

  const Container = ({ children, className }) => (
    <div
      className={cn(
        'absolute top-full mt-2 rounded-xl left-0 w-full bg-white border border-gray-300 shadow-md z-10 overflow-y-auto max-h-60',
        className
      )}
    >
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <Container className={cn('flex items-center justify-center')}>
        <BouncingDots className="h-12 flex items-center justify-center" />
      </Container>
    );
  }

  const item_names =
    data != null && data.length !== 1
      ? distinct(data.map((item) => item.title))
      : [];

  return (
    <Container className={cn('flex flex-col gap-2 p-3')}>
      {data != null && data.length === 1 ? (
        <Link href={data[0].link} className="w-full" onClick={clear}>
          <div className="p-2 hover:bg-gray-100 cursor-pointer rounded-xl">
            <div className="flex flex-row items-center justify-between">
              <span className="font-bold text-sm">{data[0].title}</span>
              <span className="text-sm text-gray-500">{data[0].additionalInfo}</span>
            </div>
          </div>
        </Link>
      ) : null}
      {item_names.map((name, index) => (
        <Link
          href={`/?search=${encodeURIComponent(name)}`}
          className="w-full"
          key={index}
          onClick={() => {
            onSelect(name);
          }}
        >
          <div className="p-2 hover:bg-gray-100 cursor-pointer rounded-xl">
            <div className="flex flex-row items-center justify-between">
              <span className="font-bold text-sm">{name}</span>
            </div>
          </div>
        </Link>
      ))}
    </Container>
  );
};

const SearchBar: React.FC<Props> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState<string>(''); // FIXED
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('search')) {
      setSearchTerm('');
      return;
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (!searchTerm || isNullOrWhitespace(searchTerm)) {
      router.push('/');
      return;
    }
    setHideSuggestions(true);
    router.push(`?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else {
      setHideSuggestions(false);
    }
  };

  return (
    <div className={cn('flex flex-row gap-2 relative', className)}>
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
      />
      <Button type="button" onClick={handleSearch}>
        Search
      </Button>
      {!isNullOrWhitespace(debouncedSearchTerm) && !hideSuggestions && (
        <SearchSuggestions
          searchTerm={debouncedSearchTerm}
          onSelect={(term) => {
            setSearchTerm(term);
            setHideSuggestions(true);
          }}
          clear={() => {
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
};

export default SearchBar;