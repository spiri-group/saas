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

interface BookingQRCodeProps {
  bookingCode: string;
  size?: number;
  logo?: string;
  label?: string;
  srOnly?: boolean;
  showCode?: boolean;

  dotColor?: string;
  dotType?: DotType;

  cornerColor?: string;
  cornerType?: CornerType;

  cornerDotColor?: string;
  cornerDotType?: CornerType;

  backgroundColor?: string;
  logoSizeRatio?: number;
}

export default function BookingQRCode({
  bookingCode,
  size = 150,
  logo,
  label = 'Scan for check-in',
  srOnly = false,
  showCode = true,

  dotColor = '#000',
  dotType = 'rounded',

  cornerColor = '#000',
  cornerType = 'extra-rounded',

  cornerDotColor = '#000',
  cornerDotType = 'dot',

  backgroundColor = '#ffffff',
  logoSizeRatio = 0.25,
}: BookingQRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The QR code data is just the booking code - staff will enter this manually or scan
    const qr = new QRCodeStyling({
      width: size,
      height: size,
      data: bookingCode,
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
    bookingCode,
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
    <div className="flex flex-col items-center gap-2 text-center" data-testid="booking-qr-code">
      <div ref={ref} className="bg-white rounded-xl p-2 shadow-md" data-testid="qr-code-container" />
      {showCode && (
        <div className="font-mono text-2xl font-bold tracking-widest" data-testid="booking-code-display">
          {bookingCode}
        </div>
      )}
      {!srOnly && label && (
        <span className="text-xs text-muted-foreground max-w-[10rem]">{label}</span>
      )}
    </div>
  );
}
