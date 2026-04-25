import { FundingTransactionFormClient } from "../funding-transaction-form-client"

export default function AdminFundingWithdrawPage() {
  return <FundingTransactionFormClient transactionType="WITHDRAWAL" />
}
