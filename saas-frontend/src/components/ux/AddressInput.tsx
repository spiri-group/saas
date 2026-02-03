import { ControllerRenderProps } from "react-hook-form";
import z from "zod";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import classNames from "classnames";
import { Check, X as XIcon } from "lucide-react";
import { Input } from "../ui/input";
import debounce from "debounce";
import { Portal } from "@radix-ui/react-portal";

// ----- Types -----
export const GooglePlaceSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
  components: z.object({
    city: z.string(),
    country: z.string().regex(/^[A-Z]{2}$/, "Country must be a 2-letter acronym following ISO 3166-1 alpha-2 codes"),
    line1: z.string(),
    line2: z.string().optional(),
    postal_code: z.string(),
    state: z.string().optional(),
  }),
  point: z.object({
    type: z.literal("Point"),
    coordinates: z.object({
      lng: z.number(),
      lat: z.number(),
    }),
  }),
});

export type GooglePlace = z.infer<typeof GooglePlaceSchema>;
type FieldValue = GooglePlace | null | undefined;

type Props = Omit<ControllerRenderProps<Record<string, FieldValue>, any>, "onChange" | "value" | "ref"> & {
  value: GooglePlace | null | undefined;
  onChange: (value: GooglePlace | null) => void;
  placeholder?: string;
  "aria-label"?: string;
};

const HINT_ID_SUFFIX = "__addressinput_hint";

const AddressInput: React.FC<Props> = (props) => {
  const { name, onBlur, value, onChange } = props;

  const gkey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
  if (!gkey) throw new Error("Google API key is not set");

  const inputRef = useRef<HTMLInputElement>(null);
  const menuWrapperRef = useRef<HTMLDivElement>(null); // outer positioned wrapper
  const listRef = useRef<HTMLDivElement>(null);        // scrollable list

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GooglePlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Portal into DialogContent to be above overlay and clickable
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [menuZ, setMenuZ] = useState<number>(1100);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const dlgContent = el.closest("[data-radix-dialog-content]") as HTMLElement | null;
    setPortalContainer(dlgContent ?? document.body);
    const z = dlgContent ? Number(getComputedStyle(dlgContent).zIndex || 1000) : 1000;
    setMenuZ((isNaN(z) ? 1000 : z) + 2);
  }, []);

  // What the user sees/edits
  const [query, setQuery] = useState<string>(value?.formattedAddress ?? "");
  useEffect(() => {
    setQuery(value?.formattedAddress ?? "");
  }, [value?.formattedAddress]);

  const clearSelection = useCallback(() => {
    onChange(null);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(true);
    inputRef.current?.focus({ preventScroll: true });
  }, [onChange]);

  // Debounced remote search
  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        const trimmed = q?.trim();
        if (!trimmed) {
          setResults([]);
          setActiveIndex(-1);
          return;
        }
        if (!isOpen) setIsOpen(true);
        setLoading(true);
        try {
          const resp = await fetch("/api/googlemaps?query=" + encodeURIComponent(trimmed));
          const data = await resp.json();
          const mapped: GooglePlace[] = (data?.places ?? []).map((p: any) => ({
            id: p.id,
            formattedAddress: p.formattedAddress,
            components: p.components,
            point: {
              type: "Point",
              coordinates: {
                lng: p.location.longitude,
                lat: p.location.latitude,
              },
            },
          }));
          setResults(mapped);
          setActiveIndex(mapped.length ? 0 : -1);
        } catch {
          setResults([]);
          setActiveIndex(-1);
        } finally {
          setLoading(false);
        }
      }, 250),
    [isOpen]
  );

  // Keyboard handling
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const key = event.key;

      if ((event.ctrlKey || event.metaKey) && key === "Backspace") {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (key === "ArrowDown") {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((i) => Math.min((i < 0 ? -1 : i) + 1, results.length - 1));
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((i) => Math.max((i < 0 ? results.length : i) - 1, 0));
        return;
      }
      if (key === "Enter") {
        if (isOpen && activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          handleSelectOption(results[activeIndex]);
        }
        return;
      }
      if (key === "Escape" || key === "Tab") {
        setIsOpen(false);
        if (key === "Escape") event.stopPropagation();
        return;
      }

      const v = (event.currentTarget as HTMLInputElement).value;
      search(v);
    },
    [results, activeIndex, isOpen, search, clearSelection]
  );

  // Outside click (capture) — works across portal
  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const path = (e.composedPath && e.composedPath()) || [];
      const inputEl = inputRef.current;
      const menuEl = menuWrapperRef.current;
      const target = e.target as Node | null;

      const inInput = !!inputEl && (path.includes(inputEl) || inputEl.contains(target as Node));
      const inMenu  = !!menuEl && (path.includes(menuEl)  || menuEl.contains(target as Node));
      if (inInput || inMenu) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDownCapture, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, { capture: true } as any);
  }, []);

  const handleSelectOption = (selected: GooglePlace) => {
    onChange(selected);
    setQuery(selected.formattedAddress);
    setIsOpen(false);
  };

  const hintId = `${name}${HINT_ID_SUFFIX}`;

  // Check if user has typed but not selected
  const hasTypedButNotSelected = query.trim().length > 0 && !value;

  return (
    <div className="w-full relative">
      {/* Input + clear */}
      <div className="relative">
        <Input
          ref={inputRef}
          tabIndex={0}
          autoComplete="off"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${name}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${name}-opt-${results[activeIndex]?.id}` : undefined}
          aria-describedby={hintId}
          name={name}
          onBlur={onBlur}
          value={query}
          placeholder={props.placeholder}
          aria-label={props["aria-label"]}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setQuery(v);
            search(v);
          }}
          className={hasTypedButNotSelected && !isOpen ? "border-amber-500 focus:ring-amber-500" : ""}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear address"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Warning message when typed but not selected */}
      {hasTypedButNotSelected && !isOpen && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <span className="font-semibold">⚠</span>
          Please select an address from the dropdown to continue
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <Portal container={portalContainer ?? document.body}>
          <FixedPositioner ref={menuWrapperRef} anchorRef={inputRef} zIndex={menuZ}>
            <div
              role="listbox"
              id={`${name}-listbox`}
              className="pointer-events-auto text-sm w-full min-w-[300px] max-h-[240px] overflow-auto overscroll-contain rounded-xl bg-white border border-stone-200 shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
              ref={listRef}
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
              onWheelCapture={(e) => {
                // keep wheel events from bubbling to the dialog/page
                const el = listRef.current;
                if (!el) return;
                e.stopPropagation();
                const atTop = el.scrollTop <= 0;
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                  e.preventDefault();
                }
              }}
            >
              {/* --- hint goes here --- */}
              <div
                className="sticky top-0 z-[1] p-4 bg-white px-3 text-[11px] text-muted-foreground border-b border-stone-100"
                aria-hidden="true"
              >
                ↑/↓ Navigate • Enter Select • Esc Close • Ctrl/⌘+Backspace Clear
              </div>

              {loading && (
                <div className="flex items-center justify-center h-10" aria-live="polite">
                  ...
                </div>
              )}

              {!loading && results.length === 0 && query.trim().length > 0 && (
                <div className="px-3 py-2 text-stone-500">No results</div>
              )}

              {!loading &&
                results.map((option, idx) => {
                  const isSelected = value?.id === option.id;
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      id={`${name}-opt-${option.id}`}
                      role="option"
                      aria-selected={isActive}
                      key={option.id}
                      onMouseDown={(e) => {
                        // prevent input blur before select
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => handleSelectOption(option)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={classNames(
                        "flex text-sm items-center gap-2 w-full cursor-pointer p-2 rounded-lg",
                        isActive ? "bg-stone-100" : "hover:bg-stone-100",
                        !isSelected ? "pl-8" : null
                      )}
                    >
                      {isSelected && <Check className="w-4" />}
                      {option.formattedAddress}
                    </div>
                  );
                })}

                <div
                  className="sticky bottom-0 z-[1] bg-white text-[11px] p-4 flex items-center gap-2 text-muted-foreground border-t border-stone-100"
                  aria-hidden="true"
                > <span>Powered by Google</span>
                  <img
                    src="/google-maps-logo.webp"
                    alt="Powered by Google"
                    className="h-4"
                  />
                </div>
            </div>
          </FixedPositioner>
        </Portal>
      )}
    </div>
  );
};

export default AddressInput;

/** Positions children under the anchor using position: fixed so it floats above dialogs/overflows. */
const FixedPositioner = React.forwardRef<HTMLDivElement, {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  zIndex?: number;
}>(({ anchorRef, children, zIndex = 1100 }, ref) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: 0,
    top: 0,
    width: 0,
    zIndex,
    pointerEvents: "auto",
  });

  useEffect(() => {
    const el = anchorRef.current as HTMLElement | null;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setStyle((s) => ({
        ...s,
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width,
        zIndex,
      }));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const raf = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      cancelAnimationFrame(raf);
    };
  }, [anchorRef, zIndex]);

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  );
});
FixedPositioner.displayName = "FixedPositioner";
