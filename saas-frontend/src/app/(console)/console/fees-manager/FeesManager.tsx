"use client";
import { useState, useMemo, useCallback } from "react";
import { DollarSign, ClipboardCopy } from "lucide-react";
import UseFees from "./hooks/UseFees";
import FeeEditor from "./components/FeeEditor";
import FeeGroupTable from "./components/FeeGroupTable";
import FeeRevenueSimPDF from "./components/FeeRevenueSimPDF";
import CopyButton from "@/components/ux/CopyButton";
import PDFSaveButton from "@/app/(site)/components/0_PDFS/_components/PDFSaveButton";
import {
  SimulationInput,
  FeeEntry,
  groupFees,
  generateClipboardText,
} from "./constants/feeGroups";

export type FeeConfig = {
  percent: number;
  fixed: number;
  currency: string;
};

export type FeesData = {
  id: string;
  [key: string]: FeeConfig | string; // string for the id field
};

const MARKETS = [
  { code: 'AU', label: 'AU', currency: 'AUD' },
  { code: 'UK', label: 'UK', currency: 'GBP' },
  { code: 'US', label: 'US', currency: 'USD' },
] as const;

export default function FeesManager() {
  const [market, setMarket] = useState<string>('AU');
  const [showEditor, setShowEditor] = useState(false);
  const [editingFee, setEditingFee] = useState<{ key: string; config: FeeConfig } | null>(null);
  const [simInputs, setSimInputs] = useState<Record<string, SimulationInput>>({});

  const { data: feesData, isLoading, error } = UseFees(market);

  const handleEditFee = (key: string, config: FeeConfig) => {
    setEditingFee({ key, config });
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingFee(null);
  };

  const handleSimInputChange = useCallback(
    (key: string, field: "volume" | "avgSale", value: number) => {
      setSimInputs((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          volume: prev[key]?.volume ?? 0,
          avgSale: prev[key]?.avgSale ?? 0,
          [field]: value,
        },
      }));
    },
    []
  );

  // Extract fee configurations (exclude id and cosmos metadata fields)
  const feeConfigs: FeeEntry[] = useMemo(() => {
    if (!feesData) return [];
    return Object.entries(feesData)
      .filter(
        ([key, value]) =>
          key !== "id" &&
          !key.startsWith("_") &&
          typeof value === "object" &&
          value !== null &&
          "percent" in value &&
          "currency" in value
      )
      .map(([key, value]) => ({ key, config: value as FeeConfig }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [feesData]);

  const groups = useMemo(() => groupFees(feeConfigs), [feeConfigs]);

  const clipboardText = useMemo(
    () => generateClipboardText(groups, simInputs),
    [groups, simInputs]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-slate-400">
          <DollarSign className="h-5 w-5 animate-pulse" />
          <span>Loading fees configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Failed to load fees configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Fees Manager</h1>
                <p className="text-sm text-slate-400">Manage platform fee configurations</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 bg-slate-900 rounded-lg p-1" data-testid="market-selector">
              {MARKETS.map((m) => (
                <button
                  key={m.code}
                  data-testid={`market-tab-${m.code}`}
                  onClick={() => {
                    setMarket(m.code);
                    setShowEditor(false);
                    setEditingFee(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    market === m.code
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                  <span className="ml-1 text-xs text-slate-500">{m.currency}</span>
                </button>
              ))}
            </div>

            {feeConfigs.length > 0 && (
              <div className="flex items-center space-x-2">
                <CopyButton
                  textToCopy={clipboardText}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  Copy
                </CopyButton>
                <PDFSaveButton
                  component={<FeeRevenueSimPDF />}
                  data_loader={async () => ({ groups, simInputs })}
                  defaultFileName="fee-revenue-simulation.pdf"
                  label="Download PDF"
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 w-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {feeConfigs.length > 0 ? (
            <FeeGroupTable
              groups={groups}
              simInputs={simInputs}
              onSimInputChange={handleSimInputChange}
              onEditFee={handleEditFee}
            />
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No fee configurations</h3>
              <p className="text-slate-400">Fee configurations will appear here once the database migration has been run.</p>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      {showEditor && (
        <FeeEditor
          open={showEditor}
          onClose={handleCloseEditor}
          editingFee={editingFee}
          market={market}
        />
      )}
    </div>
  );
}
