import type { Metadata } from 'next'
import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cursor Costs',
  description: 'Monitor your Cursor AI usage and get notified when spending increases',
  keywords: ['cursor', 'ai', 'usage', 'monitor', 'billing', 'notifications'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-dark-bg text-white">
        <div className="min-h-screen bg-dark-bg">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
} 