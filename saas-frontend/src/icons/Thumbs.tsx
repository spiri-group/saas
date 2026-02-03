import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps } from './shared/types';
import { fillVariants } from './shared/defaults';
import { cn } from '@/lib/utils';

type thumbsDirection = "up" | "down";

type ThumbsIconProps = IconProps & {
  direction: thumbsDirection;
}

const MemoIcon: React.FC<ThumbsIconProps> = ({ direction, fillVariant="accent", ...props }) => {
  return (
    <BaseIcon 
        {...props}
        viewBox="0 0 512 512">
          {() =>
            direction == "up" ?
              (
                <>
                <path className={fillVariants[fillVariant]} opacity={1} d="M0 224c0-17.7 14.3-32 32-32H96c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V224z"/>
                <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} d="M351.1 89.4c5.2-26-11.7-51.3-37.7-56.5s-51.3 11.7-56.5 37.7L254.6 82c-6.6 33.2-24.8 63-51.2 84.2l-7.4 5.9c-22.8 18.2-36 45.8-36 75V272v48 38.3c0 32.1 16 62.1 42.7 79.9l38.5 25.7c15.8 10.5 34.3 16.1 53.3 16.1H392c26.5 0 48-21.5 48-48c0-3.6-.4-7-1.1-10.4c19.2-6.3 33.1-24.3 33.1-45.6c0-9.1-2.5-17.6-6.9-24.9c22.2-4.2 38.9-23.7 38.9-47.1c0-15.1-7-28.6-17.9-37.4c15.4-8 25.9-24.1 25.9-42.6c0-26.5-21.5-48-48-48H320c13.7-23.1 23.5-48.5 28.8-75.2l2.3-11.4z"/>
                </>
              ) :
              (
                <>
                <path className={fillVariants[fillVariant]} opacity={1} d="M0 352c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32H32C14.3 96 0 110.3 0 128V352z"/>
                <path className={cn(fillVariants[fillVariant], "fill-opacity-20 group-hover:fill-opacity-60")} d="M351.1 422.6c5.2 26-11.7 51.3-37.7 56.5s-51.3-11.7-56.5-37.7L254.6 430c-6.6-33.2-24.8-63-51.2-84.2l-7.4-5.9c-22.8-18.2-36-45.8-36-75V240 192 153.7c0-32.1 16-62.1 42.7-79.9l38.5-25.7C257.1 37.6 275.6 32 294.5 32H392c26.5 0 48 21.5 48 48c0 3.6-.4 7-1.1 10.4C458.1 96.6 472 114.7 472 136c0 9.1-2.5 17.6-6.9 24.9c22.2 4.2 38.9 23.7 38.9 47.1c0 15.1-7 28.6-17.9 37.4c15.4 8 25.9 24.1 25.9 42.6c0 26.5-21.5 48-48 48H320c13.7 23.1 23.5 48.5 28.8 75.2l2.3 11.4z"/>
                </>
              )
          }
      </BaseIcon>
  )
};
;

export default React.memo(MemoIcon);