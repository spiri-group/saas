"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface InlineColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  dark?: boolean;
  className?: string;
}

export default function InlineColorPicker({ value, onChange, dark, className }: InlineColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`w-10 h-8 rounded border flex-shrink-0 cursor-pointer ${
              dark ? "border-slate-700" : "border-gray-300"
            }`}
            style={{ backgroundColor: value }}
          />
        </PopoverTrigger>
        <PopoverContent
          className={`w-auto p-3 ${dark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}
          align="start"
        >
          <HexColorPicker color={value} onChange={onChange} />
        </PopoverContent>
      </Popover>
      <Input
        dark={dark}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs flex-1"
        placeholder="#000000"
      />
    </div>
  );
}
