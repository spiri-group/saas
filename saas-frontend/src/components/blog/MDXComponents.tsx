import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';

// Custom components for MDX

interface CalloutProps {
  children: React.ReactNode;
  type?: 'note' | 'warning' | 'tip' | 'danger' | 'spiritual';
}

// Multi-column layout components
interface ColumnsProps {
  children: React.ReactNode;
  cols?: 2 | 3;
}

function Columns({ children, cols = 2 }: ColumnsProps) {
  const gridCols = cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return (
    <div className={cn('grid grid-cols-1 gap-6 my-8', gridCols)}>
      {children}
    </div>
  );
}

interface ColumnProps {
  children: React.ReactNode;
  title?: string;
}

function Column({ children, title }: ColumnProps) {
  return (
    <div className="p-5 rounded-lg bg-slate-900/50 border border-slate-800">
      {title && <h4 className="font-semibold text-lg mb-3 text-slate-100">{title}</h4>}
      <div className="text-slate-300 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-0 [&>ul]:space-y-1">{children}</div>
    </div>
  );
}

function Callout({ children, type = 'note' }: CalloutProps) {
  const styles = {
    note: 'bg-blue-500/10 border-blue-500/50 text-blue-200',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-200',
    tip: 'bg-green-500/10 border-green-500/50 text-green-200',
    danger: 'bg-red-500/10 border-red-500/50 text-red-200',
    spiritual: 'bg-purple-500/10 border-purple-500/50 text-purple-200',
  };

  const icons = {
    note: 'ℹ️',
    warning: '⚠️',
    tip: '💡',
    danger: '🚨',
    spiritual: '✨',
  };

  return (
    <div className={cn('p-4 my-6 border-l-4 rounded-r-lg', styles[type])}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// Custom MDX components mapping
export const mdxComponents = {
  // Headings with anchor links
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-4xl font-bold mt-12 mb-6 scroll-mt-24 text-white" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-3xl font-bold mt-10 mb-4 scroll-mt-24 text-white" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-2xl font-bold mt-8 mb-3 scroll-mt-24 text-white" {...props}>
      {children}
    </h3>
  ),

  // Paragraphs with proper spacing
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-6 leading-relaxed text-slate-200" {...props}>
      {children}
    </p>
  ),

  // Lists
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside mb-6 space-y-2 text-slate-200" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside mb-6 space-y-2 text-slate-200" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="ml-4 text-slate-200" {...props}>
      {children}
    </li>
  ),

  // Links
  a: ({ children, href, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http');
    const isAnchor = href?.startsWith('#');
    const isHeadingAnchor = className?.includes('anchor');

    // Heading anchors from rehype-autolink-headings should be amber for visibility
    if (isHeadingAnchor) {
      return (
        <a
          href={href}
          className={cn('text-amber-400 no-underline hover:underline transition-colors', className)}
          {...props}
        >
          {children}
        </a>
      );
    }

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 underline transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    }

    if (isAnchor) {
      return (
        <a
          href={href}
          className="text-amber-400 hover:text-amber-300 underline transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href || '#'} className="text-amber-400 hover:text-amber-300 underline transition-colors">
        {children}
      </Link>
    );
  },

  // Images with Next.js optimization
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return (
      <div className="my-8 rounded-lg overflow-hidden">
        <img
          src={src}
          alt={alt || ''}
          className="w-full h-auto rounded-lg"
          {...props}
        />
        {alt && (
          <p className="text-sm text-center text-slate-500 mt-2 italic">{alt}</p>
        )}
      </div>
    );
  },

  // Code blocks
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
    return <>{children}</>;
  },
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    // Inline code
    if (!className) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }

    // Code block
    return <CodeBlock className={className}>{children as string}</CodeBlock>;
  },

  // Blockquotes
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-4 border-amber-500 pl-6 py-2 my-6 italic text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-12 border-slate-800" {...props} />
  ),

  // Tables
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-8">
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-slate-900" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-slate-800" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-slate-800" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 text-left font-semibold text-white" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-slate-200" {...props}>
      {children}
    </td>
  ),

  // Custom components
  Callout,
  Columns,
  Column,
};
