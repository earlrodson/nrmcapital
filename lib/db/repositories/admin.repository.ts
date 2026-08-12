import { randomUUID } from "node:crypto"

import { and, asc, count, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm"

import {
  attachments,
  auditLogs,
  clients,
  fundingTransactions,
  investors,
  loanApplications,
  loans,
  paymentEvents,
  paymentSchedules,
  payments,
  systemSettings,
  users,
} from "@/drizzle/schema"
import { db } from "@/lib/db/client"
import { reconcileLoanAndClientStatus } from "@/lib/db/repositories/loan-status.repository"
import { paymentEventSnapshotSchema } from "@/lib/domain/payment-events"
import { calculateLoanTerms } from "@/lib/domain/loan-calculations"

interface ListInput {
  page: number
  pageSize: number
  search?: string | null
  status?: string | null
  sortBy?: string | null
  sortOrder?: string | null
}

function moneyToString(value: string | number) {
  if (typeof value === "number") {
    return value.toFixed(2)
  }
  return value
}

function toPaymentSnapshot(payment: typeof payments.$inferSelect) {
  return paymentEventSnapshotSchema.parse({
    paymentId: payment.id,
    loanId: payment.loanId,
    amount: payment.amount,
    paymentType: payment.paymentType,
    paymentMethod: payment.paymentMethod,
    paymentScheduleId: payment.paymentScheduleId ?? null,
    paymentDate: payment.paymentDate,
    penaltyReason: payment.penaltyReason ?? null,
    notes: payment.notes ?? null,
    deletedAt: payment.deletedAt ?? null,
    deletedById: payment.deletedById ?? null,
    deleteReason: payment.deleteReason ?? null,
  })
}

function clientDelinquentClause() {
  return sql<boolean>`EXISTS (
    SELECT 1
    FROM loans l
    JOIN payment_schedules ps ON ps.loan_id = l.id
    WHERE l.client_id = clients.id
      AND ps.is_paid = false
      AND ps.due_date < NOW()
  )`
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
    const delinquentClause = clientDelinquentClause()

    if (input.search) {
      clauses.push(or(ilike(clients.firstName, `%${input.search}%`), ilike(clients.lastName, `%${input.search}%`)))
    }
    if (input.status === "active") {
      clauses.push(eq(clients.isActive, true))
    }
    if (input.status === "inactive") {
      clauses.push(eq(clients.isActive, false))
    }
    if (input.status === "delinquent") {
      clauses.push(eq(clients.isActive, true))
      clauses.push(delinquentClause)
    }

    const whereClause = clauses.length ? and(...clauses) : undefined
    const rows = await db
      .select({ ...getTableColumns(clients), delinquent: delinquentClause })
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
    const [row] = await db
      .select({ ...getTableColumns(clients), delinquent: clientDelinquentClause() })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)
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
      .where(and(eq(loans.clientId, clientId), sql`${payments.deletedAt} IS NULL`))
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

  async createAttachmentsBatch(
    items: Array<{
      clientId: string
      uploadedById: string
      storageKey: string
      type?: "GOV_ID" | "PROOF_OF_INCOME" | "PROOF_OF_BILLING" | "CONTRACT" | "OTHER"
      fileName?: string
    }>,
  ) {
    if (items.length === 0) return []
    return db
      .insert(attachments)
      .values(
        items.map((item) => ({
          id: randomUUID(),
          clientId: item.clientId,
          uploadedById: item.uploadedById,
          storageKey: item.storageKey,
          type: item.type ?? "OTHER",
          fileName: item.fileName,
          updatedAt: new Date(),
        })),
      )
      .returning()
  }

  async listLoans(input: ListInput) {
    const clauses = []
    const overdueClause = sql<boolean>`EXISTS (
      SELECT 1
      FROM payment_schedules ps
      WHERE ps.loan_id = ${loans.id}
        AND ps.is_paid = false
        AND ps.due_date < NOW()
    )`

    if (input.search) {
      const searchClause = or(
        ilike(loans.id, `%${input.search}%`),
        ilike(clients.firstName, `%${input.search}%`),
        ilike(clients.lastName, `%${input.search}%`),
      )
      if (searchClause) clauses.push(searchClause)
    }
    if (input.status) {
      if (input.status === "active") clauses.push(eq(loans.status, "ACTIVE"))
      if (input.status === "completed") clauses.push(eq(loans.status, "COMPLETED"))
      if (input.status === "defaulted") clauses.push(eq(loans.status, "DEFAULTED"))
      if (input.status === "overdue") clauses.push(overdueClause)
    }

    const whereClause = clauses.length ? and(...clauses) : undefined
    const sortBy = input.sortBy ?? "createdAt"
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc"

    let orderByClause
    if (sortBy === "loanDate") {
      orderByClause = sortOrder === "asc" ? asc(loans.loanDate) : desc(loans.loanDate)
    } else if (sortBy === "outstandingBalance") {
      orderByClause = sortOrder === "asc" ? asc(loans.outstandingBalance) : desc(loans.outstandingBalance)
    } else if (sortBy === "expectedEndDate") {
      orderByClause = sortOrder === "asc" ? asc(loans.expectedEndDate) : desc(loans.expectedEndDate)
    } else {
      orderByClause = sortOrder === "asc" ? asc(loans.createdAt) : desc(loans.createdAt)
    }

    const rows = await db
      .select()
      .from(loans)
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db
      .select({ total: sql<number>`COUNT(DISTINCT ${loans.id})` })
      .from(loans)
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(whereClause)

    const [summaryRow] = await db
      .select({
        totalOutstanding: sql<string>`COALESCE(SUM(${loans.outstandingBalance}),0)`,
        activeLoans: sql<number>`COUNT(*) FILTER (WHERE ${loans.status} = 'ACTIVE')`,
        overdueLoans: sql<number>`COUNT(*) FILTER (WHERE ${overdueClause})`,
      })
      .from(loans)
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(whereClause)

    const [collectedThisMonthRow] = await db
      .select({
        collectedThisMonth: sql<string>`COALESCE(SUM(${payments.amount}),0)`,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(whereClause ? and(whereClause, sql`${payments.deletedAt} IS NULL`) : sql`${payments.deletedAt} IS NULL`)

    return {
      rows,
      total: totalRow?.total ?? 0,
      summary: {
        totalOutstanding: summaryRow?.totalOutstanding ?? "0",
        activeLoans: summaryRow?.activeLoans ?? 0,
        overdueLoans: summaryRow?.overdueLoans ?? 0,
        collectedThisMonth: collectedThisMonthRow?.collectedThisMonth ?? "0",
      },
    }
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

  async createClientWithLoan(input: {
    client: {
      userId?: string
      firstName: string
      lastName: string
      contactNumber?: string
      address?: string
      idType?: string
      idNumber?: string
      notes?: string
      isActive?: boolean
    }
    loan: {
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
    }
  }) {
    const calculations = calculateLoanTerms({
      principalAmount: input.loan.principalAmount,
      monthlyInterestRate: input.loan.monthlyInterestRate,
      months: input.loan.months,
      termsPerMonth: input.loan.termsPerMonth,
      loanDate: input.loan.loanDate,
    })

    return db.transaction(async (tx) => {
      const [client] = await tx
        .insert(clients)
        .values({
          id: randomUUID(),
          userId: input.client.userId,
          firstName: input.client.firstName,
          lastName: input.client.lastName,
          contactNumber: input.client.contactNumber,
          address: input.client.address,
          idType: input.client.idType,
          idNumber: input.client.idNumber,
          notes: input.client.notes,
          isActive: input.client.isActive ?? true,
          updatedAt: new Date(),
        })
        .returning()

      const [loan] = await tx
        .insert(loans)
        .values({
          id: randomUUID(),
          clientId: client.id,
          investorId: input.loan.investorId,
          loanType: input.loan.loanType,
          principalAmount: calculations.principalAmount,
          monthlyInterestRate: calculations.monthlyInterestRate,
          months: input.loan.months,
          termsPerMonth: input.loan.termsPerMonth,
          totalTerms: calculations.totalTerms,
          paymentFrequency: input.loan.paymentFrequency,
          estimatedInterest: calculations.estimatedInterest,
          totalInterest: calculations.estimatedInterest,
          totalPayable: calculations.totalPayable,
          amortizationAmount: calculations.amortizationAmount,
          loanDate: input.loan.loanDate,
          disbursementDate: input.loan.disbursementDate,
          expectedEndDate: calculations.expectedEndDate,
          outstandingBalance: calculations.totalPayable,
          createdById: input.loan.createdById,
          notes: input.loan.notes,
          updatedAt: new Date(),
        })
        .returning()

      const scheduleRows = []
      for (let i = 1; i <= calculations.totalTerms; i += 1) {
        const dueDate = new Date(input.loan.loanDate)
        dueDate.setDate(dueDate.getDate() + Math.floor((30 / input.loan.termsPerMonth) * i))
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
      return { client, loan }
    })
  }

  async createLoanApplication(input: {
    applicantUserId?: string
    applicantEmail: string
    firstName: string
    lastName: string
    contactNumber?: string
    address?: string
    principalAmount: number | string
    monthlyInterestRate: number | string
    months: number
    termsPerMonth: number
    paymentFrequency: "MONTHLY" | "SEMI_MONTHLY" | "WEEKLY"
    notes?: string
  }) {
    const [row] = await db
      .insert(loanApplications)
      .values({
        id: randomUUID(),
        applicantUserId: input.applicantUserId,
        applicantEmail: input.applicantEmail.trim().toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        contactNumber: input.contactNumber,
        address: input.address,
        principalAmount: moneyToString(input.principalAmount),
        monthlyInterestRate: moneyToString(input.monthlyInterestRate),
        months: input.months,
        termsPerMonth: input.termsPerMonth,
        paymentFrequency: input.paymentFrequency,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async listLoanApplications(input: ListInput) {
    const clauses = []
    if (input.search) {
      const searchClause = or(
        ilike(loanApplications.firstName, `%${input.search}%`),
        ilike(loanApplications.lastName, `%${input.search}%`),
        ilike(loanApplications.applicantEmail, `%${input.search}%`),
      )
      if (searchClause) clauses.push(searchClause)
    }
    if (input.status && input.status !== "all") {
      if (input.status === "pending") clauses.push(eq(loanApplications.status, "PENDING"))
      if (input.status === "approved") clauses.push(eq(loanApplications.status, "APPROVED"))
      if (input.status === "rejected") clauses.push(eq(loanApplications.status, "REJECTED"))
    }
    const whereClause = clauses.length ? and(...clauses) : undefined

    const rows = await db
      .select()
      .from(loanApplications)
      .where(whereClause)
      .orderBy(desc(loanApplications.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(loanApplications).where(whereClause)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async getLoanApplicationById(applicationId: string) {
    const [row] = await db.select().from(loanApplications).where(eq(loanApplications.id, applicationId)).limit(1)
    return row ?? null
  }

  async approveLoanApplication(input: { applicationId: string; reviewedById: string; notes?: string }) {
    return db.transaction(async (tx) => {
      const [application] = await tx
        .select()
        .from(loanApplications)
        .where(eq(loanApplications.id, input.applicationId))
        .limit(1)
      if (!application) return null
      if (application.status !== "PENDING") {
        throw new Error("VALIDATION_ERROR: Application is already reviewed.")
      }

      const normalizedEmail = application.applicantEmail.trim().toLowerCase()
      const [matchedUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1)

      let clientId: string | null = null
      if (matchedUser?.id) {
        const [existingClient] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.userId, matchedUser.id))
          .limit(1)
        if (existingClient) {
          clientId = existingClient.id
        } else {
          const [createdClient] = await tx
            .insert(clients)
            .values({
              id: randomUUID(),
              userId: matchedUser.id,
              firstName: application.firstName,
              lastName: application.lastName,
              contactNumber: application.contactNumber,
              address: application.address,
              notes: application.notes ?? null,
              isActive: true,
              updatedAt: new Date(),
            })
            .returning({ id: clients.id })
          clientId = createdClient?.id ?? null
        }
      } else {
        const [createdClient] = await tx
          .insert(clients)
          .values({
            id: randomUUID(),
            firstName: application.firstName,
            lastName: application.lastName,
            contactNumber: application.contactNumber,
            address: application.address,
            notes: application.notes ?? null,
            isActive: true,
            updatedAt: new Date(),
          })
          .returning({ id: clients.id })
        clientId = createdClient?.id ?? null
      }
      if (!clientId) {
        throw new Error("VALIDATION_ERROR: Failed to resolve client for application.")
      }

      const loanDate = new Date()
      const calculations = calculateLoanTerms({
        principalAmount: application.principalAmount,
        monthlyInterestRate: application.monthlyInterestRate,
        months: application.months,
        termsPerMonth: application.termsPerMonth,
        loanDate,
      })
      const [loan] = await tx
        .insert(loans)
        .values({
          id: randomUUID(),
          clientId,
          loanType: "FLAT",
          principalAmount: calculations.principalAmount,
          monthlyInterestRate: calculations.monthlyInterestRate,
          months: application.months,
          termsPerMonth: application.termsPerMonth,
          totalTerms: calculations.totalTerms,
          paymentFrequency: application.paymentFrequency,
          estimatedInterest: calculations.estimatedInterest,
          totalInterest: calculations.estimatedInterest,
          totalPayable: calculations.totalPayable,
          amortizationAmount: calculations.amortizationAmount,
          loanDate,
          expectedEndDate: calculations.expectedEndDate,
          outstandingBalance: calculations.totalPayable,
          createdById: input.reviewedById,
          notes: input.notes ?? application.notes ?? undefined,
          updatedAt: new Date(),
        })
        .returning()

      const scheduleRows = []
      for (let i = 1; i <= calculations.totalTerms; i += 1) {
        const dueDate = new Date(loanDate)
        dueDate.setDate(dueDate.getDate() + Math.floor((30 / application.termsPerMonth) * i))
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

      const [updatedApplication] = await tx
        .update(loanApplications)
        .set({
          status: "APPROVED",
          reviewedById: input.reviewedById,
          reviewedAt: new Date(),
          rejectionReason: null,
          createdLoanId: loan.id,
          notes: input.notes ?? application.notes ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(loanApplications.id, input.applicationId), eq(loanApplications.status, "PENDING")))
        .returning()

      if (!updatedApplication) {
        throw new Error("VALIDATION_ERROR: Application was already processed.")
      }

      return { application: updatedApplication, loan, clientId }
    })
  }

  async rejectLoanApplication(input: { applicationId: string; reviewedById: string; rejectionReason: string }) {
    const [updated] = await db
      .update(loanApplications)
      .set({
        status: "REJECTED",
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason,
        updatedAt: new Date(),
      })
      .where(and(eq(loanApplications.id, input.applicationId), eq(loanApplications.status, "PENDING")))
      .returning()
    return updated ?? null
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

  async updateLoanScheduleDueDate(scheduleId: string, dueDate: Date) {
    const [existing] = await db
      .select({
        id: paymentSchedules.id,
        loanId: paymentSchedules.loanId,
        termNumber: paymentSchedules.termNumber,
        dueDate: paymentSchedules.dueDate,
        isPaid: paymentSchedules.isPaid,
      })
      .from(paymentSchedules)
      .where(eq(paymentSchedules.id, scheduleId))
      .limit(1)

    if (!existing) {
      return null
    }
    if (existing.isPaid) {
      throw new Error("VALIDATION_ERROR: Paid schedule terms cannot be edited.")
    }

    const [nextTerm] = await db
      .select({
        dueDate: paymentSchedules.dueDate,
      })
      .from(paymentSchedules)
      .where(and(eq(paymentSchedules.loanId, existing.loanId), eq(paymentSchedules.termNumber, existing.termNumber + 1)))
      .limit(1)

    if (nextTerm && dueDate.getTime() > nextTerm.dueDate.getTime()) {
      throw new Error("VALIDATION_ERROR: Due date cannot be later than the next schedule term date.")
    }

    const [updated] = await db
      .update(paymentSchedules)
      .set({
        dueDate,
        updatedAt: new Date(),
      })
      .where(eq(paymentSchedules.id, scheduleId))
      .returning({
        id: paymentSchedules.id,
        loanId: paymentSchedules.loanId,
        termNumber: paymentSchedules.termNumber,
        dueDate: paymentSchedules.dueDate,
        isPaid: paymentSchedules.isPaid,
      })
    return updated ?? null
  }

  async listPayments(input: ListInput & { includeDeleted?: boolean }) {
    const paymentWhere = input.includeDeleted ? undefined : sql`${payments.deletedAt} IS NULL`
    const rows = await db
      .select()
      .from(payments)
      .where(paymentWhere)
      .orderBy(desc(payments.paymentDate))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(payments).where(paymentWhere)
    return { rows, total: totalRow?.total ?? 0 }
  }

  async listLoanPayments(loanId: string, input?: { includeDeleted?: boolean }) {
    const whereClause = input?.includeDeleted
      ? eq(payments.loanId, loanId)
      : and(eq(payments.loanId, loanId), sql`${payments.deletedAt} IS NULL`)
    return db.select().from(payments).where(whereClause).orderBy(desc(payments.paymentDate))
  }

  async listPaymentEventsByLoan(loanId: string) {
    return db.select().from(paymentEvents).where(eq(paymentEvents.loanId, loanId)).orderBy(desc(paymentEvents.createdAt))
  }

  async updateLoanPayment(input: {
    paymentId: string
    actorUserId: string
    amount: string
    paymentType: "REGULAR" | "ADVANCE" | "PENALTY"
    paymentMethod: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
    paymentScheduleId?: string | null
    paymentDate: Date
    penaltyReason?: string | null
    notes?: string | null
  }) {
    return db.transaction(async (tx) => {
      const [existingPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, input.paymentId))
        .limit(1)

      if (!existingPayment) return null
      if (existingPayment.deletedAt) {
        throw new Error("VALIDATION_ERROR: Deleted payments cannot be edited.")
      }

      if (input.paymentScheduleId) {
        const [schedule] = await tx
          .select({
            id: paymentSchedules.id,
            loanId: paymentSchedules.loanId,
          })
          .from(paymentSchedules)
          .where(eq(paymentSchedules.id, input.paymentScheduleId))
          .limit(1)

        if (!schedule || schedule.loanId !== existingPayment.loanId) {
          throw new Error("VALIDATION_ERROR: Payment schedule not found for this loan.")
        }
      }

      if (existingPayment.paymentScheduleId) {
        await tx
          .update(paymentSchedules)
          .set({
            amountPaid: sql`GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount})`,
            isPaid: sql`GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount}) >= ${paymentSchedules.amountDue}`,
            paidAt: sql`CASE
              WHEN GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount}) >= ${paymentSchedules.amountDue}
              THEN ${paymentSchedules.paidAt}
              ELSE NULL
            END`,
            updatedAt: new Date(),
          })
          .where(eq(paymentSchedules.id, existingPayment.paymentScheduleId))
      }

      if (input.paymentScheduleId) {
        await tx
          .update(paymentSchedules)
          .set({
            amountPaid: sql`${paymentSchedules.amountPaid} + ${input.amount}`,
            isPaid: sql`(${paymentSchedules.amountPaid} + ${input.amount}) >= ${paymentSchedules.amountDue}`,
            paidAt: sql`CASE
              WHEN (${paymentSchedules.amountPaid} + ${input.amount}) >= ${paymentSchedules.amountDue}
              THEN COALESCE(${paymentSchedules.paidAt}, NOW())
              ELSE ${paymentSchedules.paidAt}
            END`,
            updatedAt: new Date(),
          })
          .where(eq(paymentSchedules.id, input.paymentScheduleId))
      }

      await tx
        .update(loans)
        .set({
          totalPaid: sql`GREATEST(0, ${loans.totalPaid} - ${existingPayment.amount} + ${input.amount})`,
          outstandingBalance: sql`GREATEST(0, ${loans.outstandingBalance} + ${existingPayment.amount} - ${input.amount})`,
          updatedAt: new Date(),
        })
        .where(eq(loans.id, existingPayment.loanId))

      const [updatedPayment] = await tx
        .update(payments)
        .set({
          amount: input.amount,
          paymentType: input.paymentType,
          paymentMethod: input.paymentMethod,
          paymentScheduleId: input.paymentScheduleId ?? null,
          paymentDate: input.paymentDate,
          penaltyReason: input.penaltyReason ?? null,
          notes: input.notes ?? null,
        })
        .where(eq(payments.id, input.paymentId))
        .returning()

      if (updatedPayment) {
        await tx.insert(paymentEvents).values({
          id: randomUUID(),
          loanId: updatedPayment.loanId,
          paymentId: updatedPayment.id,
          eventType: "UPDATED",
          actorUserId: input.actorUserId,
          before: toPaymentSnapshot(existingPayment),
          after: toPaymentSnapshot(updatedPayment),
        })
      }

      await reconcileLoanAndClientStatus(existingPayment.loanId, tx)

      return {
        before: existingPayment,
        after: updatedPayment ?? existingPayment,
      }
    })
  }

  async removeLoanPayment(input: { paymentId: string; reason: string; actorUserId: string }) {
    return db.transaction(async (tx) => {
      const [existingPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, input.paymentId))
        .limit(1)

      if (!existingPayment) return null
      if (existingPayment.deletedAt) {
        throw new Error("VALIDATION_ERROR: Payment is already deleted.")
      }

      if (existingPayment.paymentScheduleId) {
        await tx
          .update(paymentSchedules)
          .set({
            amountPaid: sql`GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount})`,
            isPaid: sql`GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount}) >= ${paymentSchedules.amountDue}`,
            paidAt: sql`CASE
              WHEN GREATEST(0, ${paymentSchedules.amountPaid} - ${existingPayment.amount}) >= ${paymentSchedules.amountDue}
              THEN ${paymentSchedules.paidAt}
              ELSE NULL
            END`,
            updatedAt: new Date(),
          })
          .where(eq(paymentSchedules.id, existingPayment.paymentScheduleId))
      }

      await tx
        .update(loans)
        .set({
          totalPaid: sql`GREATEST(0, ${loans.totalPaid} - ${existingPayment.amount})`,
          outstandingBalance: sql`${loans.outstandingBalance} + ${existingPayment.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(loans.id, existingPayment.loanId))

      const deletedAt = new Date()
      const [softDeletedPayment] = await tx
        .update(payments)
        .set({
          deletedAt,
          deletedById: input.actorUserId,
          deleteReason: input.reason,
        })
        .where(eq(payments.id, input.paymentId))
        .returning()

      const finalPayment = softDeletedPayment ?? existingPayment
      await tx.insert(paymentEvents).values({
        id: randomUUID(),
        loanId: finalPayment.loanId,
        paymentId: finalPayment.id,
        eventType: "SOFT_DELETED",
        actorUserId: input.actorUserId,
        before: toPaymentSnapshot(existingPayment),
        after: toPaymentSnapshot(finalPayment),
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: input.actorUserId,
        action: "DELETE",
        entity: "PAYMENT",
        entityId: finalPayment.id,
        payload: {
          reason: input.reason,
          deletedPayment: finalPayment,
        },
      })

      await reconcileLoanAndClientStatus(existingPayment.loanId, tx)

      return finalPayment
    })
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
    const [fundingRows, collectionsRows, disbursedRows] = await Promise.all([
      db
        .select({
          totalDeposits: sql<string>`COALESCE(SUM(CASE WHEN ${fundingTransactions.transactionType} = 'DEPOSIT' THEN ${fundingTransactions.amount} ELSE 0 END),0)`,
          totalWithdrawals: sql<string>`COALESCE(SUM(CASE WHEN ${fundingTransactions.transactionType} = 'WITHDRAWAL' THEN ${fundingTransactions.amount} ELSE 0 END),0)`,
        })
        .from(fundingTransactions),
      db
        .select({
          totalCollections: sql<string>`COALESCE(SUM(${payments.amount}),0)`,
        })
        .from(payments)
        .where(sql`${payments.deletedAt} IS NULL`),
      db
        .select({
          totalDisbursed: sql<string>`COALESCE(SUM(${loans.principalAmount}),0)`,
        })
        .from(loans),
    ])
    const [fundingRow] = fundingRows
    const [collectionsRow] = collectionsRows
    const [disbursedRow] = disbursedRows

    const deposits = Number(fundingRow?.totalDeposits ?? "0")
    const withdrawals = Number(fundingRow?.totalWithdrawals ?? "0")
    const collections = Number(collectionsRow?.totalCollections ?? "0")
    const disbursed = Number(disbursedRow?.totalDisbursed ?? "0")
    const cashAvailable = deposits + collections - withdrawals - disbursed

    return {
      totalDeposits: deposits.toFixed(2),
      totalCollections: collections.toFixed(2),
      totalWithdrawals: withdrawals.toFixed(2),
      totalDisbursed: disbursed.toFixed(2),
      cashAvailable: cashAvailable.toFixed(2),
      // Backward-compat alias while UI/API fully shift terminology
      availableFunding: cashAvailable.toFixed(2),
    }
  }

  async getDashboardSummary() {
    const [activeLoansRows, activeMembersRows, overdueRows, paymentsRows, pendingApplicationsRows, funding] = await Promise.all([
      db
        .select({
          activeLoans: sql<number>`COUNT(DISTINCT ${loans.id})`,
        })
        .from(loans)
        .innerJoin(clients, eq(loans.clientId, clients.id))
        .where(and(eq(loans.status, "ACTIVE"), eq(clients.isActive, true))),
      db
        .select({
          activeMembers: count(),
        })
        .from(clients)
        .where(eq(clients.isActive, true)),
      db
        .select({
          overduePayments: count(),
        })
        .from(paymentSchedules)
        .innerJoin(loans, eq(paymentSchedules.loanId, loans.id))
        .innerJoin(clients, eq(loans.clientId, clients.id))
        .where(
          and(
            eq(paymentSchedules.isPaid, false),
            sql`${paymentSchedules.dueDate} < NOW()`,
            eq(clients.isActive, true),
          ),
        ),
      db
        .select({
          totalPayments: sql<string>`COALESCE(SUM(${payments.amount}),0)`,
        })
        .from(payments)
        .where(sql`${payments.deletedAt} IS NULL`),
      db
        .select({
          pendingApplications: count(),
        })
        .from(loanApplications)
        .where(eq(loanApplications.status, "PENDING")),
      this.getFundingSummary(),
    ])
    const [activeLoansRow] = activeLoansRows
    const [activeMembersRow] = activeMembersRows
    const [overdueRow] = overdueRows
    const [paymentsRow] = paymentsRows
    const [pendingApplicationsRow] = pendingApplicationsRows

    return {
      totalPayments: paymentsRow?.totalPayments ?? "0",
      activeLoans: activeLoansRow?.activeLoans ?? 0,
      activeMembers: activeMembersRow?.activeMembers ?? 0,
      overduePayments: overdueRow?.overduePayments ?? 0,
      pendingApplications: pendingApplicationsRow?.pendingApplications ?? 0,
      cashAvailable: funding.cashAvailable,
      availableFunding: funding.cashAvailable,
    }
  }

  async getDashboardOverview(granularity: "day" | "month" | "year" = "month") {
    const bucketExpr =
      granularity === "day"
        ? sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM-DD')`
        : granularity === "year"
          ? sql`TO_CHAR(${payments.paymentDate}, 'YYYY')`
          : sql`TO_CHAR(${payments.paymentDate}, 'YYYY-MM')`
    const windowStart =
      granularity === "day"
        ? sql`CURRENT_DATE - INTERVAL '29 days'`
        : granularity === "year"
          ? sql`DATE_TRUNC('year', NOW()) - INTERVAL '9 years'`
          : sql`DATE_TRUNC('month', NOW()) - INTERVAL '11 months'`

    const rows = await db
      .select({
        bucket: bucketExpr.as("bucket"),
        total: sql<string>`SUM(${payments.amount})`,
      })
      .from(payments)
      .where(and(sql`${payments.deletedAt} IS NULL`, sql`${payments.paymentDate} >= ${windowStart}`))
      .groupBy(bucketExpr)
      .orderBy(bucketExpr)
    return rows
  }

  async findLoanContextById(loanIdOrPrefix: string) {
    const normalized = loanIdOrPrefix.trim().replace(/^#/, "")
    if (!normalized) return null

    const [exactMatch] = await db
      .select({
        loan: {
          id: loans.id,
          status: loans.status,
          outstandingBalance: loans.outstandingBalance,
          totalPaid: loans.totalPaid,
          totalPayable: loans.totalPayable,
        },
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          contactNumber: clients.contactNumber,
        },
      })
      .from(loans)
      .leftJoin(clients, eq(loans.clientId, clients.id))
      .where(eq(loans.id, normalized))
      .limit(1)

    if (exactMatch) {
      return exactMatch
    }

    const [prefixMatch] = await db
      .select({
        loan: {
          id: loans.id,
          status: loans.status,
          outstandingBalance: loans.outstandingBalance,
          totalPaid: loans.totalPaid,
          totalPayable: loans.totalPayable,
        },
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          contactNumber: clients.contactNumber,
        },
      })
      .from(loans)
      .leftJoin(clients, eq(loans.clientId, clients.id))
      .where(ilike(loans.id, `${normalized}%`))
      .orderBy(desc(loans.createdAt))
      .limit(1)

    return prefixMatch ?? null
  }

  async getDashboardActivity(input: { page: number; pageSize: number }) {
    const activityFilter = sql`${auditLogs.entity} IN ('CLIENT', 'LOAN', 'PAYMENT', 'FUNDING_TRANSACTION')`

    const rows = await db
      .select({
        id: auditLogs.id,
        type: auditLogs.entity,
        action: auditLogs.action,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        title: sql<string>`CASE
          WHEN ${auditLogs.entity} = 'CLIENT' AND ${auditLogs.action} = 'CREATE' THEN 'New client onboarded'
          WHEN ${auditLogs.entity} = 'CLIENT' AND ${auditLogs.action} = 'UPDATE' THEN 'Client profile updated'
          WHEN ${auditLogs.entity} = 'CLIENT' AND ${auditLogs.action} = 'DEACTIVATE' THEN 'Client deactivated'
          WHEN ${auditLogs.entity} = 'LOAN' AND ${auditLogs.action} = 'CREATE' THEN 'Loan created'
          WHEN ${auditLogs.entity} = 'LOAN' AND ${auditLogs.action} = 'UPDATE' THEN 'Loan updated'
          WHEN ${auditLogs.entity} = 'PAYMENT' AND ${auditLogs.action} = 'CREATE' THEN 'Payment recorded'
          WHEN ${auditLogs.entity} = 'FUNDING_TRANSACTION' AND ${auditLogs.action} = 'CREATE' THEN 'Funding transaction recorded'
          ELSE 'System activity'
        END`,
        description: sql<string>`CASE
          WHEN ${auditLogs.entity} = 'CLIENT' THEN COALESCE(${auditLogs.payload}->>'firstName','') || ' ' || COALESCE(${auditLogs.payload}->>'lastName','')
          WHEN ${auditLogs.entity} = 'LOAN' THEN 'Loan #' || SUBSTRING(${auditLogs.entityId} FROM 1 FOR 8)
          WHEN ${auditLogs.entity} = 'PAYMENT' THEN COALESCE(${auditLogs.payload}->>'paymentType','PAYMENT') || ' on loan #' || COALESCE(SUBSTRING(${auditLogs.payload}->>'loanId' FROM 1 FOR 8),'')
          WHEN ${auditLogs.entity} = 'FUNDING_TRANSACTION' THEN COALESCE(${auditLogs.payload}->>'transactionType','FUNDING')
          ELSE COALESCE(${auditLogs.payload}->>'notes', '')
        END`,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(activityFilter)
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)

    const [totalRow] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(activityFilter)

    return { rows, total: totalRow?.total ?? 0 }
  }

  async getTopOverdueLoans(limit = 5) {
    return db
      .select({
        loanId: loans.id,
        clientId: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        overdueTerms: count(),
        oldestDueDate: sql<Date>`MIN(${paymentSchedules.dueDate})`,
        overdueAmount: sql<string>`COALESCE(SUM(${paymentSchedules.amountDue}),0)`,
        daysOverdue: sql<number>`COALESCE(DATE_PART('day', NOW() - MIN(${paymentSchedules.dueDate})), 0)::int`,
      })
      .from(paymentSchedules)
      .innerJoin(loans, eq(paymentSchedules.loanId, loans.id))
      .innerJoin(clients, eq(loans.clientId, clients.id))
      .where(and(eq(paymentSchedules.isPaid, false), sql`${paymentSchedules.dueDate} < NOW()`, eq(clients.isActive, true)))
      .groupBy(loans.id, clients.id, clients.firstName, clients.lastName)
      .orderBy(desc(sql`COALESCE(DATE_PART('day', NOW() - MIN(${paymentSchedules.dueDate})), 0)`))
      .limit(limit)
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
      .where(sql`${payments.deletedAt} IS NULL`)
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
      .where(sql`${payments.deletedAt} IS NULL`)
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
