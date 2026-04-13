import type { ReactNode } from "react"
import { FormProvider, type FieldValues, type UseFormReturn } from "react-hook-form"

export function Form<T extends FieldValues>({
  methods,
  children,
}: {
  methods: UseFormReturn<T>
  children: ReactNode
}) {
  return <FormProvider {...methods}>{children}</FormProvider>
}
