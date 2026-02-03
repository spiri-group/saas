import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { fillVariants } from './shared/defaults';
import { IconProps } from './shared/types';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ fillVariant="accent", ...props }) => {
  return (
    <BaseIcon 
      {...props}
      viewBox="0 0 576 512">
        {() => (
          <>
          <path className={fillVariants[fillVariant]} opacity={1} d="M576 128c0-11.8-6.5-22.6-16.9-28.2s-23-5-32.9 1.6L384 196.2V315.8l142.2 94.8c9.8 6.5 22.4 7.2 32.9 1.6s16.9-16.4 16.9-28.2V128z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} d="M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);
