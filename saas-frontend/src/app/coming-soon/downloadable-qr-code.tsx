'use client';

import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';

interface DownloadableQRCodeProps {
  url: string;
  size?: number;
  logo?: string;
  label?: string;
  onShare?: () => void;
}

export default function DownloadableQRCode({
  url,
  size = 200,
  logo,
  label = 'Scan to visit page',
  onShare,
}: DownloadableQRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrCode.current) {
      qrCode.current = new QRCodeStyling({
        width: size + 20, // Add extra size for padding
        height: size + 20,
        data: url,
        type: 'svg',
        margin: 10, // Small margin for print-friendly spacing
        image: logo,
        imageOptions: {
          imageSize: 0.3,
          margin: 4,
          hideBackgroundDots: true,
        },
        dotsOptions: {
          color: '#dc2626',
          type: 'dots',
        },
        cornersSquareOptions: {
          color: '#eab308',
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#eab308',
          type: 'dot',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
      });
    }

    if (ref.current) {
      ref.current.innerHTML = '';
      qrCode.current.append(ref.current);
    }
  }, [url, size, logo]);

  const handleDownload = () => {
    if (qrCode.current) {
      qrCode.current.download({
        name: 'spiriverse-qr-code',
        extension: 'png',
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} className="bg-white rounded-xl p-4 shadow-lg" />
      <p className="text-xs text-slate-400 text-center">{label}</p>
      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>
        {onShare && (
          <Button
            onClick={onShare}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            size="sm"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Share via Mobile
          </Button>
        )}
      </div>
    </div>
  );
}
