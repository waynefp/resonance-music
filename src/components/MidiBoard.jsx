'use client'
import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightning, ArrowsClockwise } from '@phosphor-icons/react'
import { useAppStore } from '../store/useAppStore.js'
import { generateMusic, pollUntilComplete } from '../lib/sunoApi.js'

// ── Helpers ──────────────────────────────────────────────

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  if (Math.abs(endDeg - startDeg) < 0.5) return ''
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

// ── Rotary Knob ───────────────────────────────────────────

const Knob = memo(function Knob({ label, value, min, max, onChange, unit = '', step = 1, size = 64, color = '#3b82f6' }) {
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(value)
  const [active, setActive] = useState(false)

  const normalized = (value - min) / (max - min)
  const angleDeg = -135 + normalized * 270
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const knobR = size * 0.30
  const indicR = size * 0.21
  const trackStart = -135
  const trackEnd = 135

  const onMouseDown = useCallback((e) => {
    isDragging.current = true
    startY.current = e.clientY
    startVal.current = value
    setActive(true)
    document.body.style.cursor = 'ns-resize'
    e.preventDefault()
  }, [value])

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return
      const dy = startY.current - e.clientY
      const delta = (dy / 120) * (max - min)
      const next = Math.max(min, Math.min(max, startVal.current + delta))
      onChange(Math.round(next / step) * step)
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setActive(false)
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [min, max, onChange, step])

  const indicator = polarToCartesian(cx, cy, indicR, angleDeg)

  // Value display
  const displayValue = unit === 'BPM' ? `${value}` : unit === '%' ? `${value}` : `${value}`

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={onMouseDown}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track background arc */}
          <path
            d={arcPath(cx, cy, outerR, trackStart, trackEnd)}
            fill="none"
            stroke="#27272a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {normalized > 0.01 && (
            <path
              d={arcPath(cx, cy, outerR, trackStart, angleDeg)}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={active ? 1 : 0.85}
            />
          )}
          {/* Glow ring when active */}
          {active && normalized > 0.01 && (
            <path
              d={arcPath(cx, cy, outerR, trackStart, angleDeg)}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              opacity={0.15}
            />
          )}
          {/* Tick marks */}
          {[-135, -90, -45, 0, 45, 90, 135].map((tickAngle, i) => {
            const inner = polarToCartesian(cx, cy, outerR - 5, tickAngle)
            const outer2 = polarToCartesian(cx, cy, outerR - 2, tickAngle)
            return (
              <line
                key={i}
                x1={inner.x} y1={inner.y}
                x2={outer2.x} y2={outer2.y}
                stroke="#3f3f46"
                strokeWidth="1"
              />
            )
          })}
          {/* Knob body */}
          <circle
            cx={cx} cy={cy} r={knobR}
            fill="url(#knobGrad)"
            stroke={active ? color : '#3f3f46'}
            strokeWidth="1"
          />
          {/* Indicator dot */}
          <circle
            cx={indicator.x}
            cy={indicator.y}
            r={size * 0.055}
            fill={active ? color : '#e4e4e7'}
          />
          <defs>
            <radialGradient id="knobGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#18181b" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      {/* Label and value */}
      <div className="text-center">
        <div className={`text-xs font-mono tabular-nums transition-colors ${active ? 'text-blue-400' : 'text-zinc-200'}`}>
          {displayValue}
          {unit && unit !== 'BPM' && <span className="text-zinc-600 text-[10px]">{unit}</span>}
          {unit === 'BPM' && <span className="text-zinc-600 text-[9px] ml-0.5">BPM</span>}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mt-0.5">{label}</div>
      </div>
    </div>
  )
})

// ── Toggle Switch ─────────────────────────────────────────

function ToggleSwitch({ label, value, onChange, labelOff, labelOn }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-center leading-tight">
        {labelOff}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-7 h-12 rounded-full border transition-all duration-200 ${
          value
            ? 'bg-blue-500/20 border-blue-500/50 shadow-glow-blue-sm'
            : 'bg-zinc-900 border-zinc-700'
        }`}
      >
        <motion.div
          animate={{ y: value ? 12 : -12 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${
            value ? 'bg-blue-400' : 'bg-zinc-500'
          }`}
        />
      </button>
      <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-center leading-tight">
        {labelOn}
      </div>
    </div>
  )
}

// ── LED Button ────────────────────────────────────────────

function LedButton({ label, active, onClick, color = 'blue' }) {
  const colors = {
    blue: {
      active: 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.25)]',
      inactive: 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400',
    },
    amber: {
      active: 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
      inactive: 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400',
    },
  }
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className={`px-2.5 py-2 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-all duration-150 ${
        active ? colors[color].active : colors[color].inactive
      }`}
    >
      <span className={`inline-block w-1 h-1 rounded-full mr-1.5 transition-colors ${
        active ? (color === 'blue' ? 'bg-blue-400' : 'bg-amber-400') : 'bg-zinc-700'
      }`} />
      {label}
    </motion.button>
  )
}

// ── VU Meter ──────────────────────────────────────────────

const VuMeter = memo(function VuMeter({ active }) {
  const bars = [0.3, 0.5, 0.8, 1.0, 0.9, 0.6, 0.4, 0.7, 0.9, 0.5]
  return (
    <div className="flex items-end gap-[2px] h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all ${
            active
              ? i < 7 ? 'bg-emerald-500' : i < 9 ? 'bg-amber-400' : 'bg-red-500'
              : 'bg-zinc-800'
          } waveform-bar`}
          style={{
            height: active ? `${h * 32}px` : '4px',
            '--delay': `${0.6 + i * 0.09}s`,
            animationDelay: `${i * 0.08}s`,
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  )
})

// ── Panel Label ───────────────────────────────────────────

function PanelSection({ label, children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-700 mb-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-zinc-800" />
        {label}
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
      {children}
    </div>
  )
}

// ── Main Board ────────────────────────────────────────────

const GENRES = ['Classical', 'Jazz', 'Electronic', 'Rock', 'Cinematic', 'Ambient', 'Lo-Fi', 'Folk']
const MOODS = ['Uplifting', 'Melancholic', 'Tense', 'Serene', 'Dramatic', 'Playful', 'Mysterious', 'Epic']

export default function MidiBoard() {
  const {
    genParams,
    setGenParams,
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,
    addTracks,
    setError,
  } = useAppStore()

  // Local board state (knobs)
  const [tempo, setTempo] = useState(genParams.tempo || 120)
  const [energy, setEnergy] = useState(genParams.energy || 5)
  const [reverb, setReverb] = useState(genParams.reverb || 30)
  const [warmth, setWarmth] = useState(genParams.warmth || 50)
  const [complexity, setComplexity] = useState(genParams.complexity || 50)
  const [prevParams, setPrevParams] = useState({})
  const [flashBoard, setFlashBoard] = useState(false)

  // Sync from producer AI updates
  useEffect(() => {
    const p = genParams
    let changed = false
    if (p.tempo !== undefined && p.tempo !== prevParams.tempo) { setTempo(p.tempo); changed = true }
    if (p.energy !== undefined && p.energy !== prevParams.energy) { setEnergy(p.energy); changed = true }
    if (p.reverb !== undefined && p.reverb !== prevParams.reverb) { setReverb(p.reverb); changed = true }
    if (p.warmth !== undefined && p.warmth !== prevParams.warmth) { setWarmth(p.warmth); changed = true }
    if (p.complexity !== undefined && p.complexity !== prevParams.complexity) { setComplexity(p.complexity); changed = true }
    if (changed) {
      setPrevParams(p)
      setFlashBoard(true)
      setTimeout(() => setFlashBoard(false), 800)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genParams.tempo, genParams.energy, genParams.reverb, genParams.warmth, genParams.complexity])

  const handleGenerate = useCallback(async () => {
    // Build final style string from board state
    const styleArr = [
      genParams.style,
      reverb > 60 ? 'spacious reverb' : reverb < 20 ? 'dry, intimate' : null,
      warmth > 70 ? 'warm, analog' : warmth < 30 ? 'cold, digital' : null,
      complexity > 75 ? 'complex arrangement' : complexity < 25 ? 'minimal' : null,
    ].filter(Boolean)

    const finalParams = {
      ...genParams,
      tempo, energy, reverb, warmth, complexity,
      style: styleArr.join(', '),
    }

    // Auto-build prompt if empty
    let prompt = finalParams.prompt?.trim()
    if (!prompt) {
      const parts = [
        finalParams.genre && finalParams.genre,
        finalParams.mood && `${finalParams.mood.toLowerCase()} mood`,
        `${tempo} BPM`,
        finalParams.instrumental ? 'instrumental' : 'with vocals',
        finalParams.style,
      ].filter(Boolean)
      prompt = parts.join(', ') + '. High quality studio production.'
    }

    if (!prompt) {
      setError('Chat with Marcus or set at least a genre to generate.')
      return
    }

    setIsGenerating(true)
    setGenerationProgress([])

    try {
      const taskId = await generateMusic({
        prompt,
        style: [finalParams.genre, finalParams.mood, finalParams.style].filter(Boolean).join(', '),
        title: finalParams.title || 'Resonance Session',
        instrumental: finalParams.instrumental ?? true,
        lyrics: finalParams.lyrics || '',
      })

      const tracks = await pollUntilComplete(
        taskId,
        (taskData) => setGenerationProgress([{ id: taskId, status: taskData.status, title: finalParams.title }]),
        { maxWait: 180000, interval: 5000 }
      )

      if (tracks.length > 0) {
        addTracks(tracks)
        setGenerationProgress([])
      } else {
        setError('Generation completed but no audio returned.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [genParams, tempo, energy, reverb, warmth, complexity, setIsGenerating, setGenerationProgress, addTracks, setError])

  const selectedGenre = genParams.genre || null
  const selectedMood = genParams.mood || null

  return (
    <div
      className={`relative rounded-[1.5rem] overflow-hidden transition-all duration-300 ${
        flashBoard ? 'ring-1 ring-blue-500/30' : ''
      }`}
      style={{
        background: 'linear-gradient(160deg, #111115 0%, #0d0d11 60%, #0a0a0e 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: flashBoard
          ? '0 0 30px rgba(59,130,246,0.15), 0 20px 60px -15px rgba(0,0,0,0.6)'
          : '0 20px 60px -15px rgba(0,0,0,0.6)',
      }}
    >
      {/* Board header bar */}
      <div className="px-6 py-3.5 border-b border-zinc-800/50 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, #18181b 0%, #141418 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {['bg-red-500', 'bg-amber-400', 'bg-emerald-400'].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-70`} />
            ))}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-600">
            Resonance MK-1 Studio
          </span>
        </div>
        <div className="flex items-center gap-4">
          <VuMeter active={isGenerating} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
          }`} />
        </div>
      </div>

      <div className="p-6 space-y-7">
        {/* ── Oscillator Bank (Knobs) ── */}
        <PanelSection label="Oscillators">
          <div className="flex items-start justify-between gap-2">
            <Knob label="TEMPO" value={tempo} min={40} max={200} step={1} unit="BPM"
              onChange={v => { setTempo(v); setGenParams({ tempo: v }) }} />
            <Knob label="ENERGY" value={energy} min={1} max={10} step={0.5}
              onChange={v => { setEnergy(v); setGenParams({ energy: v }) }} />
            <Knob label="REVERB" value={reverb} min={0} max={100} step={5} unit="%"
              color="#6366f1"
              onChange={v => { setReverb(v); setGenParams({ reverb: v }) }} />
            <Knob label="WARMTH" value={warmth} min={0} max={100} step={5} unit="%"
              color="#f59e0b"
              onChange={v => { setWarmth(v); setGenParams({ warmth: v }) }} />
            <Knob label="COMPLEXITY" value={complexity} min={0} max={100} step={5} unit="%"
              color="#10b981"
              onChange={v => { setComplexity(v); setGenParams({ complexity: v }) }} />
          </div>
        </PanelSection>

        {/* ── Genre + Mood ── */}
        <div className="grid grid-cols-2 gap-6">
          <PanelSection label="Genre Bank">
            <div className="grid grid-cols-2 gap-1.5">
              {GENRES.map(g => (
                <LedButton
                  key={g}
                  label={g}
                  active={selectedGenre === g}
                  onClick={() => setGenParams({ genre: selectedGenre === g ? '' : g })}
                />
              ))}
            </div>
          </PanelSection>

          <PanelSection label="Mood Matrix">
            <div className="grid grid-cols-2 gap-1.5">
              {MOODS.map(m => (
                <LedButton
                  key={m}
                  label={m}
                  color="amber"
                  active={selectedMood === m}
                  onClick={() => setGenParams({ mood: selectedMood === m ? '' : m })}
                />
              ))}
            </div>
          </PanelSection>
        </div>

        {/* ── Signal Path (Toggles) ── */}
        <PanelSection label="Signal Path">
          <div className="flex items-center justify-around px-4">
            <ToggleSwitch
              label="vocal"
              value={genParams.instrumental ?? true}
              onChange={v => setGenParams({ instrumental: v })}
              labelOff="Vocal"
              labelOn="Instr."
            />
            <div className="h-12 w-px bg-zinc-800" />
            <ToggleSwitch
              label="scale"
              value={genParams.scale === 'minor'}
              onChange={v => setGenParams({ scale: v ? 'minor' : 'major' })}
              labelOff="Major"
              labelOn="Minor"
            />
            <div className="h-12 w-px bg-zinc-800" />
            {/* Style tags input */}
            <div className="flex-1 max-w-[200px] px-4">
              <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-1.5 text-center">
                Style Tags
              </div>
              <input
                type="text"
                value={genParams.style || ''}
                onChange={e => setGenParams({ style: e.target.value })}
                placeholder="strings, 808, reverb…"
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-[11px] font-mono text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-colors text-center"
              />
            </div>
          </div>
        </PanelSection>

        {/* ── Lyrics Input (vocal mode only) ── */}
        <AnimatePresence>
          {!(genParams.instrumental ?? true) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <PanelSection label="Lyrics">
                <textarea
                  value={genParams.lyrics || ''}
                  onChange={e => setGenParams({ lyrics: e.target.value })}
                  placeholder={'Write your own lyrics here…\n\nLeave empty and Suno will generate lyrics from your prompt.'}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-sm text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-blue-500/30 transition-colors leading-relaxed font-mono text-xs"
                />
                <p className="text-[10px] font-mono text-zinc-700 mt-1.5">
                  Optional — custom lyrics are passed directly to Suno
                </p>
              </PanelSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prompt Buffer ── */}
        <PanelSection label="Prompt Buffer">
          <div className="relative">
            <textarea
              value={genParams.prompt || ''}
              onChange={e => setGenParams({ prompt: e.target.value })}
              placeholder="Marcus will fill this in… or write your own prompt directly."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-sm text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-blue-500/30 transition-colors leading-relaxed font-mono text-xs"
            />
            {genParams.prompt && (
              <div className="absolute top-2 right-3 text-[9px] font-mono text-zinc-700">
                {genParams.prompt.length} chars
              </div>
            )}
          </div>
        </PanelSection>

        {/* ── Generate ── */}
        <motion.button
          onClick={handleGenerate}
          disabled={isGenerating}
          whileTap={!isGenerating ? { scale: 0.98 } : {}}
          className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-3 ${
            isGenerating
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'text-zinc-900 shadow-glow-blue'
          }`}
          style={!isGenerating ? {
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
          } : {}}
        >
          {isGenerating ? (
            <>
              <ArrowsClockwise size={17} weight="bold" className="animate-spin" />
              Rendering with Suno
              {generationProgress[0]?.status && (
                <span className="text-xs font-mono text-zinc-500 normal-case tracking-normal ml-1">
                  · {generationProgress[0].status.toLowerCase().replace('_', ' ')}
                </span>
              )}
            </>
          ) : (
            <>
              <Lightning size={17} weight="fill" />
              Generate Track
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
