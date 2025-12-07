import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { CURRENCIES, type CurrencyOption } from "@/lib/constants" // Added CURRENCIES import

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

/**
 * Gets the full CurrencyOption object from the list by its 3-letter code.
 * Defaults to USD if the code is not found.
 * * @param currencyCode The 3-letter currency code (e.g., 'KES').
 * @returns The full CurrencyOption configuration.
 */
export function getCurrencyConfig(currencyCode: string): CurrencyOption {
    return CURRENCIES.find(c => c.value === currencyCode) ?? CURRENCIES.find(c => c.value === 'USD')!;
}

/**
 * Formats a monetary amount based on custom currency settings.
 *
 * @param amount The numerical amount to format.
 * @param currency The CurrencyOption object OR the currency code (string).
 * @returns The formatted string (e.g., "$1,234.56" or "1 234,56 €").
 */
export function formatMoney(amount: number, currency: CurrencyOption | string): string {
    let currencyConfig: CurrencyOption;
    
    if (typeof currency === 'string') {
        // Look up the configuration if only the code string is passed
        currencyConfig = getCurrencyConfig(currency);
    } else {
        currencyConfig = currency;
    }

 const { symbol, position, precision } = currencyConfig

 // Use Intl.NumberFormat for locale-specific grouping and decimal separators,
 // but without the currency symbol, as we add it manually for flexibility.
 const formattedAmount = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: precision,
  maximumFractionDigits: precision,
  useGrouping: true,
 }).format(amount)

 if (position === 'before') {
  return `${symbol}${formattedAmount}`
 } else {
  // Add a non-breaking space for aesthetics after the amount
  return `${formattedAmount}\u00A0${symbol}`
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
 *
 * @param dateStr The ISO 8601 date string to compare against (e.g., order start time).
 * @returns The time difference string (e.g., "5m ago" or "Just now").
 */
export function getTimeDiff(dateStr: string | null): string {
 if (!dateStr) return "Just now"
 
 const startTime = new Date(dateStr).getTime()
 const currentTime = new Date().getTime() 
 
 // Difference in milliseconds
 const diffMs = currentTime - startTime
 
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