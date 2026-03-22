'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkle,
  Lightning,
  MusicNotes,
  Microphone,
  Guitar,
  SpeakerHigh,
  ArrowsClockwise,
  CheckCircle,
  Circle,
} from '@phosphor-icons/react'
import { useAppStore } from '../store/useAppStore.js'
import { midiDataToPrompt } from '../lib/midiParser.js'
import { generateMusic, pollUntilComplete } from '../lib/sunoApi.js'

const GENRES = [
  { label: 'Classical', icon: MusicNotes },
  { label: 'Jazz', icon: Guitar },
  { label: 'Electronic', icon: SpeakerHigh },
  { label: 'Rock', icon: Guitar },
  { label: 'Cinematic', icon: Sparkle },
  { label: 'Ambient', icon: Microphone },
  { label: 'Lo-Fi', icon: Microphone },
  { label: 'Folk', icon: Guitar },
]

const MOODS = [
  'Uplifting', 'Melancholic', 'Tense', 'Serene',
  'Dramatic', 'Playful', 'Mysterious', 'Epic',
]

function EnergySlider({ value, onChange }) {
  const ticks = ['Gentle', 'Calm', 'Balanced', 'Energetic', 'Intense']
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Energy</label>
        <span className="text-xs font-mono text-blue-400 font-semibold">{ticks[value - 1]}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={1}
          max={5}
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${(value - 1) * 25}%, #27272a ${(value - 1) * 25}%)`,
          }}
        />
        <div className="flex justify-between mt-2">
          {ticks.map((tick, i) => (
            <span
              key={tick}
              className={`text-[9px] font-mono ${
                i + 1 === value ? 'text-blue-400' : 'text-zinc-700'
              }`}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function GeneratingState({ progress }) {
  const generating = progress.filter(c => c.status !== 'complete' && c.status !== 'error')
  const done = progress.filter(c => c.status === 'complete')
  const errored = progress.filter(c => c.status === 'error')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Generating music…</span>
        <span className="text-xs font-mono text-zinc-500">
          {done.length}/{progress.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          animate={{ width: `${(done.length / Math.max(progress.length, 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Clip status list */}
      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((clip, i) => (
            <div key={clip.id || i} className="flex items-center gap-3 text-xs">
              {clip.status === 'SUCCESS' ? (
                <CheckCircle size={14} className="text-emerald-400 shrink-0" weight="fill" />
              ) : clip.status?.includes('FAILED') || clip.status?.includes('ERROR') || clip.status?.includes('EXCEPTION') ? (
                <Circle size={14} className="text-red-400 shrink-0" weight="fill" />
              ) : (
                <ArrowsClockwise size={14} className="text-blue-400 shrink-0 animate-spin" weight="bold" />
              )}
              <span className="text-zinc-500 font-mono">
                Track {i + 1}
                {clip.title && ` — ${clip.title}`}
              </span>
              <span className={`ml-auto font-mono ${
                clip.status === 'SUCCESS' ? 'text-emerald-400' :
                clip.status?.includes('FAILED') || clip.status?.includes('ERROR') || clip.status?.includes('EXCEPTION') ? 'text-red-400' :
                'text-zinc-600'
              }`}>
                {clip.status === 'PENDING' ? 'queued' :
                 clip.status === 'TEXT_SUCCESS' ? 'lyrics ready' :
                 clip.status === 'FIRST_SUCCESS' ? 'rendering…' :
                 clip.status === 'SUCCESS' ? 'done' :
                 clip.status?.includes('FAILED') ? 'failed' :
                 clip.status || 'processing'}
              </span>
            </div>
          ))}
        </div>
      )}

      {!progress.length && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full waveform-bar"
                style={{
                  '--delay': `${0.8 + i * 0.12}s`,
                  height: '32px',
                }}
              />
            ))}
          </div>
          <span className="text-sm text-zinc-500">Connecting to Suno…</span>
        </div>
      )}
    </div>
  )
}

export default function GenerationPanel() {
  const {
    midiData,
    genParams,
    setGenParams,
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,
    addTracks,
    setError,
  } = useAppStore()

  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)

  const regeneratePrompt = useCallback(() => {
    if (!midiData) return
    const prompt = midiDataToPrompt(midiData, {
      genre: selectedGenre?.toLowerCase(),
      style: selectedMood ? `${selectedMood} style.` : '',
    })
    setGenParams({ prompt })
  }, [midiData, selectedGenre, selectedMood, setGenParams])

  const handleGenerate = useCallback(async () => {
    if (!genParams.prompt.trim()) {
      setError('Please write a prompt or upload a MIDI file first.')
      return
    }
    setIsGenerating(true)
    setGenerationProgress([])

    try {
      const styleTag = [selectedGenre, selectedMood, genParams.style]
        .filter(Boolean)
        .join(', ')

      // Step 1: Submit generation — returns a taskId string
      const taskId = await generateMusic({
        prompt: genParams.prompt,
        style: styleTag,
        title: genParams.title || 'Resonance Composition',
        instrumental: genParams.instrumental,
      })

      // Step 2: Poll until SUCCESS
      const tracks = await pollUntilComplete(
        taskId,
        (taskData) => setGenerationProgress([{
          id: taskId,
          status: taskData.status,
          title: genParams.title || 'Resonance Composition',
        }]),
        { maxWait: 180000, interval: 5000 }
      )

      if (tracks.length > 0) {
        addTracks(tracks)
        setGenerationProgress([])
      } else {
        setError('Generation completed but no audio was returned.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [genParams, selectedGenre, selectedMood, setIsGenerating, setGenerationProgress, addTracks, setError])

  return (
    <div className="glass-panel rounded-[1.5rem] flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Sparkle size={14} className="text-blue-400" weight="fill" />
        </div>
        <span className="text-sm font-semibold text-zinc-100">Generation Controls</span>
        {!midiData && (
          <span className="ml-auto text-[10px] font-mono text-zinc-600 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            Upload MIDI for auto-prompt
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-7">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GeneratingState progress={generationProgress} />
            </motion.div>
          ) : (
            <motion.div
              key="controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-7"
            >
              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    Prompt
                  </label>
                  {midiData && (
                    <button
                      onClick={regeneratePrompt}
                      className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-blue-400 transition-colors font-mono"
                    >
                      <ArrowsClockwise size={10} weight="bold" />
                      Regenerate
                    </button>
                  )}
                </div>
                <textarea
                  value={genParams.prompt}
                  onChange={e => setGenParams({ prompt: e.target.value })}
                  rows={4}
                  placeholder="Describe the music you want to generate… e.g. 'Upbeat jazz composition in D major, 120 BPM, featuring piano and double bass'"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 resize-none focus:outline-none focus:border-blue-500/50 transition-colors leading-relaxed"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-700">
                    {genParams.prompt.length} chars
                  </span>
                  {midiData && (
                    <span className="text-[10px] font-mono text-emerald-600">
                      Auto-generated from MIDI
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                  Track Title
                </label>
                <input
                  type="text"
                  value={genParams.title}
                  onChange={e => setGenParams({ title: e.target.value })}
                  placeholder="My Composition"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Genre */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                  Genre
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GENRES.map(genre => (
                    <button
                      key={genre.label}
                      onClick={() => setSelectedGenre(g => g === genre.label ? null : genre.label)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                        selectedGenre === genre.label
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                  Mood
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map(mood => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(m => m === mood ? null : mood)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                        selectedMood === mood
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <EnergySlider
                value={genParams.energy}
                onChange={v => setGenParams({ energy: v })}
              />

              {/* Style tags */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                  Additional Style Tags
                </label>
                <input
                  type="text"
                  value={genParams.style}
                  onChange={e => setGenParams({ style: e.target.value })}
                  placeholder="e.g. strings, reverb, cinematic, 4/4"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                />
              </div>

              {/* Instrumental toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div>
                  <div className="text-sm font-medium text-zinc-200">Instrumental only</div>
                  <div className="text-xs text-zinc-600 mt-0.5">Generate without vocals</div>
                </div>
                <button
                  onClick={() => setGenParams({ instrumental: !genParams.instrumental })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    genParams.instrumental ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      genParams.instrumental ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Button */}
      <div className="p-6 pt-0">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !genParams.prompt.trim()}
          className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            isGenerating || !genParams.prompt.trim()
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 text-white shadow-glow-blue active:scale-[0.98]'
          }`}
        >
          {isGenerating ? (
            <>
              <ArrowsClockwise size={18} weight="bold" className="animate-spin" />
              Generating with Suno…
            </>
          ) : (
            <>
              <Lightning size={18} weight="fill" />
              Generate Music
            </>
          )}
        </button>
      </div>
    </div>
  )
}
