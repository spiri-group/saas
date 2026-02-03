'use client';

import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChakraCheckin, useDeleteChakraCheckin } from '../../hooks';

interface Props {
  checkins: ChakraCheckin[];
  onEdit: (checkin: ChakraCheckin) => void;
  isLoading: boolean;
  userId: string;
}

const CHAKRA_COLORS: Record<string, string> = {
  root: 'bg-red-500',
  sacral: 'bg-orange-500',
  solar_plexus: 'bg-yellow-500',
  heart: 'bg-green-500',
  throat: 'bg-blue-500',
  third_eye: 'bg-indigo-500',
  crown: 'bg-purple-500',
  earth_star: 'bg-brown-500',
  soul_star: 'bg-white',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
    case 'balanced':
      return 'text-green-400';
    case 'blocked':
    case 'weak':
      return 'text-red-400';
    case 'overactive':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
};

export const ChakraCheckinHistory: React.FC<Props> = ({ checkins, onEdit, isLoading, userId }) => {
  const deleteMutation = useDeleteChakraCheckin();

  const handleDelete = async (checkin: ChakraCheckin) => {
    if (confirm('Are you sure you want to delete this check-in?')) {
      await deleteMutation.mutateAsync({ id: checkin.id, userId });
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

  if (checkins.length === 0) {
    return null; // Parent handles empty state with better UX
  }

  return (
    <div className="space-y-4">
      {checkins.map((checkin) => (
        <div
          key={checkin.id}
          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
          data-testid={`chakra-checkin-${checkin.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm text-slate-400">
                  {format(new Date(checkin.date), 'MMM d, yyyy')}
                </span>
                {checkin.checkInTime && (
                  <span className="text-sm text-slate-500">at {checkin.checkInTime}</span>
                )}
                {checkin.overallBalance && (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Balance: {checkin.overallBalance}/10
                  </Badge>
                )}
              </div>

              {/* Chakra Status Row */}
              <div className="flex flex-wrap gap-2 mb-3">
                {checkin.chakras.map((chakraState) => (
                  <div
                    key={chakraState.chakra}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5"
                  >
                    <div className={`w-2 h-2 rounded-full ${CHAKRA_COLORS[chakraState.chakra] || 'bg-slate-500'}`} />
                    <span className="text-xs text-slate-400 capitalize">
                      {chakraState.chakra.replace('_', ' ')}:
                    </span>
                    <span className={`text-xs font-medium ${getStatusColor(chakraState.status)}`}>
                      {chakraState.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* States */}
              {(checkin.physicalState || checkin.emotionalState || checkin.mentalState) && (
                <div className="flex flex-wrap gap-4 text-sm mb-2">
                  {checkin.physicalState && (
                    <div>
                      <span className="text-slate-500">Physical:</span>{' '}
                      <span className="text-slate-300">{checkin.physicalState}</span>
                    </div>
                  )}
                  {checkin.emotionalState && (
                    <div>
                      <span className="text-slate-500">Emotional:</span>{' '}
                      <span className="text-slate-300">{checkin.emotionalState}</span>
                    </div>
                  )}
                  {checkin.mentalState && (
                    <div>
                      <span className="text-slate-500">Mental:</span>{' '}
                      <span className="text-slate-300">{checkin.mentalState}</span>
                    </div>
                  )}
                </div>
              )}

              {checkin.observations && (
                <p className="text-slate-300 text-sm line-clamp-2">{checkin.observations}</p>
              )}
            </div>

            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(checkin)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                data-testid={`edit-chakra-checkin-${checkin.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(checkin)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-chakra-checkin-${checkin.id}`}
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
