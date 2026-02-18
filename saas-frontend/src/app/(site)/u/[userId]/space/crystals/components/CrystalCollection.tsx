'use client';

import { useState } from 'react';
import { Gem, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CrystalCollectionItem, CrystalColor, CrystalForm, CRYSTAL_COLORS, CRYSTAL_FORMS } from '../types';
import CrystalCard from './CrystalCard';

interface CrystalCollectionProps {
  crystals: CrystalCollectionItem[];
  isLoading: boolean;
  onEdit: (crystal: CrystalCollectionItem) => void;
  onDelete: (crystal: CrystalCollectionItem) => void;
  onSelect?: (crystal: CrystalCollectionItem) => void;
}

const CrystalCollection: React.FC<CrystalCollectionProps> = ({
  crystals,
  isLoading,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<CrystalColor | 'all'>('all');
  const [formFilter, setFormFilter] = useState<CrystalForm | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter crystals
  const filteredCrystals = crystals.filter(crystal => {
    const matchesSearch = searchQuery === '' ||
      crystal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crystal.nickname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = colorFilter === 'all' || crystal.color === colorFilter;
    const matchesForm = formFilter === 'all' || crystal.form === formFilter;
    return matchesSearch && matchesColor && matchesForm;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-slate-400">Loading your collection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crystals..."
            dark
            className="pl-10"
            data-testid="crystal-search"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showFilters || colorFilter !== 'all' || formFilter !== 'all'
              ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
              : 'bg-white/5 border-white/20 text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {(colorFilter !== 'all' || formFilter !== 'all') && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-500/30 rounded text-xs">
              {[colorFilter !== 'all', formFilter !== 'all'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Color</label>
            <Select
              value={colorFilter}
              onValueChange={(value) => setColorFilter(value as CrystalColor | 'all')}
              dark
            >
              <SelectTrigger>
                <SelectValue placeholder="All colors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All colors</SelectItem>
                {CRYSTAL_COLORS.map((color) => (
                  <SelectItem key={color.key} value={color.key}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Form</label>
            <Select
              value={formFilter}
              onValueChange={(value) => setFormFilter(value as CrystalForm | 'all')}
              dark
            >
              <SelectTrigger>
                <SelectValue placeholder="All forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All forms</SelectItem>
                {CRYSTAL_FORMS.map((form) => (
                  <SelectItem key={form.key} value={form.key}>
                    {form.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        {filteredCrystals.length} {filteredCrystals.length === 1 ? 'crystal' : 'crystals'}
        {searchQuery || colorFilter !== 'all' || formFilter !== 'all' ? ' found' : ' in collection'}
      </div>

      {/* Crystal Grid */}
      {filteredCrystals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <Gem className="w-8 h-8 text-purple-400/50" />
          </div>
          {crystals.length === 0 ? (
            <>
              <h3 className="text-white font-medium mb-2">Start Your Collection</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Add your first crystal to begin cataloging your sacred stones.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-white font-medium mb-2">No Crystals Found</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCrystals.map((crystal) => (
            <CrystalCard
              key={crystal.id}
              crystal={crystal}
              onEdit={onEdit}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CrystalCollection;
