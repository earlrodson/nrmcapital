import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("Role", ["SUPERADMIN", "ADMIN", "CLIENT"])
export const loanTypeEnum = pgEnum("LoanType", ["FLAT", "DIMINISHING"])
export const loanStatusEnum = pgEnum("LoanStatus", ["ACTIVE", "COMPLETED", "DEFAULTED"])
export const paymentFrequencyEnum = pgEnum("PaymentFrequency", ["MONTHLY", "SEMI_MONTHLY", "WEEKLY"])
export const paymentMethodEnum = pgEnum("PaymentMethod", ["CASH", "GCASH", "BANK_TRANSFER", "OTHER"])
export const paymentTypeEnum = pgEnum("PaymentType", ["REGULAR", "ADVANCE", "PENALTY"])
export const fundingTransactionTypeEnum = pgEnum("FundingTransactionType", ["DEPOSIT", "WITHDRAWAL"])
export const attachmentTypeEnum = pgEnum("AttachmentType", [
  "GOV_ID",
  "PROOF_OF_INCOME",
  "PROOF_OF_BILLING",
  "CONTRACT",
  "OTHER",
])

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull().default("ADMIN"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { mode: "date", precision: 3 }),
    createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [uniqueIndex("users_email_key").on(table.email)],
)

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    contactNumber: text("contact_number"),
    address: text("address"),
    idType: text("id_type"),
    idNumber: text("id_number"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", precision: 3 }),
  },
  (table) => [uniqueIndex("clients_user_id_key").on(table.userId)],
)

export const investors = pgTable("investors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  capitalAmount: decimal("capital_amount", { precision: 12, scale: 2 }),
  interestShareRate: decimal("interest_share_rate", { precision: 5, scale: 2 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
})

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict", onUpdate: "cascade" }),
  type: attachmentTypeEnum("type").notNull().default("OTHER"),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name"),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
})

export const loans = pgTable(
  "loans",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict", onUpdate: "cascade" }),
    investorId: text("investor_id").references(() => investors.id, { onDelete: "set null", onUpdate: "cascade" }),
    loanType: loanTypeEnum("loan_type").notNull().default("FLAT"),
    principalAmount: decimal("principal_amount", { precision: 12, scale: 2 }).notNull(),
    monthlyInterestRate: decimal("monthly_interest_rate", { precision: 5, scale: 2 }).notNull(),
    months: integer("months").notNull(),
    termsPerMonth: integer("terms_per_month").notNull(),
    totalTerms: integer("total_terms").notNull(),
    paymentFrequency: paymentFrequencyEnum("payment_frequency").notNull(),
    estimatedInterest: decimal("estimated_interest", { precision: 12, scale: 2 }).notNull(),
    totalInterest: decimal("total_interest", { precision: 12, scale: 2 }).notNull(),
    totalPayable: decimal("total_payable", { precision: 12, scale: 2 }).notNull(),
    amortizationAmount: decimal("amortization_amount", { precision: 12, scale: 2 }).notNull(),
    loanDate: timestamp("loan_date", { mode: "date", precision: 3 }).notNull(),
    disbursementDate: timestamp("disbursement_date", { mode: "date", precision: 3 }),
    expectedEndDate: timestamp("expected_end_date", { mode: "date", precision: 3 }).notNull(),
    actualEndDate: timestamp("actual_end_date", { mode: "date", precision: 3 }),
    status: loanStatusEnum("status").notNull().default("ACTIVE"),
    outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).notNull(),
    totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("loans_client_id_idx").on(table.clientId),
    index("loans_investor_id_idx").on(table.investorId),
    index("loans_status_idx").on(table.status),
  ],
)

export const paymentSchedules = pgTable(
  "payment_schedules",
  {
    id: text("id").primaryKey(),
    loanId: text("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict", onUpdate: "cascade" }),
    termNumber: integer("term_number").notNull(),
    dueDate: timestamp("due_date", { mode: "date", precision: 3 }).notNull(),
    amountDue: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),
    principalDue: decimal("principal_due", { precision: 12, scale: 2 }).notNull(),
    interestDue: decimal("interest_due", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    isPaid: boolean("is_paid").notNull().default(false),
    paidAt: timestamp("paid_at", { mode: "date", precision: 3 }),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("payment_schedules_loan_id_is_paid_idx").on(table.loanId, table.isPaid),
    index("payment_schedules_due_date_idx").on(table.dueDate),
  ],
)

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    loanId: text("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict", onUpdate: "cascade" }),
    paymentScheduleId: text("payment_schedule_id").references(() => paymentSchedules.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentType: paymentTypeEnum("payment_type").notNull().default("REGULAR"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH"),
    paymentDate: timestamp("payment_date", { mode: "date", precision: 3 }).notNull().defaultNow(),
    penaltyReason: text("penalty_reason"),
    notes: text("notes"),
    recordedById: text("recorded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (table) => [index("payments_loan_id_idx").on(table.loanId)],
)

export const fundingTransactions = pgTable("funding_transactions", {
  id: text("id").primaryKey(),
  investorId: text("investor_id").references(() => investors.id, { onDelete: "set null", onUpdate: "cascade" }),
  transactionType: fundingTransactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  transactionDate: timestamp("transaction_date", { mode: "date", precision: 3 }).notNull().defaultNow(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedById: text("recorded_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
})

export const systemSettings = pgTable(
  "system_settings",
  {
    id: text("id").primaryKey(),
    settingKey: text("setting_key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).notNull(),
    updatedById: text("updated_by_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  },
  (table) => [uniqueIndex("system_settings_setting_key_key").on(table.settingKey)],
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_entity_entity_id_idx").on(table.entity, table.entityId), index("audit_logs_user_id_idx").on(table.userId)],
)
