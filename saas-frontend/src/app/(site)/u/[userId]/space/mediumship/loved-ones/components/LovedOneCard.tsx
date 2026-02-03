'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, Heart, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LovedOneInSpirit, useDeleteLovedOne } from '../../hooks';

interface Props {
  lovedOne: LovedOneInSpirit;
  onEdit: (lovedOne: LovedOneInSpirit) => void;
  onView?: (lovedOne: LovedOneInSpirit) => void;
  userId: string;
}

export const LovedOneCard: React.FC<Props> = ({ lovedOne, onEdit, onView, userId }) => {
  const [showDelete, setShowDelete] = useState(false);
  const deleteMutation = useDeleteLovedOne();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: lovedOne.id, userId });
    setShowDelete(false);
  };

  return (
    <>
      <button
        onClick={() => onView?.(lovedOne)}
        className="group text-left w-full p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl border border-rose-500/10 hover:border-rose-500/30 transition-all hover:shadow-lg hover:shadow-rose-500/5"
      >
        <div className="flex items-start gap-4">
          {/* Photo or Icon */}
          {lovedOne.photoUrl ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-500/20 flex-shrink-0">
              <img src={lovedOne.photoUrl} alt={lovedOne.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/20 flex-shrink-0">
              <Heart className="w-7 h-7 text-rose-400/60" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white text-lg">{lovedOne.name}</h3>
                <p className="text-rose-400/80 text-sm">{lovedOne.relationship}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(lovedOne);
                  }}
                  className="text-slate-400 hover:text-white h-7 w-7"
                  data-testid="edit-loved-one"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDelete(true);
                  }}
                  className="text-slate-400 hover:text-red-400 h-7 w-7"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Dates */}
            {(lovedOne.birthDate || lovedOne.passingDate) && (
              <p className="text-slate-500 text-xs mt-1">
                {lovedOne.birthDate && format(parseISO(lovedOne.birthDate), 'yyyy')}
                {lovedOne.birthDate && lovedOne.passingDate && ' — '}
                {lovedOne.passingDate && format(parseISO(lovedOne.passingDate), 'yyyy')}
              </p>
            )}

            {/* Personal Memory Preview */}
            {lovedOne.personalMemory && (
              <p className="text-slate-400 text-sm mt-2 line-clamp-2 italic">
                &ldquo;{lovedOne.personalMemory}&rdquo;
              </p>
            )}

            {/* Signs Preview */}
            {lovedOne.commonSigns && lovedOne.commonSigns.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Sparkles className="w-3 h-3 text-amber-400/60" />
                <span className="text-xs text-slate-500">
                  {lovedOne.commonSigns.slice(0, 2).join(', ')}
                  {lovedOne.commonSigns.length > 2 && ` +${lovedOne.commonSigns.length - 2} more`}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-rose-400 transition-colors flex-shrink-0 mt-4" />
        </div>
      </button>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-slate-900 border-rose-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove {lovedOne.name} from your memorial?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove their memorial from your space. Their memory lives on in your heart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Keep Memorial
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
