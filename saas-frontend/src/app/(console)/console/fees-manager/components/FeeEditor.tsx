"use client";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Calculator } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PercentageInput from "@/components/ux/PercentageInput";
import CurrencyInput from "@/components/ux/CurrencyInput";
import { FeeConfig } from "../FeesManager";
import UseUpdateFees from "../hooks/UseUpdateFees";
import { formatFeeKey } from "../constants/feeGroups";

const feeSchema = z.object({
  percent: z.number().min(0, "Percentage must be 0 or greater").max(100, "Percentage must be 100% or less"),
  fixed: z.number().min(0, "Fixed amount must be 0 or greater"),
  currency: z.string().min(3, "Currency code is required").max(3, "Currency code must be 3 characters")
}).refine((data) => data.percent > 0 || data.fixed > 0, {
  message: "Either percentage or fixed amount must be greater than 0",
  path: ["percent"]
});

type FeeForm = z.infer<typeof feeSchema>;

const CURRENCIES = [
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

const MARKET_CURRENCY: Record<string, string> = {
  AU: "AUD",
  UK: "GBP",
  US: "USD",
};

interface FeeEditorProps {
  open: boolean;
  onClose: () => void;
  editingFee?: { key: string; config: FeeConfig } | null;
  market: string;
}

export default function FeeEditor({
  open,
  onClose,
  editingFee,
  market
}: FeeEditorProps) {
  const { updateFee } = UseUpdateFees();
  const [simAmount, setSimAmount] = useState("100");

  const defaultCurrency = MARKET_CURRENCY[market] || "AUD";

  const form = useForm<FeeForm>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      percent: 0,
      fixed: 0,
      currency: defaultCurrency
    }
  });

  // Watch current form values for live simulator
  const watchPercent = form.watch("percent");
  const watchFixed = form.watch("fixed");
  const watchCurrency = form.watch("currency");

  // Reset form when editingFee or market changes
  // percent is stored as raw number (5 = 5%), PercentageInput expects fraction (0-1)
  useEffect(() => {
    if (editingFee) {
      form.reset({
        percent: editingFee.config.percent,
        fixed: editingFee.config.fixed || 0,
        currency: editingFee.config.currency
      });
    } else {
      form.reset({
        percent: 0,
        fixed: 0,
        currency: defaultCurrency
      });
    }
  }, [editingFee, form, defaultCurrency]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: FeeForm) => {
    if (!editingFee) return;

    updateFee.mutate({
      market,
      key: editingFee.key,
      config: {
        percent: data.percent,
        fixed: data.fixed,
        currency: data.currency
      }
    }, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  // Fee simulator calculations using current form values
  const simResult = useMemo(() => {
    const saleAmount = parseFloat(simAmount);
    if (!isFinite(saleAmount) || saleAmount <= 0) return null;

    // Convert sale amount to cents (smallest unit)
    const saleInCents = Math.round(saleAmount * 100);
    const percentFee = Math.round(saleInCents * (watchPercent / 100));
    const fixedFee = watchFixed || 0;
    const totalFee = percentFee + fixedFee;
    const merchantReceives = saleInCents - totalFee;
    const effectiveRate = saleInCents > 0 ? (totalFee / saleInCents) * 100 : 0;

    return {
      saleInCents,
      percentFee,
      fixedFee,
      totalFee,
      merchantReceives,
      effectiveRate
    };
  }, [simAmount, watchPercent, watchFixed]);

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const isValid = form.formState.isValid;
  const isPending = updateFee.isPending;

  if (!open || !editingFee) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Edit Fee
            </h2>
            <p className="text-sm text-slate-400">
              {formatFeeKey(editingFee.key)}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {editingFee.key}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Fee Percentage</FormLabel>
                  <FormControl>
                    <PercentageInput
                      placeholder="5"
                      value={field.value / 100}
                      onChange={(fraction) => field.onChange(fraction * 100)}
                      min={0}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-slate-500">
                    Percentage fee (e.g. 5 for 5%, 10 for 10%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fixed"
              render={({ field }) => {
                const currentCurrency = form.watch("currency");
                const currencyValue = {
                  amount: field.value || 0,
                  currency: currentCurrency
                };

                return (
                  <FormItem>
                    <FormLabel className="text-slate-300">Fixed Amount</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="2.50"
                        value={currencyValue}
                        glass={false}
                        onChange={({ amount }) => {
                          field.onChange(amount || 0);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Fixed fee in smallest currency unit (e.g. cents)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 border border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isPending}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Fee Simulator */}
        <div className="border-t border-slate-800 pt-5">
          <div className="flex items-center space-x-2 mb-3">
            <Calculator className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">Fee Simulator</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Enter a sale amount to preview the fee breakdown with current settings.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Sale Amount ({watchCurrency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="pl-7"
                  placeholder="100.00"
                />
              </div>
            </div>

            {simResult && (
              <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Sale amount</span>
                  <span className="text-white">{formatCents(simResult.saleInCents)}</span>
                </div>
                {simResult.percentFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Percent fee ({watchPercent}%)</span>
                    <span className="text-amber-400">-{formatCents(simResult.percentFee)}</span>
                  </div>
                )}
                {simResult.fixedFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Fixed fee</span>
                    <span className="text-amber-400">-{formatCents(simResult.fixedFee)}</span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Platform takes</span>
                  <span className="text-green-400">{formatCents(simResult.totalFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Merchant receives</span>
                  <span className="text-white">{formatCents(simResult.merchantReceives)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-500">Effective rate</span>
                  <span className="text-slate-400">{simResult.effectiveRate.toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
