'use client';

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

const OfflineBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState(true);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline && !showReconnected) return null;

    return (
        <div
            className={`flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-colors ${
                isOnline
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
            }`}
            data-testid="offline-banner"
        >
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4" />
                    Back online — data syncing
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4" />
                    You&apos;re offline — check-ins will sync when reconnected
                </>
            )}
        </div>
    );
};

export default OfflineBanner;
