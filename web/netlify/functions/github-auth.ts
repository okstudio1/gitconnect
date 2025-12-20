import type { Handler } from '@netlify/functions'

// GitHub App credentials (not OAuth App)
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET!

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const path = event.path.replace('/.netlify/functions/github-auth', '').replace('/api/github-auth', '')

  // GET /api/github-auth/login - Returns GitHub App OAuth URL
  // GitHub Apps use the same OAuth flow but with different scopes/permissions
  if (event.httpMethod === 'GET' && path === '/login') {
    const state = Math.random().toString(36).substring(7)
    const redirectUri = `${process.env.SITE_URL || 'http://localhost:8888'}/api/github-auth/callback`
    
    // GitHub App OAuth flow - user authorizes the app
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_APP_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: authUrl, state })
    }
  }

  // GET /api/github-auth/callback - Exchange code for user access token
  if (event.httpMethod === 'GET' && path === '/callback') {
    const code = event.queryStringParameters?.code
    const error = event.queryStringParameters?.error

    if (error) {
      return {
        statusCode: 302,
        headers: { Location: '/?error=' + encodeURIComponent(error) },
        body: ''
      }
    }

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing code parameter' })
      }
    }

    try {
      // Exchange code for user access token (GitHub App flow)
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_APP_CLIENT_ID,
          client_secret: GITHUB_APP_CLIENT_SECRET,
          code
        })
      })

      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        return {
          statusCode: 302,
          headers: { Location: '/?error=' + encodeURIComponent(tokenData.error_description || tokenData.error) },
          body: ''
        }
      }

      // GitHub App tokens can be refreshed - store refresh token if provided
      const params = new URLSearchParams()
      params.set('token', tokenData.access_token)
      if (tokenData.refresh_token) {
        params.set('refresh_token', tokenData.refresh_token)
      }
      if (tokenData.expires_in) {
        params.set('expires_in', tokenData.expires_in.toString())
      }

      return {
        statusCode: 302,
        headers: { Location: `/?${params.toString()}` },
        body: ''
      }
    } catch (err) {
      console.error('Token exchange error:', err)
      return {
        statusCode: 302,
        headers: { Location: '/?error=token_exchange_failed' },
        body: ''
      }
    }
  }

  // POST /api/github-auth/refresh - Refresh an expired token
  if (event.httpMethod === 'POST' && path === '/refresh') {
    try {
      const body = JSON.parse(event.body || '{}')
      const refreshToken = body.refresh_token

      if (!refreshToken) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing refresh_token' })
        }
      }

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_APP_CLIENT_ID,
          client_secret: GITHUB_APP_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })

      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: tokenData.error_description || tokenData.error })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in
        })
      }
    } catch (err) {
      console.error('Token refresh error:', err)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token refresh failed' })
      }
    }
  }

  // POST /api/github-auth/logout - Just returns success (token is client-side)
  if (event.httpMethod === 'POST' && path === '/logout') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  }
}
