'use client'
import { useCallback, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  UploadSimple,
  FileAudio,
  X,
  MusicNote,
  Metronome,
  PianoKeys,
  Waveform,
  Clock,
  Hash,
} from '@phosphor-icons/react'
import { parseMidiFile, midiDataToPrompt, formatDuration } from '../lib/midiParser.js'
import { useAppStore } from '../store/useAppStore.js'

// --- Piano Roll Canvas Component ---
function PianoRollCanvas({ notes, duration }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !notes?.length) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, W, H)

    // Background grid lines (octave separators)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 8; i++) {
      const y = (i / 8) * H
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Time grid
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * W
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }

    const totalDuration = duration || Math.max(...notes.map(n => n.time + n.duration), 4)
    const minPitch = Math.max(0, Math.min(...notes.map(n => n.pitch)) - 2)
    const maxPitch = Math.min(127, Math.max(...notes.map(n => n.pitch)) + 2)
    const pitchRange = maxPitch - minPitch || 24

    notes.forEach(note => {
      const x = (note.time / totalDuration) * W
      const noteWidth = Math.max((note.duration / totalDuration) * W, 2)
      const y = H - ((note.pitch - minPitch) / pitchRange) * H
      const noteH = Math.max(H / pitchRange, 2)

      const alpha = 0.5 + note.velocity * 0.5
      const isBlack = [1, 3, 6, 8, 10].includes(note.pitch % 12)

      ctx.fillStyle = isBlack
        ? `rgba(147,197,253,${alpha})`
        : `rgba(59,130,246,${alpha})`
      ctx.beginPath()
      ctx.roundRect(x, y - noteH / 2, noteWidth, noteH, 1)
      ctx.fill()
    })
  }, [notes, duration])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

// --- Pitch Histogram ---
function PitchHistogram({ histogram }) {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return (
    <div className="flex items-end gap-0.5 h-10">
      {histogram.map((bar, i) => (
        <div
          key={bar.name}
          className="flex-1 flex flex-col items-center gap-0.5"
          title={`${bar.name}: ${bar.count} notes`}
        >
          <div
            className="w-full rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max(bar.value * 32, 2)}px`,
              background: bar.value > 0.5
                ? 'rgba(59,130,246,0.8)'
                : 'rgba(59,130,246,0.3)',
            }}
          />
          <span className="text-[8px] font-mono text-zinc-700">{bar.name.replace('#', '♯')}</span>
        </div>
      ))}
    </div>
  )
}

// --- Stat Chip ---
function StatChip({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
      <Icon size={14} className="text-zinc-500 shrink-0" weight="bold" />
      <div>
        <div className={`text-sm font-semibold text-zinc-100 leading-none ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
        <div className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider leading-none">
          {label}
        </div>
      </div>
    </div>
  )
}

// --- Main Component ---
export default function MidiWorkspace() {
  const { midiFile, midiData, setMidiFile, setMidiData, setGenParams, setError, clearMidi } =
    useAppStore()
  const [isParsing, setIsParsing] = useState(false)

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      setIsParsing(true)
      try {
        const data = await parseMidiFile(file)
        setMidiFile(file)
        setMidiData(data)
        // Auto-populate the prompt
        const prompt = midiDataToPrompt(data)
        setGenParams({ prompt, title: file.name.replace('.mid', '').replace('.midi', '') })
      } catch (err) {
        setError(`Failed to parse MIDI: ${err.message}`)
      } finally {
        setIsParsing(false)
      }
    },
    [setMidiFile, setMidiData, setGenParams, setError]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => accepted[0] && handleFile(accepted[0]),
    accept: { 'audio/midi': ['.mid', '.midi'], 'audio/x-midi': ['.mid', '.midi'] },
    multiple: false,
    noClick: !!midiData,
  })

  return (
    <div className="glass-panel rounded-[1.5rem] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileAudio size={14} className="text-blue-400" weight="bold" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">MIDI Analysis</span>
        </div>
        {midiData && (
          <button
            onClick={() => { clearMidi(); setGenParams({ prompt: '', title: '' }) }}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={12} weight="bold" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {!midiData ? (
            /* ---- Upload Zone ---- */
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 h-full min-h-[400px] flex flex-col"
            >
              <div
                {...getRootProps()}
                className={`flex-1 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 p-8 min-h-[340px] ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-500/8 scale-[0.99]'
                    : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30'
                }`}
              >
                <input {...getInputProps()} />

                {isParsing ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Waveform size={22} className="text-blue-400 animate-spin-slow" weight="bold" />
                    </div>
                    <div className="text-sm text-zinc-400">Analyzing MIDI structure...</div>
                    <div className="w-48 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full shimmer-bg animate-shimmer" style={{ width: '60%' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <motion.div
                      animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                        isDragActive
                          ? 'bg-blue-500/20 border border-blue-500/40'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      <UploadSimple
                        size={28}
                        className={isDragActive ? 'text-blue-400' : 'text-zinc-600'}
                        weight="bold"
                      />
                    </motion.div>

                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-300 mb-1">
                        {isDragActive ? 'Drop to analyze' : 'Drop your MIDI file here'}
                      </p>
                      <p className="text-xs text-zinc-600">
                        Supports .mid and .midi — click or drag
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-700">
                      <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">.mid</span>
                      <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">.midi</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            /* ---- MIDI Analysis ---- */
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 space-y-6"
            >
              {/* File name */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <FileAudio size={16} className="text-blue-400" weight="bold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-200 truncate">{midiFile?.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    {(midiFile?.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {/* Primary stats grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatChip icon={MusicNote} label="Key" value={`${midiData.key} ${midiData.scale}`} />
                <StatChip icon={Metronome} label="BPM" value={midiData.bpm} mono />
                <StatChip icon={Clock} label="Duration" value={formatDuration(midiData.duration)} mono />
                <StatChip icon={Hash} label="Notes" value={midiData.totalNotes.toLocaleString()} mono />
                <StatChip icon={PianoKeys} label="Tracks" value={midiData.trackCount} mono />
                <StatChip icon={Waveform} label="Density" value={`${midiData.noteDensity}/s`} mono />
              </div>

              {/* Time signature + complexity */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div>
                  <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">Time Signature</div>
                  <div className="text-2xl font-bold font-mono text-zinc-100 leading-none">
                    {midiData.timeSignature[0]}/{midiData.timeSignature[1]}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">Complexity</div>
                  <div className="text-2xl font-bold font-mono text-zinc-100 leading-none">
                    {midiData.complexity}
                    <span className="text-sm text-zinc-600">/100</span>
                  </div>
                </div>
                <div>
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#27272a" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="14" fill="none"
                        stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray={`${(midiData.complexity / 100) * 88} 88`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Piano Roll */}
              {midiData.visualNotes?.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-wider">Piano Roll</div>
                  <div className="h-24 rounded-xl overflow-hidden bg-zinc-950/80 border border-zinc-800/60">
                    <PianoRollCanvas
                      notes={midiData.visualNotes}
                      duration={midiData.duration}
                    />
                  </div>
                </div>
              )}

              {/* Pitch histogram */}
              {midiData.pitchHistogram && (
                <div>
                  <div className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-wider">Note Distribution</div>
                  <div className="px-3 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800/60">
                    <PitchHistogram histogram={midiData.pitchHistogram} />
                  </div>
                </div>
              )}

              {/* Instruments */}
              {midiData.instruments.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-zinc-600 mb-2.5 uppercase tracking-wider">Detected Instruments</div>
                  <div className="flex flex-wrap gap-1.5">
                    {midiData.instruments.map(inst => (
                      <span
                        key={inst}
                        className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
