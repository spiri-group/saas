import React from 'react';

const base_dimensions = {
    height: 50,
    width: 80
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

const defaultColors : IconColors = {
  primaries: ["#2454a3", "#4776bb"],
  middle: "#c1bfc3",
  under: ["url(#linear-gradient-3)", "url(#linear-gradient-2)"],
}

const MemoIcon: React.FC<IconProps> = ({ className, colors = defaultColors, height }) => (
    <svg className={className} height={height} width={(height / base_dimensions.height) * base_dimensions.width} id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 677.48 445.59">
      <defs>
        <linearGradient id="linear-gradient" x1="265.51" y1="385.75" x2="156.62" y2="86.58" gradientUnits="userSpaceOnUse">
          <stop offset=".03" stopColor="#21409a"/>
          <stop offset=".11" stopColor="#26429a"/>
          <stop offset=".2" stopColor="#34499c"/>
          <stop offset=".21" stopColor="#374b9d"/>
          <stop offset=".7" stopColor="#374b9d"/>
          <stop offset=".84" stopColor="#2d3c92"/>
          <stop offset=".87" stopColor="#2b3990"/>
        </linearGradient>
        <linearGradient id="linear-gradient-2" x1="505.62" y1="152.39" x2="505.62" y2="256.12" gradientUnits="userSpaceOnUse">
          <stop offset=".23" stopColor="#2254a3"/>
          <stop offset=".31" stopColor="#29589c"/>
          <stop offset=".45" stopColor="#3e638b"/>
          <stop offset=".61" stopColor="#60756f"/>
          <stop offset=".8" stopColor="#8e8e48"/>
          <stop offset=".86" stopColor="#a19839"/>
        </linearGradient>
        <linearGradient id="linear-gradient-3" x1="444.59" y1="345.7" x2="79.65" y2="345.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2254a3"/>
          <stop offset="0" stopColor="#a19839"/>
        </linearGradient>
      </defs>
      {/* <path fill={"url(#linear-gradient)"} d="m192.87,412.09c39.7-13.14,89.44-41.93,148.6-99.37,13.02-12.64,30.85-29.61,49.73-48.13-54.62-51.51-111.89-108.49-162.54-149.22.26.25.52.48.78.73C71.44-5.5-55.81,333.7,192.87,412.09Z"/> */}
      <path fill={colors.under && colors.under.length > 0 ? colors.under[1] : defaultColors.under[1]} d="m457.28,256.12s62.08-84.02,112.63-93.13-49.71-20.04-82.67,3.22c-19.52,13.78-59.22,59.09-59.22,59.09l29.26,30.82Z"/>
      <g>
        <polygon fill={colors.middle ?? defaultColors.middle} points="311.5 310.19 311.5 310.19 311.5 310.19 311.5 310.19"/>
        <path fill={colors.middle ?? defaultColors.middle} d="m138.49,355.3h0c79.98,27.12,255.5-180.01,255.5-180.01,80.9-92.12,162.96-147.21,219.56-75.13-62.04-39.88-120.62,13.41-166.3,59.88l-71.23,78.76c-78.53,75.33-127.76,140.63-237.53,116.5Z"/>
      </g>
      <path fill={colors.primaries && colors.primaries.length > 0 ? colors.primaries[1] : defaultColors.primaries[1]} d="m472.01,179.11s0,0,0,0c16.45-13.12,40.35-21.13,64.63-21.13,10.82,0,26.7,1.92,36.34,4.85,104.51,28.96,60.59,167.74.54,169.74-21.75.72-46.4-.58-82-40.5-109.94-123.31-150.7-178.03-171.08-200.14C269.99,37.21,220.07-8.8,148.89,1.43c-45.98,6.61-82.4,31.99-109.22,75.72-14.36,18.15-26.73,41.57-31.78,82.24-15.99,128.57,106.93,300.52,219.59,273.25,4.4-1.06,16.43-5.58,22.5-8.12-32.78,2.03-118-28.21-147.63-56.58-65.54-62.74-65.19-197.67-21.14-255.94,34.1-45.1,90.05-41.63,140.19-2.4,79.96,62.57,178.03,169.42,256.21,231.59,33.56,26.68,85.36,39.21,126.42,17.83,158.67-82.59,35.03-329.81-132.02-179.91Z"/>
      <path fill={colors.primaries ? colors.primaries[0] : defaultColors.primaries[0]} d="m11.11,137.71C29.02,105.02,106.98-.54,229.44,116.09,60.33-14.05-73.57,383.69,250.98,424.52c-6.08,2.52-13.89,5.52-18.23,6.79C69.83,479.18-35.56,313.6,11.11,137.71Z"/>
      <path fill={colors.under ? colors.under[0] : defaultColors.under[0]} d="m79.65,406.59s92.22,70.81,261.82-93.88c14.56-14.14,35.14-33.68,56.46-54.76,21.32-21.08,75.82-17.88,26.79,35.09-96.54,104.29-209.65,212.43-345.07,113.55Z"/>
      <polygon fill={colors.primaries && colors.primaries.length > 0 ? colors.primaries[1] : defaultColors.primaries[1]} points="381.6 255.48 434.04 303.36 453.22 267.12 437.73 242.05 392.75 236.89 381.6 255.48"/>
    </svg>
);

export default React.memo(MemoIcon);