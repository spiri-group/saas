'use client';

import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

type DotType =
  | 'dots'
  | 'rounded'
  | 'classy'
  | 'classy-rounded'
  | 'square'
  | 'extra-rounded';

type CornerType = 'dot' | 'square' | 'extra-rounded';

interface PageQRCodeProps {
  url?: string;
  size?: number;
  logo?: string;
  label?: string;
  srOnly?: boolean;

  dotColor?: string;
  dotType?: DotType;

  cornerColor?: string;
  cornerType?: CornerType;

  cornerDotColor?: string;
  cornerDotType?: CornerType;

  backgroundColor?: string;
  logoSizeRatio?: number;
}

export default function PageQRCode({
  url,
  size = 180,
  logo,
  label = 'Scan to open this page',
  srOnly = false,

  dotColor = '#000',
  dotType = 'square',

  cornerColor = '#000',
  cornerType = 'square',

  cornerDotColor = '#000',
  cornerDotType = 'dot',

  backgroundColor = '#ffffff',
  logoSizeRatio = 0.3,
}: PageQRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qr = new QRCodeStyling({
      width: size,
      height: size,
      data: url || window.location.href,
      type: 'svg',
      image: logo,
      imageOptions: {
        crossOrigin: 'anonymous',
        imageSize: logoSizeRatio,
        margin: 4,
        hideBackgroundDots: true
      },
      dotsOptions: {
        color: dotColor,
        type: dotType,
      },
      cornersSquareOptions: {
        color: cornerColor,
        type: cornerType,
      },
      cornersDotOptions: {
        color: cornerDotColor,
        type: cornerDotType,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
    });

    if (ref.current) {
      ref.current.innerHTML = '';
      qr.append(ref.current);
    }
  }, [
    url,
    size,
    logo,
    dotColor,
    dotType,
    cornerColor,
    cornerType,
    cornerDotColor,
    cornerDotType,
    backgroundColor,
    logoSizeRatio,
  ]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div ref={ref} className="bg-white rounded-xl p-1" />
      {!srOnly && (
        <span className="text-xs text-muted-foreground max-w-[10rem]">{label}</span>
      )}
    </div>
  );
}
