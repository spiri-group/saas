import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps } from './shared/types';
import { fillVariants } from './shared/defaults';
import { cn } from '@/lib/utils';

const MemoIcon: React.FC<IconProps> = ({ fillVariant="accent", ...props }) => {
  return (
    <BaseIcon
      {...props}
      viewBox="0 0 640 512" 
      >
        {() => (
          <>
          <path className={fillVariants[fillVariant]} opacity={0.4} d="M257.2 217.8c9 3.7 14.8 12.5 14.8 22.2v32h96V240c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l64 64c9.4 9.4 9.4 24.6 0 33.9l-64 64c-6.9 6.9-17.2 8.9-26.2 5.2s-14.8-12.5-14.8-22.2V336H272v32c0 9.7-5.8 18.5-14.8 22.2s-19.3 1.7-26.2-5.2l-64-64c-9.4-9.4-9.4-24.6 0-33.9l64-64c6.9-6.9 17.2-8.9 26.2-5.2z"/>
          <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} opacity={1}   d="M192 64A64 64 0 1 0 64 64a64 64 0 1 0 128 0zM25.9 233.4l-4.1 49.3c-2.5 29.8 15.7 56.1 42.2 65.6V464c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V348.3c.6-.2 1.1-.4 1.7-.6L167 321c-9.4-9.4-9.4-24.6 0-33.9l62-62c-7.1-37.4-39.8-65.1-78.6-65.1H105.6c-41.6 0-76.3 31.9-79.7 73.4zM446.3 347.6c.6 .2 1.1 .4 1.7 .6V464c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V348.3c26.5-9.5 44.7-35.8 42.2-65.6l-4.1-49.3C610.7 191.9 576 160 534.4 160H489.6c-38.8 0-71.5 27.7-78.6 65.1l62 62c9.4 9.4 9.4 24.6 0 33.9l-26.7 26.7zM576 64A64 64 0 1 0 448 64a64 64 0 1 0 128 0z"/>
          </>
        )}
      </BaseIcon>
  )
};

export default React.memo(MemoIcon);