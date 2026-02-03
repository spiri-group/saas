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
        {({hover}) => (
          <>
          <path className={fillVariants[fillVariant]} opacity={1} d="M512 64V288H64L64 64H512zM64 0C28.7 0 0 28.7 0 64V288c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} opacity={hover ? 0.6 : 0.2} d="M32 416c-17.7 0-32 14.3-32 32v32c0 17.7 14.3 32 32 32H64c17.7 0 32-14.3 32-32V448c0-17.7-14.3-32-32-32H32zm160 0c-17.7 0-32 14.3-32 32v32c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32V448c0-17.7-14.3-32-32-32H192zm128 32v32c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32V448c0-17.7-14.3-32-32-32H352c-17.7 0-32 14.3-32 32zm192-32c-17.7 0-32 14.3-32 32v32c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32V448c0-17.7-14.3-32-32-32H512z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);

