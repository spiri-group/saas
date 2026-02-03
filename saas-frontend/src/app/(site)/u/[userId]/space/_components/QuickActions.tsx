'use client';

import { useRouter } from 'next/navigation';
import { SpiritualInterest } from '../../onboarding/types';
import {
  MessageCircle,
  Moon,
  Sparkles,
  Activity,
  Zap,
  Wind,
  Gem,
  Droplets,
  Grid3X3,
  Heart,
  BookOpen,
  Cross,
  Flame,
  Search,
  Layers,
  Star,
  LucideIcon
} from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  color: string;
  // Either a path to navigate to, or a dialogId to open
  path?: string;
  dialogId?: string;
}

const QUICK_ACTIONS: Record<SpiritualInterest, QuickAction[]> = {
  // MEDIUMSHIP covers mediums, tarot readers, astrologers - show actions for all
  MEDIUMSHIP: [
    // Row 1: The big three tools
    { label: 'Log Card Pull', icon: Layers, dialogId: 'card-pull', color: 'text-violet-400' },
    { label: 'Check Transits', icon: Star, path: '/astrology/transits', color: 'text-amber-400' },
    { label: 'Spirit Message', icon: MessageCircle, dialogId: 'spirit-message', color: 'text-cyan-400' },
    // Row 2: Universal journaling
    { label: 'Record Dream', icon: Moon, dialogId: 'dream', color: 'text-indigo-400' },
    { label: 'Synchronicity', icon: Sparkles, dialogId: 'synchronicity', color: 'text-purple-400' },
    { label: 'Reflection', icon: Heart, dialogId: 'reflection', color: 'text-pink-400' },
  ],
  ENERGY: [
    { label: 'Chakra Check-In', icon: Activity, path: '/energy/chakra', color: 'text-yellow-400' },
    { label: 'Log Session', icon: Zap, dialogId: 'energy-session', color: 'text-orange-400' },
    { label: 'Record Meditation', icon: Wind, dialogId: 'meditation', color: 'text-teal-400' },
  ],
  CRYSTALS: [
    { label: 'Add Crystal', icon: Gem, dialogId: 'crystal', color: 'text-cyan-400' },
    { label: 'Record Cleansing', icon: Droplets, dialogId: 'cleansing', color: 'text-blue-400' },
    { label: 'Create Grid', icon: Grid3X3, dialogId: 'crystal-grid', color: 'text-purple-400' },
  ],
  FAITH: [
    { label: 'Daily Reading', icon: Heart, path: '/faith/daily', color: 'text-amber-400' },
    { label: 'Write Prayer', icon: Cross, dialogId: 'prayer', color: 'text-amber-400' },
    { label: 'Scripture Reflection', icon: BookOpen, dialogId: 'scripture', color: 'text-amber-400' },
  ],
  WITCHCRAFT: [
    { label: 'Log Ritual', icon: Flame, dialogId: 'ritual', color: 'text-violet-400' },
    { label: 'Record Dream', icon: Moon, dialogId: 'dream', color: 'text-indigo-400' },
    { label: 'Add Synchronicity', icon: Sparkles, dialogId: 'synchronicity', color: 'text-purple-400' },
  ],
  PARANORMAL: [
    { label: 'Log Investigation', icon: Search, dialogId: 'investigation', color: 'text-slate-400' },
    { label: 'Record Evidence', icon: Sparkles, dialogId: 'evidence', color: 'text-cyan-400' },
    { label: 'Add Synchronicity', icon: Sparkles, dialogId: 'synchronicity', color: 'text-purple-400' },
  ],
  HERBALISM: [
    { label: 'Log Remedy', icon: Flame, dialogId: 'remedy', color: 'text-green-400' },
    { label: 'Record Harvest', icon: Sparkles, dialogId: 'harvest', color: 'text-emerald-400' },
    { label: 'Add to Garden', icon: Gem, dialogId: 'garden', color: 'text-lime-400' },
  ],
};

// Fallback actions for interests without specific ones defined
const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Record Dream', icon: Moon, dialogId: 'dream', color: 'text-indigo-400' },
  { label: 'Add Synchronicity', icon: Sparkles, dialogId: 'synchronicity', color: 'text-purple-400' },
  { label: 'Meditation Log', icon: Wind, dialogId: 'meditation', color: 'text-teal-400' },
];

interface Props {
  userId: string;
  primaryInterest?: SpiritualInterest;
}

const QuickActions: React.FC<Props> = ({ userId, primaryInterest }) => {
  const router = useRouter();

  const actions = primaryInterest
    ? QUICK_ACTIONS[primaryInterest] || DEFAULT_ACTIONS
    : DEFAULT_ACTIONS;

  const handleClick = (action: QuickAction) => {
    if (action.dialogId) {
      // Dispatch event to open dialog via sidenav
      const event = new CustomEvent("open-nav", {
        detail: {
          path: [action.label],
          action: {
            type: "dialog",
            dialog: action.dialogId
          }
        }
      });
      window.dispatchEvent(event);
    } else if (action.path) {
      router.push(`/u/${userId}/space${action.path}`);
    }
  };

  // Determine grid columns based on action count
  const gridCols = actions.length > 3
    ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-400">Quick Actions</h2>
      <div className={`grid ${gridCols} gap-3`}>
        {actions.map((action) => (
          <button
            key={action.dialogId || action.path}
            onClick={() => handleClick(action)}
            data-testid={`quick-action-${action.dialogId || action.path?.replace(/\//g, '-')}`}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group cursor-pointer"
          >
            <div className={`p-2 rounded-lg bg-white/5 ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-white group-hover:text-white/90">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
