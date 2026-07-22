import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/functions/evaluate-compliance/__tests__/**/*.test.ts'],
  },
});
