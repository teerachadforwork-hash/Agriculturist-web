const AUTH_KEY = 'agriculturist_auth';
const TOKEN_KEY = 'agriculturist_token';

export function isAuthenticated() {
  return getUser() !== null && getToken() !== null;
}

export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

export function initiateLineLogin() {
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  if (!baseUrl.startsWith('http')) {
    baseUrl = 'https://' + baseUrl;
  }

  window.location.href = `${baseUrl}/api/auth/line/start`;
}

export function loginWithToken(token, user) {
  if (!token || !user) {
    throw new Error('Invalid authentication data');
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));

  return user;
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('line_oauth_state');
}