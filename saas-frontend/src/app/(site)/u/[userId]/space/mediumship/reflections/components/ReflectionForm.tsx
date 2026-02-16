'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateReadingReflection,
  useUpdateReadingReflection,
  ReadingReflection,
} from '../../hooks';

// Pre-fill data from SpiriVerse readings
export interface ReflectionPrefillData {
  date?: string;
  readerName?: string;
  readingType?: string;
  format?: string;
  mainMessages?: string;
  sourceReadingId?: string; // Link back to the SpiriVerse reading
}

interface Props {
  userId: string;
  existingReflection?: ReadingReflection | null;
  prefillData?: ReflectionPrefillData;
  onSuccess: () => void;
}

const READING_TYPES = [
  'Tarot Reading',
  'Oracle Card Reading',
  'Mediumship Reading',
  'Psychic Reading',
  'Akashic Records',
  'Astrology Reading',
  'Palmistry',
  'Numerology',
  'Aura Reading',
  'Energy Reading',
  'Other',
];

const FORMATS = [
  'In Person',
  'Video Call',
  'Phone Call',
  'Chat/Text',
  'Email',
  'Pre-recorded',
];

interface FormData {
  date: string;
  readerName: string;
  readingType?: string;
  format?: string;
  duration?: number;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  validatedLater?: string;
  notes?: string;
}

export const ReflectionForm: React.FC<Props> = ({ userId, existingReflection, prefillData, onSuccess }) => {
  const createMutation = useCreateReadingReflection();
  const updateMutation = useUpdateReadingReflection();
  const [resonatedWith, setResonatedWith] = useState<string[]>(existingReflection?.resonatedWith || []);
  const [didntResonate, setDidntResonate] = useState<string[]>(existingReflection?.didntResonate || []);
  const [newResonated, setNewResonated] = useState('');
  const [newDidntResonate, setNewDidntResonate] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingReflection?.date || prefillData?.date || new Date().toISOString().split('T')[0],
      readerName: existingReflection?.readerName || prefillData?.readerName || '',
      readingType: existingReflection?.readingType || prefillData?.readingType || '',
      format: existingReflection?.format || prefillData?.format || '',
      duration: existingReflection?.duration || 30,
      mainMessages: existingReflection?.mainMessages || prefillData?.mainMessages || '',
      evidentialInfo: existingReflection?.evidentialInfo || '',
      predictions: existingReflection?.predictions || '',
      guidance: existingReflection?.guidance || '',
      accuracyScore: existingReflection?.accuracyScore || 50,
      emotionalImpact: existingReflection?.emotionalImpact || '',
      actionsTaken: existingReflection?.actionsTaken || '',
      overallRating: existingReflection?.overallRating || 3,
      validatedLater: existingReflection?.validatedLater || '',
      notes: existingReflection?.notes || '',
    }
  });

  const addResonated = () => {
    if (newResonated.trim()) {
      setResonatedWith([...resonatedWith, newResonated.trim()]);
      setNewResonated('');
    }
  };

  const addDidntResonate = () => {
    if (newDidntResonate.trim()) {
      setDidntResonate([...didntResonate, newDidntResonate.trim()]);
      setNewDidntResonate('');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (existingReflection) {
      // Update - include all fields including validatedLater
      await updateMutation.mutateAsync({
        id: existingReflection.id,
        userId,
        ...data,
        resonatedWith: resonatedWith.length > 0 ? resonatedWith : undefined,
        didntResonate: didntResonate.length > 0 ? didntResonate : undefined,
      });
    } else {
      // Create - exclude validatedLater field (destructure inline to avoid unused var)
      const { validatedLater, ...createData } = data;
      void validatedLater; // Explicitly ignore
      await createMutation.mutateAsync({
        userId,
        ...createData,
        resonatedWith: resonatedWith.length > 0 ? resonatedWith : undefined,
        didntResonate: didntResonate.length > 0 ? didntResonate : undefined,
      });
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const accuracy = watch('accuracyScore') || 50;
  const rating = watch('overallRating') || 3;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date of Reading</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="readerName">Reader Name</Label>
          <Input
            id="readerName"
            {...register('readerName', { required: true })}
            placeholder="Who gave the reading?"
            dark
            data-testid="reader-name"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="readingType">Reading Type</Label>
          <Select
            dark
            value={watch('readingType')}
            onValueChange={(value) => setValue('readingType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {READING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select
            dark
            value={watch('format')}
            onValueChange={(value) => setValue('format', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input
            id="duration"
            type="number"
            {...register('duration', { valueAsNumber: true })}
            dark
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mainMessages">Main Messages</Label>
        <Textarea
          id="mainMessages"
          {...register('mainMessages')}
          placeholder="What were the key messages or themes?"
          dark
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidentialInfo">Evidential Information</Label>
        <Textarea
          id="evidentialInfo"
          {...register('evidentialInfo')}
          placeholder="Any specific details that could be verified (names, dates, facts)?"
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="predictions">Predictions Made</Label>
          <Textarea
            id="predictions"
            {...register('predictions')}
            placeholder="Any predictions about the future?"
            dark
          className="min-h-[60px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidance">Guidance Received</Label>
          <Textarea
            id="guidance"
            {...register('guidance')}
            placeholder="Any advice or guidance given?"
            dark
          className="min-h-[60px]"
          />
        </div>
      </div>

      {/* What Resonated */}
      <div className="space-y-2">
        <Label>What Resonated</Label>
        <div className="flex gap-2">
          <Input
            value={newResonated}
            onChange={(e) => setNewResonated(e.target.value)}
            placeholder="Something that felt true..."
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResonated())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addResonated}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {resonatedWith.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {resonatedWith.map((item, index) => (
              <Badge key={index} variant="secondary" className="bg-green-500/20 text-green-300">
                {item}
                <button
                  type="button"
                  onClick={() => setResonatedWith(resonatedWith.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* What Didn't Resonate */}
      <div className="space-y-2">
        <Label>What Didn&apos;t Resonate</Label>
        <div className="flex gap-2">
          <Input
            value={newDidntResonate}
            onChange={(e) => setNewDidntResonate(e.target.value)}
            placeholder="Something that didn&apos;t feel right..."
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDidntResonate())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addDidntResonate}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {didntResonate.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {didntResonate.map((item, index) => (
              <Badge key={index} variant="secondary" className="bg-orange-500/20 text-orange-300">
                {item}
                <button
                  type="button"
                  onClick={() => setDidntResonate(didntResonate.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Accuracy Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Accuracy Score</Label>
          <span className="text-violet-400 font-medium">{accuracy}%</span>
        </div>
        <Slider
          value={[accuracy]}
          onValueChange={(value) => setValue('accuracyScore', value[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Overall Rating */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Overall Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setValue('overallRating', star)}
                className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-slate-600'}`}
              >
                <Star className={`w-5 h-5 ${star <= rating ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emotionalImpact">Emotional Impact</Label>
        <Input
          id="emotionalImpact"
          {...register('emotionalImpact')}
          placeholder="How did the reading make you feel?"
          dark
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actionsTaken">Actions Taken</Label>
        <Textarea
          id="actionsTaken"
          {...register('actionsTaken')}
          placeholder="What did you do as a result of this reading?"
          dark
          className="min-h-[60px]"
        />
      </div>

      {existingReflection && (
        <div className="space-y-2">
          <Label htmlFor="validatedLater">Validated Later (Update)</Label>
          <Textarea
            id="validatedLater"
            {...register('validatedLater')}
            placeholder="Did any predictions come true? Was anything confirmed later?"
            dark
          className="min-h-[60px]"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Any other thoughts..."
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          data-testid="save-reflection"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingReflection ? 'Update Reflection' : 'Save Reflection'}
        </Button>
      </div>
    </form>
  );
};
