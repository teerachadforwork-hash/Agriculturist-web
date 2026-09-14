// ══════════════════════════════════════════════════
// Auth — Real LINE Login (OAuth 2.0 / OpenID Connect)
// ══════════════════════════════════════════════════

const AUTH_KEY = 'agriculturist_auth';

export function isAuthenticated() {
  return getUser() !== null;
}

export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * Initiates the LINE Login OAuth 2.0 flow
 */
export function initiateLineLogin() {
  // We use import.meta.env since we are in Vite
  const clientId = import.meta.env.VITE_LINE_CHANNEL_ID;
  const redirectUri = import.meta.env.VITE_LINE_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    loginWithProfile({
      userId: 'demo-farmer-001',
      displayName: 'เกษตรกรทดลอง',
      pictureUrl: '',
      statusMessage: 'Demo mode',
    });
    window.location.hash = '#/dashboard';
    return;
  }
  
  // Create a random state and store it in sessionStorage to mitigate CSRF attacks
  const state = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('line_oauth_state', state);

  // Build the authorization URL
  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
  
  // Redirect the browser to the LINE Login page
  window.location.href = authUrl;
}

/**
 * Saves the user profile fetched from the callback
 */
export function loginWithProfile(profile) {
  const user = {
    id: profile.userId,
    lineUserId: profile.userId,
    lineDisplayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
    role: 'farmer',
    loginAt: new Date().toISOString(),
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}
