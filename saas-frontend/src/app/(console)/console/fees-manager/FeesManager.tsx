"use client";
import { useState } from "react";
import { DollarSign, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UseFees from "./hooks/UseFees";
import FeeEditor from "./components/FeeEditor";
import { decodeAmountFromSmallestUnit } from "@/lib/functions";

export type FeeConfig = {
  percent: number;
  fixed: number;
  currency: string;
};

export type FeesData = {
  id: string;
  [key: string]: FeeConfig | string; // string for the id field
};

export default function FeesManager() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingFee, setEditingFee] = useState<{ key: string; config: FeeConfig } | null>(null);

  const { data: feesData, isLoading, error } = UseFees();

  const handleAddFee = () => {
    setEditingFee(null);
    setShowEditor(true);
  };

  const handleEditFee = (key: string, config: FeeConfig) => {
    setEditingFee({ key, config });
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingFee(null);
  };

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

  // Extract fee configurations (exclude id and cosmos metadata fields)
  const feeConfigs = feesData ? Object.entries(feesData)
    .filter(([key, value]) =>
      key !== 'id' &&
      !key.startsWith('_') &&
      typeof value === 'object' &&
      value !== null &&
      'percent' in value &&
      'currency' in value
      // Don't require 'fixed' for backward compatibility
    )
    .map(([key, value]) => ({ key, config: value as FeeConfig }))
    .sort((a, b) => a.key.localeCompare(b.key)) : [];

  const formatFeeKey = (key: string) => {
    return key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const FeeDisplay = ({ config }: { config: FeeConfig }) => {
    const hasPercent = config.percent > 0;
    const hasFixed = (config.fixed || 0) > 0; // Handle legacy data without fixed field

    // Convert fixed amount from smallest units to dollars for display
    const fixedInDollars = hasFixed ? decodeAmountFromSmallestUnit(config.fixed, config.currency) : 0;

    if (hasPercent && hasFixed) {
      return (
        <div className="flex items-center justify-center gap-1">
          <span>{(config.percent * 100).toFixed(config.percent >= 0.01 ? 1 : 2)}%</span>
          <span>+</span>
          <span>${fixedInDollars.toFixed(2)} {config.currency}</span>
        </div>
      );
    } else if (hasPercent) {
      return <span>{(config.percent * 100).toFixed(config.percent >= 0.01 ? 1 : 2)}% {config.currency}</span>;
    } else if (hasFixed) {
      return <span>${fixedInDollars.toFixed(2)} {config.currency}</span>;
    } else {
      return <span>Free ({config.currency})</span>;
    }
  };


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
                <p className="text-sm text-slate-400">Manage platform fee configurations • {feeConfigs.length} fee types</p>
              </div>
            </div>

            <Button
              onClick={handleAddFee}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Fee Type</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {feeConfigs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feeConfigs.map(({ key, config }) => (
                <Card key={key} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-base font-medium">
                        {formatFeeKey(key)}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFee(key, config)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white mb-1 break-words">
                        <FeeDisplay config={config} />
                      </div>
                      <span className="text-sm text-slate-400">Fee Structure</span>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-900 rounded p-2 font-mono text-center">
                      {key}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No fee configurations</h3>
              <p className="text-slate-400 mb-4">Get started by adding your first fee type.</p>
              <Button
                onClick={handleAddFee}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Fee Type</span>
              </Button>
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
        />
      )}
    </div>
  );
}