'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { resolvePlaceholders } from '@/utils/resolvePlaceholders';
import UseLegalPlaceholders from '@/hooks/UseLegalPlaceholders';
import useUserMarket from '@/hooks/UseUserMarket';

type LegalDocumentResponse = {
  documentType: string;
  title: string;
  content: string;
  market: string;
  parentDocumentId?: string;
  placeholders?: Record<string, string>;
  version: number;
  effectiveDate: string;
  updatedAt: string;
};

const useLegalDocumentWithSupplement = (documentType: string, market: string | null) => {
  return useQuery({
    queryKey: ['legal-document-public', documentType, market],
    queryFn: async () => {
      const response = await gql<{
        legalDocuments: LegalDocumentResponse[];
      }>(`
        query GetPublicLegalDocument($documentType: String!) {
          legalDocuments(documentType: $documentType) {
            documentType
            title
            content
            market
            parentDocumentId
            placeholders
            version
            effectiveDate
            updatedAt
          }
        }
      `, { documentType });

      const docs = response.legalDocuments;

      // Find the base (global) document
      const baseDoc = docs.find(d => d.market === 'global' && !d.parentDocumentId) ?? null;

      // Find the market-specific supplement if market is available
      const supplement = market
        ? docs.find(d => d.parentDocumentId && d.market === market) ?? null
        : null;

      return { baseDoc, supplement };
    },
    enabled: !!documentType,
  });
};

export default function LegalDocumentPage() {
  const params = useParams();
  const documentType = params.documentType as string;
  const market = useUserMarket();

  const { data, isLoading, error } = useLegalDocumentWithSupplement(documentType, market);
  const { data: globalPlaceholders } = UseLegalPlaceholders();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="space-y-2 mt-8">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  const document = data?.baseDoc;

  if (error || !document) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
        <p className="text-gray-600 mb-6">
          The legal document you&apos;re looking for could not be found.
        </p>
        <Link href="/" className="text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const supplement = data?.supplement;

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const formattedEffectiveDate = new Date(document.effectiveDate || document.updatedAt).toLocaleDateString('en-US', dateFormatOptions);
  const formattedUpdatedDate = new Date(document.updatedAt).toLocaleDateString('en-US', dateFormatOptions);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="text-blue-600 hover:underline inline-flex items-center gap-1 mb-6"
        data-testid="legal-back-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="legal-doc-title">
        {document.title}
      </h1>
      <div className="flex items-center justify-between text-sm text-gray-500 mb-8" data-testid="legal-doc-date">
        <span>Effective: {formattedEffectiveDate}</span>
        <span>Last Updated: {formattedUpdatedDate} &middot; Version {document.version}</span>
      </div>

      <div
        className="prose prose-gray max-w-none"
        data-testid="legal-doc-content"
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(resolvePlaceholders(document.content, globalPlaceholders || {}, document.placeholders)),
        }}
      />

      {supplement && (
        <>
          <hr className="my-10 border-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2" data-testid="legal-supplement-title">
            {supplement.title}
          </h2>
          <div className="text-sm text-gray-500 mb-6">
            Version {supplement.version}
          </div>
          <div
            className="prose prose-gray max-w-none"
            data-testid="legal-supplement-content"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(resolvePlaceholders(supplement.content, globalPlaceholders || {}, supplement.placeholders)),
            }}
          />
        </>
      )}
    </div>
  );
}
