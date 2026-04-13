"use server"

import type { ActionResult } from "@repo/loan-engine"

export async function createLoan(): Promise<ActionResult> {
  return { success: false, error: "Not implemented" }
}
