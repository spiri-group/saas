"use client";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlaceholderEditorProps {
  placeholders: Record<string, string>;
  onChange: (placeholders: Record<string, string>) => void;
  onSave?: () => void;
  isSaving?: boolean;
  label: string;
  description: string;
  testIdPrefix: string;
}

const VALID_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export default function PlaceholderEditor({
  placeholders,
  onChange,
  onSave,
  isSaving,
  label,
  description,
  testIdPrefix,
}: PlaceholderEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [keyError, setKeyError] = useState("");

  const entries = Object.entries(placeholders);

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...placeholders, [key]: value });
  };

  const handleDelete = (key: string) => {
    const next = { ...placeholders };
    delete next[key];
    onChange(next);
  };

  const handleAdd = () => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setKeyError("Key is required");
      return;
    }
    if (!VALID_KEY_PATTERN.test(trimmedKey)) {
      setKeyError("Use UPPER_SNAKE_CASE (e.g. COMPANY_NAME)");
      return;
    }
    if (placeholders[trimmedKey] !== undefined) {
      setKeyError("Key already exists");
      return;
    }
    onChange({ ...placeholders, [trimmedKey]: newValue });
    setNewKey("");
    setNewValue("");
    setKeyError("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewKey("");
      setNewValue("");
      setKeyError("");
    }
  };

  return (
    <div data-testid={`${testIdPrefix}-editor`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-medium text-console">{label}</h4>
          <p className="text-[10px] text-console-muted">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          {onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSave}
              disabled={isSaving}
              className="h-7 text-xs border-console text-console"
              data-testid={`${testIdPrefix}-save-btn`}
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs border-console text-console"
            data-testid={`${testIdPrefix}-add-btn`}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {entries.length === 0 && !isAdding && (
        <p className="text-[10px] text-console-muted/50 py-2">
          No placeholders defined. Click Add to create one.
        </p>
      )}

      {(entries.length > 0 || isAdding) && (
        <div className="border border-console rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-console-surface/50 border-b border-console">
                <th className="text-left px-3 py-1.5 text-console-muted font-medium w-1/3">
                  Placeholder
                </th>
                <th className="text-left px-3 py-1.5 text-console-muted font-medium">
                  Value
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr
                  key={key}
                  className="border-b border-console last:border-b-0"
                  data-testid={`${testIdPrefix}-row-${key}`}
                >
                  <td className="px-3 py-1.5">
                    <code className="text-console-primary text-[11px]">
                      {`[${key}]`}
                    </code>
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={value}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      className="h-7 text-xs bg-console-surface border-console text-console"
                      data-testid={`${testIdPrefix}-value-${key}`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => handleDelete(key)}
                      className="p-1 text-console-muted hover:text-red-400 rounded transition-colors"
                      data-testid={`${testIdPrefix}-delete-${key}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {isAdding && (
                <tr
                  className="border-b border-console last:border-b-0 bg-console-primary/5"
                  data-testid={`${testIdPrefix}-new-row`}
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center space-x-1">
                      <span className="text-console-muted text-[11px]">{"["}</span>
                      <Input
                        value={newKey}
                        onChange={(e) => {
                          setNewKey(e.target.value.toUpperCase());
                          setKeyError("");
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="KEY_NAME"
                        className="h-7 text-xs bg-console-surface border-console text-console font-mono w-32"
                        autoFocus
                        data-testid={`${testIdPrefix}-new-key`}
                      />
                      <span className="text-console-muted text-[11px]">{"]"}</span>
                    </div>
                    {keyError && (
                      <p className="text-red-400 text-[10px] mt-0.5">{keyError}</p>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Value"
                      className="h-7 text-xs bg-console-surface border-console text-console"
                      data-testid={`${testIdPrefix}-new-value`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleAdd}
                        className="p-1 text-emerald-400 hover:text-emerald-300 rounded transition-colors"
                        data-testid={`${testIdPrefix}-confirm-add`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewKey("");
                          setNewValue("");
                          setKeyError("");
                        }}
                        className="p-1 text-console-muted hover:text-red-400 rounded transition-colors"
                        data-testid={`${testIdPrefix}-cancel-add`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
