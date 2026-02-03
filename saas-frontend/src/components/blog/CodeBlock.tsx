'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace(/language-/, '') || 'text';

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 group relative">
      <div className="bg-slate-900 rounded-t-lg px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className={cn(
            'text-xs transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100',
            copied ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
          )}
          title="Copy to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={cn('p-4 overflow-x-auto bg-slate-950 rounded-b-lg', className)}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
