'use client';

import { format } from 'date-fns';
import { Edit2, Trash2, Clock, Zap, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnergyJournalEntry, useDeleteEnergyJournal } from '../../hooks';

interface Props {
  entries: EnergyJournalEntry[];
  onEdit: (entry: EnergyJournalEntry) => void;
  isLoading: boolean;
  userId: string;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  meditation: 'Meditation',
  clearing: 'Clearing',
  grounding: 'Grounding',
  session_given: 'Session Given',
  session_received: 'Session Received',
  self_practice: 'Self Practice',
  attunement: 'Attunement',
  protection_ritual: 'Protection',
  observation: 'Observation',
};

const MODALITY_LABELS: Record<string, string> = {
  reiki: 'Reiki',
  pranic_healing: 'Pranic',
  quantum_touch: 'Quantum Touch',
  theta_healing: 'Theta',
  healing_touch: 'Healing Touch',
  chakra_balancing: 'Chakra',
  aura_cleansing: 'Aura',
  crystal_healing: 'Crystal',
  sound_healing: 'Sound',
  breathwork: 'Breathwork',
  grounding: 'Grounding',
  shielding: 'Shielding',
  cord_cutting: 'Cord Cutting',
  entity_clearing: 'Entity',
  space_clearing: 'Space',
  distance_healing: 'Distance',
  self_healing: 'Self Healing',
  other: 'Other',
};

export const EnergyJournalHistory: React.FC<Props> = ({ entries, onEdit, isLoading, userId }) => {
  const deleteMutation = useDeleteEnergyJournal();

  const handleDelete = async (entry: EnergyJournalEntry) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await deleteMutation.mutateAsync({ id: entry.id, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-xl h-32" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return null; // Parent handles empty state with better UX
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          data-testid={`energy-entry-${entry.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  {ENTRY_TYPE_LABELS[entry.entryType] || entry.entryType}
                </Badge>
                {entry.modality && (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {MODALITY_LABELS[entry.modality] || entry.modality}
                  </Badge>
                )}
                {entry.energyLevel && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Zap className="w-3 h-3 mr-1" />
                    {entry.energyLevel}/10
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                {entry.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.duration} min
                  </span>
                )}
                {entry.practitionerName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.practitionerName}
                  </span>
                )}
              </div>

              {entry.title && (
                <h3 className="text-white font-medium mb-1">{entry.title}</h3>
              )}

              {entry.intention && (
                <p className="text-slate-400 text-sm mb-2">
                  <span className="text-slate-500">Intention:</span> {entry.intention}
                </p>
              )}

              {entry.insights && (
                <p className="text-slate-300 text-sm line-clamp-2">{entry.insights}</p>
              )}

              {entry.notes && !entry.insights && (
                <p className="text-slate-300 text-sm line-clamp-2">{entry.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(entry)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                data-testid={`edit-energy-entry-${entry.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(entry)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-energy-entry-${entry.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
