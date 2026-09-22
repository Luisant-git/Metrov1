// Mobile app environment configuration (single source of truth for the API base URL).

export async function resolveApiBaseUrl() {
  return 'https://outside-release-polls-cal.trycloudflare.com';
}

export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.includes('localhost:3000')) {
    return url.replace(/http:\/\/localhost:3000/g, 'https://outside-release-polls-cal.trycloudflare.com');
  }
  return url;
}

export default resolveApiBaseUrl;
