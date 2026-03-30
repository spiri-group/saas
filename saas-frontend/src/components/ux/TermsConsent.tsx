"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  vendorId: string;
  vendorName: string;
  termsDocumentId: string | undefined;
  accepted: boolean;
  onAccept: (accepted: boolean) => void;
};

/**
 * Checkout consent checkbox for practitioner terms & conditions.
 * Only renders when a termsDocumentId is provided.
 * Shows a checkbox with a link to view the full terms in a dialog.
 */
export default function TermsConsent({ vendorId, vendorName, termsDocumentId, accepted, onAccept }: Props) {
  const [showTerms, setShowTerms] = useState(false);

  const { data: termsDoc } = useQuery({
    queryKey: ["public-terms-document", vendorId, termsDocumentId],
    queryFn: async () => {
      const response = await gql<{ publicTermsDocument: { id: string; title: string; content: string } | null }>(
        `
        query PublicTermsDocument($vendorId: ID!, $documentId: ID!) {
          publicTermsDocument(vendorId: $vendorId, documentId: $documentId) {
            id
            title
            content
          }
        }
      `,
        { vendorId, documentId: termsDocumentId }
      );
      return response.publicTermsDocument;
    },
    enabled: !!termsDocumentId && !!vendorId,
  });

  if (!termsDocumentId || !termsDoc) return null;

  return (
    <>
      <label
        data-testid="terms-consent-checkbox"
        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm text-slate-700">
          I agree to {vendorName}&apos;s{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowTerms(true);
            }}
            className="text-purple-600 underline hover:text-purple-700"
          >
            terms and conditions
          </button>
        </span>
      </label>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{termsDoc.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
              {termsDoc.content}
            </div>
          </div>
          <DialogFooter>
            <Button
              data-testid="close-terms-btn"
              onClick={() => setShowTerms(false)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
