/**
 * Minimal JWT payload decoder.
 * ----------------------------
 * The client only needs to *read* the (already-trusted) payload — the
 * server is the source of truth for signature verification. Avoiding the
 * `jwt-decode` dependency keeps the bundle small.
 */

export function decodeJwt(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(
      decodeURIComponent(
        Array.prototype.map
          .call(json, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  } catch (_) {
    return null;
  }
}

export function isTokenExpired(payload) {
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= payload.exp * 1000;
}
