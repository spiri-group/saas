'use client';

import { Gem, Heart, MapPin, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CrystalCollectionItem, CRYSTAL_COLORS, CRYSTAL_FORMS, CHAKRAS } from '../types';

interface CrystalCardProps {
  crystal: CrystalCollectionItem;
  onEdit: (crystal: CrystalCollectionItem) => void;
  onDelete: (crystal: CrystalCollectionItem) => void;
  onSelect?: (crystal: CrystalCollectionItem) => void;
}

const CrystalCard: React.FC<CrystalCardProps> = ({
  crystal,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const colorLabel = CRYSTAL_COLORS.find(c => c.key === crystal.color)?.label;
  const formLabel = CRYSTAL_FORMS.find(f => f.key === crystal.form)?.label;

  return (
    <div
      className={`relative group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all ${
        onSelect ? 'cursor-pointer' : ''
      }`}
      onClick={() => onSelect?.(crystal)}
      data-testid={`crystal-card-${crystal.id}`}
    >
      {/* Actions Menu */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-white/20">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(crystal);
              }}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(crystal);
              }}
              className="text-red-400 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Special Bond Indicator */}
      {crystal.specialBond && (
        <div className="absolute top-3 left-3">
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
        </div>
      )}

      {/* Crystal Icon/Photo Placeholder */}
      <div className="flex justify-center mb-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
          <Gem className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      {/* Crystal Name */}
      <h3 className="text-white font-medium text-center mb-1">
        {crystal.nickname || crystal.name}
      </h3>
      {crystal.nickname && (
        <p className="text-slate-400 text-xs text-center mb-2">{crystal.name}</p>
      )}

      {/* Properties */}
      <div className="flex flex-wrap justify-center gap-1 mb-3">
        {colorLabel && (
          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300">
            {colorLabel}
          </span>
        )}
        {formLabel && (
          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300">
            {formLabel}
          </span>
        )}
      </div>

      {/* Chakras */}
      {crystal.chakras && crystal.chakras.length > 0 && (
        <div className="flex justify-center gap-1 mb-3">
          {crystal.chakras.slice(0, 3).map((chakra) => {
            const chakraInfo = CHAKRAS.find(c => c.key === chakra);
            return (
              <div
                key={chakra}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chakraInfo?.color }}
                title={chakraInfo?.label}
              />
            );
          })}
          {crystal.chakras.length > 3 && (
            <span className="text-xs text-slate-400">+{crystal.chakras.length - 3}</span>
          )}
        </div>
      )}

      {/* Location */}
      {crystal.location && (
        <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
          <MapPin className="w-3 h-3" />
          <span>{crystal.location}</span>
        </div>
      )}

      {/* Inactive Badge */}
      {!crystal.isActive && (
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-600/50 rounded text-xs text-slate-400">
          Inactive
        </div>
      )}
    </div>
  );
};

export default CrystalCard;
