'use client';

import { Star, Check, Bell, BellOff, Trash2, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CrystalWishlistItem, CRYSTAL_FORMS, PRIORITY_OPTIONS } from '../types';

interface WishlistSectionProps {
  items: CrystalWishlistItem[];
  isLoading: boolean;
  onEdit: (item: CrystalWishlistItem) => void;
  onDelete: (item: CrystalWishlistItem) => void;
  onMarkAcquired: (item: CrystalWishlistItem) => void;
}

const WishlistSection: React.FC<WishlistSectionProps> = ({
  items,
  isLoading,
  onEdit,
  onDelete,
  onMarkAcquired,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
        <p className="text-slate-400 text-sm">Loading wishlist...</p>
      </div>
    );
  }

  // Separate active and acquired items
  const activeItems = items.filter(item => !item.isAcquired);
  const acquiredItems = items.filter(item => item.isAcquired);

  // Sort active items by priority
  const sortedActiveItems = [...activeItems].sort((a, b) => (a.priority || 3) - (b.priority || 3));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
          <Star className="w-6 h-6 text-purple-400/50" />
        </div>
        <h3 className="text-white font-medium mb-1">No Wishlist Items</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Add crystals you&apos;re dreaming of to your wishlist.
        </p>
      </div>
    );
  }

  const getPriorityLabel = (priority?: number) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority)?.label || 'Medium';
  };

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 1: return 'text-red-400 bg-red-500/20';
      case 2: return 'text-orange-400 bg-orange-500/20';
      case 3: return 'text-yellow-400 bg-yellow-500/20';
      case 4: return 'text-blue-400 bg-blue-500/20';
      case 5: return 'text-slate-400 bg-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Wishlist Items */}
      {sortedActiveItems.length > 0 && (
        <div className="space-y-3">
          {sortedActiveItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
              data-testid={`wishlist-item-${item.id}`}
            >
              {/* Priority Badge */}
              <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                {getPriorityLabel(item.priority)}
              </div>

              {/* Crystal Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{item.name}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.preferredForm && (
                    <span className="text-slate-400 text-xs">
                      {CRYSTAL_FORMS.find(f => f.key === item.preferredForm)?.label}
                    </span>
                  )}
                  {item.preferredSize && (
                    <span className="text-slate-400 text-xs">• {item.preferredSize}</span>
                  )}
                  {item.maxBudget && (
                    <span className="text-slate-400 text-xs">
                      • Up to {item.currency} {item.maxBudget}
                    </span>
                  )}
                </div>
                {item.purpose && (
                  <p className="text-slate-500 text-xs mt-1 truncate">{item.purpose}</p>
                )}
              </div>

              {/* Alert Status */}
              <div className="flex items-center" title={item.alertEnabled ? "Alerts enabled" : "Alerts disabled"}>
                {item.alertEnabled ? (
                  <Bell className="w-4 h-4 text-purple-400" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-500" />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAcquired(item)}
                  className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  title="Mark as acquired"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acquired Items (Collapsed) */}
      {acquiredItems.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-slate-400 text-sm mb-3 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Acquired ({acquiredItems.length})
          </h4>
          <div className="space-y-2">
            {acquiredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg opacity-75"
              >
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 line-through">{item.name}</span>
                {item.acquiredDate && (
                  <span className="text-slate-500 text-xs ml-auto">
                    {new Date(item.acquiredDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistSection;
