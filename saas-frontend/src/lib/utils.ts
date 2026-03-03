import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isNullOrWhiteSpace = (str: string | null | undefined): boolean => {
  return str == null || str.match(/^ *$/) !== null || str === "";
}

export const isNullOrUndefined = (obj: any): obj is null | undefined => {
  return obj == undefined || obj == null;
}
