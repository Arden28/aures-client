// src/lib/constants.ts

// --- Core Types ---

export type CurrencyOption = {
    value: string; // The 3-letter currency code (e.g., USD)
    label: string; // Display name (e.g., USD - United States Dollar)
    symbol: string; // The currency symbol (e.g., $)
    position: 'before' | 'after'; // Where the symbol is placed
    precision: number; // Number of decimal places
};

export type TimezoneOption = {
    value: string; // The IANA identifier (e.g., Africa/Nairobi)
    label: string; // Display label (e.g., Africa/Nairobi (EAT))
};

// --- Currency List (Expanded Data) ---

export const CURRENCIES: CurrencyOption[] = [
    // North African Currencies
    { value: "DZD", label: "DZD - Algerian Dinar", symbol: "DA", position: 'after', precision: 2 },
    { value: "EGP", label: "EGP - Egyptian Pound", symbol: "£", position: 'before', precision: 2 },
    { value: "LYD", label: "LYD - Libyan Dinar", symbol: "LD", position: 'before', precision: 3 }, // Libya uses 3 decimal places (millimes/dirhams)
    { value: "MAD", label: "MAD - Moroccan Dirham", symbol: "DH", position: 'after', precision: 2 },
    { value: "TND", label: "TND - Tunisian Dinar", symbol: "DT", position: 'before', precision: 3 }, // Tunisia uses 3 decimal places (millimes)
    { value: "SDG", label: "SDG - Sudanese Pound", symbol: "ج.س", position: 'before', precision: 2 },
    { value: "MRU", label: "MRU - Mauritanian Ouguiya", symbol: "UM", position: 'after', precision: 2 },

    // Global Currencies
    { value: "USD", label: "USD - United States Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "EUR", label: "EUR - Euro", symbol: "€", position: 'after', precision: 2 },
    { value: "GBP", label: "GBP - British Pound", symbol: "£", position: 'before', precision: 2 },
    { value: "JPY", label: "JPY - Japanese Yen", symbol: "¥", position: 'before', precision: 0 }, // JPY uses no decimals
    { value: "AUD", label: "AUD - Australian Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "CAD", label: "CAD - Canadian Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "CHF", label: "CHF - Swiss Franc", symbol: "CHF", position: 'after', precision: 2 },
    { value: "CNY", label: "CNY - Chinese Yuan", symbol: "¥", position: 'before', precision: 2 },
    { value: "SEK", label: "SEK - Swedish Krona", symbol: "kr", position: 'after', precision: 2 },
    { value: "NZD", label: "NZD - New Zealand Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "SGD", label: "SGD - Singapore Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "HKD", label: "HKD - Hong Kong Dollar", symbol: "$", position: 'before', precision: 2 },
    { value: "NOK", label: "NOK - Norwegian Krone", symbol: "kr", position: 'after', precision: 2 },
    { value: "KRW", label: "KRW - South Korean Won", symbol: "₩", position: 'before', precision: 0 }, // KRW uses no decimals
    { value: "INR", label: "INR - Indian Rupee", symbol: "₹", position: 'before', precision: 2 },
    { value: "BRL", label: "BRL - Brazilian Real", symbol: "R$", position: 'before', precision: 2 },
    { value: "ZAR", label: "ZAR - South African Rand", symbol: "R", position: 'before', precision: 2 },
    { value: "KES", label: "KES - Kenyan Shilling", symbol: "KSh", position: 'before', precision: 2 },
    { value: "NGN", label: "NGN - Nigerian Naira", symbol: "₦", position: 'before', precision: 2 },
    { value: "MXN", label: "MXN - Mexican Peso", symbol: "$", position: 'before', precision: 2 },
    { value: "TRY", label: "TRY - Turkish Lira", symbol: "₺", position: 'after', precision: 2 },
    { value: "RUB", label: "RUB - Russian Ruble", symbol: "₽", position: 'after', precision: 2 },
    { value: "THB", label: "THB - Thai Baht", symbol: "฿", position: 'before', precision: 2 },
    { value: "MYR", label: "MYR - Malaysian Ringgit", symbol: "RM", position: 'before', precision: 2 },
    { value: "PHP", label: "PHP - Philippine Peso", symbol: "₱", position: 'before', precision: 2 },
];

// --- Timezone List (Expanded Data) ---

export const TIMEZONES: TimezoneOption[] = [
    // North Africa Timezones
    { value: "Africa/Algiers", label: "Africa/Algiers (CET)" }, // Algeria
    { value: "Africa/Cairo", label: "Africa/Cairo (EET)" }, // Egypt
    { value: "Africa/Tripoli", label: "Africa/Tripoli (EET)" }, // Libya
    { value: "Africa/Casablanca", label: "Africa/Casablanca (WET/WEST)" }, // Morocco
    { value: "Africa/Tunis", label: "Africa/Tunis (CET)" }, // Tunisia
    { value: "Africa/Khartoum", label: "Africa/Khartoum (CAT)" }, // Sudan
    { value: "Africa/Nouakchott", label: "Africa/Nouakchott (GMT)" }, // Mauritania
    
    // Africa
    { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
    { value: "Africa/Cairo", label: "Africa/Cairo (EET)" },
    { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
    { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
    // Americas
    { value: "America/New_York", label: "America/New_York (EST/EDT)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
    { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
    { value: "America/Denver", label: "America/Denver (MST/MDT)" },
    { value: "America/Vancouver", label: "America/Vancouver (PST/PDT)" },
    { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
    { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT/BRST)" },
    { value: "America/Mexico_City", label: "America/Mexico_City (CST/CDT)" },
    // Asia
    { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
    { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (HKT)" },
    { value: "Asia/Seoul", label: "Asia/Seoul (KST)" },
    { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
    // Europe
    { value: "Europe/London", label: "Europe/London (GMT/BST)" },
    { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
    { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
    // Oceania
    { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
    { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
    // Other
    { value: "UTC", label: "UTC - Coordinated Universal Time" },
    { value: "GMT", label: "GMT - Greenwich Mean Time" },
];