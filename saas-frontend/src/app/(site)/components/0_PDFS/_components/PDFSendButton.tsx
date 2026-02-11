'use client';

import React from "react";
import { DocumentProps, pdf } from "@react-pdf/renderer";
import {
  Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { MailIcon, XIcon } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { blobToBase64 } from "@/lib/functions";
import SendEmail from "@/lib/services/sendgrid";
import useFormStatus from "@/components/utils/UseFormStatus";
import ComboBox from "@/components/ux/ComboBox";
import { Input } from "@/components/ui/input";

type Contact = { id: any; name: string; email: string };
type Recipient = { email: string; name?: string; source: 'manual' | 'contact' };

type Props = ButtonProps & {
  buttonLabel?: string;
  component?: React.ReactElement<DocumentProps>;
  data_loader?: (...args: []) => Promise<any>;
  pdfUrl?: string;
  subject: string;
  contacts: Contact[];
  cc: string[];
  defaultFileName?: string;
  onSuccess?: (contact: { id: any; name: string; email: string }) => void;
};

const PDFSendButton: React.FC<Props> = ({
  component,
  data_loader,
  subject,
  pdfUrl,
  contacts,
  cc: defaultCC,
  defaultFileName = "document.pdf",
  onSuccess,
  buttonLabel = "Send",
  variant = "link",
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [toRecipients, setToRecipients] = React.useState<Recipient[]>([]);
  const [ccRecipients, setCcRecipients] = React.useState<Recipient[]>([]);
  const [manualToInput, setManualToInput] = React.useState('');
  const [manualCcInput, setManualCcInput] = React.useState('');

  const status = useFormStatus();

  const allContacts = contacts.map(c => ({
    ...c,
    attention: `${c.name} (${c.email})`
  }));

  const handleManualAdd = (
    input: string,
    setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>
  ) => {
    const emails = input.split(/[,;]/).map(e => e.trim()).filter(Boolean);
    const newRecipients: Recipient[] = emails.map(email => ({ email, source: 'manual' }));
    setRecipients(prev => [...prev, ...newRecipients]);
  };

  const removeRecipient = (
    idx: number,
    recipients: Recipient[],
    setRecipients: React.Dispatch<React.SetStateAction<Recipient[]>>
  ) => {
    setRecipients(recipients.filter((_, i) => i !== idx));
  };

  const sendPDF = async () => {
    if (toRecipients.length === 0) throw new Error("No recipients selected");

    let pdfBlob: Blob;

    if (pdfUrl) {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Failed to fetch PDF from URL");
      pdfBlob = await response.blob();
    } else {
      if (!component || !data_loader) throw new Error("Missing component or data loader");
      const data = await data_loader();
      const clonedDocument = React.cloneElement(component, { ...data }) as React.ReactElement<DocumentProps>;
      pdfBlob = await pdf(clonedDocument).toBlob();
    }

    const base64String = await blobToBase64(pdfBlob);

    await SendEmail({
      to: toRecipients.map(r => r.email),
      subject,
      cc: [...defaultCC, ...ccRecipients.map(r => r.email)],
      attachments: [
        {
          content: base64String,
          filename: defaultFileName,
          contentType: "application/pdf",
        }
      ]
    });

    setToRecipients([]);
    setCcRecipients([]);
    setIsOpen(false);

    if (onSuccess && toRecipients.length === 1) {
      setTimeout(() => onSuccess({
        id: toRecipients[0].email,
        name: toRecipients[0].name ?? '',
        email: toRecipients[0].email
      }), 1000);
    }

    return toRecipients;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="w-full" asChild>
        <Button {...props} variant={variant} onClick={() => setIsOpen(true)}>
          <MailIcon size={16} className="mr-2" /><span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col space-y-3">
        <DialogTitle>Select or enter recipients</DialogTitle>

        {/* TO Field */}
        <label className="text-sm font-medium">To</label>
        <ComboBox
          withSearch
          items={allContacts}
          value={null}
          onChange={(contact: Contact) => {
            setToRecipients(prev => [...prev, {
              email: contact.email,
              name: contact.name,
              source: 'contact'
            }]);
          }}
          objectName="Contact"
          fieldMapping={{ keyColumn: "id", labelColumn: "attention" }}
        />
        <Input
          placeholder="Add emails separated by comma or semicolon"
          value={manualToInput}
          onChange={(e) => setManualToInput(e.target.value)}
          onBlur={() => {
            handleManualAdd(manualToInput, setToRecipients);
            setManualToInput('');
          }}
        />
        <div className="flex flex-wrap gap-1">
          {toRecipients.map((r, i) => (
            <span key={`${r.email}-${i}`} className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center">
              {r.name ? `${r.name} <${r.email}>` : r.email}
              <button className="ml-1 text-red-500" onClick={() => removeRecipient(i, toRecipients, setToRecipients)}>
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* CC Field */}
        <label className="text-sm font-medium mt-2">CC</label>
        <Input
          placeholder="Add emails separated by comma or semicolon"
          value={manualCcInput}
          onChange={(e) => setManualCcInput(e.target.value)}
          onBlur={() => {
            handleManualAdd(manualCcInput, setCcRecipients);
            setManualCcInput('');
          }}
        />
        <div className="flex flex-wrap gap-1">
          {ccRecipients.map((r, i) => (
            <span key={`${r.email}-${i}`} className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center">
              {r.name ? `${r.name} <${r.email}>` : r.email}
              <button className="ml-1 text-red-500" onClick={() => removeRecipient(i, ccRecipients, setCcRecipients)}>
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>

        <DialogFooter className="flex flex-row space-x-3 mt-4">
          <Button type="button" variant="link" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="button" variant={status.button.variant} className="flex-grow"
            onClick={async () => {
              await status.submit(sendPDF, {}, () => { });
            }}
            disabled={status.formState === "processing"}
          >
            {status.formState === "idle" ? "Send" : status.button.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFSendButton;