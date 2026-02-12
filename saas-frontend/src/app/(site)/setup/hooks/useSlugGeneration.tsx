'use client';

import { useState, useCallback, useRef } from 'react';
import { gql } from '@/lib/services/gql';
import debounce from 'debounce';
import { toast } from 'sonner';

type SlugCheckResult = {
    merchantId: string;
    slug: string;
    available: boolean;
};

type UseSlugGenerationOptions = {
    /** URL prefix displayed to users, e.g. "spiriverse.com/" or "spiriverse.com/p/" */
    prefix: string;
    /** react-hook-form setValue for the slug field */
    setValue: (field: string, value: string, options?: { shouldValidate?: boolean }) => void;
    /** react-hook-form setError for the slug field */
    setError: (field: string, error: { type: string; message: string }) => void;
    /** The form field path for slug, e.g. "merchant.slug" or "practitioner.slug" */
    slugField: string;
};

export function useSlugGeneration({ prefix, setValue, setError, slugField }: UseSlugGenerationOptions) {
    const [hasManuallySetSlug, setHasManuallySetSlug] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const previousSlugRef = useRef<string | null>(null);

    const checkSlugAvailability = useCallback(async (slug: string): Promise<SlugCheckResult> => {
        const resp = await gql<{
            vendorIdFromSlug: SlugCheckResult;
        }>(`query check_slug($slug: String!, $requiresEncoding: Boolean) {
            vendorIdFromSlug(slug: $slug, requiresEncoding: $requiresEncoding) {
                merchantId
                slug
                available
            }
        }`, { slug, requiresEncoding: false });
        return resp.vendorIdFromSlug;
    }, []);

    const generateFromName = useCallback(
        debounce(async (nameValue: string) => {
            if (hasManuallySetSlug) return;
            setIsGenerating(true);
            try {
                const resp = await gql<{
                    vendorIdFromSlug: SlugCheckResult;
                }>(`query check_slug($slug: String!, $requiresEncoding: Boolean) {
                    vendorIdFromSlug(slug: $slug, requiresEncoding: $requiresEncoding) {
                        merchantId
                        slug
                        available
                    }
                }`, { slug: nameValue, requiresEncoding: true });

                if (!resp.vendorIdFromSlug.available) {
                    const message = `${prefix}${resp.vendorIdFromSlug.slug} is already taken.`;
                    setError(slugField, { type: 'manual', message });
                    toast.error(message);
                    setValue(slugField, resp.vendorIdFromSlug.slug);
                } else {
                    setValue(slugField, resp.vendorIdFromSlug.slug, { shouldValidate: true });
                }
            } catch {
                // Silently fail slug generation
            } finally {
                setIsGenerating(false);
            }
        }, 1000),
        [hasManuallySetSlug, setValue, setError, slugField, prefix]
    );

    const validateSlug = useCallback(async (slug: string): Promise<boolean> => {
        if (!slug || slug.length < 1) return false;
        if (!/^[a-z0-9-]+$/.test(slug)) return false;

        // Skip re-check if slug hasn't changed
        if (previousSlugRef.current === slug) return true;
        previousSlugRef.current = slug;

        try {
            const result = await checkSlugAvailability(slug);
            if (!result.available) {
                const message = `${prefix}${slug} is already taken.`;
                toast.error(message);
                return false;
            }
            return true;
        } catch {
            return true; // Don't block on network errors
        }
    }, [checkSlugAvailability, prefix]);

    const setManualSlug = useCallback((slug: string) => {
        setHasManuallySetSlug(true);
        setValue(slugField, slug, { shouldValidate: true });
    }, [setValue, slugField]);

    return {
        generateFromName,
        validateSlug,
        setManualSlug,
        isGenerating,
        hasManuallySetSlug,
    };
}
