import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";
import { Plus, Minus } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  withButtons?: boolean;
  withAutocomplete?: boolean;
  glass?: boolean;
  dark?: boolean; // For dark-themed backgrounds
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      withButtons = true,
      withAutocomplete = false,
      step = 1,
      glass = true,
      dark = false,
      ...props
    },
    ref
  ) => {
    const parseValue = (): number => {
      if (
        props.value == undefined ||
        isNullOrWhitespace(props.value.toString())
      ) {
        return 0;
      }
      return parseFloat(props.value.toString()); // now supports floats!
    };

    const handleChange = (newValue: number) => {
      if (props.onChange) {
        props.onChange({ target: { value: newValue } } as any);
      }
    };

    if (type === "number") {
      const currentVal = parseValue();
      const minReached =
        !isNullOrUndefined(props.min) &&
        typeof props.min === "number" &&
        currentVal <= props.min;
      const maxReached =
        !isNullOrUndefined(props.max) &&
        typeof props.max === "number" &&
        currentVal >= props.max;

      return (
        <div
          className={cn(
            "flex h-10 min-w-[96px] rounded-md flex-row items-center text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            withButtons
              ? cn(
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  dark
                    ? "border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
                    : glass
                      ? "border border-white/20 bg-white/70 backdrop-blur-sm text-black placeholder:text-black/60 shadow-inner"
                      : "border border-input bg-white text-black"
                )
              : "bg-transparent border-none",
            className
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.]*"
            autoComplete={withAutocomplete ? "on" : "off"}
            aria-autocomplete={withAutocomplete ? "both" : "none"}
            className={cn(
              "min-w-[48px] w-full px-3 py-2 focus-visible:outline-none h-8",
              withButtons 
                ? "max-w-[120px] text-right rounded-l-md" 
                : "text-left rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              dark
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                : glass
                  ? "bg-white/70 backdrop-blur-sm border-white/20 text-black placeholder:text-black/60"
                  : "bg-white border border-input text-black"
            )}
            ref={ref}
            {...props}
            onFocus={(event) => {
              // Select all text when the input is focused for better UX
              event.target.select();
              // Call the original onFocus if provided
              if (props.onFocus) props.onFocus(event);
            }}
            onKeyDown={(event) => {
              if (props.disabled) return;
              const currentVal = parseValue();
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (
                  !isNullOrUndefined(props.max) &&
                  typeof props.max === "number" &&
                  currentVal >= props.max
                )
                  return;
                handleChange(currentVal + Number(step));
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                if (
                  !isNullOrUndefined(props.min) &&
                  typeof props.min === "number" &&
                  currentVal <= props.min
                )
                  return;
                handleChange(currentVal - Number(step));
              }
            }}
            onInput={(event) => {
              const input = event.target as HTMLInputElement;
              // Allow only digits and a single decimal point
              input.value = input.value.replace(/[^0-9.]/g, "");
              // Prevent entering more than one decimal point
              const parts = input.value.split(".");
              if (parts.length > 2) {
                input.value = parts[0] + "." + parts[1];
              }
            }}
          />
          {withButtons && (
            <div className="flex flex-row items-center">
              <Button
                type="button"
                variant="link"
                size="icon"
                disabled={props.disabled || minReached}
                aria-label="Decrease value"
                onClick={() => {
                  if (props.disabled || minReached) return;
                  const newValue = currentVal - Number(step);
                  handleChange(newValue);
                }}
                className="w-10 h-10 rounded-none"
              >
                <Minus
                  className={cn(
                    "w-4 h-4",
                    props.disabled || minReached
                      ? "text-muted-foreground"
                      : "text-primary"
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="link"
                size="icon"
                disabled={props.disabled || maxReached}
                aria-label="Increase value"
                onClick={() => {
                  if (props.disabled || maxReached) return;
                  const newValue = currentVal + Number(step);
                  handleChange(newValue);
                }}
                className="w-10 h-10 rounded-r-md"
              >
                <Plus
                  className={cn(
                    "w-4 h-4",
                    props.disabled || maxReached
                      ? "text-muted-foreground"
                      : "text-primary"
                  )}
                />
              </Button>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <input
          type={type}
          autoComplete={withAutocomplete ? "on" : "off"}
          aria-autocomplete={withAutocomplete ? "both" : "none"}
          className={cn(
            "flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            dark
              ? "bg-slate-800 border border-slate-700 text-white placeholder:text-slate-400"
              : glass
                ? "bg-white/70 backdrop-blur-sm border-white/20 text-black placeholder:text-black/60 shadow-inner"
                : "bg-white border border-input text-black placeholder:text-muted-foreground",
            className
          )}
          ref={ref}
          {...props}
        />
      );
    }
  }
);

Input.displayName = "Input";

export { Input };