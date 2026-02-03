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
          <path className={fillVariants[fillVariant]} opacity={1} d="M232 256a56 56 0 1 1 112 0 56 56 0 1 1 -112 0z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} d="M113.1 116c11.1-13.8 8.8-33.9-5-45s-33.9-8.8-45 5C23.7 125.3 0 187.9 0 256s23.7 130.7 63.2 180c11.1 13.8 31.2 16 45 5s16-31.2 5-45C82.4 357.6 64 309 64 256s18.4-101.6 49.1-140zM512.8 76c-11.1-13.8-31.2-16-45-5s-16 31.2-5 45c30.7 38.4 49.1 87 49.1 140s-18.4 101.6-49.1 140c-11.1 13.8-8.8 33.9 5 45s33.9 8.8 45-5C552.3 386.7 576 324.1 576 256s-23.7-130.7-63.2-180zM204.5 181.3c11.8-13.2 10.7-33.4-2.5-45.2s-33.4-10.7-45.2 2.5C129 169.8 112 210.9 112 256s17 86.2 44.8 117.3c11.8 13.2 32 14.3 45.2 2.5s14.3-32 2.5-45.2c-17.8-19.8-28.5-46-28.5-74.7s10.8-54.8 28.5-74.7zm214.7-42.7c-11.8-13.2-32-14.3-45.2-2.5s-14.3 32-2.5 45.2c17.8 19.8 28.5 46 28.5 74.7s-10.8 54.8-28.5 74.7c-11.8 13.2-10.7 33.4 2.5 45.2s33.4 10.7 45.2-2.5C447 342.2 464 301.1 464 256s-17-86.2-44.8-117.3z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);