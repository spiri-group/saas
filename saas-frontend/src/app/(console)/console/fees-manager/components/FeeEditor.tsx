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
import { formatFeeKey, FEE_CONTEXT, isSubscriptionFee, isReadingFee } from "../constants/feeGroups";

// Schema for default fees (marketplace, services, etc.)
const defaultFeeSchema = z.object({
  percent: z.number().min(0).max(100),
  fixed: z.number().min(0),
  currency: z.string().min(3).max(3),
  basePrice: z.number().optional(),
}).refine((data) => data.percent > 0 || data.fixed > 0, {
  message: "Either percentage or fixed amount must be greater than 0",
  path: ["percent"]
});

type FeeForm = z.infer<typeof defaultFeeSchema>;

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
  const isSub = editingFee ? isSubscriptionFee(editingFee.key) : false;
  const isReading = editingFee ? isReadingFee(editingFee.key) : false;

  const form = useForm<FeeForm>({
    resolver: zodResolver(defaultFeeSchema),
    defaultValues: {
      percent: 0,
      fixed: 0,
      currency: defaultCurrency,
      basePrice: undefined,
    }
  });

  const watchPercent = form.watch("percent");
  const watchFixed = form.watch("fixed");
  const watchCurrency = form.watch("currency");
  const watchBasePrice = form.watch("basePrice");

  useEffect(() => {
    if (editingFee) {
      form.reset({
        percent: editingFee.config.percent,
        fixed: editingFee.config.fixed || 0,
        currency: editingFee.config.currency,
        basePrice: editingFee.config.basePrice,
      });
    } else {
      form.reset({
        percent: 0,
        fixed: 0,
        currency: defaultCurrency,
        basePrice: undefined,
      });
    }
  }, [editingFee, form, defaultCurrency]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: FeeForm) => {
    if (!editingFee) return;

    const config: FeeConfig = {
      percent: isSub ? 0 : data.percent,
      fixed: data.fixed,
      currency: data.currency,
    };

    // Include basePrice for reading fees
    if (isReading && data.basePrice !== undefined) {
      config.basePrice = data.basePrice;
    }

    updateFee.mutate({
      market,
      key: editingFee.key,
      config,
    }, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Subscription simulator: volume × price
  const subSimResult = useMemo(() => {
    if (!isSub) return null;
    const subscribers = parseInt(simAmount);
    if (!isFinite(subscribers) || subscribers <= 0) return null;
    const pricePerSub = watchFixed || 0;
    return {
      subscribers,
      pricePerSub,
      totalRevenue: subscribers * pricePerSub,
    };
  }, [isSub, simAmount, watchFixed]);

  // Reading simulator: calculated from base price + platform %
  const readingSimResult = useMemo(() => {
    if (!isReading || !watchBasePrice) return null;
    const volume = parseInt(simAmount);
    if (!isFinite(volume) || volume <= 0) return null;
    const platformPerReading = Math.floor(watchBasePrice * (watchPercent / 100)) + (watchFixed || 0);
    const readerPayout = watchBasePrice - platformPerReading;
    return {
      volume,
      customerPays: watchBasePrice,
      platformTake: platformPerReading,
      readerPayout,
      totalRevenue: volume * platformPerReading,
    };
  }, [isReading, simAmount, watchBasePrice, watchPercent, watchFixed]);

  // Default fee simulator
  const defaultSimResult = useMemo(() => {
    if (isSub || isReading) return null;
    const saleAmount = parseFloat(simAmount);
    if (!isFinite(saleAmount) || saleAmount <= 0) return null;
    const saleInCents = Math.round(saleAmount * 100);
    const percentFee = Math.round(saleInCents * (watchPercent / 100));
    const fixedFee = watchFixed || 0;
    const totalFee = percentFee + fixedFee;
    const merchantReceives = saleInCents - totalFee;
    const effectiveRate = saleInCents > 0 ? (totalFee / saleInCents) * 100 : 0;
    return { saleInCents, percentFee, fixedFee, totalFee, merchantReceives, effectiveRate };
  }, [isSub, isReading, simAmount, watchPercent, watchFixed]);

  const isValid = form.formState.isValid;
  const isPending = updateFee.isPending;

  if (!open || !editingFee) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isSub ? "Edit Subscription Price" : isReading ? "Edit Reading Fee" : "Edit Fee"}
            </h2>
            <p className="text-sm text-slate-400">
              {formatFeeKey(editingFee.key)}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {editingFee.key}
            </p>
            {FEE_CONTEXT[editingFee.key] && (
              <p className="text-xs text-blue-400 mt-1">
                {FEE_CONTEXT[editingFee.key]}
              </p>
            )}
            {isSub && (
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                100% platform revenue
              </div>
            )}
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

            {/* --- SUBSCRIPTION MODE: Just price + currency --- */}
            {isSub && (
              <FormField
                control={form.control}
                name="fixed"
                render={({ field }) => {
                  const currentCurrency = form.watch("currency");
                  const currencyValue = { amount: field.value || 0, currency: currentCurrency };
                  return (
                    <FormItem>
                      <FormLabel className="text-slate-300">Subscription Price</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder="16.00"
                          value={currencyValue}
                          glass={false}
                          onChange={({ amount }) => field.onChange(amount || 0)}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-slate-500">
                        Price charged to the vendor per billing period
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* --- READING MODE: Base price + platform % + optional fixed --- */}
            {isReading && (
              <>
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => {
                    const currentCurrency = form.watch("currency");
                    const currencyValue = { amount: field.value || 0, currency: currentCurrency };
                    return (
                      <FormItem>
                        <FormLabel className="text-slate-300">Reading Price</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="20.00"
                            value={currencyValue}
                            glass={false}
                            onChange={({ amount }) => field.onChange(amount || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-slate-500">
                          What the customer pays for this reading
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Platform Cut (%)</FormLabel>
                      <FormControl>
                        <PercentageInput
                          placeholder="20"
                          value={field.value / 100}
                          onChange={(fraction) => field.onChange(fraction * 100)}
                          min={0}
                          max={100}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-slate-500">
                        Percentage of reading price kept by platform
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show calculated split */}
                {watchBasePrice !== undefined && watchBasePrice > 0 && (
                  <div className="bg-slate-900 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Customer pays</span>
                      <span className="text-white">{formatCents(watchBasePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Platform takes ({watchPercent}%)</span>
                      <span className="text-green-400">
                        {formatCents(Math.floor(watchBasePrice * (watchPercent / 100)) + (watchFixed || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Reader receives</span>
                      <span className="text-white">
                        {formatCents(watchBasePrice - Math.floor(watchBasePrice * (watchPercent / 100)) - (watchFixed || 0))}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* --- DEFAULT MODE: Percent + Fixed + Currency --- */}
            {!isSub && !isReading && (
              <>
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
                    const currencyValue = { amount: field.value || 0, currency: currentCurrency };
                    return (
                      <FormItem>
                        <FormLabel className="text-slate-300">Fixed Amount</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="2.50"
                            value={currencyValue}
                            glass={false}
                            onChange={({ amount }) => field.onChange(amount || 0)}
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
              </>
            )}

            {/* Currency selector (all modes) */}
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

        {/* --- SIMULATOR --- */}
        <div className="border-t border-slate-800 pt-5">
          <div className="flex items-center space-x-2 mb-3">
            <Calculator className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">Revenue Simulator</h3>
          </div>

          {/* Subscription simulator */}
          {isSub && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Estimate monthly revenue from subscriber count.
              </p>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Number of subscribers</label>
                <Input
                  type="number"
                  min="0"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
              {subSimResult && (
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subscribers</span>
                    <span className="text-white">{subSimResult.subscribers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Price each</span>
                    <span className="text-white">{formatCents(subSimResult.pricePerSub)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                    <span className="text-slate-300">Monthly revenue</span>
                    <span className="text-green-400">{formatCents(subSimResult.totalRevenue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reading simulator */}
          {isReading && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Estimate monthly revenue from reading volume.
              </p>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Readings per month</label>
                <Input
                  type="number"
                  min="0"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="50"
                />
              </div>
              {readingSimResult && (
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Readings</span>
                    <span className="text-white">{readingSimResult.volume}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Platform take each</span>
                    <span className="text-green-400">{formatCents(readingSimResult.platformTake)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Reader gets each</span>
                    <span className="text-white">{formatCents(readingSimResult.readerPayout)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                    <span className="text-slate-300">Platform revenue</span>
                    <span className="text-green-400">{formatCents(readingSimResult.totalRevenue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Default fee simulator */}
          {!isSub && !isReading && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Enter a sale amount to preview the fee breakdown.
              </p>
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
              {defaultSimResult && (
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sale amount</span>
                    <span className="text-white">{formatCents(defaultSimResult.saleInCents)}</span>
                  </div>
                  {defaultSimResult.percentFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Percent fee ({watchPercent}%)</span>
                      <span className="text-amber-400">-{formatCents(defaultSimResult.percentFee)}</span>
                    </div>
                  )}
                  {defaultSimResult.fixedFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Fixed fee</span>
                      <span className="text-amber-400">-{formatCents(defaultSimResult.fixedFee)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                    <span className="text-slate-300">Platform takes</span>
                    <span className="text-green-400">{formatCents(defaultSimResult.totalFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Merchant receives</span>
                    <span className="text-white">{formatCents(defaultSimResult.merchantReceives)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-500">Effective rate</span>
                    <span className="text-slate-400">{defaultSimResult.effectiveRate.toFixed(2)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
