'use client';

import { useState, useMemo } from 'react';
import { Heart, Plus, Calendar, Sparkles, Feather, Flower2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, differenceInDays, parseISO } from 'date-fns';
import useLovedOnes, { LovedOneInSpirit } from '../hooks/useLovedOnes';
import { LovedOneForm } from './components/LovedOneForm';
import { LovedOneCard } from './components/LovedOneCard';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLovedOne, setEditingLovedOne] = useState<LovedOneInSpirit | null>(null);
  const [selectedLovedOne, setSelectedLovedOne] = useState<LovedOneInSpirit | null>(null);

  const { data: lovedOnes, isLoading } = useLovedOnes(userId);

  const handleEdit = (lovedOne: LovedOneInSpirit) => {
    setEditingLovedOne(lovedOne);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLovedOne(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLovedOne(null);
  };

  // Get upcoming important dates (within next 30 days)
  const upcomingDates = useMemo(() => {
    if (!lovedOnes) return [];

    const today = new Date();
    const results: { lovedOne: LovedOneInSpirit; date: string; occasion: string; daysUntil: number }[] = [];

    lovedOnes.forEach(lo => {
      // Check important dates
      lo.importantDates?.forEach(d => {
        const dateThisYear = new Date(today.getFullYear(), parseISO(d.date).getMonth(), parseISO(d.date).getDate());
        if (dateThisYear < today) {
          dateThisYear.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = differenceInDays(dateThisYear, today);
        if (daysUntil <= 30) {
          results.push({ lovedOne: lo, date: d.date, occasion: d.occasion, daysUntil });
        }
      });

      // Check passing anniversary
      if (lo.passingDate) {
        const passingAnniv = new Date(today.getFullYear(), parseISO(lo.passingDate).getMonth(), parseISO(lo.passingDate).getDate());
        if (passingAnniv < today) {
          passingAnniv.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = differenceInDays(passingAnniv, today);
        if (daysUntil <= 30) {
          results.push({ lovedOne: lo, date: lo.passingDate, occasion: 'Passing Anniversary', daysUntil });
        }
      }

      // Check birthday
      if (lo.birthDate) {
        const birthday = new Date(today.getFullYear(), parseISO(lo.birthDate).getMonth(), parseISO(lo.birthDate).getDate());
        if (birthday < today) {
          birthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = differenceInDays(birthday, today);
        if (daysUntil <= 30) {
          results.push({ lovedOne: lo, date: lo.birthDate, occasion: 'Birthday', daysUntil });
        }
      }
    });

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [lovedOnes]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Warm, Memorial Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-pink-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header - Warm and Reverent */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-rose-500/20">
            <Heart className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Loved Ones in Spirit</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            A sacred space to honor and remember those who continue to watch over you
          </p>
        </div>

        {/* Empty State - Gentle Invitation */}
        {!isLoading && (!lovedOnes || lovedOnes.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-rose-500/10 backdrop-blur-xl">
                <Flower2 className="w-12 h-12 text-rose-400/40 mx-auto mb-3" />
                <Feather className="w-6 h-6 text-amber-400/40 absolute bottom-6 right-6" />
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Create a Memorial</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Keep the memory of your loved ones alive. Record their signs, remember their important dates,
              and carry their presence with you.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/30 hover:scale-105"
            >
              <Heart className="w-5 h-5 mr-2" />
              Remember Someone Special
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && lovedOnes && lovedOnes.length > 0 && (
          <>
            {/* Upcoming Dates Banner */}
            {upcomingDates.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-white font-medium">Approaching Dates</h3>
                </div>
                <div className="space-y-2">
                  {upcomingDates.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{item.lovedOne.name}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{item.occasion}</span>
                      </div>
                      <span className={`${item.daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {item.daysUntil === 0 ? 'Today' : item.daysUntil === 1 ? 'Tomorrow' : `${item.daysUntil} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Button */}
            <div className="mb-8">
              <button
                onClick={() => setShowForm(true)}
                className="group p-5 bg-gradient-to-br from-rose-600/10 to-pink-600/10 rounded-2xl border border-rose-500/20 hover:border-rose-500/40 transition-all hover:scale-[1.01] text-left w-full md:w-auto md:inline-flex md:items-center md:gap-4"
              >
                <div className="p-2 bg-rose-500/20 rounded-lg group-hover:bg-rose-500/30 transition-colors mb-2 md:mb-0 inline-block">
                  <Plus className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <span className="text-white font-medium block md:inline">Remember Another Loved One</span>
                  <span className="text-slate-500 text-sm block md:hidden">Add to your memorial</span>
                </div>
              </button>
            </div>

            {/* Loved Ones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lovedOnes.map((lovedOne) => (
                <LovedOneCard
                  key={lovedOne.id}
                  lovedOne={lovedOne}
                  onEdit={handleEdit}
                  onView={setSelectedLovedOne}
                  userId={userId}
                />
              ))}
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
              <Heart className="relative w-12 h-12 text-rose-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your memories...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="border-rose-500/20 max-w-[95vw] w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              {editingLovedOne ? `Edit ${editingLovedOne.name}` : 'Remember a Loved One'}
            </DialogTitle>
          </DialogHeader>

          <LovedOneForm
            userId={userId}
            existingLovedOne={editingLovedOne}
            onSuccess={handleFormSuccess}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedLovedOne} onOpenChange={(open) => !open && setSelectedLovedOne(null)}>
        <DialogContent className="border-rose-500/20 sm:max-w-lg">
          {selectedLovedOne && (
            <>
              <div className="text-center mb-6">
                {selectedLovedOne.photoUrl ? (
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-rose-500/30 mb-4">
                    <img src={selectedLovedOne.photoUrl} alt={selectedLovedOne.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30 mb-4">
                    <Heart className="w-10 h-10 text-rose-400/60" />
                  </div>
                )}
                <h2 className="text-2xl font-light text-white">{selectedLovedOne.name}</h2>
                {selectedLovedOne.nickname && (
                  <p className="text-slate-400 text-sm">&ldquo;{selectedLovedOne.nickname}&rdquo;</p>
                )}
                <p className="text-rose-400 text-sm mt-1">{selectedLovedOne.relationship}</p>
              </div>

              <div className="space-y-4">
                {/* Dates */}
                {(selectedLovedOne.birthDate || selectedLovedOne.passingDate) && (
                  <div className="flex justify-center gap-6 text-sm text-slate-400">
                    {selectedLovedOne.birthDate && (
                      <span>{format(parseISO(selectedLovedOne.birthDate), 'MMM d, yyyy')}</span>
                    )}
                    {selectedLovedOne.birthDate && selectedLovedOne.passingDate && <span>—</span>}
                    {selectedLovedOne.passingDate && (
                      <span>{format(parseISO(selectedLovedOne.passingDate), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                )}

                {/* Personal Memory */}
                {selectedLovedOne.personalMemory && (
                  <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
                    <p className="text-slate-300 text-sm italic leading-relaxed">
                      &ldquo;{selectedLovedOne.personalMemory}&rdquo;
                    </p>
                  </div>
                )}

                {/* Their Personality */}
                {selectedLovedOne.theirPersonality && (
                  <div>
                    <h4 className="text-sm text-slate-500 mb-2">Their Spirit</h4>
                    <p className="text-slate-300 text-sm">{selectedLovedOne.theirPersonality}</p>
                  </div>
                )}

                {/* Signs */}
                {selectedLovedOne.commonSigns && selectedLovedOne.commonSigns.length > 0 && (
                  <div>
                    <h4 className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Signs They Send
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedLovedOne.commonSigns.map((sign, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-500/10 text-amber-300 rounded-full text-sm">
                          {sign}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lessons Learned */}
                {selectedLovedOne.lessonsLearned && (
                  <div>
                    <h4 className="text-sm text-slate-500 mb-2">What They Taught You</h4>
                    <p className="text-slate-300 text-sm">{selectedLovedOne.lessonsLearned}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedLovedOne(null);
                      handleEdit(selectedLovedOne);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedLovedOne(null)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
