'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import DomPurify from 'dompurify';
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import ToolBar from './components/ToolBar';
import HtmlPlugin from './Plugins/HtmlPlugin';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from "@lexical/list";
import { countWords } from '@/lib/functions';

// Removed AutoLinkNode from the `nodes` array to resolve type incompatibility
const editorConfig = {
  namespace: "editor",
  theme: {
    ltr: "ltr",
    rtl: "rtl",
    placeholder: "editor-placeholder",
    paragraph: "editor-paragraph",
    heading: {
      h1: "editor-heading-h1",
      h2: "editor-heading-h2",
      h3: "editor-heading-h3",
      h4: "editor-heading-h4",
      h5: "editor-heading-h5"
    },
    list: {
      nested: {
        listitem: "editor-nested-listitem"
      },
      ol: "editor-list-ol",
      ul: "editor-list-ul",
      listitem: "editor-listitem"
    },
    text: {
      bold: "editor-text-bold",
      italic: "editor-text-italic",
      underline: "editor-text-underline",
      strikethrough: "editor-text-strikethrough",
      code: "editor-text-code"
    }
  },
  onError(error) {
    throw error;
  },
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode // Retained only compatible nodes
  ]
};

// Define the props for the component
type RichTextInputProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  className?: string;
  placeholder?: string;
  maxWords?: number;
  maxChars?: number;
  label?: string;
  description?: string;
  "aria-label"?: string;
};

const RichTextInput: React.FC<RichTextInputProps> = ({
  value = "",
  onChange,
  className,
  placeholder,
  maxWords,
  maxChars,
  label,
  description,
  ...props
}) => {
  const content = value.replace(/<\/?.*?>/g, "");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const wordCount = maxWords
    ? content.trim().split(/\s+/).length
    : undefined;
  const charCount = maxChars ? content.length : undefined;

  return (
    <div className={cn("w-full flex flex-col", className)} aria-label={props["aria-label"]}>
      {(label || description) && (
        <div className="flex flex-col space-y-1">
          {label && <div className="font-medium text-sm">{label}</div>}
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      )}
      <LexicalComposer initialConfig={editorConfig}>
        <div className="flex flex-col w-full flex-grow min-h-0">
          <ToolBar />
          <div className="relative border border-input bg-background flex-grow rounded-md mt-1 overflow-y-auto min-h-none h-full w-full">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  ref={containerRef}
                  className="text-wrap px-3 py-2 w-full min-h-full text-sm text-foreground focus:outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              }
              placeholder={<div className="absolute top-2 left-3 text-muted-foreground text-sm">{placeholder}</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <ListPlugin />
            <HtmlPlugin
              initialHtml={value}
              onHtmlChanged={(htmlString) => {
                const cleanedText = DomPurify.sanitize(htmlString);
                if (cleanedText !== "" && countWords(cleanedText) === 0) {
                  onChange?.(undefined);
                } else {
                  onChange?.(cleanedText);
                }
              }}
            />
          </div>
        </div>
      </LexicalComposer>
      {(maxWords || maxChars) && (
        <div className="flex justify-end text-xs text-muted-foreground my-3">
          {maxWords && <span>{wordCount}/{maxWords} words</span>}
          {maxChars && <span className="ml-2">{charCount}/{maxChars} characters</span>}
        </div>
      )}
    </div>
  );
};

export default RichTextInput;