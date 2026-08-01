import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.PUBLIC_INSFORGE_URL,
  anonKey: import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
});

// Server-side admin client (for privileged operations)
export function getAdminClient() {
  const { createAdminClient } = require('@insforge/sdk');
  return createAdminClient({
    baseUrl: import.meta.env.INSFORGE_URL || import.meta.env.PUBLIC_INSFORGE_URL,
    apiKey: import.meta.env.INSFORGE_API_KEY,
  });
}
