import { defineConfig, configDefaults } from 'vitest/config'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // Load environment variables from .env file for tests
    env: loadEnv(mode || 'test', process.cwd(), ''),
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js'
      ]
    }
  },
  setupFiles: ['./src/test-setup.js']
}))
