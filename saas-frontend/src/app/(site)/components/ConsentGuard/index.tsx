'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { resolvePlaceholders } from '@/utils/resolvePlaceholders';
import UseLegalPlaceholders from '@/hooks/UseLegalPlaceholders';
import useCheckOutstandingConsents from './hooks/UseCheckOutstandingConsents';
import useRecordConsents from './hooks/UseRecordConsents';
import SpiriLogo from '@/icons/spiri-logo';

const ConsentGuard = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const { data: outstanding, isLoading } = useCheckOutstandingConsents('site', isLoggedIn);
  const { data: globalPlaceholders } = UseLegalPlaceholders();
  const recordConsents = useRecordConsents();

  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!isLoggedIn || isLoading || dismissed) return null;
  if (!outstanding || outstanding.length === 0) return null;

  const activeDoc = outstanding[activeIndex];
  const isLastStep = activeIndex === outstanding.length - 1;
  const isCurrentChecked = checkedDocs.has(activeDoc.documentType);
  const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));
  const completedCount = outstanding.filter(doc => checkedDocs.has(doc.documentType)).length;

  const handleToggle = (documentType: string) => {
    setCheckedDocs(prev => {
      const next = new Set(prev);
      if (next.has(documentType)) {
        next.delete(documentType);
      } else {
        next.add(documentType);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (activeIndex < outstanding.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleAccept = async () => {
    const inputs = outstanding.map(doc => ({
      documentType: doc.documentType,
      documentId: doc.documentId,
      version: doc.version,
      consentContext: 'site-modal',
      documentTitle: doc.title,
    }));

    await recordConsents.mutateAsync(inputs);
    setDismissed(true);
  };

  return (
    <div
      data-testid="consent-guard-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        data-testid="consent-guard-modal"
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] flex-1 min-h-0">
          {/* Left panel — progress tracker */}
          <div className="bg-slate-50 p-6 flex flex-col md:border-r border-b md:border-b-0 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-indigo-100 p-2.5">
                <ShieldCheck className="h-6 w-6 text-indigo-600" />
              </div>
              <h2
                className="text-lg font-semibold text-gray-900"
                data-testid="consent-guard-title"
              >
                Review Updates
              </h2>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Please review and accept each document to continue.
            </p>

            {/* Step list */}
            <nav
              data-testid="consent-step-list"
              className="flex-1 space-y-1"
              aria-label="Document review progress"
            >
              {outstanding.map((doc, index) => {
                const isCompleted = checkedDocs.has(doc.documentType);
                const isActive = index === activeIndex;

                return (
                  <button
                    key={doc.documentType}
                    data-testid={`consent-step-${index}`}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 border border-indigo-200'
                        : isCompleted
                          ? 'hover:bg-gray-100 cursor-pointer'
                          : 'cursor-default'
                    }`}
                    onClick={() => {
                      if (isCompleted || isActive) {
                        setActiveIndex(index);
                      }
                    }}
                    disabled={!isCompleted && !isActive}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : isActive ? (
                      <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-white">{index + 1}</span>
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                      </div>
                    )}
                    <span
                      className={`text-sm truncate ${
                        isActive
                          ? 'font-semibold text-indigo-900'
                          : isCompleted
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {doc.title}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Progress count */}
            <p
              data-testid="consent-progress-count"
              className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200"
            >
              {completedCount} of {outstanding.length} reviewed
            </p>

            <SpiriLogo height={28} className="mt-4 opacity-40" />
          </div>

          {/* Right panel — single document view */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
              <h3 className="font-medium text-gray-900 mb-4 shrink-0">{activeDoc.title}</h3>
              <div
                data-testid={`consent-content-${activeDoc.documentType}`}
                className="border rounded-lg p-4 overflow-y-auto text-sm text-gray-700 bg-gray-50 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-strong:text-gray-900 prose-li:text-gray-700 flex-1 min-h-0"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(resolvePlaceholders(activeDoc.content, globalPlaceholders || {}, activeDoc.placeholders)) }}
              />
            </div>

            <div className="p-6 border-t space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`consent-${activeDoc.documentType}`}
                  data-testid={`consent-checkbox-${activeDoc.documentType}`}
                  checked={isCurrentChecked}
                  onCheckedChange={() => handleToggle(activeDoc.documentType)}
                />
                <label
                  htmlFor={`consent-${activeDoc.documentType}`}
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  I have read and agree to the {activeDoc.title}
                </label>
              </div>

              {isLastStep ? (
                <Button
                  data-testid="consent-accept-btn"
                  className="w-full"
                  disabled={!allChecked || recordConsents.isPending}
                  onClick={handleAccept}
                >
                  {recordConsents.isPending ? 'Saving...' : 'Accept & Continue'}
                </Button>
              ) : (
                <Button
                  data-testid="consent-next-btn"
                  className="w-full"
                  disabled={!isCurrentChecked}
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentGuard;
