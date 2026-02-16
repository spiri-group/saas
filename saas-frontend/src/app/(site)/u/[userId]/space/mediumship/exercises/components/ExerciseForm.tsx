'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  useCreateDevelopmentExercise,
  useUpdateDevelopmentExercise,
  DevelopmentExercise,
  ExerciseType,
  ExerciseDifficulty,
} from '../../hooks';

interface Props {
  userId: string;
  existingExercise?: DevelopmentExercise | null;
  onSuccess: () => void;
}

const EXERCISE_TYPES: { value: ExerciseType; label: string; description: string }[] = [
  { value: 'meditation', label: 'Meditation', description: 'Connecting with spirit through meditation' },
  { value: 'visualization', label: 'Visualization', description: 'Using mental imagery' },
  { value: 'psychometry', label: 'Psychometry', description: 'Reading energy from objects' },
  { value: 'remote_viewing', label: 'Remote Viewing', description: 'Perceiving distant locations' },
  { value: 'aura_reading', label: 'Aura Reading', description: 'Seeing or sensing energy fields' },
  { value: 'symbol_work', label: 'Symbol Work', description: 'Working with spiritual symbols' },
  { value: 'automatic_writing', label: 'Automatic Writing', description: 'Channeled writing' },
  { value: 'pendulum', label: 'Pendulum', description: 'Dowsing with a pendulum' },
  { value: 'card_practice', label: 'Card Practice', description: 'Oracle or tarot practice' },
  { value: 'sitting_in_power', label: 'Sitting in Power', description: 'Building energy connection' },
  { value: 'other', label: 'Other', description: 'Other development exercise' },
];

const DIFFICULTY_LEVELS: { value: ExerciseDifficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

interface FormData {
  date: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  source?: string;
  difficulty?: ExerciseDifficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat: boolean;
  nextSteps?: string;
  notes?: string;
}

export const ExerciseForm: React.FC<Props> = ({ userId, existingExercise, onSuccess }) => {
  const createMutation = useCreateDevelopmentExercise();
  const updateMutation = useUpdateDevelopmentExercise();
  const [hits, setHits] = useState<string[]>(existingExercise?.hits || []);
  const [misses, setMisses] = useState<string[]>(existingExercise?.misses || []);
  const [newHit, setNewHit] = useState('');
  const [newMiss, setNewMiss] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingExercise?.date || new Date().toISOString().split('T')[0],
      exerciseType: existingExercise?.exerciseType || 'meditation',
      exerciseName: existingExercise?.exerciseName || '',
      source: existingExercise?.source || '',
      difficulty: existingExercise?.difficulty || 'beginner',
      duration: existingExercise?.duration || 15,
      environment: existingExercise?.environment || '',
      preparation: existingExercise?.preparation || '',
      results: existingExercise?.results || '',
      accuracy: existingExercise?.accuracy || 50,
      insights: existingExercise?.insights || '',
      challengesFaced: existingExercise?.challengesFaced || '',
      improvements: existingExercise?.improvements || '',
      confidenceLevel: existingExercise?.confidenceLevel || 5,
      willRepeat: existingExercise?.willRepeat ?? true,
      nextSteps: existingExercise?.nextSteps || '',
      notes: existingExercise?.notes || '',
    }
  });

  const addHit = () => {
    if (newHit.trim()) {
      setHits([...hits, newHit.trim()]);
      setNewHit('');
    }
  };

  const addMiss = () => {
    if (newMiss.trim()) {
      setMisses([...misses, newMiss.trim()]);
      setNewMiss('');
    }
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      hits: hits.length > 0 ? hits : undefined,
      misses: misses.length > 0 ? misses : undefined,
    };

    if (existingExercise) {
      await updateMutation.mutateAsync({
        id: existingExercise.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const accuracy = watch('accuracy') || 50;
  const confidence = watch('confidenceLevel') || 5;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            dark
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exerciseType">Exercise Type</Label>
          <Select
            dark
            value={watch('exerciseType')}
            onValueChange={(value) => setValue('exerciseType', value as ExerciseType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {EXERCISE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div>{type.label}</div>
                    <div className="text-xs text-slate-400">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exerciseName">Exercise Name</Label>
        <Input
          id="exerciseName"
          {...register('exerciseName', { required: true })}
          placeholder="What did you practice?"
          dark
          data-testid="exercise-name"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            dark
            value={watch('difficulty')}
            onValueChange={(value) => setValue('difficulty', value as ExerciseDifficulty)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
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

        <div className="space-y-2">
          <Label htmlFor="source">Source/Teacher</Label>
          <Input
            id="source"
            {...register('source')}
            placeholder="Book, course..."
            dark
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="environment">Environment</Label>
        <Input
          id="environment"
          {...register('environment')}
          placeholder="Where and how did you practice?"
          dark
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="results">Results</Label>
        <Textarea
          id="results"
          {...register('results')}
          placeholder="What happened during the exercise?"
          dark
          className="min-h-[80px]"
        />
      </div>

      {/* Hits */}
      <div className="space-y-2">
        <Label>Hits (What Worked)</Label>
        <div className="flex gap-2">
          <Input
            value={newHit}
            onChange={(e) => setNewHit(e.target.value)}
            placeholder="Something you got right..."
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHit())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addHit}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {hits.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {hits.map((hit, index) => (
              <Badge key={index} variant="secondary" className="bg-green-500/20 text-green-300">
                {hit}
                <button
                  type="button"
                  onClick={() => setHits(hits.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Misses */}
      <div className="space-y-2">
        <Label>Misses (Areas for Growth)</Label>
        <div className="flex gap-2">
          <Input
            value={newMiss}
            onChange={(e) => setNewMiss(e.target.value)}
            placeholder="Something to improve..."
            dark
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMiss())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addMiss}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {misses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {misses.map((miss, index) => (
              <Badge key={index} variant="secondary" className="bg-orange-500/20 text-orange-300">
                {miss}
                <button
                  type="button"
                  onClick={() => setMisses(misses.filter((_, i) => i !== index))}
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
          <span className="text-cyan-400 font-medium">{accuracy}%</span>
        </div>
        <Slider
          value={[accuracy]}
          onValueChange={(value) => setValue('accuracy', value[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Confidence Level */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Confidence Level</Label>
          <span className="text-cyan-400 font-medium">{confidence}/10</span>
        </div>
        <Slider
          value={[confidence]}
          onValueChange={(value) => setValue('confidenceLevel', value[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="insights">Insights</Label>
        <Textarea
          id="insights"
          {...register('insights')}
          placeholder="What did you learn?"
          dark
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextSteps">Next Steps</Label>
        <Input
          id="nextSteps"
          {...register('nextSteps')}
          placeholder="What will you work on next?"
          dark
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Switch
          dark
          id="willRepeat"
          checked={watch('willRepeat')}
          onCheckedChange={(checked) => setValue('willRepeat', checked)}
        />
        <Label htmlFor="willRepeat" dark className="text-sm">
          Will practice this again
        </Label>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
          data-testid="save-exercise"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingExercise ? 'Update Exercise' : 'Log Exercise'}
        </Button>
      </div>
    </form>
  );
};
