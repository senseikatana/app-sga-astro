// MOCKED INSFORGE CLIENT
export const insforge = {
  db: {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
      eq: () => ({ select: async () => ({ data: [], error: null }) })
    })
  }
};

export function getAdminClient() {
  return insforge;
}
