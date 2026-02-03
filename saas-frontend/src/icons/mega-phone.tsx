import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps } from './shared/types';
import { fillVariants } from './shared/defaults';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ fillVariant="accent", ...props }) => {
  return (
    <BaseIcon 
      {...props}
      viewBox="0 0 576 512" 
      >
        {() => (
          <>
          <path 
              className={fillVariants[fillVariant]} opacity={1}
              d="M544 32c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32zM160 384c0 53 43 96 96 96c46.8 0 85.8-33.5 94.3-77.8L303.7 389c-2.5 24.2-22.9 43-47.7 43c-26.5 0-48-21.5-48-48c0-7.4 1.7-14.5 4.7-20.8L166.2 350c-4 10.6-6.2 22-6.2 34z"/>
          <path 
              className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")}
              d="M64 190.9L512 64V448L64 321.1C63.4 338.2 49.3 352 32 352c-17.7 0-32-14.3-32-32V192c0-17.7 14.3-32 32-32c17.3 0 31.4 13.8 32 30.9z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);
