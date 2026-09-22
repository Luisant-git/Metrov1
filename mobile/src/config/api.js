// Mobile app environment configuration (single source of truth for the API base URL).

export async function resolveApiBaseUrl() {
  return 'https://outside-release-polls-cal.trycloudflare.com';
}

export default resolveApiBaseUrl;
