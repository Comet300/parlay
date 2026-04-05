import { create } from 'zustand'

interface BuilderState {
  // Builder state will be added during builder-canvas implementation
}

export const useBuilderStore = create<BuilderState>()(() => ({}))
