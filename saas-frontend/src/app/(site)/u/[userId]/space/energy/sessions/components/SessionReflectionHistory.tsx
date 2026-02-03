'use client';

import { format } from 'date-fns';
import { Edit2, Trash2, Star, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SessionReflection, useDeleteSessionReflection } from '../../hooks';

interface Props {
  reflections: SessionReflection[];
  onEdit: (reflection: SessionReflection) => void;
  isLoading: boolean;
  userId: string;
}

const MODALITY_COLORS: Record<string, string> = {
  reiki: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  pranic_healing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  crystal_healing: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  sound_healing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  breathwork: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  meditation: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  chakra_balancing: 'bg-green-500/20 text-green-300 border-green-500/30',
  acupuncture: 'bg-red-500/20 text-red-300 border-red-500/30',
  qigong: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  theta_healing: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  shamanic: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const formatModality = (modality: string) => {
  return modality
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const SessionReflectionHistory: React.FC<Props> = ({ reflections, onEdit, isLoading, userId }) => {
  const deleteMutation = useDeleteSessionReflection();

  const handleDelete = async (reflection: SessionReflection) => {
    if (confirm('Are you sure you want to delete this reflection?')) {
      await deleteMutation.mutateAsync({ id: reflection.id, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-xl h-40" />
        ))}
      </div>
    );
  }

  if (reflections.length === 0) {
    return null; // Parent handles empty state with better UX
  }

  return (
    <div className="space-y-4">
      {reflections.map((reflection) => (
        <div
          key={reflection.id}
          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          data-testid={`session-reflection-${reflection.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header Row */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-sm text-slate-400">
                  {format(new Date(reflection.date), 'MMM d, yyyy')}
                </span>

                {reflection.modality && (
                  <Badge
                    variant="outline"
                    className={MODALITY_COLORS[reflection.modality] || MODALITY_COLORS.other}
                  >
                    {formatModality(reflection.modality)}
                  </Badge>
                )}

                {reflection.duration && (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {reflection.duration} min
                  </span>
                )}

                {reflection.overallRating && reflection.overallRating > 0 && (
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                    {reflection.overallRating}/5
                  </span>
                )}
              </div>

              {/* Practitioner/Client */}
              {reflection.practitionerName && (
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{reflection.practitionerName}</span>
                </div>
              )}

              {/* Session Type */}
              {reflection.sessionType && (
                <div className="text-sm text-slate-400 mb-2">
                  <span className="text-slate-500">Focus:</span> {reflection.sessionType}
                </div>
              )}

              {/* Sensations */}
              {reflection.sensations && reflection.sensations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {reflection.sensations.slice(0, 5).map((sensation) => (
                    <span
                      key={sensation}
                      className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full"
                    >
                      {sensation}
                    </span>
                  ))}
                  {reflection.sensations.length > 5 && (
                    <span className="px-2 py-0.5 text-xs bg-slate-500/10 text-slate-400 rounded-full">
                      +{reflection.sensations.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Areas Worked On */}
              {reflection.areasWorkedOn && reflection.areasWorkedOn.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {reflection.areasWorkedOn.slice(0, 4).map((area) => (
                    <span
                      key={area}
                      className="px-2 py-0.5 text-xs bg-teal-500/10 text-teal-400 rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                  {reflection.areasWorkedOn.length > 4 && (
                    <span className="px-2 py-0.5 text-xs bg-slate-500/10 text-slate-400 rounded-full">
                      +{reflection.areasWorkedOn.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Summary of experience */}
              {(reflection.duringSession || reflection.shiftsNoticed) && (
                <p className="text-slate-300 text-sm line-clamp-2">
                  {reflection.duringSession || reflection.shiftsNoticed}
                </p>
              )}

              {/* Would Recommend Badge */}
              {reflection.wouldRecommend && (
                <div className="mt-2">
                  <span className="text-xs text-emerald-400">✓ Would recommend</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(reflection)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                data-testid={`edit-session-reflection-${reflection.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(reflection)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-session-reflection-${reflection.id}`}
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
