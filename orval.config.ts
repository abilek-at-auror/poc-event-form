import { defineConfig } from 'orval';

export default defineConfig({
  'events-api': {
    input: './specs/events-api.yaml',
    output: {
      mode: 'split',
      target: './src/generated/events',
      client: 'react-query',
      mock: true,
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'apiClient',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
  'events-api-zod': {
    input: './specs/events-api.yaml',
    output: {
      mode: 'single',
      target: './src/generated/zod-schemas.ts',
      client: 'zod',
    },
  },
});
