'use client'

import { useSearchParams } from "next/navigation";

/**
 * Hook to detect if the current view is in customer mode
 * Returns true when viewMode=customer is present in URL params
 */
export const useCustomerViewMode = (): boolean => {
    const searchParams = useSearchParams();
    return searchParams.get('viewMode') === 'customer';
};

export default useCustomerViewMode;