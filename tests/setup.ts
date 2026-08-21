/**
 * Phase 3 Vitest setup.
 *
 * Wave 0 stubs (this plan) only validate pure functions and React Email's
 * Node-side render(). No DOM assertion library is wired in here; downstream
 * plans can add `@testing-library/jest-dom/vitest` import + matchers if they
 * need browser-style assertions.
 */
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})
