'use client';

import React from "react";
import { Store } from "lucide-react";

interface WelcomeHeaderProps {
    merchantName: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ merchantName }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Store className="w-6 h-6 text-amber-400" />
                {getGreeting()}, {merchantName}
            </h1>
            <p className="text-slate-400 mt-1">
                Manage your store
            </p>
        </div>
    );
};

export default WelcomeHeader;
