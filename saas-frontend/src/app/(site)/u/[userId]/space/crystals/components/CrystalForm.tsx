'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Gem, Save, Loader2, Heart, Sparkles } from 'lucide-react';
import {
  CrystalFormState,
  CrystalCollectionItem,
  CrystalColor,
  CrystalForm as CrystalFormType,
  CrystalAcquisitionSource,
  ChakraType,
  CRYSTAL_COLORS,
  CRYSTAL_FORMS,
  ACQUISITION_SOURCES,
  CHAKRAS,
} from '../types';
import { useCreateCrystal, useUpdateCrystal } from '../hooks';
import CrystalTypeSelector from './CrystalTypeSelector';

interface CrystalFormProps {
  userId: string;
  existingCrystal?: CrystalCollectionItem | null;
  onSuccess?: () => void;
}

const getDefaultFormState = (): CrystalFormState => ({
  name: '',
  crystalRefId: undefined,
  color: undefined,
  form: undefined,
  size: '',
  weight: undefined,
  origin: '',
  primaryPurpose: '',
  chakras: [],
  elements: [],
  zodiacSigns: [],
  nickname: '',
  personalMeaning: '',
  specialBond: false,
  energyNotes: '',
  acquisitionSource: undefined,
  acquiredFrom: '',
  acquiredDate: '',
  purchasePrice: undefined,
  currency: 'USD',
  location: '',
  photoUrl: '',
});

const CrystalForm: React.FC<CrystalFormProps> = ({
  userId,
  existingCrystal,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<CrystalFormState>(getDefaultFormState());

  const createMutation = useCreateCrystal();
  const updateMutation = useUpdateCrystal();

  const isEditing = !!existingCrystal;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form with existing data if editing
  useEffect(() => {
    if (existingCrystal) {
      setFormState({
        name: existingCrystal.name,
        crystalRefId: existingCrystal.crystalRefId,
        color: existingCrystal.color,
        form: existingCrystal.form,
        size: existingCrystal.size || '',
        weight: existingCrystal.weight,
        origin: existingCrystal.origin || '',
        primaryPurpose: existingCrystal.primaryPurpose || '',
        chakras: existingCrystal.chakras || [],
        elements: existingCrystal.elements || [],
        zodiacSigns: existingCrystal.zodiacSigns || [],
        nickname: existingCrystal.nickname || '',
        personalMeaning: existingCrystal.personalMeaning || '',
        specialBond: existingCrystal.specialBond,
        energyNotes: existingCrystal.energyNotes || '',
        acquisitionSource: existingCrystal.acquisitionSource,
        acquiredFrom: existingCrystal.acquiredFrom || '',
        acquiredDate: existingCrystal.acquiredDate || '',
        purchasePrice: existingCrystal.purchasePrice,
        currency: existingCrystal.currency || 'USD',
        location: existingCrystal.location || '',
        photoUrl: existingCrystal.photoUrl || '',
      });
    }
  }, [existingCrystal]);

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

  const handleChakraToggle = (chakra: ChakraType) => {
    setFormState(prev => ({
      ...prev,
      chakras: prev.chakras.includes(chakra)
        ? prev.chakras.filter(c => c !== chakra)
        : [...prev.chakras, chakra],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name.trim()) return;

    // Clean up empty strings for enum fields - GraphQL doesn't accept "" for enums
    const cleanedData = {
      ...formState,
      name: formState.name.trim(),
      color: formState.color || undefined,
      form: formState.form || undefined,
      acquisitionSource: formState.acquisitionSource || undefined,
    };

    try {
      if (isEditing && existingCrystal) {
        await updateMutation.mutateAsync({
          id: existingCrystal.id,
          userId,
          ...cleanedData,
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          ...cleanedData,
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
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="crystal-form">
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Info</h3>

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

        {/* Name (manual entry/override) */}
        <div>
          <Label htmlFor="name" dark>
            Crystal Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name"
            value={formState.name}
            onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value, crystalRefId: undefined }))}
            placeholder="e.g., Amethyst, Clear Quartz, Rose Quartz"
            dark
            className="mt-1"
            data-testid="crystal-name-input"
          />
          {formState.crystalRefId && (
            <p className="text-xs text-purple-400 mt-1">
              Linked to crystal database
            </p>
          )}
        </div>

        {/* Nickname */}
        <div>
          <Label htmlFor="nickname" dark>
            Nickname (optional)
          </Label>
          <Input
            id="nickname"
            value={formState.nickname}
            onChange={(e) => setFormState(prev => ({ ...prev, nickname: e.target.value }))}
            placeholder="Give your crystal a personal name"
            dark
            className="mt-1"
          />
        </div>

        {/* Color & Form Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label dark>Color</Label>
            <Select
              value={formState.color || ''}
              onValueChange={(value) => setFormState(prev => ({ ...prev, color: value as CrystalColor }))}
              dark
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {CRYSTAL_COLORS.map((color) => (
                  <SelectItem key={color.key} value={color.key}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label dark>Form</Label>
            <Select
              value={formState.form || ''}
              onValueChange={(value) => setFormState(prev => ({ ...prev, form: value as CrystalFormType }))}
              dark
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select form" />
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
        </div>

        {/* Size & Weight Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="size" dark>Size</Label>
            <Input
              id="size"
              value={formState.size}
              onChange={(e) => setFormState(prev => ({ ...prev, size: e.target.value }))}
              placeholder="e.g., Small, 2 inches"
              dark
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="weight" dark>Weight (grams)</Label>
            <Input
              id="weight"
              type="number"
              value={formState.weight || ''}
              onChange={(e) => setFormState(prev => ({ ...prev, weight: e.target.value ? parseFloat(e.target.value) : undefined }))}
              placeholder="e.g., 50"
              dark
              className="mt-1"
            />
          </div>
        </div>

        {/* Origin */}
        <div>
          <Label htmlFor="origin" dark>Origin</Label>
          <Input
            id="origin"
            value={formState.origin}
            onChange={(e) => setFormState(prev => ({ ...prev, origin: e.target.value }))}
            placeholder="e.g., Brazil, Madagascar, Uruguay"
            dark
            className="mt-1"
          />
        </div>
      </div>

      {/* Spiritual Properties Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Spiritual Properties
        </h3>

        {/* Primary Purpose */}
        <div>
          <Label htmlFor="purpose" dark>Primary Purpose</Label>
          <Input
            id="purpose"
            value={formState.primaryPurpose}
            onChange={(e) => setFormState(prev => ({ ...prev, primaryPurpose: e.target.value }))}
            placeholder="e.g., Protection, Love, Clarity, Grounding"
            dark
            className="mt-1"
          />
        </div>

        {/* Chakras */}
        <div>
          <Label dark className="mb-2 block">Associated Chakras</Label>
          <div className="flex flex-wrap gap-2">
            {CHAKRAS.map((chakra) => (
              <button
                key={chakra.key}
                type="button"
                onClick={() => handleChakraToggle(chakra.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  formState.chakras.includes(chakra.key)
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                }`}
                style={{
                  borderLeftColor: formState.chakras.includes(chakra.key) ? chakra.color : undefined,
                  borderLeftWidth: formState.chakras.includes(chakra.key) ? '3px' : undefined,
                }}
              >
                {chakra.label}
              </button>
            ))}
          </div>
        </div>

        {/* Personal Meaning */}
        <div>
          <Label htmlFor="meaning" dark>Personal Meaning</Label>
          <Textarea
            id="meaning"
            value={formState.personalMeaning}
            onChange={(e) => setFormState(prev => ({ ...prev, personalMeaning: e.target.value }))}
            placeholder="What does this crystal mean to you personally?"
            dark
            className="mt-1 min-h-[80px]"
          />
        </div>

        {/* Energy Notes */}
        <div>
          <Label htmlFor="energy" dark>Energy Notes</Label>
          <Textarea
            id="energy"
            value={formState.energyNotes}
            onChange={(e) => setFormState(prev => ({ ...prev, energyNotes: e.target.value }))}
            placeholder="How does this crystal feel when you hold it?"
            dark
            className="mt-1 min-h-[80px]"
          />
        </div>

        {/* Special Bond */}
        <div className="flex items-center space-x-3 p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
          <Checkbox
            id="specialBond"
            checked={formState.specialBond}
            onCheckedChange={(checked) => setFormState(prev => ({ ...prev, specialBond: checked as boolean }))}
            className="border-pink-400/50 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            dark
          />
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            <Label htmlFor="specialBond" dark className="cursor-pointer">
              This crystal has a special bond with me
            </Label>
          </div>
        </div>
      </div>

      {/* Acquisition Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Acquisition Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label dark>Source</Label>
            <Select
              value={formState.acquisitionSource || ''}
              onValueChange={(value) => setFormState(prev => ({ ...prev, acquisitionSource: value as CrystalAcquisitionSource }))}
              dark
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="How acquired?" />
              </SelectTrigger>
              <SelectContent>
                {ACQUISITION_SOURCES.map((source) => (
                  <SelectItem key={source.key} value={source.key}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="acquiredDate" dark>Date Acquired</Label>
            <Input
              id="acquiredDate"
              type="date"
              value={formState.acquiredDate}
              onChange={(e) => setFormState(prev => ({ ...prev, acquiredDate: e.target.value }))}
              dark
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="acquiredFrom" dark>Acquired From</Label>
          <Input
            id="acquiredFrom"
            value={formState.acquiredFrom}
            onChange={(e) => setFormState(prev => ({ ...prev, acquiredFrom: e.target.value }))}
            placeholder="Shop name, person, event, etc."
            dark
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price" dark>Purchase Price</Label>
            <Input
              id="price"
              type="number"
              value={formState.purchasePrice || ''}
              onChange={(e) => setFormState(prev => ({ ...prev, purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
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

        <div>
          <Label htmlFor="location" dark>Current Location</Label>
          <Input
            id="location"
            value={formState.location}
            onChange={(e) => setFormState(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Where is this crystal kept?"
            dark
            className="mt-1"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !formState.name.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        data-testid="submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Saving...' : 'Adding...'}
          </>
        ) : (
          <>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Gem className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Add to Collection'}
          </>
        )}
      </Button>
    </form>
  );
};

export default CrystalForm;
