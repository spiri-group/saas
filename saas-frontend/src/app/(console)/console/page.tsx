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
  BarChart3,
  Scale,
  Tag,
  Bot,
  Send,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import ChoiceManager from "./choice-manager/ChoiceManager";
import FeesManager from "./fees-manager/FeesManager";
import EmailTemplatesManager from "./email-templates/EmailTemplatesManager";
import AlertsManager from "./alerts-manager/AlertsManager";
import AccountsManager from "./accounts-manager/AccountsManager";
import AccountJourneys from "./account-journeys/AccountJourneys";
import Analytics from "./analytics/Analytics";
import LegalDocumentsManager from "./legal-documents/LegalDocumentsManager";
import PricingReference from "./pricing-reference/PricingReference";
import AiAssistant from "./ai-assistant/AiAssistant";
import OutboxManager from "./outbox/OutboxManager";

type ConsoleView = 'choice-manager' | 'fees-manager' | 'email-templates' | 'alerts-manager' | 'accounts-manager' | 'account-journeys' | 'analytics' | 'legal-documents' | 'pricing-reference' | 'ai-assistant' | 'outbox';

const NAV_GROUPS = [
  { group: 'Content', items: [
    { key: 'choice-manager' as ConsoleView, icon: List, label: 'Choice Manager' },
    { key: 'email-templates' as ConsoleView, icon: Mail, label: 'Email Templates' },
    { key: 'outbox' as ConsoleView, icon: Send, label: 'Outbox' },
    { key: 'legal-documents' as ConsoleView, icon: Scale, label: 'Legal Documents' },
  ]},
  { group: 'Finance', items: [
    { key: 'fees-manager' as ConsoleView, icon: DollarSign, label: 'Fees Manager' },
    { key: 'pricing-reference' as ConsoleView, icon: Tag, label: 'Pricing Reference' },
  ]},
  { group: 'Accounts', items: [
    { key: 'accounts-manager' as ConsoleView, icon: Users, label: 'Accounts' },
    { key: 'account-journeys' as ConsoleView, icon: GitBranch, label: 'Journeys' },
  ]},
  { group: 'System', items: [
    { key: 'alerts-manager' as ConsoleView, icon: AlertTriangle, label: 'Alerts' },
    { key: 'analytics' as ConsoleView, icon: BarChart3, label: 'Website Traffic' },
    { key: 'ai-assistant' as ConsoleView, icon: Bot, label: 'AI Assistant' },
  ]},
];

const VIEW_LABELS: Record<ConsoleView, string> = {
  'choice-manager': 'Choice Manager',
  'fees-manager': 'Fees Manager',
  'email-templates': 'Email Templates',
  'legal-documents': 'Legal Documents',
  'alerts-manager': 'Alerts Manager',
  'account-journeys': 'Account Journeys',
  'analytics': 'Site Analytics',
  'pricing-reference': 'Pricing Reference',
  'ai-assistant': 'AI Assistant',
  'accounts-manager': 'Accounts Manager',
  'outbox': 'Outbox',
};

export default function ConsolePage() {
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<ConsoleView>('choice-manager');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/console/login" });
  };

  const handleNavClick = (key: ConsoleView) => {
    setCurrentView(key);
    setSidebarOpen(false);
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
      <header className="console-surface border-b border-console sticky top-0 z-30">
        <div className="w-full px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Mobile hamburger */}
              <button
                data-testid="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 -ml-1 text-console-muted hover:text-console rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="h-7 w-7 md:h-8 md:w-8 bg-console-gradient-brand rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs md:text-sm font-bold">SV</span>
                </div>
                <div>
                  <h1 className="text-base md:text-xl font-semibold text-console leading-tight">
                    <span className="hidden sm:inline">Spiriverse Console</span>
                    <span className="sm:hidden">{VIEW_LABELS[currentView]}</span>
                  </h1>
                  <p className="text-xs text-console-muted hidden sm:block">
                    {VIEW_LABELS[currentView]}
                  </p>
                </div>
              </div>

              {/* Navigation to Customer Site — hidden on mobile */}
              <Link
                href="/"
                className="hidden md:flex items-center space-x-2 px-3 py-2 text-sm text-console-muted hover:text-console bg-console-surface hover:bg-console-surface-hover rounded-lg console-interactive border border-console"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Customer Site</span>
              </Link>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* User Menu */}
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="text-right hidden sm:block">
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
      <div className="flex-1 flex min-h-0 relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            data-testid="sidebar-overlay"
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation — drawer on mobile, static on desktop */}
        <nav
          data-testid="sidebar-nav"
          className={`
            fixed md:static inset-y-0 left-0 z-50
            w-64 md:w-48
            console-surface border-r border-console
            flex-shrink-0 flex flex-col overflow-y-auto
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Mobile drawer header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-console">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 bg-console-gradient-brand rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">SV</span>
              </div>
              <span className="text-sm font-semibold text-console">Console</span>
            </div>
            <button
              data-testid="close-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-console-muted hover:text-console rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile: Customer Site link */}
          <div className="md:hidden px-3 pt-3">
            <Link
              href="/"
              className="flex items-center space-x-2 px-3 py-2.5 text-sm text-console-muted hover:text-console bg-console-surface hover:bg-console-surface-hover rounded-lg border border-console"
              onClick={() => setSidebarOpen(false)}
            >
              <ExternalLink className="h-4 w-4" />
              <span>Customer Site</span>
            </Link>
          </div>

          <div className="py-2">
            {NAV_GROUPS.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-console-muted/60">{group}</p>
                {items.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => handleNavClick(key)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 md:py-2 text-sm font-medium transition-colors ${
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
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-h-0 min-w-0">
          {currentView === 'choice-manager' && <ChoiceManager />}
          {currentView === 'fees-manager' && <FeesManager />}
          {currentView === 'email-templates' && <EmailTemplatesManager />}
          {currentView === 'legal-documents' && <LegalDocumentsManager />}
          {currentView === 'alerts-manager' && <AlertsManager />}
          {currentView === 'accounts-manager' && <AccountsManager />}
          {currentView === 'account-journeys' && <AccountJourneys />}
          {currentView === 'analytics' && <Analytics />}
          {currentView === 'pricing-reference' && <PricingReference />}
          {currentView === 'ai-assistant' && <AiAssistant />}
          {currentView === 'outbox' && <OutboxManager />}
        </main>
      </div>
    </div>
  );
}
