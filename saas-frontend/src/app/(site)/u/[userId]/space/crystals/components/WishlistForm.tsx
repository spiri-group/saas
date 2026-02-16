'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Star, Save, Loader2, Bell } from 'lucide-react';
import {
  WishlistFormState,
  CrystalWishlistItem,
  CrystalForm,
  CRYSTAL_FORMS,
  PRIORITY_OPTIONS,
} from '../types';
import { useCreateWishlistItem, useUpdateWishlistItem } from '../hooks';
import CrystalTypeSelector from './CrystalTypeSelector';

interface WishlistFormProps {
  userId: string;
  existingItem?: CrystalWishlistItem | null;
  onSuccess?: () => void;
}

const getDefaultFormState = (): WishlistFormState => ({
  name: '',
  crystalRefId: undefined,
  preferredForm: undefined,
  preferredSize: '',
  preferredOrigin: '',
  maxBudget: undefined,
  currency: 'USD',
  purpose: '',
  reason: '',
  alertEnabled: false,
  priority: 3,
});

const WishlistForm: React.FC<WishlistFormProps> = ({
  userId,
  existingItem,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<WishlistFormState>(getDefaultFormState());

  const createMutation = useCreateWishlistItem();
  const updateMutation = useUpdateWishlistItem();

  const isEditing = !!existingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (existingItem) {
      setFormState({
        name: existingItem.name,
        crystalRefId: existingItem.crystalRefId,
        preferredForm: existingItem.preferredForm,
        preferredSize: existingItem.preferredSize || '',
        preferredOrigin: existingItem.preferredOrigin || '',
        maxBudget: existingItem.maxBudget,
        currency: existingItem.currency || 'USD',
        purpose: existingItem.purpose || '',
        reason: existingItem.reason || '',
        alertEnabled: existingItem.alertEnabled || false,
        priority: existingItem.priority || 3,
      });
    }
  }, [existingItem]);

  // Handle crystal type selection
  const handleCrystalTypeSelect = (crystal: { id: string | null; name: string } | null) => {
    if (crystal) {
      setFormState(prev => ({
        ...prev,
        name: crystal.name,
        crystalRefId: crystal.id,
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        crystalRefId: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name.trim()) return;

    try {
      if (isEditing && existingItem) {
        await updateMutation.mutateAsync({
          id: existingItem.id,
          userId,
          ...formState,
          name: formState.name.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          ...formState,
          name: formState.name.trim(),
        });
      }

      onSuccess?.();

      if (!isEditing) {
        setFormState(getDefaultFormState());
      }
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="wishlist-form">
      {/* Crystal Type Selector */}
      <div>
        <Label dark>
          Crystal Type
        </Label>
        <p className="text-xs text-slate-500 mb-2">
          Search our database or enter a custom crystal name
        </p>
        <CrystalTypeSelector
          value={formState.name ? { id: formState.crystalRefId || null, name: formState.name } : null}
          onChange={handleCrystalTypeSelect}
          placeholder="Search crystal database..."
        />
      </div>

      {/* Crystal Name (manual entry/override) */}
      <div>
        <Label htmlFor="wishName" dark>
          Crystal Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="wishName"
          value={formState.name}
          onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value, crystalRefId: undefined }))}
          placeholder="e.g., Black Tourmaline, Labradorite"
          dark
          className="mt-1"
          data-testid="wishlist-name-input"
        />
        {formState.crystalRefId && (
          <p className="text-xs text-purple-400 mt-1">
            Linked to crystal database
          </p>
        )}
      </div>

      {/* Priority */}
      <div>
        <Label dark>Priority</Label>
        <div className="flex gap-2 mt-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormState(prev => ({ ...prev, priority: option.value }))}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                formState.priority === option.value
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label dark>Preferred Form</Label>
          <Select
            value={formState.preferredForm || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, preferredForm: value as CrystalForm }))}
            dark
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Any form" />
            </SelectTrigger>
            <SelectContent>
              {CRYSTAL_FORMS.map((form) => (
                <SelectItem key={form.key} value={form.key}>
                  {form.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="wishSize" dark>Preferred Size</Label>
          <Input
            id="wishSize"
            value={formState.preferredSize}
            onChange={(e) => setFormState(prev => ({ ...prev, preferredSize: e.target.value }))}
            placeholder="e.g., Palm size"
            dark
            className="mt-1"
          />
        </div>
      </div>

      {/* Origin */}
      <div>
        <Label htmlFor="wishOrigin" dark>Preferred Origin</Label>
        <Input
          id="wishOrigin"
          value={formState.preferredOrigin}
          onChange={(e) => setFormState(prev => ({ ...prev, preferredOrigin: e.target.value }))}
          placeholder="e.g., Madagascar, Brazil"
          dark
          className="mt-1"
        />
      </div>

      {/* Budget Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maxBudget" dark>Max Budget</Label>
          <Input
            id="maxBudget"
            type="number"
            value={formState.maxBudget || ''}
            onChange={(e) => setFormState(prev => ({ ...prev, maxBudget: e.target.value ? parseFloat(e.target.value) : undefined }))}
            placeholder="0.00"
            dark
            className="mt-1"
          />
        </div>

        <div>
          <Label dark>Currency</Label>
          <Select
            value={formState.currency}
            onValueChange={(value) => setFormState(prev => ({ ...prev, currency: value }))}
            dark
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Purpose */}
      <div>
        <Label htmlFor="wishPurpose" dark>Purpose</Label>
        <Input
          id="wishPurpose"
          value={formState.purpose}
          onChange={(e) => setFormState(prev => ({ ...prev, purpose: e.target.value }))}
          placeholder="What will you use this crystal for?"
          dark
          className="mt-1"
        />
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="wishReason" dark>Why do you want this crystal?</Label>
        <Textarea
          id="wishReason"
          value={formState.reason}
          onChange={(e) => setFormState(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="What draws you to this crystal?"
          dark
          className="mt-1 min-h-[80px]"
        />
      </div>

      {/* Alert Toggle */}
      <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-white text-sm font-medium">Marketplace Alerts</p>
            <p className="text-slate-400 text-xs">Get notified when this crystal appears in the marketplace</p>
          </div>
        </div>
        <Switch
          checked={formState.alertEnabled}
          onCheckedChange={(checked) => setFormState(prev => ({ ...prev, alertEnabled: checked }))}
          dark
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !formState.name.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        data-testid="wishlist-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Saving...' : 'Adding...'}
          </>
        ) : (
          <>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Add to Wishlist'}
          </>
        )}
      </Button>
    </form>
  );
};

export default WishlistForm;
