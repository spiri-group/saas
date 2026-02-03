'use client';

import { useState } from 'react';
import { Edit2, Trash2, TrendingUp, Moon, Sparkles, Eye, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { PersonalSymbol, useDeletePersonalSymbol } from '../../hooks';

interface Props {
  symbol: PersonalSymbol;
  onEdit: (symbol: PersonalSymbol) => void;
  onView?: (symbol: PersonalSymbol) => void;
  userId: string;
}

export const SymbolCard: React.FC<Props> = ({ symbol, onEdit, onView, userId }) => {
  const [showDelete, setShowDelete] = useState(false);
  const deleteMutation = useDeletePersonalSymbol();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: symbol.id, userId });
    setShowDelete(false);
  };

  return (
    <>
      <button
        onClick={() => onView?.(symbol)}
        className="group text-left w-full p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl border border-amber-500/10 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-medium text-white text-lg">{symbol.symbolName}</h3>
            {symbol.category && (
              <Badge variant="outline" className="text-amber-400/80 border-amber-400/20 text-xs mt-1">
                {symbol.category}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(symbol);
                }}
                className="text-slate-400 hover:text-white h-7 w-7"
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
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>

        {/* Personal Meaning or Prompt */}
        {symbol.personalMeaning ? (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">
            {symbol.personalMeaning}
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-4 italic">
            No meaning defined yet...
          </p>
        )}

        {/* Occurrence Stats - Visual */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-md">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              <span className="text-white font-medium">{symbol.totalOccurrences}</span>
            </div>
          </div>

          {symbol.dreamOccurrences > 0 && (
            <div className="flex items-center gap-1 text-xs text-purple-400">
              <Moon className="w-3 h-3" />
              <span>{symbol.dreamOccurrences}</span>
            </div>
          )}
          {symbol.readingOccurrences > 0 && (
            <div className="flex items-center gap-1 text-xs text-indigo-400">
              <Eye className="w-3 h-3" />
              <span>{symbol.readingOccurrences}</span>
            </div>
          )}
          {symbol.synchronicityOccurrences > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Sparkles className="w-3 h-3" />
              <span>{symbol.synchronicityOccurrences}</span>
            </div>
          )}
        </div>
      </button>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-slate-900 border-amber-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove &ldquo;{symbol.symbolName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the symbol from your dictionary. The symbol may reappear
              if you log it in future entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Keep It
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
