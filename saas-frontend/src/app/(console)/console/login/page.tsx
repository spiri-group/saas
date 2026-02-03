import ConsoleLoginForm from "./ui";
import { Shield } from "lucide-react";

export default function ConsoleLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Spiriverse Console</h1>
            <p className="text-slate-400 text-sm">
              Administrative access portal
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
              </div>
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Secure Access Required</p>
                <p className="text-blue-200/70 text-xs leading-relaxed">
                  This console requires Microsoft Entra ID authentication. Your access will be logged and monitored.
                </p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <ConsoleLoginForm />

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <p className="text-center text-xs text-slate-500">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>

        {/* Additional Security Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}
