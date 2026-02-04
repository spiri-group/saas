"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeeConfig } from "../FeesManager";
import {
  FeeGroup,
  SimulationInput,
  formatFeeKey,
  formatPercent,
  formatFixed,
  formatCentsAsDollars,
  computeMonthlyRevenue,
} from "../constants/feeGroups";

interface FeeGroupTableProps {
  groups: FeeGroup[];
  simInputs: Record<string, SimulationInput>;
  onSimInputChange: (key: string, field: "volume" | "avgSale", value: number) => void;
  onEditFee: (key: string, config: FeeConfig) => void;
}

export default function FeeGroupTable({
  groups,
  simInputs,
  onSimInputChange,
  onEditFee,
}: FeeGroupTableProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setCollapsed((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  let grandTotal = 0;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent">
          <TableHead className="text-slate-400 w-[200px]">Fee Name</TableHead>
          <TableHead className="text-slate-400 font-mono">Key</TableHead>
          <TableHead className="text-slate-400 text-right">Percentage</TableHead>
          <TableHead className="text-slate-400 text-right">Fixed Amount</TableHead>
          <TableHead className="text-slate-400">Currency</TableHead>
          <TableHead className="text-slate-400 text-right w-[120px]">Est. Volume</TableHead>
          <TableHead className="text-slate-400 text-right w-[120px]">Avg Sale ($)</TableHead>
          <TableHead className="text-slate-400 text-right w-[130px]">Monthly Rev</TableHead>
          <TableHead className="text-slate-400 w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>

      {groups.map((group) => {
        const isCollapsed = collapsed[group.name] ?? false;

        let subtotal = 0;
        for (const { key, config } of group.fees) {
          const sim = simInputs[key] ?? { volume: 0, avgSale: 0 };
          subtotal += computeMonthlyRevenue(config, sim);
        }
        grandTotal += subtotal;

        return (
          <TableBody key={group.name}>
            {/* Group header row */}
            <TableRow
              className="border-slate-700 hover:bg-slate-800/30 cursor-pointer"
              onClick={() => toggleGroup(group.name)}
            >
              <TableCell colSpan={7} className="py-3">
                <div className="flex items-center space-x-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-white font-semibold">{group.name}</span>
                  <span className="text-slate-500 text-sm">
                    ({group.fees.length} {group.fees.length === 1 ? "fee" : "fees"})
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3">
                {subtotal > 0 && (
                  <span className="text-green-400 font-medium text-sm">
                    {formatCentsAsDollars(subtotal)}
                  </span>
                )}
              </TableCell>
              <TableCell />
            </TableRow>

            {/* Fee rows (hidden when collapsed) */}
            {!isCollapsed &&
              group.fees.map(({ key, config }) => {
                const sim = simInputs[key] ?? { volume: 0, avgSale: 0 };
                const monthlyRev = computeMonthlyRevenue(config, sim);

                return (
                  <TableRow key={key} className="border-slate-700/50 hover:bg-slate-800/50">
                    <TableCell className="text-white font-medium pl-10">
                      {formatFeeKey(key)}
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-sm">
                      {key}
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {formatPercent(config.percent)}
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {formatFixed(config.fixed)}
                    </TableCell>
                    <TableCell className="text-slate-300">{config.currency}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={sim.volume || ""}
                        onChange={(e) =>
                          onSimInputChange(key, "volume", parseInt(e.target.value) || 0)
                        }
                        className="w-[100px] ml-auto text-right h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={sim.avgSale || ""}
                        onChange={(e) =>
                          onSimInputChange(key, "avgSale", parseFloat(e.target.value) || 0)
                        }
                        className="w-[100px] ml-auto text-right h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {monthlyRev > 0 ? (
                        <span className="text-green-400 font-medium">
                          {formatCentsAsDollars(monthlyRev)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditFee(key, config)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

            {/* Subtotal row (visible when expanded) */}
            {!isCollapsed && (
              <TableRow className="border-slate-700/30 hover:bg-transparent">
                <TableCell colSpan={7} className="text-right text-sm text-slate-500 py-2 pr-4">
                  Subtotal: {group.name}
                </TableCell>
                <TableCell className="text-right py-2">
                  <span className="text-green-400 font-semibold text-sm">
                    {formatCentsAsDollars(subtotal)}
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        );
      })}

      <TableFooter>
        <TableRow className="border-slate-700 hover:bg-transparent">
          <TableCell colSpan={7} className="text-right text-white font-semibold pr-4">
            Grand Total
          </TableCell>
          <TableCell className="text-right">
            <span className="text-green-400 font-bold text-base">
              {formatCentsAsDollars(grandTotal)}
            </span>
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
