'use client';

import React from "react";
import { Button, ButtonProps } from "@/components/ui/button"; // ShadCN UI Button import
import { DocumentProps, pdf } from "@react-pdf/renderer"; // For generating the PDF Blob
import { PrinterIcon } from "lucide-react";

type Props = {
  component?: React.ReactElement<DocumentProps>;
  data_loader?: (...args: any[]) => Promise<any>;
  pdfUrl?: string; // <-- new optional prop
} & ButtonProps;

const PDFPrintButton: React.FC<Props> = ({ component, data_loader, pdfUrl, variant="link", ...rest }) => {
  const [loading, setLoading] = React.useState(false);

    const printPDF = async () => {
    try {
      setLoading(true);

      // Dynamically import printJS to avoid SSR issues (uses window)
      const printJS = (await import('print-js')).default;

      let blobUrl = '';

      if (pdfUrl) {
        // If a remote URL is supplied, use it directly
        blobUrl = pdfUrl;
      } else {
        if (!component || !data_loader) throw new Error("Missing PDF component or data_loader");

        const data = await data_loader();
        const clonedDocument = React.cloneElement(component, { ...data }) as React.ReactElement<DocumentProps>;
        const pdfBlob = await pdf(clonedDocument).toBlob();
        blobUrl = URL.createObjectURL(pdfBlob);
      }

      printJS({
        printable: blobUrl,
        type: 'pdf',
        showModal: true,
        onPrintDialogClose: () => {
          if (!pdfUrl) URL.revokeObjectURL(blobUrl); // Clean up only for blob-based PDFs
        },
        style: `
          '@media print {
            @page {
              size: A4;
              margin: 0;
            }
          }'
        `
      });

    } catch (error) {
      console.error("Failed to print PDF:", error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Button className="flex items-center justify-center w-full" onClick={printPDF} variant={variant} {...rest}> {/* ShadCN UI Button */}
      {loading ? <span>....</span> : <><PrinterIcon size={16} className="mr-2" /><span>Print</span></>}
    </Button>
  );
};

export default PDFPrintButton;
