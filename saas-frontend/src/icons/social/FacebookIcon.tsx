import React from 'react';
import BaseIcon from '../shared/BaseIcon';
import { IconProps } from '../shared/types';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ mode="solid", ...props }) => {
  return (
    <BaseIcon 
      {...props}
      viewBox="0 0 24 24">
        {() => (
          mode == 'solid' ?
          <>
            <path fill={"#1877F2"} d="M12 2.04c-5.52 0-10 4.48-10 10 0 4.99 3.66 9.12 8.44 9.88v-6.99h-2.54v-2.88h2.54v-2.21c0-2.5 1.5-3.88 3.78-3.88 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.62.77-1.62 1.56v1.86h2.78l-.44 2.88h-2.34v6.99c4.78-.76 8.44-4.89 8.44-9.88 0-5.52-4.48-10-10-10z"/>
          </> : 
          <>
            <path className={cn("fill-none stroke-primary", "stroke-merchant-primary")} d="M12 2.04c-5.52 0-10 4.48-10 10 0 4.99 3.66 9.12 8.44 9.88v-6.99h-2.54v-2.88h2.54v-2.21c0-2.5 1.5-3.88 3.78-3.88 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.62.77-1.62 1.56v1.86h2.78l-.44 2.88h-2.34v6.99c4.78-.76 8.44-4.89 8.44-9.88 0-5.52-4.48-10-10-10z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);
