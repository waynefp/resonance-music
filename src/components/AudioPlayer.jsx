'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SpeakerHigh, SpeakerX, DownloadSimple } from '@phosphor-icons/react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ audioUrl, title }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    let ws = null

    async function initWaveSurfer() {
      try {
        const WaveSurfer = (await import('wavesurfer.js')).default

        // Destroy previous instance
        if (wsRef.current) {
          wsRef.current.destroy()
          wsRef.current = null
        }

        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#27272a',
          progressColor: '#3b82f6',
          cursorColor: 'rgba(59,130,246,0.8)',
          cursorWidth: 2,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 52,
          normalize: true,
          interact: true,
          hideScrollbar: true,
        })

        ws.on('ready', () => {
          setDuration(ws.getDuration())
          setLoading(false)
          setReady(true)
          ws.setVolume(volume)
        })

        ws.on('timeupdate', (ct) => setCurrentTime(ct))
        ws.on('play', () => setIsPlaying(true))
        ws.on('pause', () => setIsPlaying(false))
        ws.on('finish', () => setIsPlaying(false))
        ws.on('error', (e) => {
          setError('Could not load audio')
          setLoading(false)
        })

        wsRef.current = ws
        ws.load(audioUrl)
      } catch (err) {
        setError('WaveSurfer failed to initialize')
        setLoading(false)
      }
    }

    setLoading(true)
    setReady(false)
    setError(null)
    initWaveSurfer()

    return () => {
      if (ws) ws.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl])

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  const toggleMute = useCallback(() => {
    if (!wsRef.current) return
    const newMuted = !muted
    setMuted(newMuted)
    wsRef.current.setMuted(newMuted)
  }, [muted])

  const handleVolume = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    wsRef.current?.setVolume(v)
  }, [])

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="space-y-3">
      {/* Waveform */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-950/60 border border-zinc-800/50">
        {/* Shimmer loading state */}
        {loading && (
          <div className="absolute inset-0 shimmer-bg animate-shimmer rounded-xl" />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-zinc-600">{error}</span>
          </div>
        )}
        <div
          ref={containerRef}
          className={`px-3 py-2 ${loading || error ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play/pause */}
        <motion.button
          onClick={togglePlay}
          disabled={!ready}
          whileTap={{ scale: 0.9 }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            ready
              ? 'bg-blue-500 hover:bg-blue-400 text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isPlaying
            ? <Pause size={14} weight="fill" />
            : <Play size={14} weight="fill" />
          }
        </motion.button>

        {/* Time */}
        <span className="text-[11px] font-mono text-zinc-500 w-20 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!wsRef.current || !ready) return
            const rect = e.currentTarget.getBoundingClientRect()
            const p = (e.clientX - rect.left) / rect.width
            wsRef.current.seekTo(Math.max(0, Math.min(1, p)))
          }}
        >
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            {muted ? <SpeakerX size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-16 h-1 accent-blue-500 cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${(muted ? 0 : volume) * 100}%, #27272a ${(muted ? 0 : volume) * 100}%)`,
            }}
          />
        </div>

        {/* Download */}
        {audioUrl && (
          <a
            href={audioUrl}
            download={`${title || 'resonance-track'}.mp3`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Download track"
          >
            <DownloadSimple size={15} weight="bold" />
          </a>
        )}
      </div>
    </div>
  )
}
