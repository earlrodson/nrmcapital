import "./globals.css"

import type { ReactNode } from "react"
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", montserrat.variable)}>
      <body>{children}</body>
    </html>
  )
}
