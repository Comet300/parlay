export interface ColorTheme {
  key: string
  label: string
  primary: string
  accent: string
  background: string
}

export const THEMES: ColorTheme[] = [
  { key: 'default',    label: 'Default',    primary: '#0EA5E9', accent: '#F97316', background: '#FFFFFF' },
  { key: 'ocean',      label: 'Ocean',      primary: '#0891b2', accent: '#0ea5e9', background: '#f0f9ff' },
  { key: 'ember',      label: 'Ember',      primary: '#ea580c', accent: '#dc2626', background: '#1c1917' },
  { key: 'forest',     label: 'Forest',     primary: '#16a34a', accent: '#059669', background: '#fefce8' },
  { key: 'midnight',   label: 'Midnight',   primary: '#7c3aed', accent: '#6366f1', background: '#0f172a' },
  { key: 'rose',       label: 'Rose',       primary: '#e11d48', accent: '#f43f5e', background: '#fff1f2' },
  { key: 'monochrome', label: 'Monochrome', primary: '#374151', accent: '#6b7280', background: '#f9fafb' },
]

export function findThemeByKey(key: string | undefined | null): ColorTheme | undefined {
  if (!key) return undefined
  return THEMES.find((t) => t.key === key)
}
