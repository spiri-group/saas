'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { resolvePlaceholders } from '@/utils/resolvePlaceholders';
import UseLegalPlaceholders from '@/hooks/UseLegalPlaceholders';
import useCheckOutstandingConsents from './hooks/UseCheckOutstandingConsents';
import useRecordConsents from './hooks/UseRecordConsents';

const ConsentGuard = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const { data: outstanding, isLoading } = useCheckOutstandingConsents('site', isLoggedIn);
  const { data: globalPlaceholders } = UseLegalPlaceholders();
  const recordConsents = useRecordConsents();

  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  if (!isLoggedIn || isLoading || dismissed) return null;
  if (!outstanding || outstanding.length === 0) return null;

  const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));

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
          {/* Left panel — preamble */}
          <div className="bg-slate-50 p-8 flex flex-col items-start md:border-r border-b md:border-b-0 border-gray-200">
            <div className="rounded-full bg-indigo-100 p-3 mb-5">
              <ShieldCheck className="h-7 w-7 text-indigo-600" />
            </div>
            <h2
              className="text-xl font-semibold text-gray-900 mb-3"
              data-testid="consent-guard-title"
            >
              We&apos;ve Updated Our Terms
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              We periodically update our legal documents to better protect you and stay current with regulations. Please take a moment to review the changes below.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your continued use of SpiriVerse means a lot to us. This only takes a minute.
            </p>
          </div>

          {/* Right panel — documents + consent */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {outstanding.map(doc => (
                <div key={doc.documentType} className="space-y-3">
                  <h3 className="font-medium text-gray-900">{doc.title}</h3>
                  <div
                    data-testid={`consent-content-${doc.documentType}`}
                    className="border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-700 bg-gray-50 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-strong:text-gray-900 prose-li:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(resolvePlaceholders(doc.content, globalPlaceholders || {}, doc.placeholders)) }}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`consent-${doc.documentType}`}
                      data-testid={`consent-checkbox-${doc.documentType}`}
                      checked={checkedDocs.has(doc.documentType)}
                      onCheckedChange={() => handleToggle(doc.documentType)}
                    />
                    <label
                      htmlFor={`consent-${doc.documentType}`}
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      I have read and agree to the {doc.title}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t">
              <Button
                data-testid="consent-accept-btn"
                className="w-full"
                disabled={!allChecked || recordConsents.isPending}
                onClick={handleAccept}
              >
                {recordConsents.isPending ? 'Saving...' : 'Accept & Continue'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentGuard;
