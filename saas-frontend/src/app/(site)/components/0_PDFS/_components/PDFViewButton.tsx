'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import useInterfaceSize from '@/components/ux/useInterfaceSize';
import { EyeIcon } from 'lucide-react';
import * as React from 'react';
import PDFSaveButton from './PDFSaveButton';
import PDFPrintButton from './PDFPrintButton';
import { escape_key } from '@/lib/functions';

type Props = {
  fileName?: string;
  pdfUrl: string;
  label?: string;
};

export default function PDFViewButton({ pdfUrl, fileName, label = 'View PDF' }: Props) {
  const [open, setOpen] = React.useState(false);
  const { isMobile } = useInterfaceSize();

  const DialogFrame = isMobile ? Drawer : Dialog;
  const DialogFrameContent = isMobile ? DrawerContent : DialogContent;
  const DialogFrameHeader = isMobile ? DrawerHeader : DialogHeader;
  const DialogFrameTitle = isMobile ? DrawerTitle : DialogTitle;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <EyeIcon size={16} className="mr-2" />
        {label}
      </Button>

      <DialogFrame open={open} onOpenChange={setOpen}>
        <DialogFrameContent className="max-w-5xl w-full h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogFrameHeader className="px-4 pt-4">
            <DialogFrameTitle className="text-base">PDF Preview</DialogFrameTitle>
          </DialogFrameHeader>

          {/* Iframe viewer */}
          <div className="flex-1 overflow-hidden px-4 pb-4">
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="w-full h-full border rounded"
            />
          </div>

          {/* Footer actions */}
          <div className="flex flex-row items-center w-full gap-2 px-4 pb-4">
            <PDFSaveButton className="w-48 flex-none" variant="link" pdfUrl={pdfUrl} defaultFileName={fileName} />
            <PDFPrintButton className="w-48 flex-none" variant="link" pdfUrl={pdfUrl} />
            <Button type="button" variant="default" className="flex-grow" onClick={escape_key}>
              Close
            </Button>
          </div>
        </DialogFrameContent>
      </DialogFrame>
    </>
  );
}
