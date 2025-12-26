import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  if (!DEEPGRAM_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Deepgram API key not configured' })
    }
  }

  try {
    // Get GitHub ID from request to verify subscription
    const body = JSON.parse(event.body || '{}')
    const githubId = body.github_id

    if (!githubId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      }
    }

    // Check subscription status
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('subscription_status, subscription_ends_at')
        .eq('github_id', githubId)
        .single()

      if (error || !user) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        }
      }

      const isSubscribed = user.subscription_status === 'pro' || user.subscription_status === 'team'
      const isActive = !user.subscription_ends_at || new Date(user.subscription_ends_at) > new Date()

      if (!isSubscribed || !isActive) {
        return {
          statusCode: 402,
          headers,
          body: JSON.stringify({ 
            error: 'Subscription required',
            message: 'Upgrade to Pro to use managed API keys'
          })
        }
      }
    }

    // Return connection info for WebSocket (client will connect directly)
    // For Deepgram, we return a temporary token or connection URL
    // Note: Deepgram WebSocket needs to be handled differently - 
    // we provide a signed URL or the client uses our key via the proxy
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        apiKey: DEEPGRAM_API_KEY,
        message: 'Use this key for WebSocket connection'
      })
    }

  } catch (error) {
    console.error('Deepgram proxy error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
