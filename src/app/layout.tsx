import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Skåring av motoriske oppgaver i NUBU 4-16",
  description: "Registrering av motoriske oppgaver i NUBU 4-16",
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="nb"><body>{children}</body></html>
}
