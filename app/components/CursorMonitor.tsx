'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DollarSign, Activity, Settings, Bell, AlertCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UsageEvent {
  timestamp: string
  priceCents: number
  details: {
    toolCallComposer?: {
      modelIntent: string
      tokenUsage?: {
        inputTokens: number
        outputTokens: number
        totalCents: number
      }
    }
  }
}

interface UsageData {
  items: Array<{
    cents: number
    description: string
  }>
  usageEvents: UsageEvent[]
}

interface Config {
  sessionToken: string
  notifications: {
    browser: boolean
    email: boolean
    webhook: boolean
    emailAddress: string
    webhookUrl: string
  }
  threshold: number
  setupDate: string
  cooldown?: number
}

export default function CursorMonitor() {
  const [config, setConfig] = useState<Config | null>(null)
  const [currentSpending, setCurrentSpending] = useState(0) // Session spending (current - baseline)
  const [sessionBaseline, setSessionBaseline] = useState(0) // Monthly total when session started
  const [lastSpending, setLastSpending] = useState(0) // Last known session spending
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [usageHistory, setUsageHistory] = useState<Array<{time: string, amount: number}>>([])
  const [recentEvents, setRecentEvents] = useState<UsageEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [lastNotify, setLastNotify] = useState<number>(() => {
    const ts = localStorage.getItem('cursor-monitor-last-notify')
    return ts ? parseInt(ts) : 0
  })
  const [baselineInitialized, setBaselineInitialized] = useState(false)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('cursor-monitor-snooze-until')
    return saved ? parseInt(saved) : null
  })

  // Load config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('cursor-monitor-config')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      setConfig(parsedConfig)
      
      // Clear old session data immediately when starting fresh
      console.log('🧹 Clearing old session data for fresh start')
      localStorage.removeItem('cursor-monitor-session-baseline')
      localStorage.removeItem('cursor-monitor-session-spending')
      localStorage.removeItem('cursor-monitor-history')
      
      // Reset state to clean values
      setSessionBaseline(0)
      setCurrentSpending(0)
      setLastSpending(0)
      setUsageHistory([])

      // Auto-start monitoring once config is loaded
      setIsMonitoring(true)
    }
  }, [])

  // Request notification permission
  useEffect(() => {
    if (config?.notifications.browser && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [config])

  const fetchUsageData = useCallback(async (): Promise<UsageData | null> => {
    if (!config) return null

    const now = new Date()
    
    // Try current month first, then previous month if no data (matches Python logic)
    const monthsToTry = [
      { month: now.getMonth() + 1, year: now.getFullYear() },
      { 
        month: now.getMonth() > 0 ? now.getMonth() : 12, 
        year: now.getMonth() > 0 ? now.getFullYear() : now.getFullYear() - 1 
      }
    ]

    for (const { month, year } of monthsToTry) {
      const payload = {
        month,
        year,
        includeUsageEvents: true
      }

      try {
        console.log(`Trying month ${month}/${year}`)
        const response = await fetch('/api/cursor-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionToken: config.sessionToken,
            payload
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`Raw API response for ${month}/${year}:`, data)
        
        // Check if this month has actual usage data
        const hasItems = Array.isArray(data.items) && data.items.length > 0
        const hasEvents = Array.isArray(data.usageEvents) && data.usageEvents.length > 0
        if (hasItems || hasEvents) {
          console.log(`Found usage data in month ${month}/${year}`)
          return data
        } else {
          console.log(`No usage data in month ${month}/${year}, trying next month`)
          continue
        }
      } catch (error) {
        console.error(`Failed to fetch usage data for ${month}/${year}:`, error)
        setError(error instanceof Error ? error.message : 'Failed to fetch usage data')
        return null
      }
    }

    // If we get here, no months had usage data
    console.log('No usage data found in any month')
    return { items: [], usageEvents: [] }
  }, [config])

  const snoozeNotifications = useCallback((minutes: number) => {
    const until = Date.now() + (minutes * 60 * 1000)
    setSnoozeUntil(until)
    localStorage.setItem('cursor-monitor-snooze-until', until.toString())
    console.log(`🔕 Notifications snoozed for ${minutes} minutes until ${new Date(until).toLocaleTimeString()}`)
  }, [])

  const clearSnooze = useCallback(() => {
    setSnoozeUntil(null)
    localStorage.removeItem('cursor-monitor-snooze-until')
    console.log('🔔 Snooze cleared - notifications re-enabled')
  }, [])

  const isNotificationsSnoozed = useCallback(() => {
    if (!snoozeUntil) return false
    const now = Date.now()
    if (now >= snoozeUntil) {
      // Snooze period expired, clear it
      clearSnooze()
      return false
    }
    return true
  }, [snoozeUntil, clearSnooze])

  const sendNotification = useCallback(async (message: string) => {
    if (!config) {
      console.log('❌ No config available for notifications')
      return
    }

    // Check if notifications are snoozed
    if (isNotificationsSnoozed()) {
      const remaining = Math.ceil((snoozeUntil! - Date.now()) / 60000)
      console.log(`🔕 Notifications snoozed for ${remaining} more minutes - skipping notification`)
      return
    }

    console.log('🔔 sendNotification called with message:', message)
    console.log('📋 Notification config:', config.notifications)

    // Browser notification
    if (config.notifications.browser) {
      console.log('📣 Browser notifications enabled - attempting notification')
      console.log('🔐 Current permission:', notificationPermission)
      console.log('🌐 Notification API available:', 'Notification' in window)
      
      if (notificationPermission === 'granted') {
        try {
          console.log('🚀 Creating notification...')
          const notification = new Notification('Cursor Usage Alert', {
            body: message,
            icon: '/favicon.ico',
            tag: 'cursor-usage', // Prevents duplicate notifications
            requireInteraction: true // Keeps notification visible until user interacts
          })
          
          console.log('✅ Browser notification object created:', notification)
          
          // Add event listeners to track notification lifecycle
          notification.onclick = () => {
            console.log('👆 User clicked notification')
            notification.close()
          }
          
          notification.onshow = () => {
            console.log('👁️ Notification shown to user')
          }
          
          notification.onerror = (error) => {
            console.error('❌ Notification error:', error)
          }
          
          notification.onclose = () => {
            console.log('🚪 Notification closed')
          }
          
          console.log('✅ Browser notification dispatched successfully')
        } catch (e) {
          console.error('❌ Browser notification failed:', e)
        }
      } else {
        console.warn('⚠️ Notification permission not granted:', notificationPermission)
      }
    } else {
      console.log('📱 Browser notifications disabled in config')
    }

    // Webhook notification
    // (Disabled for now)
    // Email notification
    // (Disabled for now)
  }, [config, notificationPermission, isNotificationsSnoozed, snoozeUntil])

  const initializeBaseline = useCallback(async () => {
    const data = await fetchUsageData()
    if (!data) return

    console.log('Baseline data received:', data)
    console.log('data.items:', data.items)
    console.log('data.items length:', data.items?.length)
    console.log('data.items[0]:', data.items?.[0])
    console.log('data.usageEvents length:', data.usageEvents?.length)

    let totalCents = 0
    
    // Try to get total spending from items first (matches Python logic)
    if (data.items && data.items.length > 0) {
      totalCents = data.items[0].cents
      console.log('Using items total:', totalCents, 'from cents field:', data.items[0].cents)
    } 
    // If no items, try to calculate from usage events
    else if (data.usageEvents && data.usageEvents.length > 0) {
      totalCents = data.usageEvents.reduce((sum, event) => sum + (event.priceCents || 0), 0)
      console.log('Calculated from events:', totalCents, 'events:', data.usageEvents.length)
      console.log('First few events with costs:', data.usageEvents.filter(e => e.priceCents > 0).slice(0, 3))
    } 
    // If still no data, this might be the first run or no usage yet
    else {
      totalCents = 0
      console.log('No spending data found in response - items:', !!data.items, 'events:', !!data.usageEvents)
    }

    const totalDollars = totalCents / 100
    console.log('Setting session baseline to:', totalDollars)
    
    // Set up new session tracking
    setSessionBaseline(totalDollars)
    setCurrentSpending(0) // Session spending starts at 0
    setLastSpending(0)
    setLastCheck(new Date())
    setError(null)

    // Update recent events
    if (data.usageEvents) {
      const recentWithCost = data.usageEvents
        .filter(event => event.priceCents > 0)
        .slice(0, 10)
      setRecentEvents(recentWithCost)
    }

    // Save session baseline
    localStorage.setItem('cursor-monitor-session-baseline', totalDollars.toString())
    localStorage.setItem('cursor-monitor-session-spending', '0')

    // Add initial history entry (session spending = 0)
    const historyEntry = {
      time: new Date().toISOString(),
      amount: 0
    }
    
    setUsageHistory(prev => {
      const newHistory = [historyEntry] // Start fresh for new session
      localStorage.setItem('cursor-monitor-history', JSON.stringify(newHistory))
      return newHistory
    })

    // Record session start timestamp
    const nowTs = Date.now()
    setSessionStart(nowTs)
    localStorage.setItem('cursor-monitor-session-start', nowTs.toString())
  }, [fetchUsageData])

  // Initialize baseline when config is loaded but no session data exists
  useEffect(() => {
    if (config && isMonitoring && !baselineInitialized) {
      console.log('🆕 Monitoring started – initializing new session baseline')
      const init = async () => {
        await initializeBaseline()
        setBaselineInitialized(true)
      }
      init()
    }

    if (!isMonitoring) {
      setBaselineInitialized(false) // allow re-initialization next time
    }
  }, [config, isMonitoring, baselineInitialized, initializeBaseline])

  const checkUsage = useCallback(async () => {
    console.log('🔍 checkUsage called - fetching data...')
    const data = await fetchUsageData()
    if (!data) {
      console.log('❌ No data returned from fetchUsageData')
      return
    }

    console.log('Check usage data received:', data)
    console.log('data.items:', data.items)
    console.log('data.items length:', data.items?.length)
    console.log('data.items[0]:', data.items?.[0])
    console.log('data.usageEvents length:', data.usageEvents?.length)

    let totalCents = 0
    
    // Try to get total spending from items first (matches Python logic)
    if (data.items && data.items.length > 0) {
      totalCents = data.items[0].cents
      console.log('Using items total:', totalCents, 'from cents field:', data.items[0].cents)
    } 
    // If no items, try to calculate from usage events
    else if (data.usageEvents && data.usageEvents.length > 0) {
      totalCents = data.usageEvents.reduce((sum, event) => sum + (event.priceCents || 0), 0)
      console.log('Calculated from events:', totalCents, 'events:', data.usageEvents.length)
      console.log('First few events with costs:', data.usageEvents.filter(e => e.priceCents > 0).slice(0, 3))
    } 
    // If still no data, this might be the first run or no usage yet
    else {
      totalCents = 0
      console.log('No spending data found in response - items:', !!data.items, 'events:', !!data.usageEvents)
    }

    const totalDollars = totalCents / 100
    const sessionSpending = Math.max(0, totalDollars - sessionBaseline)
    console.log('Monthly total:', totalDollars, 'Session baseline:', sessionBaseline, 'Session spending:', sessionSpending)
    
    setCurrentSpending(sessionSpending)
    setLastCheck(new Date())
    setError(null)

    // Update recent events
    if (data.usageEvents) {
      const recentWithCost = data.usageEvents
        .filter(event => {
          if (event.priceCents <= 0) return false
          if (sessionStart) {
            return parseInt(event.timestamp) >= sessionStart
          }
          return true
        })
        .slice(0, 10)
      setRecentEvents(recentWithCost)
    }

    // Check for spending increase in this session
    console.log('💰 Checking for spending increase...')
    console.log('  Current session spending:', sessionSpending)
    console.log('  Last known spending:', lastSpending)
    console.log('  Configured threshold:', config!.threshold)
    console.log('  Configured cooldown (minutes):', config!.cooldown || 30)
    
    if (sessionSpending > lastSpending) {
      const increase = sessionSpending - lastSpending
      const nowTs = Date.now()
      const cooldownMs = (config!.cooldown || 30) * 60 * 1000
      const timeSinceLastNotify = nowTs - lastNotify
      
      console.log('📈 Spending increased!')
      console.log('  Increase amount:', increase)
      console.log('  Threshold required:', config!.threshold)
      console.log('  Increase meets threshold?', increase >= config!.threshold)
      console.log('  Time since last notify (ms):', timeSinceLastNotify)
      console.log('  Cooldown required (ms):', cooldownMs)
      console.log('  Cooldown period passed?', timeSinceLastNotify >= cooldownMs)
      
      if (increase >= config!.threshold && timeSinceLastNotify >= cooldownMs) {
        const message = `Session spending increased by $${increase.toFixed(2)} (Session total: $${sessionSpending.toFixed(2)})`
        console.log('🚨 Sending notification:', message)
        await sendNotification(message)
        setLastNotify(nowTs)
        localStorage.setItem('cursor-monitor-last-notify', nowTs.toString())
      } else {
        console.log('⏸️ Not sending notification - conditions not met')
      }
    } else {
      console.log('📊 No spending increase detected')
    }

    // Update history with session spending
    const historyEntry = {
      time: new Date().toISOString(),
      amount: sessionSpending
    }
    
    setUsageHistory(prev => {
      const newHistory = [...prev, historyEntry].slice(-100) // Keep last 100 entries
      localStorage.setItem('cursor-monitor-history', JSON.stringify(newHistory))
      return newHistory
    })

    // Save current session spending
    setLastSpending(sessionSpending)
    localStorage.setItem('cursor-monitor-session-spending', sessionSpending.toString())
    console.log('✅ checkUsage completed successfully')
  }, [fetchUsageData, lastSpending, sessionBaseline, config, sendNotification, lastNotify, sessionStart])

  // Start/stop monitoring
  useEffect(() => {
    if (!config || !isMonitoring) {
      console.log('⏸️ Monitoring not active - config:', !!config, 'isMonitoring:', isMonitoring)
      return
    }

    // Wait for baseline to be initialized before starting polling
    if (!baselineInitialized) {
      console.log('⏳ Waiting for baseline initialization before starting polling')
      return
    }

    // Polling interval follows the configured notification interval (in minutes)
    const pollMinutes = config.cooldown ?? 5
    const pollMs = pollMinutes * 60 * 1000
    console.log(`🔄 Setting up polling timer: checking every ${pollMinutes} minutes (${pollMs}ms)`)
    
    const interval = setInterval(() => {
      console.log(`⏰ Polling heartbeat - checking usage (every ${pollMinutes} minutes)`)
      checkUsage()
    }, pollMs)

    console.log('📊 Timer created with ID:', interval)

    // Initial check - but only after baseline is set
    console.log('🚀 Starting monitoring - performing initial check')
    checkUsage()

    return () => {
      console.log('🛑 Stopping monitoring timer with ID:', interval)
      clearInterval(interval)
    }
  }, [config, isMonitoring, checkUsage, baselineInitialized])

  const resetSetup = () => {
    localStorage.removeItem('cursor-monitor-config')
    localStorage.removeItem('cursor-monitor-setup')
    localStorage.removeItem('cursor-monitor-session-baseline')
    localStorage.removeItem('cursor-monitor-session-spending')
    localStorage.removeItem('cursor-monitor-history')
    localStorage.removeItem('cursor-monitor-last-notify')
    window.location.reload()
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  if (!config) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="app-title text-2xl font-bold text-white">
                Cursor Costs
              </h1>
              <p className="text-sm text-gray-500">
                {isMonitoring ? 'Monitoring active' : 'Monitoring paused'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-4 py-2 font-medium transition-colors ${
                'bg-light-grey text-white hover:bg-dark-grey'
              }`}
            >
              {isMonitoring ? 'Pause' : 'Start'} Monitoring
            </button>
            {isNotificationsSnoozed() ? (
              <button
                onClick={clearSnooze}
                className="px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
              >
                🔕 Snoozed ({Math.ceil((snoozeUntil! - Date.now()) / 60000)}m)
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => document.getElementById('snooze-menu')?.classList.toggle('hidden')}
                  className="px-4 py-2 bg-light-grey text-white hover:bg-dark-grey transition-colors"
                >
                  Snooze Notifications
                </button>
                <div id="snooze-menu" className="hidden absolute right-0 mt-2 w-48 bg-dark-grey border border-light-grey shadow-lg z-50">
                  <button
                    onClick={() => {
                      snoozeNotifications(15)
                      document.getElementById('snooze-menu')?.classList.add('hidden')
                    }}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-light-grey"
                  >
                    15 minutes
                  </button>
                  <button
                    onClick={() => {
                      snoozeNotifications(30)
                      document.getElementById('snooze-menu')?.classList.add('hidden')
                    }}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-light-grey"
                  >
                    30 minutes
                  </button>
                  <button
                    onClick={() => {
                      snoozeNotifications(60)
                      document.getElementById('snooze-menu')?.classList.add('hidden')
                    }}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-light-grey"
                  >
                    1 hour
                  </button>
                  <button
                    onClick={() => {
                      snoozeNotifications(120)
                      document.getElementById('snooze-menu')?.classList.add('hidden')
                    }}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-light-grey"
                  >
                    2 hours
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={resetSetup}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-grey shadow-lg p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Current Session Spending</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(currentSpending)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="bg-dark-grey shadow-lg p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Last Check</p>
                <p className="text-lg font-semibold text-white">
                  {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="bg-dark-grey shadow-lg p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">Status</p>
                <div className="flex items-center space-x-2">
                  {error ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-white" />
                      <span className="text-sm text-red-600">Error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span className="text-sm text-green-600">Active</span>
                    </>
                  )}
                </div>
              </div>
              <Bell className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-dark-grey border border-light-grey p-4 mb-6 relative z-10">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-white" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Usage Chart */}
        <div className="bg-dark-grey shadow-lg p-6 mb-8 relative z-10">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Spending History
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  labelFormatter={(time) => new Date(time).toLocaleString()}
                  formatter={(value) => [`$${value}`, 'Spending']}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  dot={{ fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-dark-grey shadow-lg p-6 relative z-10">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Recent Usage Events
          </h2>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-700 hover:bg-neutral-700 border border-neutral-600/40 transition-colors relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {event.details.toolCallComposer?.modelIntent || 'Unknown Model'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {new Date(parseInt(event.timestamp)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(event.priceCents / 100)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 