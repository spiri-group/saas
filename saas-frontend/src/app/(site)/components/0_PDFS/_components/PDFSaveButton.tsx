'use client';

import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { DocumentProps, pdf } from "@react-pdf/renderer";
import { FileDownIcon } from "lucide-react";
import { toast } from "sonner";

interface ExtendedWindow extends Window {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface FilePickerAcceptType {
  description?: string;
  accept?: Record<string, string[]>;
}

interface FileSystemFileHandle {
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}

type Props = {
  component?: React.ReactElement<DocumentProps>;
  data_loader?: (...args: any[]) => Promise<any>;
  pdfUrl?: string;
  defaultFileName?: string;
  label?: string;
} & ButtonProps;

const PDFSaveButton: React.FC<Props> = ({
  component,
  data_loader,
  pdfUrl,
  label = "Save",
  defaultFileName = "document.pdf",
  variant = "link",
  ...buttonProps
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleSaveButtonClick = async () => {
    setLoading(true);
    const toastId = toast.loading("Generating PDF...");

    const extendedWindow = window as ExtendedWindow;

    try {
      let pdfBlob: Blob;
      const fileName = defaultFileName;

      if (pdfUrl) {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error("Failed to fetch PDF from URL.");
        pdfBlob = await response.blob();
      } else {
        if (!component || !data_loader) throw new Error("Missing component or data_loader");
        const data = await data_loader();
        const clonedDocument = React.cloneElement(component, { ...data }) as React.ReactElement<DocumentProps>;
        pdfBlob = await pdf(clonedDocument).toBlob();
      }

      let fileHandle: FileSystemFileHandle | null = null;

      if (extendedWindow.showSaveFilePicker) {
        fileHandle = await extendedWindow.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "PDF Document",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
      }

      if (fileHandle) {
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(pdfBlob);
        await writableStream.close();
      } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      toast.success("PDF saved successfully!", { id: toastId });

    } catch (error) {
      console.error("Failed to generate or save PDF:", error);
      toast.error("Failed to save PDF", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="flex items-center justify-center w-full"
      onClick={handleSaveButtonClick}
      variant={variant}
      {...buttonProps}
    >
      {loading ? (
        <span>....</span>
      ) : (
        <>
          <FileDownIcon size={16} className="mr-2" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
};

export default PDFSaveButton;
