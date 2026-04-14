export const extractHttpOnlyCookie = (name: 'access_token' | 'refresh_token', cookies: string | string[]): string => {
  let access_token: string = '';
  let getAccessToken: string = '';

  if (!cookies) return '';

  if (typeof cookies === 'string') {
    getAccessToken = cookies;
    if (getAccessToken) {
      const rawValue = getAccessToken.split(';')[0].split('=')[1];
      const decodedValue = decodeURIComponent(rawValue);
      access_token = decodedValue.startsWith('s:') ? decodedValue.substring(2) : decodedValue;
      return access_token;
    }
  } else if (Array.isArray(cookies)) {
    getAccessToken = cookies.find((cookie: string) => cookie.includes(`${name}=`)) ?? '';
    if (getAccessToken) {
      const rawValue = getAccessToken.split(';')[0].split('=')[1];
      const decodedValue = decodeURIComponent(rawValue);
      access_token = decodedValue.startsWith('s:') ? decodedValue.substring(2) : decodedValue;
      return access_token;
    }
  } else {
    return access_token;
  }
  throw new Error('access_token failed to extract');
};

export function extractSignedCookieToken(cookieValue: string): string {
  // Format: s:<jwt-token>.<express-hmac-signature>
  const lastDot = cookieValue.lastIndexOf('.');
  return cookieValue.substring(0, lastDot);
}
