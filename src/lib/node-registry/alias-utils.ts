import type { NodeTypeName } from './types'

/**
 * Regex for valid alias values: lowercase alphanumeric segments separated
 * by single hyphens, no leading/trailing hyphens, no consecutive hyphens.
 */
export const ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Maximum allowed length of an alias, in characters. */
export const ALIAS_MAX_LENGTH = 60

/**
 * Node types that may carry an alias. Containers (page, page_group, group)
 * and anchors (start, end) are excluded — they do not produce values
 * consumable by formula expressions.
 */
export const ALIAS_TYPES: ReadonlySet<NodeTypeName> = new Set<NodeTypeName>([
  'card',
  'likert',
  'single_choice',
  'multi_choice',
  'email_collection',
  'scripted_llm',
  'real_llm',
])

/**
 * Returns true iff `alias` is a valid non-empty alias:
 * matches ALIAS_PATTERN and length ≤ ALIAS_MAX_LENGTH.
 * Empty strings are NOT considered valid here — callers that accept
 * empty as a legal "no alias" state must check that separately.
 */
export function isValidAlias(alias: string): boolean {
  if (!alias) return false
  if (alias.length > ALIAS_MAX_LENGTH) return false
  return ALIAS_PATTERN.test(alias)
}

/**
 * Transform a label into an alias: lowercase, strip non-alphanumeric
 * (except hyphens), replace spaces with hyphens, collapse consecutive
 * hyphens, trim, truncate to ALIAS_MAX_LENGTH.
 */
export function toAlias(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, ALIAS_MAX_LENGTH)
}
