'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Wind, Save, Loader2 } from 'lucide-react';
import {
  MeditationFormState,
  MEDITATION_TECHNIQUES,
  MEDITATION_MOODS,
  getDefaultFormState,
} from '../types';
import { useCreateMeditation, useUpdateMeditation, MeditationJournalEntry } from '../hooks';

interface MeditationFormProps {
  userId: string;
  existingMeditation?: MeditationJournalEntry | null;
  onSuccess?: () => void;
}

const MeditationForm: React.FC<MeditationFormProps> = ({
  userId,
  existingMeditation,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<MeditationFormState>(getDefaultFormState());

  const createMutation = useCreateMeditation();
  const updateMutation = useUpdateMeditation();

  const isEditing = !!existingMeditation;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form with existing data if editing
  useEffect(() => {
    if (existingMeditation) {
      setFormState({
        date: existingMeditation.date,
        duration: existingMeditation.duration,
        technique: existingMeditation.technique as any,
        guidedBy: existingMeditation.guidedBy,
        focus: existingMeditation.focus,
        preSessionMood: existingMeditation.preSessionMood as any,
        postSessionMood: existingMeditation.postSessionMood as any,
        depth: existingMeditation.depth,
        distractionLevel: existingMeditation.distractionLevel,
        insights: existingMeditation.insights,
        experiences: existingMeditation.experiences,
        intentions: existingMeditation.intentions,
        gratitude: existingMeditation.gratitude,
        location: existingMeditation.location,
        posture: existingMeditation.posture,
      });
    }
  }, [existingMeditation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (formState.duration <= 0) return;

    try {
      if (isEditing && existingMeditation) {
        await updateMutation.mutateAsync({
          id: existingMeditation.id,
          userId,
          duration: formState.duration,
          technique: formState.technique,
          guidedBy: formState.guidedBy?.trim() || undefined,
          focus: formState.focus?.trim() || undefined,
          preSessionMood: formState.preSessionMood,
          postSessionMood: formState.postSessionMood,
          depth: formState.depth,
          distractionLevel: formState.distractionLevel,
          insights: formState.insights?.trim() || undefined,
          experiences: formState.experiences?.trim() || undefined,
          intentions: formState.intentions?.trim() || undefined,
          gratitude: formState.gratitude?.filter(g => g.trim()) || undefined,
          location: formState.location?.trim() || undefined,
          posture: formState.posture?.trim() || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          date: formState.date,
          duration: formState.duration,
          technique: formState.technique,
          guidedBy: formState.guidedBy?.trim() || undefined,
          focus: formState.focus?.trim() || undefined,
          preSessionMood: formState.preSessionMood,
          postSessionMood: formState.postSessionMood,
          depth: formState.depth,
          distractionLevel: formState.distractionLevel,
          insights: formState.insights?.trim() || undefined,
          experiences: formState.experiences?.trim() || undefined,
          intentions: formState.intentions?.trim() || undefined,
          gratitude: formState.gratitude?.filter(g => g.trim()) || undefined,
          location: formState.location?.trim() || undefined,
          posture: formState.posture?.trim() || undefined,
        });
      }

      onSuccess?.();

      // Reset form if creating new
      if (!isEditing) {
        setFormState(getDefaultFormState());
      }
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="meditation-form">
      {/* Date (only if creating new) */}
      {!isEditing && (
        <div>
          <Label htmlFor="date" dark>
            Date
          </Label>
          <Input
            type="date"
            id="date"
            value={formState.date}
            onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
            dark
            className="mt-1 w-fit"
            data-testid="date-input"
          />
        </div>
      )}

      {/* Duration */}
      <div>
        <Label htmlFor="duration" dark>
          Duration (minutes)
        </Label>
        <Input
          type="number"
          id="duration"
          min={1}
          max={180}
          value={formState.duration}
          onChange={(e) => setFormState(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
          dark
          className="mt-1 w-32"
          data-testid="duration-input"
        />
      </div>

      {/* Technique */}
      <div>
        <Label htmlFor="technique" dark>
          Technique
        </Label>
        <Select
          value={formState.technique}
          onValueChange={(value) => setFormState(prev => ({ ...prev, technique: value as any }))}
          dark
        >
          <SelectTrigger
            id="technique"
            className="mt-1"
            data-testid="technique-select"
          >
            <SelectValue placeholder="Select technique" />
          </SelectTrigger>
          <SelectContent>
            {MEDITATION_TECHNIQUES.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guided By (show only if technique is 'guided') */}
      {formState.technique === 'guided' && (
        <div>
          <Label htmlFor="guidedBy" dark>
            Guided By
          </Label>
          <Input
            id="guidedBy"
            value={formState.guidedBy || ''}
            onChange={(e) => setFormState(prev => ({ ...prev, guidedBy: e.target.value }))}
            placeholder="e.g., Headspace, Calm, teacher name"
            dark
            className="mt-1"
            data-testid="guided-by-input"
          />
        </div>
      )}

      {/* Mood - Pre and Post */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="preSessionMood" dark>
            Mood Before
          </Label>
          <Select
            value={formState.preSessionMood}
            onValueChange={(value) => setFormState(prev => ({ ...prev, preSessionMood: value as any }))}
            dark
          >
            <SelectTrigger
              id="preSessionMood"
              className="mt-1"
            >
              <SelectValue placeholder="How did you feel?" />
            </SelectTrigger>
            <SelectContent>
              {MEDITATION_MOODS.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="postSessionMood" dark>
            Mood After
          </Label>
          <Select
            value={formState.postSessionMood}
            onValueChange={(value) => setFormState(prev => ({ ...prev, postSessionMood: value as any }))}
            dark
          >
            <SelectTrigger
              id="postSessionMood"
              className="mt-1"
            >
              <SelectValue placeholder="How do you feel now?" />
            </SelectTrigger>
            <SelectContent>
              {MEDITATION_MOODS.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Depth and Distraction Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label dark>
            Depth: {formState.depth}/5
          </Label>
          <Slider
            value={[formState.depth || 3]}
            onValueChange={([value]) => setFormState(prev => ({ ...prev, depth: value }))}
            min={1}
            max={5}
            step={1}
            className="mt-3"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Surface</span>
            <span>Deep</span>
          </div>
        </div>

        <div>
          <Label dark>
            Distraction: {formState.distractionLevel}/5
          </Label>
          <Slider
            value={[formState.distractionLevel || 3]}
            onValueChange={([value]) => setFormState(prev => ({ ...prev, distractionLevel: value }))}
            min={1}
            max={5}
            step={1}
            className="mt-3"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Focused</span>
            <span>Distracted</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div>
        <Label htmlFor="insights" dark>
          Insights (optional)
        </Label>
        <Textarea
          id="insights"
          value={formState.insights || ''}
          onChange={(e) => setFormState(prev => ({ ...prev, insights: e.target.value }))}
          placeholder="Any realizations or thoughts that came up..."
          dark
          className="mt-1 min-h-[80px]"
          data-testid="insights-input"
        />
      </div>

      {/* Experiences */}
      <div>
        <Label htmlFor="experiences" dark>
          Experiences (optional)
        </Label>
        <Textarea
          id="experiences"
          value={formState.experiences || ''}
          onChange={(e) => setFormState(prev => ({ ...prev, experiences: e.target.value }))}
          placeholder="Notable sensations, visions, or feelings..."
          dark
          className="mt-1 min-h-[80px]"
          data-testid="experiences-input"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || formState.duration <= 0}
        className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
        data-testid="submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Saving...' : 'Recording...'}
          </>
        ) : (
          <>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Wind className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Log Session'}
          </>
        )}
      </Button>
    </form>
  );
};

export default MeditationForm;
