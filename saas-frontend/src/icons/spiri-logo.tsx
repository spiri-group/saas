import React from 'react';

const base_dimensions = {
    height: 236.81,
    width: 654.75
}

interface IconProps {
  colors?: IconColors,
  height: number,
  hover?: boolean,
  className?: string
}

type IconColors = {
  primaries: string[],
  middle: string,
  under: string[]
}

const MemoIcon: React.FC<IconProps> = ({ className, height }) => (
      <svg className={className} height={height} width={(height / base_dimensions.height) * base_dimensions.width} id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 654.75 236.81`}>
        <defs>
          <style>
            {`
              @font-face {
                font-family: 'Spiriverse';
                src: url('/fonts/spiriverse.woff2') format('woff2');
                font-weight: normal;
                font-style: normal;
              }

              .spiri-logo-cls-1 {
                fill: #bd202e;
                stroke-width: 0px;
              }

              .spiri-logo-cls-2 {
                font-size: 148.15px;
              }

              .spiri-logo-cls-2, .spiri-logo-cls-3 {
                fill: #f6b041;
                font-family: Spiriverse, sans-serif;
                font-weight: 700;
              }

              @media not all and (min-resolution: 0.001dpcm) {
                @supports (-webkit-appearance: none) {
                  .spiri-logo-cls-3 {
                    transform: translateX(-2%); /* Shift left as needed */
                  }
                }
              }
                
              .spiri-logo-cls-3 {
                font-size: 136.3px;
              }
            `}
          </style>
        </defs>
        <text className="spiri-logo-cls-2" transform="translate(336.44 142.56) scale(.85 .95) skewX(-20)">
          <tspan x="0" y="0">erse</tspan>
        </text>
        <g>
          <polygon className="spiri-logo-cls-1" points="282.31 0 272.48 11.96 314.13 118.41 356.7 11 349.86 0 381.5 0 314.13 161.14 248.29 0 282.31 0" />
          <polygon className="spiri-logo-cls-1" points="238.01 0 314.54 188.97 392.78 0 417.17 0 411.16 4.3 314.54 236.81 217.91 4.3 211.91 0 238.01 0" />
        </g>
        <text className="spiri-logo-cls-3" transform="translate(0 142.53) scale(.89 1)">
          <tspan x="0" y="0">spiri</tspan>
        </text>
      </svg>
);

export default React.memo(MemoIcon);