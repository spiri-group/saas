'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import useCheckOutstandingConsents from '../../components/ConsentGuard/hooks/UseCheckOutstandingConsents';
import useRecordConsents from '../../components/ConsentGuard/hooks/UseRecordConsents';

type Props = {
    onAccepted: () => void;
};

export default function OnboardingConsent({ onAccepted }: Props) {
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const { data: outstanding, isLoading } = useCheckOutstandingConsents('merchant-onboarding', isLoggedIn);
    const recordConsents = useRecordConsents();
    const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isLoading && (!outstanding || outstanding.length === 0)) {
            onAccepted();
        }
    }, [isLoading, outstanding, onAccepted]);

    if (isLoading || !outstanding || outstanding.length === 0) return null;

    const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));

    const handleToggle = (documentType: string) => {
        setCheckedDocs(prev => {
            const next = new Set(prev);
            if (next.has(documentType)) next.delete(documentType);
            else next.add(documentType);
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
        onAccepted();
    };

    return (
        <div className="flex flex-col space-y-6 p-8" data-testid="onboarding-consent">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Before You Begin</h1>
                <p className="text-base text-slate-600">
                    Please review and accept the following to get started.
                </p>
            </div>
            <div className="space-y-4">
                {outstanding.map(doc => (
                    <div key={doc.documentType} className="flex items-start space-x-2">
                        <Checkbox
                            id={`onboarding-consent-${doc.documentType}`}
                            data-testid={`onboarding-consent-${doc.documentType}`}
                            checked={checkedDocs.has(doc.documentType)}
                            onCheckedChange={() => handleToggle(doc.documentType)}
                        />
                        <label
                            htmlFor={`onboarding-consent-${doc.documentType}`}
                            className="text-sm text-slate-700 cursor-pointer select-none leading-normal"
                        >
                            I have read and agree to the{' '}
                            <Link
                                href={`/legal/${doc.documentType}`}
                                target="_blank"
                                className="text-purple-600 underline hover:text-purple-800"
                            >
                                {doc.title}
                            </Link>
                        </label>
                    </div>
                ))}
            </div>
            <Button
                data-testid="onboarding-consent-accept-btn"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                disabled={!allChecked || recordConsents.isPending}
                onClick={handleAccept}
            >
                {recordConsents.isPending ? 'Saving...' : 'Accept & Continue'}
            </Button>
        </div>
    );
}
