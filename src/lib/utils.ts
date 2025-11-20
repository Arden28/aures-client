import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(e: unknown): string {
  if (typeof e === "object" && e && "payload" in e) {
    const p = (e as any).payload;
    if (p?.message) return String(p.message);
    if (p?.errors) {
      // show first validation message if present
      const first = Object.values(p.errors)[0] as string[] | string | undefined;
      if (Array.isArray(first) && first[0]) return first[0];
      if (typeof first === "string") return first;
    }
  }
  if (e instanceof Error && e.message) return e.message;
  return "Unexpected error";
}