'use client'
import { AnimatePresence, motion } from 'framer-motion'
import Navigation from './components/Navigation.jsx'
import Hero from './components/Hero.jsx'
import RecordProducer from './components/RecordProducer.jsx'
import MidiBoard from './components/MidiBoard.jsx'
import TracksGallery from './components/TracksGallery.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useAppStore } from './store/useAppStore.js'
import { WarningCircle, X } from '@phosphor-icons/react'

export default function App() {
  const { settingsOpen, setSettingsOpen, error, clearError } = useAppStore()

  return (
    <div className="min-h-[100dvh] bg-zinc-950 relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-blue-600/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/3 rounded-full blur-[120px]" />
        <div className="grid-overlay absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10">
        <Navigation onSettingsClick={() => setSettingsOpen(true)} />
        <Hero />

        <main id="studio" className="relative">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-16 space-y-12">

            {/* Studio: Producer chat + MIDI board */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
              <RecordProducer />
              <MidiBoard />
            </div>

            {/* Tracks gallery */}
            <TracksGallery />
          </div>
        </main>

        <footer className="border-t border-zinc-800/40 mt-16 py-8">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-zinc-700 text-xs font-mono">Resonance Studio — AI Music Production</p>
            <p className="text-zinc-800 text-xs">Powered by Suno via kie.ai · Produced by Claude</p>
          </div>
        </footer>
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel-elevated rounded-2xl px-5 py-4 flex items-center gap-3 max-w-md w-[calc(100vw-2rem)]"
          >
            <WarningCircle size={20} className="text-red-400 shrink-0" weight="fill" />
            <span className="text-sm text-zinc-200 flex-1">{error}</span>
            <button onClick={clearError} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <X size={16} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
