'use client';

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  currency: string;
  onAdd: (name: string, amount: number, currency: string) => void;
  onClose: () => void;
};

const CustomItemForm = ({ currency, onAdd, onClose }: Props) => {
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const amount = Math.round(parseFloat(priceStr) * 100);
    if (!trimmedName || isNaN(amount) || amount <= 0) return;

    onAdd(trimmedName, amount, currency);
    setName("");
    setPriceStr("");
    nameRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dashed border-purple-500/40 bg-purple-500/5 p-3 space-y-2"
      data-testid="pos-custom-item-form"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-purple-300">Custom Item</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors p-0.5"
          data-testid="pos-custom-item-close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          ref={nameRef}
          data-testid="pos-custom-item-name"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-8 focus:border-purple-500 focus:ring-purple-500/20"
        />
        <Input
          data-testid="pos-custom-item-price"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Price"
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          className="w-24 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-8 focus:border-purple-500 focus:ring-purple-500/20"
        />
        <Button
          type="submit"
          disabled={!name.trim() || !priceStr || parseFloat(priceStr) <= 0}
          data-testid="pos-custom-item-add"
          className="h-8 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
};

export default CustomItemForm;
