'use client';

import { LayoutGrid } from "lucide-react";

type Props = {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
};

const CategoryFilter = ({ categories, selected, onSelect }: Props) => {
  if (categories.length === 0) return null;

  return (
    <div
      className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5 -mx-1 px-1"
      data-testid="pos-category-filter"
    >
      <button
        data-testid="pos-category-all"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all touch-manipulation flex-shrink-0 ${
          selected === null
            ? 'bg-purple-600 text-white shadow-sm'
            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600'
        }`}
      >
        <LayoutGrid className="h-3 w-3" />
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          data-testid={`pos-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={() => onSelect(selected === cat ? null : cat)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all touch-manipulation flex-shrink-0 ${
            selected === cat
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
