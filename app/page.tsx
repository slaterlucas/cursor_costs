'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, DollarSign, Activity, Settings, Bell, Zap } from 'lucide-react'
import CursorMonitor from './components/CursorMonitor'

export default function Home() {
  const [isSetup, setIsSetup] = useState(false)

  useEffect(() => {
    // Check if user has already set up their monitor
    const hasSetup = localStorage.getItem('cursor-monitor-setup')
    setIsSetup(!!hasSetup)
  }, [])

  if (!isSetup) {
    return <SetupPage onSetupComplete={() => setIsSetup(true)} />
  }

  return <CursorMonitor />
}

function SetupPage({ onSetupComplete }: { onSetupComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [sessionToken, setSessionToken] = useState('')
  const [curlCommand, setCurlCommand] = useState('')
  const [showDemo, setShowDemo] = useState(false)
  const [notifications, setNotifications] = useState({
    browser: true,
  })
  const [threshold, setThreshold] = useState(0.5)
  const [cooldown, setCooldown] = useState(5)

  const extractTokenFromCurl = (curl: string) => {
    const match = curl.match(/WorkosCursorSessionToken=([^;'\s]+)/)
    return match ? match[1] : ''
  }

  const handleCurlPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const curl = e.target.value
    setCurlCommand(curl)
    const token = extractTokenFromCurl(curl)
    setSessionToken(token)
  }

  const handleSetupComplete = () => {
    const config = {
      sessionToken,
      notifications,
      threshold,
      cooldown,
      setupDate: new Date().toISOString(),
    }
    localStorage.setItem('cursor-monitor-config', JSON.stringify(config))
    localStorage.setItem('cursor-monitor-setup', 'true')
    onSetupComplete()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="app-title text-3xl font-bold text-white mb-2">
            Cursor Costs
          </h1>
          <p className="text-text-muted">
            Get notified when your Cursor AI usage increases so you never get surprised by charges
          </p>
        </div>

        {/* Setup Steps */}
        <div className="bg-dark-grey shadow-lg p-6 relative z-10">


          {/* Step Content */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Get Your Session Token</h2>
              <div className="space-y-4">
                <div className="bg-light-grey p-4">
                  <p className="text-sm mb-3">
                    Watch this demo to see how to extract your session token:
                  </p>
                  <button
                    onClick={() => setShowDemo(true)}
                    className="inline-flex items-center text-white hover:text-gray-300 transition-colors text-sm underline"
                  >
                    View Demo →
                  </button>
                </div>
                <textarea
                  value={curlCommand}
                  onChange={handleCurlPaste}
                  placeholder="Paste your cURL command here..."
                  className="w-full h-32 p-3 border border-light-grey bg-light-grey/50 font-geist text-sm text-white placeholder:text-gray-400"
                />
                {sessionToken && (
                  <div className="flex items-center text-green-600">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm">Session token extracted successfully!</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={!sessionToken}
                  className="px-6 py-2 bg-white text-dark-bg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-light-grey transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Notification Threshold</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">$</span>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      step="0.1"
                      min="0.1"
                      className="w-20 p-2 border border-light-grey bg-light-grey text-white"
                    />
                    <span className="text-sm text-text-muted">minimum increase to notify</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Notification Method</h3>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notifications.browser}
                      onChange={(e) => setNotifications({...notifications, browser: e.target.checked})}
                      className="w-4 h-4 text-white"
                    />
                    <Bell className="w-4 h-4" />
                    <span>Browser notifications</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notification Interval (minutes)</label>
                  <input
                    type="number"
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    min="1"
                    className="w-24 p-2 border border-light-grey bg-light-grey text-white"
                  />
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-white text-dark-bg hover:bg-light-grey transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Review & Start</h2>
              <div className="space-y-4">
                <div className="bg-light-grey p-4">
                  <h3 className="font-medium mb-2">Configuration Summary</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Session token: {sessionToken.substring(0, 20)}...</li>
                    <li>• Notification threshold: ${threshold}</li>
                    <li>• Notification Interval: {cooldown} minutes</li>
                    <li>• Browser notifications: {notifications.browser ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </div>
                <div className="bg-light-grey p-4">
                  <p className="text-sm">
                    <strong>Important:</strong> Keep this browser tab open to receive notifications. 
                    The monitor will check your usage every {cooldown} minutes and alert you when spending increases.
                  </p>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetupComplete}
                  className="px-6 py-2 bg-white text-dark-bg hover:bg-light-grey transition-colors"
                >
                  Start Monitoring
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Modal */}
        {showDemo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-grey p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">How to Extract Session Token</h3>
                <button
                  onClick={() => setShowDemo(false)}
                  className="text-white hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              <video
                controls
                className="w-full"
              >
                <source src="/session_demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowDemo(false)}
                  className="px-6 py-2 bg-white text-dark-bg hover:bg-light-grey transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 