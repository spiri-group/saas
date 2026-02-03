'use client';

import { useState, useMemo } from 'react';
import { Star, Plus, Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  WishlistForm,
  WishlistSection,
} from '../components';
import { CrystalWishlistItem } from '../types';
import {
  useCrystalWishlist,
  useDeleteWishlistItem,
  useUpdateWishlistItem,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CrystalWishlistItem | null>(null);

  const { data: items = [], isLoading } = useCrystalWishlist(userId);
  const deleteMutation = useDeleteWishlistItem();
  const updateMutation = useUpdateWishlistItem();

  const handleEdit = (item: CrystalWishlistItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleMarkAcquired = async (item: CrystalWishlistItem) => {
    await updateMutation.mutateAsync({
      id: item.id,
      userId,
      isAcquired: true,
      acquiredDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (item: CrystalWishlistItem) => {
    if (confirm(`Are you sure you want to remove "${item.name}" from your wishlist?`)) {
      await deleteMutation.mutateAsync({ id: item.id, userId });
    }
  };

  // Calculate insights
  const insights = useMemo(() => {
    const activeItems = items.filter(i => !i.isAcquired);
    const acquiredItems = items.filter(i => i.isAcquired);

    // Recently acquired (last 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recentlyAcquired = acquiredItems.filter(i =>
      i.acquiredDate && new Date(i.acquiredDate) >= monthAgo
    ).length;

    // High priority items (priority 1 = Must Have, 2 = High Priority)
    const highPriority = activeItems.filter(i => i.priority !== undefined && i.priority <= 2).length;

    return {
      activeCount: activeItems.length,
      acquiredCount: acquiredItems.length,
      recentlyAcquired,
      highPriority,
      totalItems: items.length,
    };
  }, [items]);

  const hasData = items.length > 0;

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-amber-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-orange-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Empty State - Centered welcoming design */}
        {!hasData && !isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-4 bg-yellow-500/20 rounded-2xl mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-light text-white mb-2">Crystal Wishlist</h1>
            <p className="text-slate-400 mb-8">Crystals calling to your spirit, waiting to join your collection</p>

            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Dream of Your Next Crystal</h3>
              <p className="text-slate-400 mb-4 max-w-md mx-auto">
                Add crystals you&apos;re drawn to. Setting intentions for what you wish to manifest helps bring these sacred stones into your life.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                data-testid="add-wishlist-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Wish
              </Button>
            </div>
          </div>
        )}

        {/* Has Data - Compact layout */}
        {hasData && (
          <>
            {/* Compact Header Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-xl">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-xl font-light text-white">Crystal Wishlist</h1>
                  <p className="text-slate-500 text-sm">Crystals calling to your spirit</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg"
                data-testid="add-wishlist-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Wishlist
              </Button>
            </div>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <Heart className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-medium">{insights.activeCount}</span>
                <span className="text-slate-400">on wishlist</span>
              </div>
              {insights.acquiredCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">{insights.acquiredCount}</span>
                  <span className="text-emerald-300/80">manifested</span>
                </div>
              )}
              {insights.recentlyAcquired > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 rounded-lg">
                  <span className="text-teal-300 font-medium">{insights.recentlyAcquired}</span>
                  <span className="text-teal-300/80">this month</span>
                </div>
              )}
              {insights.highPriority > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-medium">{insights.highPriority}</span>
                  <span className="text-amber-300/80">high priority</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {insights.acquiredCount > 0 && insights.totalItems > 0 && (
              <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Manifestation Progress</span>
                  <span className="text-yellow-300 text-sm font-medium">
                    {insights.acquiredCount} of {insights.totalItems}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(insights.acquiredCount / insights.totalItems) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Wishlist Section */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <WishlistSection
                items={items}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkAcquired={handleMarkAcquired}
              />
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="bg-slate-900 border-white/20 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              {editingItem ? 'Edit Wishlist Item' : 'Add to Wishlist'}
            </DialogTitle>
          </DialogHeader>

          <WishlistForm
            userId={userId}
            existingItem={editingItem}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
