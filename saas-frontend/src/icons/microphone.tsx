import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps } from './shared/types';
import { fillVariants } from './shared/defaults';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ fillVariant="accent", ...props }) => {
  return (
    <BaseIcon 
      {...props}
      viewBox="0 0 384 512" 
      >
        {() => (
          <>
          <path className={fillVariants[fillVariant]} opacity={1} d="M96 96c0-53 43-96 96-96s96 43 96 96V256c0 53-43 96-96 96s-96-43-96-96V96z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 hover:fill-opacity-60")} d="M40 192c13.3 0 24 10.7 24 24v40c0 70.7 57.3 128 128 128s128-57.3 128-128V216c0-13.3 10.7-24 24-24s24 10.7 24 24v40c0 89.1-66.2 162.7-152 174.4V464h48c13.3 0 24 10.7 24 24s-10.7 24-24 24H192 120c-13.3 0-24-10.7-24-24s10.7-24 24-24h48V430.4C82.2 418.7 16 345.1 16 256V216c0-13.3 10.7-24 24-24z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);