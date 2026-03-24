"use client";

import { useTermsAndConditions, TermsDocument } from "@/app/(site)/p/_components/TermsAndConditions/hooks/UseTermsAndConditions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

type Props = {
  vendorId: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  dark?: boolean;
};

/**
 * Dropdown picker for selecting a Terms & Conditions document.
 * Auto-selects the default (or only) document when the field is empty.
 */
export default function TermsDocumentPicker({ vendorId, value, onChange, dark }: Props) {
  const { data: documents, isLoading } = useTermsAndConditions(vendorId);

  // Auto-select: if no value set and there's a default (or only one doc), select it
  useEffect(() => {
    if (value || !documents || documents.length === 0) return;

    const defaultDoc = documents.find((d) => d.isDefault);
    if (defaultDoc) {
      onChange(defaultDoc.id);
    } else if (documents.length === 1) {
      onChange(documents[0].id);
    }
  }, [documents, value, onChange]);

  if (isLoading) return null;
  if (!documents || documents.length === 0) return null;

  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-slate-300" : "text-slate-700"}`}>
        Terms & Conditions
      </label>
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? undefined : v)}
      >
        <SelectTrigger
          data-testid="terms-document-picker"
          className={dark ? "bg-slate-800 border-slate-700 text-slate-200" : ""}
        >
          <SelectValue placeholder="Select terms & conditions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {documents.map((doc) => (
            <SelectItem key={doc.id} value={doc.id}>
              {doc.title}{doc.isDefault ? " (Default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className={`text-xs mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        Clients will need to agree to these terms before booking.
      </p>
    </div>
  );
}
