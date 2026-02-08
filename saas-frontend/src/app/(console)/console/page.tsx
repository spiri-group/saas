"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Shield,
  Power,
  ExternalLink,
  List,
  DollarSign,
  Mail,
  AlertTriangle,
  Users,
  GitBranch,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import ChoiceManager from "./choice-manager/ChoiceManager";
import FeesManager from "./fees-manager/FeesManager";
import EmailTemplatesManager from "./email-templates/EmailTemplatesManager";
import AlertsManager from "./alerts-manager/AlertsManager";
import AccountsManager from "./accounts-manager/AccountsManager";
import AccountJourneys from "./account-journeys/AccountJourneys";
import Analytics from "./analytics/Analytics";

type ConsoleView = 'choice-manager' | 'fees-manager' | 'email-templates' | 'alerts-manager' | 'accounts-manager' | 'account-journeys' | 'analytics';

export default function ConsolePage() {
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<ConsoleView>('choice-manager');

  const handleSignOut = () => {
    signOut({ callbackUrl: "/console/login" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-console-spin rounded-full h-6 w-6 border-2 border-console-primary border-t-transparent"></div>
          <span className="text-console-muted text-sm">Loading Console...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-console-muted mx-auto mb-4" />
          <p className="text-console-secondary">Please sign in to access the console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="console-surface border-b border-console sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-console-gradient-brand rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">SV</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-console">Spiriverse Console</h1>
                  <p className="text-xs text-console-muted">
                    {currentView === 'choice-manager' ? 'Choice Manager' :
                     currentView === 'fees-manager' ? 'Fees Manager' :
                     currentView === 'email-templates' ? 'Email Templates' :
                     currentView === 'alerts-manager' ? 'Alerts Manager' :
                     currentView === 'account-journeys' ? 'Account Journeys' :
                     currentView === 'analytics' ? 'Site Analytics' :
                     'Accounts Manager'}
                  </p>
                </div>
              </div>
              
              {/* Navigation to Customer Site */}
              <Link 
                href="/"
                className="flex items-center space-x-2 px-3 py-2 text-sm text-console-muted hover:text-console bg-console-surface hover:bg-console-surface-hover rounded-lg console-interactive border border-console"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Customer Site</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-console">{session.user?.email}</p>
                  <p className="text-xs text-console-muted">System Administrator</p>
                </div>
                <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 text-console-muted hover:text-red-400 hover:bg-console-surface-hover rounded-lg console-interactive group"
                  title="Sign Out"
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="console-surface border-b border-console">
        <div className="w-full px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('choice-manager')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'choice-manager'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Choice Manager</span>
            </button>
            <button
              onClick={() => setCurrentView('fees-manager')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'fees-manager'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Fees Manager</span>
            </button>
            <button
              onClick={() => setCurrentView('email-templates')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'email-templates'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email Templates</span>
            </button>
            <button
              onClick={() => setCurrentView('alerts-manager')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'alerts-manager'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Alerts</span>
            </button>
            <button
              onClick={() => setCurrentView('accounts-manager')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'accounts-manager'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Accounts</span>
            </button>
            <button
              onClick={() => setCurrentView('account-journeys')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'account-journeys'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <GitBranch className="h-4 w-4" />
              <span>Account Journeys</span>
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'analytics'
                  ? 'border-console-primary text-console-primary'
                  : 'border-transparent text-console-muted hover:text-console hover:border-console-muted'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Website Traffic</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow min-h-0">
        {currentView === 'choice-manager' && <ChoiceManager />}
        {currentView === 'fees-manager' && <FeesManager />}
        {currentView === 'email-templates' && <EmailTemplatesManager />}
        {currentView === 'alerts-manager' && <AlertsManager />}
        {currentView === 'accounts-manager' && <AccountsManager />}
        {currentView === 'account-journeys' && <AccountJourneys />}
        {currentView === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}