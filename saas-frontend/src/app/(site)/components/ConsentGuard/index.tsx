'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import useCheckOutstandingConsents from './hooks/UseCheckOutstandingConsents';
import useRecordConsents from './hooks/UseRecordConsents';

const ConsentGuard = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const { data: outstanding, isLoading } = useCheckOutstandingConsents('site', isLoggedIn);
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900" data-testid="consent-guard-title">
            Please Review Our Updated Terms
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Please review and accept the following to continue using SpiriVerse.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {outstanding.map(doc => (
            <div key={doc.documentType} className="space-y-3">
              <h3 className="font-medium text-gray-900">{doc.title}</h3>
              <div
                data-testid={`consent-content-${doc.documentType}`}
                className="border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-700 bg-gray-50 whitespace-pre-wrap"
              >
                {doc.content}
              </div>
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
  );
};

export default ConsentGuard;
