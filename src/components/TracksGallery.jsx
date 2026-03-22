'use client'
import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MusicNote,
  Trash,
  Link,
  Clock,
  Waveform,
  CaretDown,
  TextAlignLeft,
} from '@phosphor-icons/react'
import AudioPlayer from './AudioPlayer.jsx'
import { useAppStore } from '../store/useAppStore.js'

function formatRelativeTime(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

// Animated waveform icon for track card
function WaveformIcon() {
  return (
    <div className="flex items-end gap-[2px] h-5">
      {[0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 1.0, 0.6].map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-blue-400 rounded-full waveform-bar"
          style={{
            '--delay': `${0.8 + i * 0.1}s`,
            height: `${h * 20}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

const TrackCard = memo(function TrackCard({ track, index }) {
  const { removeTrack } = useAppStore()
  const [lyricsOpen, setLyricsOpen] = useState(false)

  // Generate a deterministic color accent per track
  const hues = [210, 190, 220, 200, 240, 180]
  const hue = hues[index % hues.length]

  const lyrics = track.lyric || track.lyrics || null

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="glass-panel rounded-2xl overflow-hidden group"
    >
      {/* Card header accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: `hsl(${hue}, 70%, 55%)` }}
      />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `hsl(${hue}, 60%, 15%)`, border: `1px solid hsl(${hue}, 50%, 25%)` }}
            >
              <MusicNote size={18} style={{ color: `hsl(${hue}, 70%, 65%)` }} weight="fill" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                {track.title || `Composition ${index + 1}`}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <WaveformIcon />
                <span className="text-[10px] font-mono text-zinc-600">
                  {formatRelativeTime(track.addedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {track.audio_url && (
              <a
                href={track.audio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                title="Open URL"
              >
                <Link size={12} className="text-zinc-400" weight="bold" />
              </a>
            )}
            <button
              onClick={() => removeTrack(track.id)}
              className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 flex items-center justify-center transition-colors group/del"
              title="Remove track"
            >
              <Trash size={12} className="text-zinc-500 group-hover/del:text-red-400 transition-colors" weight="bold" />
            </button>
          </div>
        </div>

        {/* Metadata chips */}
        <div className="flex flex-wrap gap-1.5">
          {track.tags && track.tags.split(',').slice(0, 4).map(tag => tag.trim()).filter(Boolean).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-md text-zinc-500 bg-zinc-900 border border-zinc-800 capitalize"
            >
              {tag}
            </span>
          ))}
          {track.model_name && (
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-md text-blue-500/70 bg-blue-500/5 border border-blue-500/15">
              {track.model_name}
            </span>
          )}
        </div>

        {/* Audio Player */}
        {track.audio_url ? (
          <AudioPlayer audioUrl={track.audio_url} title={track.title} />
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Clock size={14} className="text-zinc-700 animate-spin-slow" weight="bold" />
            <span className="text-xs text-zinc-700">Audio processing…</span>
          </div>
        )}

        {/* Lyrics toggle */}
        {lyrics && (
          <div className="border-t border-zinc-800/50 pt-3">
            <button
              onClick={() => setLyricsOpen(v => !v)}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
            >
              <TextAlignLeft size={13} weight="bold" />
              <span>{lyricsOpen ? 'Hide lyrics' : 'View lyrics'}</span>
              <motion.span
                animate={{ rotate: lyricsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <CaretDown size={12} weight="bold" />
              </motion.span>
            </button>
            <AnimatePresence>
              {lyricsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-800/50 max-h-48 overflow-y-auto no-scrollbar">
                    <pre className="text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                      {lyrics}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.article>
  )
})

// Empty state
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full py-24 flex flex-col items-center gap-5 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Waveform size={28} className="text-zinc-700" weight="bold" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-zinc-500 mb-2">No tracks yet</h3>
        <p className="text-sm text-zinc-700 max-w-[36ch]">
          Upload a MIDI file, configure your generation settings, and hit{' '}
          <span className="text-zinc-500">Generate Music</span> to create your first track.
        </p>
      </div>
    </motion.div>
  )
}

export default function TracksGallery() {
  const tracks = useAppStore(s => s.tracks)

  return (
    <section id="gallery" className="space-y-6">
      {/* Section header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Generated Tracks
          </h2>
          <p className="text-sm text-zinc-600 mt-1">
            {tracks.length > 0
              ? `${tracks.length} track${tracks.length === 1 ? '' : 's'} created`
              : 'Your generated compositions will appear here'}
          </p>
        </div>
        {tracks.length > 0 && (
          <span className="text-xs font-mono text-zinc-700">
            {tracks.filter(t => t.audio_url).length} playable
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {tracks.length === 0 ? (
            <EmptyState key="empty" />
          ) : (
            tracks.map((track, i) => (
              <TrackCard key={track.id || i} track={track} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
