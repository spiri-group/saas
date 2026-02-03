'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const ComingSoonVisibility: React.FC<{ hide: boolean, children: ReactNode | ReactNode[] }> = 
  ({ hide = true, children}) => {
    const pathname = usePathname();
    const shouldHide = pathname.includes('/coming-soon');

    if (shouldHide && hide) {
        return null;
    }

    return  (<>{ children}</>)
};

export default ComingSoonVisibility;
