/**
 * NRM Lending - Central Configuration & Constants
 * Source of truth for database enums, business rules, and system settings.
 */

export const CONFIG = {
  // Database Enums (Aligned with Prisma Schema)
  ROLES: {
    SUPERADMIN: "SUPERADMIN",
    ADMIN: "ADMIN",
    CLIENT: "CLIENT",
  } as const,

  LOAN_TYPES: {
    FLAT: "FLAT",
    DIMINISHING: "DIMINISHING",
  } as const,

  LOAN_STATUS: {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    DEFAULTED: "DEFAULTED",
  } as const,

  PAYMENT_FREQUENCIES: {
    MONTHLY: "MONTHLY",
    SEMI_MONTHLY: "SEMI_MONTHLY",
    WEEKLY: "WEEKLY",
  } as const,

  PAYMENT_METHODS: {
    CASH: "CASH",
    GCASH: "GCASH",
    BANK_TRANSFER: "BANK_TRANSFER",
    OTHER: "OTHER",
  } as const,

  PAYMENT_TYPES: {
    REGULAR: "REGULAR",
    ADVANCE: "ADVANCE",
    PENALTY: "PENALTY",
  } as const,

  FUNDING_TRANSACTION_TYPES: {
    DEPOSIT: "DEPOSIT",
    WITHDRAWAL: "WITHDRAWAL",
  } as const,

  // Business Logic Defaults (Configurable via SystemSetting table in production)
  DEFAULT_SETTINGS: {
    PENALTY_RATE_PERCENT: 50, // "penalty of 50% of your amortization payment"
    CURRENCY_SYMBOL: "₱",
    CURRENCY_CODE: "PHP",
    LOCALE: "en-PH",
  },

  // Interest Rate Matrix (Used by Loan Estimator)
  // These tiers map to NRM's approved matrix (1-17 months)
  INTEREST_RATE_TIERS: [
    { min: 1, max: 6, rate: 7, label: "Short-term Financing" },
    { min: 7, max: 9, rate: 6, label: "Mid-term Solutions" },
    { min: 10, max: 12, rate: 5, label: "Extended Advantage" },
    { min: 13, max: 15, rate: 4, label: "Premium Rate" },
    { min: 16, max: 17, rate: 3, label: "Ultimate Low-rate" },
  ] as const,

  // Loan Limits
  LOAN_LIMITS: {
    MIN_AMOUNT: 1000,
    MAX_AMOUNT: 100000,
    STEP_AMOUNT: 1000,
    MIN_TERM_MONTHS: 1,
    MAX_TERM_MONTHS: 17,
  } as const,

  // UI / Navigation Labels
  LABELS: {
    AVAILABLE_FUNDING: "Available Funding",
    PAYMENT_SUMMARY: "Payment Summary",
    TRANSACTIONS: "Transactions",
    NEW_BORROWER: "New Borrower",
  },
} as const

// Types derived from configuration
export type Role = keyof typeof CONFIG.ROLES
export type LoanType = keyof typeof CONFIG.LOAN_TYPES
export type LoanStatus = keyof typeof CONFIG.LOAN_STATUS
export type PaymentFrequency = keyof typeof CONFIG.PAYMENT_FREQUENCIES
export type PaymentMethod = keyof typeof CONFIG.PAYMENT_METHODS
export type PaymentType = keyof typeof CONFIG.PAYMENT_TYPES
export type FundingTransactionType = keyof typeof CONFIG.FUNDING_TRANSACTION_TYPES
