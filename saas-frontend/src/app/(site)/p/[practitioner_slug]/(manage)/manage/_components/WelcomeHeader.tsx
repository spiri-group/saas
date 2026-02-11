'use client';

import React from "react";
import { LayoutDashboard } from "lucide-react";

interface WelcomeHeaderProps {
    practitionerName: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ practitionerName }) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="mb-6" data-testid="welcome-header">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-purple-400" />
                {getGreeting()}, {practitionerName}
            </h1>
        </div>
    );
};

export default WelcomeHeader;
