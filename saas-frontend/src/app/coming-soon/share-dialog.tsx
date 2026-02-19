"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import DownloadableQRCode from "./downloadable-qr-code";

export default function ShareDialog() {
  const [isMounted, setIsMounted] = useState(false);

  // Only access window on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pageUrl = isMounted ? window.location.href : "";
  const canShare = isMounted && navigator.share;

  const handleMobileShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SpiriVerse - Coming February 2026",
          text: "Check out SpiriVerse - Your Bridge to Personal Growth!",
          url: pageUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log("Error sharing:", err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-4 w-full">
      {/* Thank you message */}
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 text-center w-full">
        <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-sm text-slate-300">
          Thank you for your willingness to share! Your support means the
          world to us.
        </p>
      </div>

      {/* QR Code with buttons */}
      {isMounted && (
        <DownloadableQRCode
          url={pageUrl}
          size={200}
          logo="/spiriverse-v-only.svg"
          label="Scan to visit spiriverse.com"
          onShare={
            canShare
              ? handleMobileShare
              : () => {
                  window.location.href = `sms:?body=${encodeURIComponent(
                    `Check out SpiriVerse - Your Bridge to Personal Growth! ${pageUrl}`
                  )}`;
                }
          }
        />
      )}
    </div>
  );
}
