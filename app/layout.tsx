import type { Metadata } from 'next'
import React from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cursor Usage Monitor',
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
      <body className="bg-dark-bg text-white">
        <div className="min-h-screen bg-dark-bg">
          {children}
        </div>
      </body>
    </html>
  )
} 