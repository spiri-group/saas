'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Search, Filter, X, Gem } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCrystalReferences } from '../hooks';
import { CrystalReference, CHAKRAS, ELEMENTS, ChakraType, ElementType } from '../types';
import CrystalDetailPanel from './components/CrystalDetailPanel';

interface Props {
  userId: string;
}

const CrystalGuideUI: React.FC<Props> = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [chakraFilter, setChakraFilter] = useState<string>('');
  const [elementFilter, setElementFilter] = useState<string>('');
  const [selectedCrystal, setSelectedCrystal] = useState<CrystalReference | null>(null);

  // Fetch all crystals
  const { data: crystalData, isLoading } = useCrystalReferences({
    search: searchQuery || undefined,
    chakra: chakraFilter || undefined,
    element: elementFilter || undefined,
  });

  const crystals = crystalData?.crystals || [];
  const totalCount = crystalData?.totalCount || 0;

  // Filter crystals client-side for immediate feedback
  const filteredCrystals = useMemo(() => {
    let filtered = crystals;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.alternateNames.some((n) => n.toLowerCase().includes(query)) ||
          c.primaryProperties.some((p) => p.toLowerCase().includes(query))
      );
    }

    if (chakraFilter) {
      filtered = filtered.filter((c) => c.chakras.includes(chakraFilter as ChakraType));
    }

    if (elementFilter) {
      filtered = filtered.filter((c) => c.elements.includes(elementFilter as ElementType));
    }

    return filtered;
  }, [crystals, searchQuery, chakraFilter, elementFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setChakraFilter('');
    setElementFilter('');
  };

  const hasActiveFilters = searchQuery || chakraFilter || elementFilter;

  const getChakraColor = (chakra: ChakraType) => {
    const chakraInfo = CHAKRAS.find((c) => c.key === chakra);
    return chakraInfo?.color || '#9370DB';
  };

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-purple-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-violet-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/20 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2" data-testid="crystal-guide-heading">Crystal Guide</h1>
          <p className="text-slate-400">
            Explore the metaphysical properties and care instructions for {totalCount} crystals
          </p>
        </div>

        {/* Search and Filters */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search crystals by name or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                data-testid="crystal-guide-search"
              />
            </div>

            {/* Chakra Filter */}
            <Select value={chakraFilter || 'all'} onValueChange={(v) => setChakraFilter(v === 'all' ? '' : v)}>
              <SelectTrigger
                className="w-full md:w-48 bg-white/5 border-white/20 text-white"
                data-testid="chakra-filter"
              >
                <SelectValue placeholder="Filter by Chakra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chakras</SelectItem>
                {CHAKRAS.map((chakra) => (
                  <SelectItem key={chakra.key} value={chakra.key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chakra.color }}
                      />
                      {chakra.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Element Filter */}
            <Select value={elementFilter || 'all'} onValueChange={(v) => setElementFilter(v === 'all' ? '' : v)}>
              <SelectTrigger
                className="w-full md:w-48 bg-white/5 border-white/20 text-white"
                data-testid="element-filter"
              >
                <SelectValue placeholder="Filter by Element" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Elements</SelectItem>
                {ELEMENTS.map((element) => (
                  <SelectItem key={element.key} value={element.key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: element.color }}
                      />
                      {element.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Showing {filteredCrystals.length} crystals</span>
            </div>
          )}
        </div>

        {/* Crystal Grid */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-white/5 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredCrystals.length === 0 ? (
            <div className="text-center py-12">
              <Gem className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No crystals found</h3>
              <p className="text-slate-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="crystal-grid">
              {filteredCrystals.map((crystal) => (
                <button
                  key={crystal.id}
                  onClick={() => setSelectedCrystal(crystal)}
                  className="group text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-200"
                  data-testid={`crystal-card-${crystal.id}`}
                >
                  {/* Thumbnail or Placeholder */}
                  <div className="w-full h-24 rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    {crystal.thumbnail ? (
                      <img
                        src={crystal.thumbnail}
                        alt={crystal.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Gem className="w-8 h-8 text-indigo-400/50" />
                    )}
                  </div>

                  {/* Crystal Name */}
                  <h3 className="font-medium text-white group-hover:text-indigo-300 transition-colors mb-1 truncate">
                    {crystal.name}
                  </h3>

                  {/* Alternate Names */}
                  {crystal.alternateNames.length > 0 && (
                    <p className="text-xs text-slate-500 truncate mb-2">
                      {crystal.alternateNames.slice(0, 2).join(', ')}
                    </p>
                  )}

                  {/* Chakra Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {crystal.chakras.slice(0, 2).map((chakra) => (
                      <div
                        key={chakra}
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: getChakraColor(chakra) }}
                        title={CHAKRAS.find((c) => c.key === chakra)?.label}
                      />
                    ))}
                    {crystal.chakras.length > 2 && (
                      <span className="text-xs text-slate-500">+{crystal.chakras.length - 2}</span>
                    )}
                  </div>

                  {/* Properties Preview */}
                  <div className="flex flex-wrap gap-1">
                    {crystal.primaryProperties.slice(0, 2).map((prop) => (
                      <Badge
                        key={prop}
                        variant="outline"
                        className="text-xs border-white/20 text-slate-400"
                      >
                        {prop}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Crystal Detail Panel */}
      {selectedCrystal && (
        <CrystalDetailPanel
          crystal={selectedCrystal}
          userId={userId}
          onClose={() => setSelectedCrystal(null)}
        />
      )}
    </div>
  );
};

export default CrystalGuideUI;
