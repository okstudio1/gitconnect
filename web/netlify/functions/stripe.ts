import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID
const SITE_URL = process.env.SITE_URL || 'https://gitconnect.pro'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const path = event.path.replace('/.netlify/functions/stripe', '').replace('/api/stripe', '')

  // POST /api/stripe/create-checkout - Create Stripe checkout session
  if (event.httpMethod === 'POST' && path === '/create-checkout') {
    if (!stripe) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe not configured: missing STRIPE_SECRET_KEY' })
      }
    }
    if (!STRIPE_PRICE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe not configured: missing STRIPE_PRICE_ID' })
      }
    }

    try {
      const body = JSON.parse(event.body || '{}')
      const { github_id, github_login, email } = body

      if (!github_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'GitHub ID required' })
        }
      }

      // Check if user already has a Stripe customer ID or active subscription
      let customerId: string | undefined
      if (supabase) {
        const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id, subscription_status')
          .eq('github_id', github_id)
          .single()

        if (user?.stripe_customer_id) {
          customerId = user.stripe_customer_id
        }

        // Prevent double subscriptions
        if (user?.subscription_status === 'pro' || user?.subscription_status === 'team') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Already subscribed',
              message: 'You already have an active subscription. Use the billing portal to manage it.'
            })
          }
        }
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICE_ID,
            quantity: 1
          }
        ],
        success_url: `${SITE_URL}?subscription=success`,
        cancel_url: `${SITE_URL}?subscription=cancelled`,
        customer: customerId,
        // Only pass email if customer doesn't exist AND email is valid
        ...(customerId ? {} : email ? { customer_email: email } : {}),
        metadata: {
          github_id,
          github_login
        },
        subscription_data: {
          metadata: {
            github_id,
            github_login
          }
        }
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: session.url })
      }

    } catch (error) {
      console.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create checkout session',
          details: errorMessage
        })
      }
    }
  }

  // POST /api/stripe/webhook - Handle Stripe webhooks
  if (event.httpMethod === 'POST' && path === '/webhook') {
    if (!stripe || !STRIPE_WEBHOOK_SECRET || !supabase) {
      console.error('Webhook not configured:', {
        hasStripe: !!stripe,
        hasWebhookSecret: !!STRIPE_WEBHOOK_SECRET,
        hasSupabase: !!supabase,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseServiceKey: !!SUPABASE_SERVICE_KEY
      })
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Webhook not configured',
          missing: {
            stripe: !stripe,
            webhookSecret: !STRIPE_WEBHOOK_SECRET,
            supabase: !supabase
          }
        })
      }
    }

    const sig = event.headers['stripe-signature']
    if (!sig) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing signature' })
      }
    }

    try {
      const stripeEvent = stripe.webhooks.constructEvent(
        event.body!,
        sig,
        STRIPE_WEBHOOK_SECRET
      )

      switch (stripeEvent.type) {
        case 'checkout.session.completed': {
          const session = stripeEvent.data.object as Stripe.Checkout.Session
          const githubId = session.metadata?.github_id
          console.log('Checkout completed for github_id:', githubId, 'customer:', session.customer)

          if (githubId && session.customer) {
            const { data, error } = await supabase
              .from('users')
              .update({
                stripe_customer_id: session.customer as string,
                subscription_status: 'pro'
              })
              .eq('github_id', githubId)
              .select()

            if (error) {
              console.error('Failed to update user subscription:', error)
            } else {
              console.log('Updated user subscription:', data)
            }

            // If no rows updated, the user might not exist yet - try upsert
            if (!data || data.length === 0) {
              console.log('No user found with github_id:', githubId, '- creating new record')
              const { error: upsertError } = await supabase
                .from('users')
                .upsert({
                  github_id: githubId,
                  stripe_customer_id: session.customer as string,
                  subscription_status: 'pro',
                  github_login: session.metadata?.github_login || 'unknown'
                }, { onConflict: 'github_id' })

              if (upsertError) {
                console.error('Failed to upsert user:', upsertError)
              }
            }
          }
          break
        }

        case 'customer.subscription.updated': {
          const subscription = stripeEvent.data.object as Stripe.Subscription
          const githubId = subscription.metadata?.github_id

          if (githubId) {
            const status = subscription.status === 'active' ? 'pro' : 'free'
            const endsAt = subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null

            await supabase
              .from('users')
              .update({
                subscription_status: status,
                subscription_ends_at: endsAt
              })
              .eq('github_id', githubId)
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = stripeEvent.data.object as Stripe.Subscription
          const githubId = subscription.metadata?.github_id

          if (githubId) {
            await supabase
              .from('users')
              .update({
                subscription_status: 'free',
                subscription_ends_at: null
              })
              .eq('github_id', githubId)
          }
          break
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true })
      }

    } catch (error) {
      console.error('Webhook error:', error)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Webhook signature verification failed' })
      }
    }
  }

  // GET /api/stripe/portal - Create customer portal session
  if (event.httpMethod === 'POST' && path === '/portal') {
    if (!stripe || !supabase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Stripe not configured' })
      }
    }

    try {
      const body = JSON.parse(event.body || '{}')
      const { github_id } = body

      if (!github_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'GitHub ID required' })
        }
      }

      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('github_id', github_id)
        .single()

      if (!user?.stripe_customer_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No subscription found' })
        }
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: SITE_URL
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: portalSession.url })
      }

    } catch (error) {
      console.error('Portal error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create portal session' })
      }
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  }
}
