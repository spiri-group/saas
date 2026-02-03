'use client';

import { Sparkles, X } from 'lucide-react';
import { JournalPrompt, getPromptCategoryLabel } from '../_hooks/useAstrologyJournal';
import { getBodyInfo, getSignInfo } from '../_hooks/useBirthChart';

interface Props {
  prompt: JournalPrompt;
  onUsePrompt: () => void;
  onDismiss: () => void;
}

export const JournalPromptCard: React.FC<Props> = ({ prompt, onUsePrompt, onDismiss }) => {
  const triggerBodyInfo = prompt.triggerBody ? getBodyInfo(prompt.triggerBody) : null;
  const triggerSignInfo = prompt.triggerSign ? getSignInfo(prompt.triggerSign) : null;

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-purple-400 font-medium">
                {getPromptCategoryLabel(prompt.category)}
              </span>
              {triggerBodyInfo && (
                <span className="text-xs text-slate-400">
                  {triggerBodyInfo.symbol} {triggerBodyInfo.name}
                  {triggerSignInfo && ` in ${triggerSignInfo.name}`}
                </span>
              )}
            </div>
            <p className="text-white text-sm">{prompt.prompt}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          data-testid="dismiss-prompt-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={onUsePrompt}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          data-testid="use-prompt-btn"
        >
          Use this prompt
        </button>
      </div>
    </div>
  );
};

export default JournalPromptCard;
