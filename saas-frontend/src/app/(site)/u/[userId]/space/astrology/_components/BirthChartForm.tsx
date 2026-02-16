'use client';

import { useState, useEffect } from 'react';
import { Loader2, Calendar, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CityAutocomplete } from './CityAutocomplete';
import { BirthTimeSelector } from './BirthTimeSelector';
import {
  BirthChart,
  BirthTimePrecision,
  ApproximateTimeRange,
  CitySearchResult,
  useCreateBirthChart,
  useUpdateBirthChart,
} from '../_hooks/useBirthChart';

interface Props {
  userId: string;
  existingChart?: BirthChart | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const BirthChartForm: React.FC<Props> = ({
  userId,
  existingChart,
  onSuccess,
  onCancel,
}) => {
  const createMutation = useCreateBirthChart();
  const updateMutation = useUpdateBirthChart();

  // Form state
  const [birthDate, setBirthDate] = useState('');
  const [birthTimePrecision, setBirthTimePrecision] = useState<BirthTimePrecision>('exact');
  const [exactTime, setExactTime] = useState('12:00');
  const [approximateRange, setApproximateRange] = useState<ApproximateTimeRange>('afternoon');
  const [selectedCity, setSelectedCity] = useState<CitySearchResult | null>(null);
  const [locationNote, setLocationNote] = useState('');

  // Initialize form with existing data
  useEffect(() => {
    if (existingChart) {
      setBirthDate(existingChart.birthDate);
      setBirthTimePrecision(existingChart.birthTimePrecision);
      if (existingChart.birthTime) {
        setExactTime(existingChart.birthTime);
      }
      if (existingChart.birthTimeApproximate) {
        setApproximateRange(existingChart.birthTimeApproximate);
      }
      if (existingChart.birthLocation) {
        setSelectedCity({
          id: `${existingChart.birthLocation.city}-${existingChart.birthLocation.country}`,
          city: existingChart.birthLocation.city,
          country: existingChart.birthLocation.country,
          countryCode: existingChart.birthLocation.countryCode,
          latitude: existingChart.birthLocation.latitude,
          longitude: existingChart.birthLocation.longitude,
          timezone: existingChart.birthLocation.timezone,
        });
        setLocationNote(existingChart.birthLocation.note || '');
      }
    }
  }, [existingChart]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const isValid = birthDate && selectedCity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !selectedCity) return;

    const input = {
      userId,
      birthDate,
      birthTimePrecision,
      birthTime: birthTimePrecision === 'exact' ? exactTime : undefined,
      birthTimeApproximate: birthTimePrecision === 'approximate' ? approximateRange : undefined,
      birthLocation: {
        city: selectedCity.city,
        country: selectedCity.country,
        countryCode: selectedCity.countryCode,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        timezone: selectedCity.timezone,
        note: locationNote || undefined,
      },
    };

    try {
      if (existingChart) {
        await updateMutation.mutateAsync({ id: existingChart.id, ...input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save birth chart:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Birth Date */}
      <div className="space-y-2">
        <Label dark className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Birth Date
        </Label>
        <Input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          dark
          required
          data-testid="birth-date-input"
        />
      </div>

      {/* Birth Time */}
      <div className="space-y-2">
        <Label dark>Birth Time</Label>
        <BirthTimeSelector
          precision={birthTimePrecision}
          exactTime={exactTime}
          approximateRange={approximateRange}
          onPrecisionChange={setBirthTimePrecision}
          onExactTimeChange={setExactTime}
          onApproximateRangeChange={setApproximateRange}
        />
      </div>

      {/* Birth Location */}
      <div className="space-y-2">
        <Label dark className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Birth Location
        </Label>
        <CityAutocomplete
          value={selectedCity}
          onChange={setSelectedCity}
          placeholder="Search for your birth city..."
        />
        {selectedCity && (
          <div className="mt-2">
            <Label dark className="text-xs">
              Location note (optional)
            </Label>
            <Textarea
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g., Born in a small town near this city..."
              dark
              className="mt-1 text-sm"
              rows={2}
              data-testid="location-note-input"
            />
          </div>
        )}
      </div>

      {/* Info about recalculation */}
      {existingChart && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200/80">
            Saving changes will recalculate your entire chart based on the new data.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!isValid || isPending}
          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          data-testid="save-birth-chart-btn"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingChart ? 'Update Chart' : 'Calculate My Chart'}
        </Button>
      </div>
    </form>
  );
};

export default BirthChartForm;
