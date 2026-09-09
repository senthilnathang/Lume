import crypto from 'crypto';

const PROVIDERS = {
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    profileUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scope: 'read:user user:email',
  },
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    emailUrl: null,
    scope: 'openid email profile',
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    profileUrl: 'https://graph.microsoft.com/oidc/userinfo',
    emailUrl: null,
    scope: 'openid email profile',
  },
};

function providerEnv(name) {
  const prefix = `OAUTH_${name.toUpperCase()}_`;
  return {
    clientId: process.env[`${prefix}CLIENT_ID`] || '',
    clientSecret: process.env[`${prefix}CLIENT_SECRET`] || '',
    redirectUri: process.env[`${prefix}REDIRECT_URI`] || '',
  };
}

export function isProviderConfigured(name) {
  const config = providerEnv(name);
  return Boolean(PROVIDERS[name] && config.clientId && config.clientSecret && config.redirectUri);
}

export function configuredProviders() {
  return Object.keys(PROVIDERS).filter(isProviderConfigured);
}

export function buildAuthorizeUrl(name, state, fetchImpl = null) {
  void fetchImpl;
  if (!PROVIDERS[name]) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  const config = providerEnv(name);
  if (!config.clientId || !config.redirectUri) {
    throw new Error(`OAuth provider not configured: ${name}`);
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: PROVIDERS[name].scope,
    state,
  });
  return `${PROVIDERS[name].authorizeUrl}?${params.toString()}`;
}

export function newState() {
  return crypto.randomBytes(16).toString('hex');
}

async function postForm(url, params, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status})`);
  }
  return res.json();
}

export async function exchangeCode(name, code, fetchImpl = fetch) {
  if (!PROVIDERS[name]) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  const config = providerEnv(name);
  const data = await postForm(PROVIDERS[name].tokenUrl, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code,
  }, fetchImpl);
  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
  }
  if (!data.access_token) {
    throw new Error('Token exchange returned no access token');
  }
  return data.access_token;
}

export async function fetchProfile(name, accessToken, fetchImpl = fetch) {
  if (!PROVIDERS[name]) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  const res = await fetchImpl(PROVIDERS[name].profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Profile fetch failed (${res.status})`);
  }
  const profile = await res.json();
  if (name === 'github' && !profile.email && PROVIDERS.github.emailUrl) {
    const emails = await fetchImpl(PROVIDERS.github.emailUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }).then((r) => (r.ok ? r.json() : []));
    const primary = (Array.isArray(emails) ? emails : []).find((e) => e.primary) || {};
    profile.email = primary.email || profile.email;
  }
  const email = profile.email || profile.preferred_username || null;
  if (!email) {
    throw new Error('OAuth profile has no email address');
  }
  return {
    email,
    firstName: profile.given_name || profile.name?.split(' ')?.[0] || profile.login || 'OAuth',
    lastName: profile.family_name || profile.name?.split(' ')?.slice(1)?.join(' ') || 'User',
    avatar: profile.picture || profile.avatar_url || null,
    providerId: String(profile.id || profile.sub || ''),
  };
}

export default { isProviderConfigured, configuredProviders, buildAuthorizeUrl, newState, exchangeCode, fetchProfile };
