import { useState, useEffect, useCallback } from 'react'
import { supabase, getUserSubscription, getOrCreateUser, type SubscriptionStatus } from '../lib/supabase'

interface UseSubscriptionOptions {
  githubUser: {
    id: number
    login: string
    email?: string | null
  } | null
}

export function useSubscription({ githubUser }: UseSubscriptionOptions) {
  const [status, setStatus] = useState<SubscriptionStatus>('free')
  const [isLoading, setIsLoading] = useState(false)

  // Sync user to Supabase and get subscription status
  useEffect(() => {
    if (!githubUser || !supabase) {
      setStatus('free')
      return
    }

    const syncUser = async () => {
      setIsLoading(true)
      try {
        // Create or get user in Supabase
        await getOrCreateUser(githubUser)
        
        // Get current subscription status
        const subStatus = await getUserSubscription(githubUser.id.toString())
        setStatus(subStatus)
      } catch (error) {
        console.error('Failed to sync user:', error)
        setStatus('free')
      } finally {
        setIsLoading(false)
      }
    }

    syncUser()
  }, [githubUser])

  // Check for subscription success/cancel from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const subscriptionResult = params.get('subscription')
    
    if (subscriptionResult === 'success') {
      // Refresh subscription status after successful checkout
      if (githubUser) {
        getUserSubscription(githubUser.id.toString()).then(setStatus)
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (subscriptionResult === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [githubUser])

  const startCheckout = useCallback(async () => {
    if (!githubUser) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_id: githubUser.id.toString(),
          github_login: githubUser.login,
          email: githubUser.email
        })
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [githubUser])

  const openPortal = useCallback(async () => {
    if (!githubUser) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_id: githubUser.id.toString()
        })
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [githubUser])

  return {
    status,
    isLoading,
    isPro: status === 'pro' || status === 'team',
    startCheckout,
    openPortal
  }
}
