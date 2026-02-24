import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Buildex - Procurement & Price Intelligence',
  description: 'B2B multi-tenant SaaS for construction procurement and price intelligence in Romania',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-4 text-center">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">@ACL Smart Software</span>. Toate drepturile rezervate.
          </p>
        </footer>
      </body>
    </html>
  )
}
