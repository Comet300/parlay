import { create } from 'zustand'

interface BuilderState {
  facetId: string | null
  flowDefinition: unknown | null
  colorScheme: unknown | null
  isDirty: boolean
  initializeFromServer: (
    facetId: string,
    flowDefinition: unknown,
    colorScheme: unknown,
  ) => void
  setFlowDefinition: (flowDefinition: unknown) => void
  setColorScheme: (colorScheme: unknown) => void
  markClean: () => void
}

export const useBuilderStore = create<BuilderState>()((set) => ({
  facetId: null,
  flowDefinition: null,
  colorScheme: null,
  isDirty: false,
  initializeFromServer: (facetId, flowDefinition, colorScheme) =>
    set({ facetId, flowDefinition, colorScheme, isDirty: false }),
  setFlowDefinition: (flowDefinition) =>
    set({ flowDefinition, isDirty: true }),
  setColorScheme: (colorScheme) =>
    set({ colorScheme, isDirty: true }),
  markClean: () => set({ isDirty: false }),
}))
