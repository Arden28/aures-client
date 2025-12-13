import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { CURRENCIES, type CurrencyOption } from "@/lib/constants" // Added CURRENCIES import
import { fetchRestaurant } from "@/api/restaurant";

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

// Initialize Global Default (Mutable)
// We default to 'USD' immediately so the app can render, 
// then update it asynchronously when the API responds.
let APP_CURRENCY_CODE = 'USD';

fetchRestaurant().then(r => {
    if (r?.currency) {
        APP_CURRENCY_CODE = r.currency;
    }
}).catch(() => {
    console.warn("Failed to load restaurant currency settings. Defaulting to USD.");
});

/**
 * Gets the full CurrencyOption object by code.
 * Defaults to USD if code not found.
 */
export function getCurrencyConfig(currencyCode: string): CurrencyOption {
    return CURRENCIES.find(c => c.value === currencyCode) ?? CURRENCIES.find(c => c.value === 'USD')!;
}

/**
 * Formats a monetary amount.
 * * @param amount - The numerical amount.
 * @param currencyInput - (Optional) Specific currency code or config. 
 * If omitted, uses the App's global default.
 */
export function formatMoney(amount: number, currencyInput?: CurrencyOption | string): string {
    let config: CurrencyOption;

    // 1. Determine which code/config to use
    if (!currencyInput) {
        // No argument? Use the global app default
        config = getCurrencyConfig(APP_CURRENCY_CODE);
    } else if (typeof currencyInput === 'string') {
        // String argument? Look it up
        config = getCurrencyConfig(currencyInput);
    } else {
        // Object argument? Use it directly
        config = currencyInput;
    }

    const { symbol, position, precision } = config;

    // 2. Format the number
    const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
        useGrouping: true,
    }).format(amount);

    // 3. Return string with correct symbol position
    if (position === 'before') {
        return `${symbol}${formattedAmount}`;
    } else {
        // \u00A0 is a non-breaking space
        return `${formattedAmount}\u00A0${symbol}`;
    }
}

/**
 * Formats a datetime string into a local time string based on the given timezone.
 *
 * @param dateString The ISO 8601 date string.
 * @param timezone The IANA timezone identifier (e.g., 'Africa/Nairobi').
 * @returns The formatted time string (e.g., "08:30 AM").
 */
export function formatTime(dateString: string | null, timezone: string): string {
 if (!dateString) return "--"
 
 // Fallback to local time if dateString is invalid or null
 const date = new Date(dateString)

 // Use Intl.DateTimeFormat with the provided timezone
 return date.toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: timezone, // Apply the specified timezone
 })
}

/**
 * Calculates the time difference between now and a given date string.
 * Automatically handles UTC conversion to prevent timezone offsets (e.g. starting at 60m).
 *
 * @param dateStr The ISO 8601 date string (e.g. "2023-10-25T12:00:00").
 * @returns The time difference string (e.g., "5m ago" or "Just now").
 */
export function getTimeDiff(dateStr: string | null): string {
  if (!dateStr) return "Just now"

  // FIX: Force UTC interpretation if the string doesn't specify a timezone.
  // Browsers default to Local Time if 'Z' or offset is missing, causing the "60m" gap.
  let cleanDateStr = dateStr
  if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
      cleanDateStr += "Z"
  }

  const startTime = new Date(cleanDateStr).getTime()
  const currentTime = new Date().getTime() 

  // Difference in milliseconds
  // We use Math.max(0, ...) to prevent negative numbers if client clock is slightly behind
  const diffMs = Math.max(0, currentTime - startTime)

  // Difference in minutes
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return "Just now"
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffMinutes < 24 * 60) {
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ago`
  } else {
    const diffDays = Math.floor(diffMinutes / (24 * 60))
    return `${diffDays}d ago`
  }
}