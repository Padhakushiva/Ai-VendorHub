const REDIRECT_KEY = 'vendorhub_post_auth_redirect';
const PRODUCT_APP_URL = import.meta.env.VITE_PRODUCT_APP_URL || 'http://localhost:5174';
const SELLER_DASHBOARD_URL = import.meta.env.VITE_SELLER_DASHBOARD_URL || `${PRODUCT_APP_URL}/seller-dashboard`;
const ADMIN_DASHBOARD_URL = import.meta.env.VITE_ADMIN_DASHBOARD_URL || `${PRODUCT_APP_URL}/admin-dashboard`;

const getRole = (accountOrRole) => {
  const role = typeof accountOrRole === 'string' ? accountOrRole : accountOrRole?.role;
  return String(role || 'user').toLowerCase();
};

const isSellerRole = (accountOrRole) => {
  const role = getRole(accountOrRole);
  return role === 'seller' || role === 'merchant';
};

const getAllowedOrigins = () => {
  const origins = new Set([window.location.origin]);

  [PRODUCT_APP_URL, SELLER_DASHBOARD_URL, ADMIN_DASHBOARD_URL].forEach((url) => {
    try {
      origins.add(new URL(url, window.location.origin).origin);
    } catch {
      // Ignore invalid env values so auth pages still work.
    }
  });

  return [...origins];
};

export const getRedirectFromSearch = (search) => {
  const params = new URLSearchParams(search);
  const redirect = params.get('redirect');
  if (!redirect) return '';

  try {
    const url = new URL(redirect, window.location.origin);
    return getAllowedOrigins().includes(url.origin) ? url.toString() : '';
  } catch {
    return '';
  }
};

export const rememberRedirect = (redirectUrl) => {
  if (redirectUrl) {
    window.sessionStorage.setItem(REDIRECT_KEY, redirectUrl);
  }
};

export const consumeRedirect = () => {
  const redirect = window.sessionStorage.getItem(REDIRECT_KEY);
  window.sessionStorage.removeItem(REDIRECT_KEY);
  return redirect || '';
};

export const getDefaultPostAuthUrl = (accountOrRole) => {
  const role = getRole(accountOrRole);
  if (role === 'admin') return ADMIN_DASHBOARD_URL;
  return isSellerRole(accountOrRole) ? SELLER_DASHBOARD_URL : PRODUCT_APP_URL;
};

export const goToUrl = (navigate, targetUrl) => {
  const url = new URL(targetUrl, window.location.origin);

  if (url.origin === window.location.origin) {
    navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true });
    return;
  }

  window.location.replace(url.toString());
};

const appendAccessToken = (targetUrl, accessToken) => {
  const url = new URL(targetUrl, window.location.origin);
  if (accessToken) {
    url.searchParams.set('accessToken', accessToken);
  }
  return url.toString();
};

export const goAfterAuth = (navigate, accountOrRole = 'user', accessToken = '') => {
  const rememberedRedirect = consumeRedirect();
  const targetUrl = rememberedRedirect || getDefaultPostAuthUrl(accountOrRole);
  goToUrl(navigate, appendAccessToken(targetUrl, accessToken));
};
