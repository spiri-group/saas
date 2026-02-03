import React from 'react';
import BaseIcon from './shared/BaseIcon';
import { IconProps, IconStyle } from './shared/types';

type StarIconProps = IconProps & {
  selected?: boolean;
}

const MemoIcon: React.FC<StarIconProps> = ({ mode=IconStyle.Fill, selected, ...props }) => {
  const variants_fill = {
    selected: "fill-primary",
    unselected: "fill-gray-500",
  }

  const variants_outline = {
    selected: "stroke-primary",
    unselected: "stroke-gray-500",
  }

  return (
    <BaseIcon 
        {...props}
        viewBox="0 0 576 512">
          {() => {
            if (mode == IconStyle.Fill) {
              return (
                <path className={variants_fill[selected ? "selected" : "unselected"]} opacity={1}
                d="M288.1 0l86.5 164 182.7 31.6L428 328.5 454.4 512 288.1 430.2 121.7 512l26.4-183.5L18.9 195.6 201.5 164 288.1 0z"/>
              )
            } else if (mode == IconStyle.Outline) {
              return (
                <path
                  className={variants_outline[selected ? "selected" : "unselected"]} opacity={1}
                  d="M287.9 0c9.2 0 17.6 5.2 21.6 13.5l68.6 141.3 153.2 22.6c9 1.3 16.5 7.6 19.3 16.3s.5 18.1-5.9 24.5L433.6 328.4l26.2 155.6c1.5 9-2.2 18.1-9.6 23.5s-17.3 6-25.3 1.7l-137-73.2L151 509.1c-8.1 4.3-17.9 3.7-25.3-1.7s-11.2-14.5-9.7-23.5l26.2-155.6L31.1 218.2c-6.5-6.4-8.7-15.9-5.9-24.5s10.3-14.9 19.3-16.3l153.2-22.6L266.3 13.5C270.4 5.2 278.7 0 287.9 0zm0 79L235.4 187.2c-3.5 7.1-10.2 12.1-18.1 13.3L99 217.9 184.9 303c5.5 5.5 8.1 13.3 6.8 21L171.4 443.7l105.2-56.2c7.1-3.8 15.6-3.8 22.6 0l105.2 56.2L384.2 324.1c-1.3-7.7 1.2-15.5 6.8-21l85.9-85.1L358.6 200.5c-7.8-1.2-14.6-6.1-18.1-13.3L287.9 79z"/>
              )
            } else {
              return <></>
            }

          }}
      </BaseIcon>
  )
};
;

export default React.memo(MemoIcon);