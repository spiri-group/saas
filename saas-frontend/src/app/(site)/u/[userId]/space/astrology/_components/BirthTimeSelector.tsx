'use client';

import { useState, useEffect } from 'react';
import { Clock, Sun, Sunset, Moon, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BirthTimePrecision, ApproximateTimeRange } from '../_hooks/useBirthChart';

interface Props {
  precision: BirthTimePrecision;
  exactTime?: string;
  approximateRange?: ApproximateTimeRange;
  onPrecisionChange: (precision: BirthTimePrecision) => void;
  onExactTimeChange: (time: string) => void;
  onApproximateRangeChange: (range: ApproximateTimeRange) => void;
  disabled?: boolean;
}

const PRECISION_OPTIONS: { key: BirthTimePrecision; label: string; description: string }[] = [
  { key: 'exact', label: 'I know my exact time', description: 'Most accurate chart' },
  { key: 'approximate', label: 'I know approximately', description: 'Partial accuracy' },
  { key: 'unknown', label: 'I don\'t know', description: 'Sun sign only' },
];

const TIME_RANGES: { key: ApproximateTimeRange; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'morning', label: 'Morning', icon: <Sun className="w-5 h-5" />, description: '6 AM - 12 PM' },
  { key: 'afternoon', label: 'Afternoon', icon: <Sun className="w-5 h-5 text-orange-400" />, description: '12 PM - 6 PM' },
  { key: 'evening', label: 'Evening', icon: <Sunset className="w-5 h-5 text-pink-400" />, description: '6 PM - 12 AM' },
  { key: 'night', label: 'Night', icon: <Moon className="w-5 h-5 text-blue-400" />, description: '12 AM - 6 AM' },
];

export const BirthTimeSelector: React.FC<Props> = ({
  precision,
  exactTime,
  approximateRange,
  onPrecisionChange,
  onExactTimeChange,
  onApproximateRangeChange,
  disabled = false,
}) => {
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

  // Parse exact time into components when it changes externally
  useEffect(() => {
    if (exactTime) {
      const [h, m] = exactTime.split(':').map(Number);
      const isPM = h >= 12;
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      setHours(displayHour.toString().padStart(2, '0'));
      setMinutes(m.toString().padStart(2, '0'));
      setPeriod(isPM ? 'PM' : 'AM');
    }
  }, [exactTime]);

  // Update exact time when components change
  const updateExactTime = (newHours: string, newMinutes: string, newPeriod: 'AM' | 'PM') => {
    let hour24 = parseInt(newHours);
    if (newPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (newPeriod === 'AM' && hour24 === 12) hour24 = 0;
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinutes}`;
    onExactTimeChange(timeString);
  };

  const handleHoursChange = (value: string) => {
    // Allow only digits, max 2 chars
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setHours(cleaned);
  };

  const handleHoursBlur = () => {
    const num = parseInt(hours) || 12;
    const clamped = Math.max(1, Math.min(12, num));
    const newHours = clamped.toString().padStart(2, '0');
    setHours(newHours);
    updateExactTime(newHours, minutes.padStart(2, '0'), period);
  };

  const handleMinutesChange = (value: string) => {
    // Allow only digits, max 2 chars
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setMinutes(cleaned);
  };

  const handleMinutesBlur = () => {
    const num = parseInt(minutes) || 0;
    const clamped = Math.max(0, Math.min(59, num));
    const newMinutes = clamped.toString().padStart(2, '0');
    setMinutes(newMinutes);
    updateExactTime(hours.padStart(2, '0'), newMinutes, period);
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod);
    updateExactTime(hours, minutes, newPeriod);
  };

  return (
    <div className="space-y-4">
      {/* Precision Selection */}
      <div className="grid grid-cols-3 gap-2">
        {PRECISION_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => !disabled && onPrecisionChange(option.key)}
            disabled={disabled}
            className={`p-3 rounded-lg border transition-all text-left ${
              precision === option.key
                ? 'border-amber-500 bg-amber-500/20 text-white'
                : 'border-white/20 bg-slate-800/50 text-slate-400 hover:border-white/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            data-testid={`precision-${option.key}`}
          >
            <div className="font-medium text-sm">{option.label}</div>
            <div className="text-xs opacity-70 mt-1">{option.description}</div>
          </button>
        ))}
      </div>

      {/* Exact Time Input */}
      {precision === 'exact' && (
        <div className="space-y-2">
          <Label className="text-slate-300">Birth Time</Label>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-1 bg-slate-800/50 border border-white/20 rounded-lg p-1">
              <Input
                type="text"
                value={hours}
                onChange={(e) => handleHoursChange(e.target.value)}
                onBlur={handleHoursBlur}
                className="w-12 text-center bg-transparent border-0 text-white p-2"
                maxLength={2}
                disabled={disabled}
                data-testid="time-hours"
              />
              <span className="text-white text-xl">:</span>
              <Input
                type="text"
                value={minutes}
                onChange={(e) => handleMinutesChange(e.target.value)}
                onBlur={handleMinutesBlur}
                className="w-12 text-center bg-transparent border-0 text-white p-2"
                maxLength={2}
                disabled={disabled}
                data-testid="time-minutes"
              />
              <div className="flex ml-2">
                <button
                  type="button"
                  onClick={() => !disabled && handlePeriodChange('AM')}
                  disabled={disabled}
                  className={`px-3 py-1 rounded-l text-sm font-medium transition-colors ${
                    period === 'AM'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                  data-testid="time-am"
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => !disabled && handlePeriodChange('PM')}
                  disabled={disabled}
                  className={`px-3 py-1 rounded-r text-sm font-medium transition-colors ${
                    period === 'PM'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                  data-testid="time-pm"
                >
                  PM
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Check your birth certificate or ask a family member for the most accurate time.
          </p>
        </div>
      )}

      {/* Approximate Time Selection */}
      {precision === 'approximate' && (
        <div className="space-y-2">
          <Label className="text-slate-300">Approximate Time of Day</Label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => !disabled && onApproximateRangeChange(range.key)}
                disabled={disabled}
                className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${
                  approximateRange === range.key
                    ? 'border-amber-500 bg-amber-500/20 text-white'
                    : 'border-white/20 bg-slate-800/50 text-slate-400 hover:border-white/40'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={`range-${range.key}`}
              >
                {range.icon}
                <div className="text-left">
                  <div className="font-medium">{range.label}</div>
                  <div className="text-xs opacity-70">{range.description}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-200/80">
              With an approximate time, your Rising sign and house placements will be calculated but marked as approximate.
            </p>
          </div>
        </div>
      )}

      {/* Unknown Time Info */}
      {precision === 'unknown' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-slate-800/50 border border-white/20 rounded-lg">
            <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="font-medium mb-1">What you&apos;ll still get:</p>
              <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                <li>Your Sun sign (accurate)</li>
                <li>Your Moon sign (may be inaccurate if Moon changed signs that day)</li>
                <li>Planet positions in signs</li>
                <li>Aspects between planets</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <Moon className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-200/80">
              <p className="font-medium mb-1">What you won&apos;t get:</p>
              <ul className="text-orange-300/70 text-xs space-y-1 list-disc list-inside">
                <li>Rising sign (Ascendant)</li>
                <li>House placements</li>
                <li>Exact Moon position if Moon changed signs</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthTimeSelector;
