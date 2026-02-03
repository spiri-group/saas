import React from 'react';

const base_dimensions = {
    height: 1213.25,
    width: 1224
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
      <svg className={className} height={height} width={(height / base_dimensions.height) * base_dimensions.width} id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 1224 1213.25`}>
        <defs>
          <style>
            {`
               .spiri-assist-cls-1 {
                  fill: #0189ba;
                }

                .spiri-assist-cls-1, .spiri-assist-cls-2 {
                  stroke-width: 0px;
                }

                .spiri-assist-cls-2 {
                  fill: #0e607f;
                }
            `}
          </style>
        </defs>
        <path className="spiri-assist-cls-1" d="m578.39,9.96l-240.51,642.01,144.04-100.31,119.75-285.18,53.73,180.24,194.77,169.43L625.54,9.96l-8.91-5.57c-9.96-6.22-22.44-5.8-32.01,1.08l-6.23,4.48Z"/>
        <path className="spiri-assist-cls-1" d="m1004.21,1013.82l115.5,158.71,81.67,2.57c2.24.07,4.38.98,6.04,2.56h0c8.17,7.77,9.73,20.66,3.67,30.35h0s-388.62,0-388.62,0l-2.82-2.55c-8.38-7.58-8.08-21.35.61-28.51l19.7-16.23-110.57-366.15,274.82,219.26Z"/>
        <path className="spiri-assist-cls-1" d="m395.12,785.96l-107.35,294.02,24.46,48.72,67.94,57.32,3.24,3.04c5.1,4.78,5.93,12.86,1.91,18.68l-3.8,5.51H16l-7.78-5.79c-8.34-6.21-10.07-18.51-3.81-27.01l7.51-10.19,105.99-15.76,27.18-50.16,94.89-203.5,155.13-114.88Z"/>
        <polygon className="spiri-assist-cls-2" points="0 959.27 621.4 475.07 1224 960.08 997.08 960.08 563.61 607.54 111.67 968.68 0 959.27"/>
      </svg>
);

export default React.memo(MemoIcon);