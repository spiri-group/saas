'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AstrologyJournalEntry,
  JournalMood,
  JOURNAL_MOODS,
  CreateAstrologyJournalInput,
  UpdateAstrologyJournalInput,
} from '../_hooks/useAstrologyJournal';
import { CelestialBody, CELESTIAL_BODIES } from '../_hooks/useBirthChart';

interface Props {
  userId: string;
  entry?: AstrologyJournalEntry | null;
  initialPrompt?: string;
  onSave: (input: CreateAstrologyJournalInput | UpdateAstrologyJournalInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const JournalEntryForm: React.FC<Props> = ({
  userId,
  entry,
  initialPrompt,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState<JournalMood | undefined>(entry?.mood);
  const [planetaryThemes, setPlanetaryThemes] = useState<CelestialBody[]>(
    entry?.planetaryThemes || []
  );
  const [promptShown, setPromptShown] = useState<string | undefined>(initialPrompt);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // If initialPrompt is provided and no existing entry, pre-fill content
  useEffect(() => {
    if (initialPrompt && !entry) {
      setPromptShown(initialPrompt);
    }
  }, [initialPrompt, entry]);

  const isEditing = !!entry;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    if (isEditing && entry) {
      const updateInput: UpdateAstrologyJournalInput = {
        id: entry.id,
        userId,
        content: content.trim(),
        mood,
        planetaryThemes,
      };
      await onSave(updateInput);
    } else {
      const createInput: CreateAstrologyJournalInput = {
        userId,
        content: content.trim(),
        mood,
        planetaryThemes,
        promptShown,
        promptDismissed,
      };
      await onSave(createInput);
    }
  };

  const togglePlanet = (planet: CelestialBody) => {
    setPlanetaryThemes(prev =>
      prev.includes(planet)
        ? prev.filter(p => p !== planet)
        : [...prev, planet]
    );
  };

  // Available planets for tagging (exclude points)
  const availablePlanets = CELESTIAL_BODIES.filter(
    b => !['ascendant', 'midheaven'].includes(b.key)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt shown */}
      {promptShown && !isEditing && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-purple-300 italic">{promptShown}</p>
            <button
              type="button"
              onClick={() => {
                setPromptShown(undefined);
                setPromptDismissed(true);
              }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          What&apos;s on your mind?
        </label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write about what you're feeling, noticing, or reflecting on..."
          dark
          className="min-h-[200px] focus:border-purple-500"
          data-testid="journal-content-input"
        />
      </div>

      {/* Mood Selection */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          How are you feeling? (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {JOURNAL_MOODS.map(moodOption => (
            <button
              key={moodOption.key}
              type="button"
              onClick={() => setMood(mood === moodOption.key ? undefined : moodOption.key)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                mood === moodOption.key
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              data-testid={`mood-${moodOption.key}`}
            >
              <span className="mr-1">{moodOption.emoji}</span>
              {moodOption.name}
            </button>
          ))}
        </div>
      </div>

      {/* Planetary Themes */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Tag planetary themes (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {availablePlanets.map(planet => {
            const isSelected = planetaryThemes.includes(planet.key);
            return (
              <button
                key={planet.key}
                type="button"
                onClick={() => togglePlanet(planet.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
                data-testid={`planet-tag-${planet.key}`}
              >
                <span>{planet.symbol}</span>
                <span>{planet.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="cancel-journal-btn"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!content.trim() || isSaving}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="save-journal-btn"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Save Entry'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default JournalEntryForm;
