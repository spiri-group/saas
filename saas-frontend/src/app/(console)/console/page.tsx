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

      {/* Body: Sidebar + Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar Navigation */}
        <nav className="console-surface border-r border-console w-48 flex-shrink-0 flex flex-col py-2 overflow-y-auto">
          {([
            { group: 'Content', items: [
              { key: 'choice-manager' as ConsoleView, icon: List, label: 'Choice Manager' },
              { key: 'email-templates' as ConsoleView, icon: Mail, label: 'Email Templates' },
            ]},
            { group: 'Finance', items: [
              { key: 'fees-manager' as ConsoleView, icon: DollarSign, label: 'Fees Manager' },
            ]},
            { group: 'Accounts', items: [
              { key: 'accounts-manager' as ConsoleView, icon: Users, label: 'Accounts' },
              { key: 'account-journeys' as ConsoleView, icon: GitBranch, label: 'Journeys' },
            ]},
            { group: 'System', items: [
              { key: 'alerts-manager' as ConsoleView, icon: AlertTriangle, label: 'Alerts' },
              { key: 'analytics' as ConsoleView, icon: BarChart3, label: 'Website Traffic' },
            ]},
          ]).map(({ group, items }) => (
            <div key={group} className="mb-1">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-console-muted/60">{group}</p>
              {items.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm font-medium transition-colors ${
                    currentView === key
                      ? 'text-console-primary bg-console-primary/10 border-r-2 border-console-primary'
                      : 'text-console-muted hover:text-console hover:bg-console-surface-hover'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-h-0 min-w-0">
          {currentView === 'choice-manager' && <ChoiceManager />}
          {currentView === 'fees-manager' && <FeesManager />}
          {currentView === 'email-templates' && <EmailTemplatesManager />}
          {currentView === 'alerts-manager' && <AlertsManager />}
          {currentView === 'accounts-manager' && <AccountsManager />}
          {currentView === 'account-journeys' && <AccountJourneys />}
          {currentView === 'analytics' && <Analytics />}
        </main>
      </div>
    </div>
  );
}