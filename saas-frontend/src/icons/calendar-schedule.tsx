import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps } from './shared/types';
import { fillVariants } from './shared/defaults';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ fillVariant="accent", ...props }) => {
  return (
    <BaseIcon 
      {...props}
      viewBox="0 0 576 512">
        {() => (
          <>
          <path className={fillVariants[fillVariant]} opacity={1} d="M288 368a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-80c-8.8 0-16 7.2-16 16v48H368c-8.8 0-16 7.2-16 16s7.2 16 16 16h48v48c0 8.8 7.2 16 16 16s16-7.2 16-16V384h48c8.8 0 16-7.2 16-16s-7.2-16-16-16H448V304c0-8.8-7.2-16-16-16z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} d="M96 32c0-17.7 14.3-32 32-32s32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32zM416 192.7c-89.7 8.1-160 83.5-160 175.3c0 59.5 29.6 112.1 74.8 144H48c-26.5 0-48-21.5-48-48V192H416v.7z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);
