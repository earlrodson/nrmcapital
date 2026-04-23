import { randomUUID } from "node:crypto"

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm"

import {
  attachments,
  auditLogs,
  clients,
  fundingTransactions,
  investors,
  loans,
  paymentSchedules,
  payments,
  systemSettings,
  users,
} from "@/drizzle/schema"
import { db } from "@/lib/db/client"
import { calculateLoanTerms } from "@/lib/domain/loan-calculations"

interface ListInput {
  page: number
  pageSize: number
  search?: string | null
  status?: string | null
}

function moneyToString(value: string | number) {
  if (typeof value === "number") {
    return value.toFixed(2)
  }
  return value
}

export class AdminRepository {
  async findUserByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return row ?? null
  }

  async touchLastLogin(userId: string) {
    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId))
  }

  async listClients(input: ListInput) {
    const clauses = []
    if (input.search) {
      clauses.push(or(ilike(clients.firstName, `%${input.search}%`), ilike(clients.lastName, `%${input.search}%`)))
    }
    if (input.status === "active") {
      clauses.push(eq(clients.isActive, true))
    }
    if (input.status === "inactive") {
      clauses.push(eq(clients.isActive, false))
    }

    const whereClause = clauses.length ? and(...clauses) : undefined
    const rows = await db
      .select()
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(clients).where(whereClause)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async createClient(input: {
    userId?: string
    firstName: string
    lastName: string
    contactNumber?: string
    address?: string
    idType?: string
    idNumber?: string
    notes?: string
    isActive?: boolean
  }) {
    const [row] = await db
      .insert(clients)
      .values({
        id: randomUUID(),
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        contactNumber: input.contactNumber,
        address: input.address,
        idType: input.idType,
        idNumber: input.idNumber,
        notes: input.notes,
        isActive: input.isActive ?? true,
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async getClientById(clientId: string) {
    const [row] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
    return row ?? null
  }

  async updateClient(clientId: string, input: Partial<Omit<typeof clients.$inferInsert, "id" | "createdAt">>) {
    const [row] = await db
      .update(clients)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning()
    return row ?? null
  }

  async deactivateClient(clientId: string) {
    const [row] = await db
      .update(clients)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning()
    return row ?? null
  }

  async listClientLoans(clientId: string) {
    return db.select().from(loans).where(eq(loans.clientId, clientId)).orderBy(desc(loans.createdAt))
  }

  async listClientPayments(clientId: string) {
    return db
      .select({
        id: payments.id,
        loanId: payments.loanId,
        amount: payments.amount,
        paymentType: payments.paymentType,
        paymentMethod: payments.paymentMethod,
        paymentDate: payments.paymentDate,
        notes: payments.notes,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .where(eq(loans.clientId, clientId))
      .orderBy(desc(payments.paymentDate))
  }

  async listClientAttachments(clientId: string) {
    return db.select().from(attachments).where(eq(attachments.clientId, clientId)).orderBy(desc(attachments.createdAt))
  }

  async createAttachment(input: {
    clientId: string
    uploadedById: string
    storageKey: string
    type?: "GOV_ID" | "PROOF_OF_INCOME" | "PROOF_OF_BILLING" | "CONTRACT" | "OTHER"
    fileName?: string
  }) {
    const [row] = await db
      .insert(attachments)
      .values({
        id: randomUUID(),
        clientId: input.clientId,
        uploadedById: input.uploadedById,
        storageKey: input.storageKey,
        type: input.type ?? "OTHER",
        fileName: input.fileName,
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async listLoans(input: ListInput) {
    const clauses = []
    if (input.search) {
      clauses.push(or(ilike(loans.id, `%${input.search}%`), ilike(clients.firstName, `%${input.search}%`), ilike(clients.lastName, `%${input.search}%`)))
    }
    if (input.status) {
      if (input.status === "active") clauses.push(eq(loans.status, "ACTIVE"))
      if (input.status === "completed") clauses.push(eq(loans.status, "COMPLETED"))
      if (input.status === "defaulted") clauses.push(eq(loans.status, "DEFAULTED"))
    }

    const whereClause = clauses.length ? and(...clauses) : undefined
    const rows = await db
      .select()
      .from(loans)
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(loans.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(loans).where(whereClause)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async createLoan(input: {
    clientId: string
    investorId?: string
    loanType: "FLAT" | "DIMINISHING"
    principalAmount: number | string
    monthlyInterestRate: number | string
    months: number
    termsPerMonth: number
    paymentFrequency: "MONTHLY" | "SEMI_MONTHLY" | "WEEKLY"
    loanDate: Date
    disbursementDate?: Date
    createdById: string
    notes?: string
  }) {
    const calculations = calculateLoanTerms({
      principalAmount: input.principalAmount,
      monthlyInterestRate: input.monthlyInterestRate,
      months: input.months,
      termsPerMonth: input.termsPerMonth,
      loanDate: input.loanDate,
    })

    return db.transaction(async (tx) => {
      const [loan] = await tx
        .insert(loans)
        .values({
          id: randomUUID(),
          clientId: input.clientId,
          investorId: input.investorId,
          loanType: input.loanType,
          principalAmount: calculations.principalAmount,
          monthlyInterestRate: calculations.monthlyInterestRate,
          months: input.months,
          termsPerMonth: input.termsPerMonth,
          totalTerms: calculations.totalTerms,
          paymentFrequency: input.paymentFrequency,
          estimatedInterest: calculations.estimatedInterest,
          totalInterest: calculations.estimatedInterest,
          totalPayable: calculations.totalPayable,
          amortizationAmount: calculations.amortizationAmount,
          loanDate: input.loanDate,
          disbursementDate: input.disbursementDate,
          expectedEndDate: calculations.expectedEndDate,
          outstandingBalance: calculations.totalPayable,
          createdById: input.createdById,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .returning()

      const scheduleRows = []
      for (let i = 1; i <= calculations.totalTerms; i += 1) {
        const dueDate = new Date(input.loanDate)
        dueDate.setDate(dueDate.getDate() + Math.floor((30 / input.termsPerMonth) * i))
        scheduleRows.push({
          id: randomUUID(),
          loanId: loan.id,
          termNumber: i,
          dueDate,
          amountDue: calculations.amortizationAmount,
          principalDue: calculations.principalPerTerm,
          interestDue: calculations.interestPerTerm,
          updatedAt: new Date(),
        })
      }

      await tx.insert(paymentSchedules).values(scheduleRows)
      return loan
    })
  }

  async getLoanById(loanId: string) {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1)
    return loan ?? null
  }

  async updateLoan(loanId: string, input: Partial<Omit<typeof loans.$inferInsert, "id" | "createdAt">>) {
    const [loan] = await db
      .update(loans)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loanId))
      .returning()
    return loan ?? null
  }

  async listLoanSchedule(loanId: string) {
    return db.select().from(paymentSchedules).where(eq(paymentSchedules.loanId, loanId)).orderBy(asc(paymentSchedules.termNumber))
  }

  async listPayments(input: ListInput) {
    const rows = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.paymentDate))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(payments)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async listLoanPayments(loanId: string) {
    return db.select().from(payments).where(eq(payments.loanId, loanId)).orderBy(desc(payments.paymentDate))
  }

  async listInvestors(input: ListInput) {
    const rows = await db
      .select()
      .from(investors)
      .orderBy(desc(investors.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(investors)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async createInvestor(input: {
    name: string
    capitalAmount?: number | string
    interestShareRate?: number | string
    notes?: string
    isActive?: boolean
  }) {
    const [row] = await db
      .insert(investors)
      .values({
        id: randomUUID(),
        name: input.name,
        capitalAmount:
          input.capitalAmount !== undefined ? moneyToString(input.capitalAmount) : null,
        interestShareRate:
          input.interestShareRate !== undefined ? moneyToString(input.interestShareRate) : null,
        notes: input.notes,
        isActive: input.isActive ?? true,
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async getInvestorById(investorId: string) {
    const [row] = await db.select().from(investors).where(eq(investors.id, investorId)).limit(1)
    return row ?? null
  }

  async updateInvestor(investorId: string, input: Partial<Omit<typeof investors.$inferInsert, "id" | "createdAt">>) {
    const [row] = await db
      .update(investors)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(investors.id, investorId))
      .returning()
    return row ?? null
  }

  async listFundingTransactions(input: ListInput) {
    const rows = await db
      .select()
      .from(fundingTransactions)
      .orderBy(desc(fundingTransactions.transactionDate))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(fundingTransactions)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async createFundingTransaction(input: {
    investorId?: string
    transactionType: "DEPOSIT" | "WITHDRAWAL"
    amount: number | string
    referenceNumber?: string
    notes?: string
    recordedById: string
  }) {
    const [row] = await db
      .insert(fundingTransactions)
      .values({
        id: randomUUID(),
        investorId: input.investorId,
        transactionType: input.transactionType,
        amount: moneyToString(input.amount),
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        recordedById: input.recordedById,
      })
      .returning()
    return row
  }

  async getFundingSummary() {
    const [row] = await db
      .select({
        deposits: sql<string>`COALESCE(SUM(CASE WHEN ${fundingTransactions.transactionType} = 'DEPOSIT' THEN ${fundingTransactions.amount} ELSE 0 END),0)`,
        withdrawals: sql<string>`COALESCE(SUM(CASE WHEN ${fundingTransactions.transactionType} = 'WITHDRAWAL' THEN ${fundingTransactions.amount} ELSE 0 END),0)`,
      })
      .from(fundingTransactions)

    const deposits = Number(row?.deposits ?? "0")
    const withdrawals = Number(row?.withdrawals ?? "0")
    return {
      deposits: deposits.toFixed(2),
      withdrawals: withdrawals.toFixed(2),
      availableFunding: (deposits - withdrawals).toFixed(2),
    }
  }

  async getDashboardSummary() {
    const [loanCounts] = await db
      .select({
        activeLoans: sql<number>`COUNT(*) FILTER (WHERE ${loans.status} = 'ACTIVE')`,
        overdueSchedules: sql<number>`COUNT(*) FILTER (WHERE ${paymentSchedules.isPaid} = false AND ${paymentSchedules.dueDate} < NOW())`,
      })
      .from(loans)
      .leftJoin(paymentSchedules, eq(paymentSchedules.loanId, loans.id))
    const [clientsCount] = await db.select({ totalClients: count() }).from(clients)
    const funding = await this.getFundingSummary()

    return {
      activeLoans: loanCounts?.activeLoans ?? 0,
      totalClients: clientsCount?.totalClients ?? 0,
      overduePayments: loanCounts?.overdueSchedules ?? 0,
      availableFunding: funding.availableFunding,
    }
  }

  async getDashboardOverview() {
    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`,
        total: sql<string>`SUM(${payments.amount})`,
      })
      .from(payments)
      .groupBy(sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`)
      .limit(12)
    return rows
  }

  async getDashboardActivity() {
    const rows = await db
      .select({
        id: payments.id,
        type: sql<string>`'PAYMENT'`,
        createdAt: payments.paymentDate,
        payload: payments.notes,
      })
      .from(payments)
      .orderBy(desc(payments.paymentDate))
      .limit(20)
    return rows
  }

  async getPaymentSummary() {
    const [row] = await db
      .select({
        totalPayments: sql<string>`COALESCE(SUM(${payments.amount}),0)`,
        totalTransactions: count(),
        overdueCount: sql<number>`(
          SELECT COUNT(*) FROM ${paymentSchedules}
          WHERE ${paymentSchedules.isPaid} = false AND ${paymentSchedules.dueDate} < NOW()
        )`,
      })
      .from(payments)
    return {
      totalPayments: row?.totalPayments ?? "0.00",
      totalTransactions: row?.totalTransactions ?? 0,
      overdueCount: row?.overdueCount ?? 0,
    }
  }

  async listSystemSettings() {
    return db.select().from(systemSettings).orderBy(asc(systemSettings.settingKey))
  }

  async upsertSystemSetting(input: {
    settingKey: string
    value: string
    description?: string
    updatedById?: string
  }) {
    const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, input.settingKey)).limit(1)
    if (existing) {
      const [row] = await db
        .update(systemSettings)
        .set({
          value: input.value,
          description: input.description ?? existing.description,
          updatedById: input.updatedById ?? existing.updatedById,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.id, existing.id))
        .returning()
      return row
    }

    const [row] = await db
      .insert(systemSettings)
      .values({
        id: randomUUID(),
        settingKey: input.settingKey,
        value: input.value,
        description: input.description,
        updatedById: input.updatedById,
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async listUsers(input: ListInput) {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(users)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async getUserById(userId: string) {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return row ?? null
  }

  async createUser(input: {
    email: string
    passwordHash: string
    name: string
    role?: "SUPERADMIN" | "ADMIN" | "CLIENT"
  }) {
    const [row] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role ?? "ADMIN",
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async updateUser(userId: string, input: Partial<Omit<typeof users.$inferInsert, "id" | "createdAt">>) {
    const [row] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()
    return row ?? null
  }

  async deactivateUser(userId: string) {
    const [row] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
    return row ?? null
  }

  async listAuditLogs(input: ListInput) {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(auditLogs)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async createAuditLog(input: {
    userId: string
    action: string
    entity: string
    entityId: string
    payload: Record<string, unknown>
  }) {
    const [row] = await db
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        payload: input.payload,
      })
      .returning()
    return row
  }

  async getReportsLoans() {
    return db
      .select({
        status: loans.status,
        count: count(),
        totalOutstanding: sql<string>`COALESCE(SUM(${loans.outstandingBalance}),0)`,
      })
      .from(loans)
      .groupBy(loans.status)
  }

  async getReportsPayments() {
    return db
      .select({
        paymentType: payments.paymentType,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(${payments.amount}),0)`,
      })
      .from(payments)
      .groupBy(payments.paymentType)
  }

  async getReportsInvestors() {
    return db
      .select({
        id: investors.id,
        name: investors.name,
        capitalAmount: investors.capitalAmount,
      })
      .from(investors)
      .orderBy(asc(investors.name))
  }

  async getClientByUserId(userId: string) {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1)
    return client ?? null
  }
}

export const adminRepository = new AdminRepository()
