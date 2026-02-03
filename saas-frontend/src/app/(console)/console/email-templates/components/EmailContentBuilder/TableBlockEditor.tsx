/**
 * Table Block Editor Component
 *
 * Allows configuration of table blocks with:
 * - Column management
 * - Data source (loop variable)
 * - Row limit (top N rows)
 * - Styling options
 */

import { Plus, Trash2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { ContentBlock } from "./types";
import { TABLE_DATA_SOURCES, getFieldsForDataSource } from "./variableSchemas";

interface TableBlockEditorProps {
  form: UseFormReturn<ContentBlock>;
}

type TableStyle = {
  showBorders?: boolean;
  alternatingRows?: boolean;
  headerBold?: boolean;
};

export default function TableBlockEditor({ form }: TableBlockEditorProps) {
  const columns = form.watch("tableColumns") || [];
  const tableDataSource = form.watch("tableDataSource");
  const tableStyle: TableStyle = form.watch("tableStyle") || {};

  const handleAddColumn = () => {
    const newColumn = {
      id: crypto.randomUUID(),
      header: "",
      field: "",
      align: "left" as const,
    };
    form.setValue("tableColumns", [...columns, newColumn]);
  };

  const handleRemoveColumn = (columnId: string) => {
    form.setValue("tableColumns", columns.filter(col => col.id !== columnId));
  };

  const handleUpdateColumn = (columnId: string, updates: Partial<typeof columns[0]>) => {
    form.setValue(
      "tableColumns",
      columns.map(col => (col.id === columnId ? { ...col, ...updates } : col))
    );
  };

  return (
    <>
      <div className="flex items-center space-x-2 text-slate-300">
        <Table2 className="h-4 w-4" />
        <span className="text-sm font-medium">Table Configuration</span>
      </div>

      {/* Data Source */}
      <FormField
        control={form.control}
        name="tableDataSource"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Data Source</FormLabel>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select data source..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-slate-900 border-slate-700">
                {TABLE_DATA_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value} className="text-white">
                    <div>
                      <p className="font-medium">{source.label}</p>
                      <p className="text-xs text-slate-400">{source.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              The array to loop over for table rows (e.g., order.lines)
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Row Limit */}
      <FormField
        control={form.control}
        name="tableRowLimit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Row Limit (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="Show all rows"
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </FormControl>
            <FormDescription>
              Limit to top N rows (e.g., 3). Leave empty to show all rows.
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Show More Text */}
      {form.watch("tableRowLimit") && (
        <FormField
          control={form.control}
          name="tableShowMoreText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>&quot;Show More&quot; Text</FormLabel>
              <FormControl>
                <Input
                  placeholder="...and {count} more items"
                  {...field}
                  value={field.value || ""}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </FormControl>
              <FormDescription>
                Text to show when rows are limited. Use {'{count}'} for remaining count.
              </FormDescription>
            </FormItem>
          )}
        />
      )}

      {/* Columns Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FormLabel>Columns ({columns.length})</FormLabel>
          <Button
            type="button"
            onClick={handleAddColumn}
            size="sm"
            variant="outline"
            className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Column
          </Button>
        </div>

        {columns.length === 0 ? (
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500">No columns yet</p>
            <p className="text-xs text-slate-600 mt-1">Click &quot;Add Column&quot; to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {columns.map((column, index) => (
              <div
                key={column.id}
                className="p-3 bg-slate-800 border border-slate-700 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400">Column {index + 1}</p>
                  <Button
                    type="button"
                    onClick={() => handleRemoveColumn(column.id)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-slate-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400">Header</label>
                    <Input
                      placeholder="Product"
                      value={column.header}
                      onChange={(e) => handleUpdateColumn(column.id, { header: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Align</label>
                    <Select
                      value={column.align}
                      onValueChange={(value: "left" | "center" | "right") =>
                        handleUpdateColumn(column.id, { align: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="left" className="text-white">Left</SelectItem>
                        <SelectItem value="center" className="text-white">Center</SelectItem>
                        <SelectItem value="right" className="text-white">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Field Variable</label>
                  {tableDataSource ? (
                    <Select
                      value={column.field}
                      onValueChange={(value) => handleUpdateColumn(column.id, { field: value })}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm mt-1">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {getFieldsForDataSource(tableDataSource).map((field) => (
                          <SelectItem key={field.key} value={field.key} className="text-white">
                            <div className="flex items-center gap-2">
                              <span>{field.label}</span>
                              {field.type && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
                                  {field.type}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Select data source first..."
                      disabled
                      className="bg-slate-900 border-slate-700 text-slate-500 text-sm mt-1 font-mono"
                    />
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {tableDataSource ? `Choose from ${tableDataSource} fields` : "Select a data source above to see available fields"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Styling */}
      <div className="space-y-3 border-t border-slate-700 pt-4">
        <FormLabel>Table Style</FormLabel>

        <div className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div>
            <p className="text-sm text-white">Show Borders</p>
            <p className="text-xs text-slate-500">Display borders around cells</p>
          </div>
          <Switch
            checked={tableStyle.showBorders !== false}
            onCheckedChange={(checked) =>
              form.setValue("tableStyle", {
                showBorders: checked,
                alternatingRows: tableStyle.alternatingRows ?? true,
                headerBold: tableStyle.headerBold ?? true,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div>
            <p className="text-sm text-white">Alternating Rows</p>
            <p className="text-xs text-slate-500">Alternate row background colors</p>
          </div>
          <Switch
            checked={tableStyle.alternatingRows !== false}
            onCheckedChange={(checked) =>
              form.setValue("tableStyle", {
                showBorders: tableStyle.showBorders ?? true,
                alternatingRows: checked,
                headerBold: tableStyle.headerBold ?? true,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div>
            <p className="text-sm text-white">Bold Headers</p>
            <p className="text-xs text-slate-500">Make header text bold</p>
          </div>
          <Switch
            checked={tableStyle.headerBold !== false}
            onCheckedChange={(checked) =>
              form.setValue("tableStyle", {
                showBorders: tableStyle.showBorders ?? true,
                alternatingRows: tableStyle.alternatingRows ?? true,
                headerBold: checked,
              })
            }
          />
        </div>
      </div>

      {/* Info Tip */}
      <div className="border border-blue-500/20 bg-blue-500/10 rounded-lg p-3">
        <p className="text-xs text-blue-400">
          💡 <strong>Tip:</strong> The table will loop over your data source{tableDataSource && ` (${tableDataSource})`} and create a row for each item
          {form.watch("tableRowLimit") && `, showing only the first ${form.watch("tableRowLimit")} rows`}.
        </p>
      </div>
    </>
  );
}
