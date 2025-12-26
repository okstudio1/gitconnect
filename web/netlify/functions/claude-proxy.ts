import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
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

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Anthropic API key not configured' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { github_id, messages, system, model, max_tokens } = body

    if (!github_id) {
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
        .select('id, subscription_status, subscription_ends_at')
        .eq('github_id', github_id)
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

      // Log usage for analytics (optional)
      await supabase.from('usage').insert({
        user_id: user.id,
        endpoint: 'claude',
        tokens_used: max_tokens || 2048
      })
    }

    // Proxy request to Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 2048,
        system: system,
        messages: messages
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Claude API error' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    }

  } catch (error) {
    console.error('Claude proxy error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
