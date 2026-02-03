'use client'

import { usePathname } from 'next/navigation';

/**
 * Hook to detect if we're currently on a vendor/merchant profile page
 * @returns boolean - true if on a merchant profile page (URL starts with /m/)
 */
export const useOnVendorPages = (): boolean => {
    const pathname = usePathname();
    return pathname.startsWith('/m/');
};

export default useOnVendorPages;