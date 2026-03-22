import { create } from 'zustand'

export const useAppStore = create((set) => ({
  // Generation Parameters (shared between board + producer)
  genParams: {
    prompt: '',
    style: '',
    title: '',
    instrumental: true,
    genre: '',
    mood: '',
    energy: 5,
    tempo: 120,
    reverb: 30,
    warmth: 50,
    complexity: 50,
    scale: 'major',
  },
  setGenParams: (updates) =>
    set(state => ({ genParams: { ...state.genParams, ...updates } })),

  // Generation State
  isGenerating: false,
  generationProgress: [],
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationProgress: (clips) => set({ generationProgress: clips }),

  // Generated Tracks
  tracks: [],
  addTracks: (newTracks) =>
    set(state => ({
      tracks: [
        ...newTracks.map(t => ({ ...t, addedAt: Date.now() })),
        ...state.tracks,
      ],
    })),
  removeTrack: (id) =>
    set(state => ({ tracks: state.tracks.filter(t => t.id !== id) })),

  // UI
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  // Error
  error: null,
  setError: (err) => set({ error: err }),
  clearError: () => set({ error: null }),
}))
