import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sammy",
  description: "RAG document chatbot",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        {children}
      </body>
    </html>
  )
}
