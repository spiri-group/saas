"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function ConsoleLoginForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("microsoft-entra-id", { callbackUrl: "/console" });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="cursor-pointer w-full group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-blue-500/25"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            <span>Signing in...</span>
          </>
        ) : (
          <span>Enter</span>
        )}
      </button>
      
      <div className="text-center">
        <p className="text-xs text-slate-500">
          By continuing, you agree to our security policies
        </p>
      </div>
    </div>
  );
}
