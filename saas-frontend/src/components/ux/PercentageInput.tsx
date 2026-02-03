import { cn } from "@/lib/utils";
import { Input, InputProps } from "../ui/input";
import { Slider } from "../ui/slider";
import useDebounce from "./UseDebounce";
import { useEffect, useRef, useState } from "react";

type Props = Omit<InputProps, "onChange" | "value" | "defaultValue"> & {
  mode?: "input" | "slider";
  /** external value as FRACTION 0..1 (e.g. 0.25 for 25%) */
  value?: number | null | undefined;
  /** min/max in PERCENT units (e.g. 0..100) */
  min?: number;
  max?: number;
  onChange: (fraction: number) => void; // emits 0..1
};

const clampNum = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Parse things like "56", "56%", "56.5", "56,5". Returns percent 0..100 or null. */
function parsePercentString(s: string): number | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (t === "") return null;
  // Allow digits, dot, comma, percent; normalize comma to dot and strip %
  const cleaned = t.replace(/%/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "..") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const PercentageInput: React.FC<Props> = ({
  className,
  value,
  placeholder,
  min = 0,
  max = 100,
  mode = "input",
  onChange,
  name,
  ...props
}) => {
  const isControlled = value !== undefined && value !== null;
  // Keep a local string for the text box so users can type freely.
  const [inputStr, setInputStr] = useState<string>("");
  // Debounce the string itself; we’ll parse inside the effect.
  const debouncedStr = useDebounce(inputStr, 350);
  const mountedRef = useRef(false);
  const [isFocused, setFocused] = useState(false);

  // Sync from external value → string (only when not actively typing).
  useEffect(() => {
    if (!isControlled) return;
    if (isFocused) return; // avoid caret jumps while typing
    const pct = clampNum((value as number) * 100, min, max);
    // Only update if it differs, to prevent loops.
    const next = Number.isFinite(pct) ? String(Math.round(pct)) : "";
    setInputStr(next);
  }, [value, min, max, isControlled, isFocused]);

  // Commit debounced input to parent, but only when valid (non-empty) and not just mounted.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return; // ← skip initial effect to avoid writing 0
    }
    const parsed = parsePercentString(debouncedStr);
    if (parsed === null) return; // ignore empty/invalid
    const clamped = clampNum(parsed, min, max);
    onChange(clamped / 100); // emit as fraction 0..1
  }, [debouncedStr, min, max]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only digits, dots, commas, and %; let parsePercentString normalize later.
    const raw = e.target.value.replace(/[^\d.,%]/g, "");
    setInputStr(raw);
  };

  if (mode === "slider") {
    // Slider shows and emits percent; we convert to fraction for onChange.
    const sliderValue = isControlled && Number.isFinite(value as number)
      ? Math.round((value as number) * 100)
      : (parsePercentString(inputStr) ?? 0);

    return (
      <Slider
        name={name}
        min={min}
        max={max}
        value={[sliderValue]}
        onValueChange={(vals) => {
          const pct = clampNum(vals[0], min, max);
          setInputStr(String(pct));
          onChange(pct / 100);
        }}
      />
    );
  }

  // mode === "input"
  return (
    <div className={cn("relative h-10 w-full flex flex-row items-center gap-2", className)}>
      <Input
        name={name}
        value={inputStr}
        placeholder={placeholder ?? "0"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={handleInputChange}
        inputMode="decimal"
        {...props}
      />
      <span className="select-none">%</span>
    </div>
  );
};

PercentageInput.displayName = "PercentageInput";
export default PercentageInput;