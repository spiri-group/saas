'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  useCreateLovedOne,
  useUpdateLovedOne,
  LovedOneInSpirit,
  SignExplanation,
  ImportantDate,
} from '../../hooks';

interface Props {
  userId: string;
  existingLovedOne?: LovedOneInSpirit | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  relationship: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  lessonsLearned?: string;
}

const COMMON_RELATIONSHIPS = [
  'Mother', 'Father', 'Grandmother', 'Grandfather',
  'Sister', 'Brother', 'Aunt', 'Uncle',
  'Friend', 'Partner', 'Child', 'Pet',
];

export const LovedOneForm: React.FC<Props> = ({ userId, existingLovedOne, onSuccess }) => {
  const createMutation = useCreateLovedOne();
  const updateMutation = useUpdateLovedOne();

  const [sharedInterests, setSharedInterests] = useState<string[]>(existingLovedOne?.sharedInterests || []);
  const [commonSigns, setCommonSigns] = useState<string[]>(existingLovedOne?.commonSigns || []);
  const [signExplanations, setSignExplanations] = useState<SignExplanation[]>(existingLovedOne?.signExplanations || []);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>(existingLovedOne?.importantDates || []);

  const [newInterest, setNewInterest] = useState('');
  const [newSign, setNewSign] = useState('');
  const [newSignReason, setNewSignReason] = useState('');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateOccasion, setNewDateOccasion] = useState('');
  const [newDateReminder, setNewDateReminder] = useState(true);

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      name: existingLovedOne?.name || '',
      relationship: existingLovedOne?.relationship || '',
      nickname: existingLovedOne?.nickname || '',
      birthDate: existingLovedOne?.birthDate || '',
      passingDate: existingLovedOne?.passingDate || '',
      passingCircumstances: existingLovedOne?.passingCircumstances || '',
      personalMemory: existingLovedOne?.personalMemory || '',
      theirPersonality: existingLovedOne?.theirPersonality || '',
      lessonsLearned: existingLovedOne?.lessonsLearned || '',
    }
  });

  const addInterest = () => {
    if (newInterest.trim() && !sharedInterests.includes(newInterest.trim())) {
      setSharedInterests([...sharedInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const addSign = () => {
    if (newSign.trim()) {
      setCommonSigns([...commonSigns, newSign.trim()]);
      if (newSignReason.trim()) {
        setSignExplanations([...signExplanations, { sign: newSign.trim(), reason: newSignReason.trim() }]);
      }
      setNewSign('');
      setNewSignReason('');
    }
  };

  const removeSign = (sign: string) => {
    setCommonSigns(commonSigns.filter(s => s !== sign));
    setSignExplanations(signExplanations.filter(se => se.sign !== sign));
  };

  const addImportantDate = () => {
    if (newDateValue && newDateOccasion.trim()) {
      setImportantDates([...importantDates, {
        date: newDateValue,
        occasion: newDateOccasion.trim(),
        reminderEnabled: newDateReminder,
      }]);
      setNewDateValue('');
      setNewDateOccasion('');
      setNewDateReminder(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      sharedInterests: sharedInterests.length > 0 ? sharedInterests : undefined,
      commonSigns: commonSigns.length > 0 ? commonSigns : undefined,
      signExplanations: signExplanations.length > 0 ? signExplanations : undefined,
      importantDates: importantDates.length > 0 ? importantDates : undefined,
    };

    if (existingLovedOne) {
      await updateMutation.mutateAsync({
        id: existingLovedOne.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name', { required: true })}
            placeholder="Their name"
            className="bg-slate-800 border-slate-700"
            data-testid="loved-one-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship">Relationship</Label>
          <Input
            id="relationship"
            {...register('relationship', { required: true })}
            placeholder="e.g., Grandmother, Friend"
            className="bg-slate-800 border-slate-700"
            list="relationships"
          />
          <datalist id="relationships">
            {COMMON_RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            {...register('nickname')}
            placeholder="Optional"
            className="bg-slate-800 border-slate-700"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input
            id="birthDate"
            type="date"
            {...register('birthDate')}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passingDate">Passing Date</Label>
          <Input
            id="passingDate"
            type="date"
            {...register('passingDate')}
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theirPersonality">Their Personality</Label>
        <Textarea
          id="theirPersonality"
          {...register('theirPersonality')}
          placeholder="What were they like? How would you describe them?"
          className="bg-slate-800 border-slate-700 min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalMemory">A Special Memory</Label>
        <Textarea
          id="personalMemory"
          {...register('personalMemory')}
          placeholder="Share a cherished memory..."
          className="bg-slate-800 border-slate-700 min-h-[80px]"
        />
      </div>

      {/* Shared Interests */}
      <div className="space-y-2">
        <Label>Shared Interests</Label>
        <div className="flex gap-2">
          <Input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="Things you enjoyed together"
            className="bg-slate-800 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addInterest}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {sharedInterests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {sharedInterests.map((interest, index) => (
              <Badge key={index} variant="secondary" className="bg-pink-500/20 text-pink-300">
                {interest}
                <button
                  type="button"
                  onClick={() => setSharedInterests(sharedInterests.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Signs from Spirit */}
      <div className="space-y-2">
        <Label>Signs They Send</Label>
        <p className="text-xs text-slate-500">What signs or symbols do they use to communicate?</p>
        <div className="flex gap-2">
          <Input
            value={newSign}
            onChange={(e) => setNewSign(e.target.value)}
            placeholder="The sign (e.g., cardinals, butterflies)"
            className="bg-slate-800 border-slate-700"
          />
          <Input
            value={newSignReason}
            onChange={(e) => setNewSignReason(e.target.value)}
            placeholder="Why this sign?"
            className="bg-slate-800 border-slate-700"
          />
          <Button type="button" variant="outline" size="icon" onClick={addSign}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {commonSigns.length > 0 && (
          <div className="space-y-2 mt-2">
            {commonSigns.map((sign) => {
              const explanation = signExplanations.find(se => se.sign === sign);
              return (
                <div key={sign} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg">
                  <div className="flex-1">
                    <Badge variant="outline" className="text-pink-400 border-pink-400/30 text-xs">
                      {sign}
                    </Badge>
                    {explanation && (
                      <p className="text-sm text-slate-400 mt-1">{explanation.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSign(sign)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Important Dates */}
      <div className="space-y-2">
        <Label>Important Dates</Label>
        <p className="text-xs text-slate-500">Birthdays, anniversaries, and other meaningful dates</p>
        <div className="flex gap-2">
          <Input
            type="date"
            value={newDateValue}
            onChange={(e) => setNewDateValue(e.target.value)}
            className="bg-slate-800 border-slate-700"
          />
          <Input
            value={newDateOccasion}
            onChange={(e) => setNewDateOccasion(e.target.value)}
            placeholder="Occasion"
            className="bg-slate-800 border-slate-700"
          />
          <div className="flex items-center gap-1">
            <Switch
              checked={newDateReminder}
              onCheckedChange={setNewDateReminder}
            />
            <span className="text-xs text-slate-500">Remind</span>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={addImportantDate}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {importantDates.length > 0 && (
          <div className="space-y-2 mt-2">
            {importantDates.map((date, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                <div className="flex-1">
                  <span className="text-sm text-white">{date.occasion}</span>
                  <span className="text-xs text-slate-500 ml-2">
                    {new Date(date.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {date.reminderEnabled && (
                    <Badge variant="outline" className="text-pink-400 border-pink-400/30 text-xs ml-2">
                      Reminder on
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setImportantDates(importantDates.filter((_, i) => i !== index))}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessonsLearned">Lessons They Taught You</Label>
        <Textarea
          id="lessonsLearned"
          {...register('lessonsLearned')}
          placeholder="What did you learn from them?"
          className="bg-slate-800 border-slate-700 min-h-[60px]"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
          data-testid="save-loved-one"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingLovedOne ? 'Update' : 'Add Loved One'}
        </Button>
      </div>
    </form>
  );
};
