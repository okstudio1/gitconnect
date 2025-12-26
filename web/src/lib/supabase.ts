import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase credentials not configured - subscription features disabled')
}

export const supabase = supabaseUrl && supabasePublishableKey 
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export type SubscriptionStatus = 'free' | 'pro' | 'team'

export interface UserProfile {
  id: string
  github_id: string
  github_login: string
  email: string | null
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  subscription_ends_at: string | null
  created_at: string
  updated_at: string
}

export async function getOrCreateUser(githubUser: {
  id: number
  login: string
  email?: string | null
}): Promise<UserProfile | null> {
  if (!supabase) return null

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('github_id', githubUser.id.toString())
    .single()

  if (existing) {
    return existing as UserProfile
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching user:', fetchError)
    return null
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      github_id: githubUser.id.toString(),
      github_login: githubUser.login,
      email: githubUser.email || null,
      subscription_status: 'free'
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating user:', insertError)
    return null
  }

  return newUser as UserProfile
}

export async function getUserSubscription(githubId: string): Promise<SubscriptionStatus> {
  if (!supabase) return 'free'

  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, subscription_ends_at')
    .eq('github_id', githubId)
    .single()

  if (error || !data) return 'free'

  if (data.subscription_ends_at) {
    const endsAt = new Date(data.subscription_ends_at)
    if (endsAt < new Date()) {
      return 'free'
    }
  }

  return data.subscription_status as SubscriptionStatus
}

export async function createCheckoutSession(githubId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_id: githubId })
    })

    const data = await response.json()
    return data.url || null
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return null
  }
}
