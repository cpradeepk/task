/**
 * Lightweight unique-id generator.
 *
 * `crypto.randomUUID()` (used by the web app) is not available in the Hermes
 * JS engine, and no uuid dependency is installed. For release checklist manual
 * items / editor sections — where ids only need to be unique within a single
 * release state object — this is sufficient and dependency-free.
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
