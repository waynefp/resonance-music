'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Sparkle, MusicNote } from '@phosphor-icons/react'

const TYPEWRITER_PHRASES = [
  'Work with an AI record producer',
  'Dial in your sound on the board',
  'Generate full tracks with Suno',
  'Compose beyond imagination',
]

function TypewriterText() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[phraseIdx]
    let timeout

    if (!isDeleting && displayed.length < phrase.length) {
      timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 55)
    } else if (!isDeleting && displayed.length === phrase.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28)
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false)
      setPhraseIdx(i => (i + 1) % TYPEWRITER_PHRASES.length)
    }

    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, phraseIdx])

  return (
    <span className="text-blue-400">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  )
}

function WaveformCanvas() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const waves = [
      { freq: 0.8, amp: 0.18, speed: 0.6, phase: 0, color: 'rgba(59,130,246,0.5)' },
      { freq: 1.3, amp: 0.12, speed: 0.9, phase: 1.2, color: 'rgba(96,165,250,0.35)' },
      { freq: 0.5, amp: 0.22, speed: 0.4, phase: 2.5, color: 'rgba(147,197,253,0.2)' },
    ]

    const draw = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      const midY = H / 2

      ctx.clearRect(0, 0, W, H)

      waves.forEach(wave => {
        ctx.beginPath()
        ctx.moveTo(0, midY)

        for (let x = 0; x <= W; x += 2) {
          const progress = x / W
          const y =
            midY +
            Math.sin(progress * Math.PI * 4 * wave.freq + t * wave.speed + wave.phase) *
              H *
              wave.amp *
              Math.sin(progress * Math.PI)

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        ctx.strokeStyle = wave.color
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      // Frequency bars at bottom
      const barCount = 48
      const barWidth = W / barCount
      for (let i = 0; i < barCount; i++) {
        const barHeight =
          (Math.sin(i * 0.4 + t * 2) * 0.5 + 0.5) *
          (Math.sin(i * 0.15 + t * 0.7) * 0.3 + 0.7) *
          H * 0.25

        const alpha = 0.15 + (barHeight / (H * 0.25)) * 0.4
        ctx.fillStyle = `rgba(59,130,246,${alpha})`
        ctx.fillRect(
          i * barWidth + 1,
          H - barHeight,
          barWidth - 2,
          barHeight
        )
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-16">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-8 items-center min-h-[calc(100dvh-4rem)]">

          {/* Left: Text content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="py-16 lg:py-0"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20">
                <Sparkle size={12} weight="fill" />
                Powered by Suno AI
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.0] text-balance mb-6"
            >
              Your AI
              <br />
              <span className="text-zinc-400">Record</span>
              <br />
              <em className="not-italic text-blue-400">Producer.</em>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="text-base md:text-lg text-zinc-500 font-mono mb-3 h-7"
            >
              <TypewriterText />
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-base text-zinc-500 leading-relaxed max-w-[52ch] mb-10"
            >
              Collaborate with Marcus Vellum — an AI producer with three decades
              of experience. Dial in your sound on the hardware-inspired studio
              board, then generate a full track through Suno AI.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <a
                href="#studio"
                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] shadow-glow-blue"
              >
                <MusicNote size={18} weight="bold" />
                Start Composing
              </a>
              <a
                href="#gallery"
                className="inline-flex items-center gap-2.5 px-6 py-3 text-zinc-400 hover:text-zinc-100 font-medium rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
              >
                Browse Examples
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-8 mt-14 pt-10 border-t border-zinc-800/60"
            >
              {[
                { label: 'Tracks Generated', value: '12,480' },
                { label: 'MIDI Formats', value: 'All types' },
                { label: 'Avg. Generate Time', value: '~47s' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-xl font-bold text-zinc-100 tracking-tight font-mono">
                    {stat.value}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Waveform visualization */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="relative h-[420px] lg:h-[560px] animate-float"
          >
            <div className="relative h-full glass-panel-elevated rounded-[2rem] overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-900/10 z-10 pointer-events-none" />

              {/* Canvas waveform */}
              <div className="absolute inset-0">
                <WaveformCanvas />
              </div>

              {/* Floating info card */}
              <div className="absolute top-6 left-6 right-6 z-20">
                <div className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500">Live Preview</span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Key', value: 'C Major' },
                      { label: 'BPM', value: '124' },
                      { label: 'Bars', value: '32' },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <div className="text-lg font-bold font-mono text-zinc-100 tracking-tighter">
                          {item.value}
                        </div>
                        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom label */}
              <div className="absolute bottom-6 left-6 right-6 z-20">
                <div className="text-xs font-mono text-zinc-600 text-center">
                  frequency spectrum — real-time analysis
                </div>
              </div>
            </div>

            {/* Glow behind card */}
            <div className="absolute -inset-6 bg-blue-500/8 rounded-[3rem] blur-2xl -z-10" />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600"
        >
          <span className="text-xs font-mono">scroll to studio</span>
          <ArrowDown size={14} className="animate-bounce" />
        </motion.div>
      </div>
    </section>
  )
}
