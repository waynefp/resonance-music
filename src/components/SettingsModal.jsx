'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  X, GearSix, CheckCircle, WarningCircle, ArrowsClockwise, Key, Info,
} from '@phosphor-icons/react'
import { pingApi } from '../lib/sunoApi.js'

const MODELS = [
  { value: 'V4', label: 'Suno V4', description: 'Balanced quality & speed' },
  { value: 'V4_5', label: 'Suno V4.5', description: 'Higher quality, recommended' },
  { value: 'V4_5PLUS', label: 'Suno V4.5 Plus', description: 'Best quality, up to 8 min' },
]

export default function SettingsModal({ onClose }) {
  const [sunoKey, setSunoKey] = useState(() => localStorage.getItem('resonance_api_key') || '')
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem('resonance_anthropic_key') || '')
  const [model, setModel] = useState(() => localStorage.getItem('resonance_model') || 'V4')
  const [showSuno, setShowSuno] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [pingStatus, setPingStatus] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(() => {
    localStorage.setItem('resonance_api_key', sunoKey.trim())
    localStorage.setItem('resonance_anthropic_key', anthropicKey.trim())
    localStorage.setItem('resonance_model', model)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 900)
  }, [sunoKey, anthropicKey, model, onClose])

  const handleTestSuno = useCallback(async () => {
    localStorage.setItem('resonance_api_key', sunoKey.trim())
    setPingStatus('checking')
    const ok = await pingApi()
    setPingStatus(ok ? 'ok' : 'fail')
  }, [sunoKey])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="glass-panel-elevated rounded-2xl w-full max-w-md overflow-hidden max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between sticky top-0 glass-panel z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <GearSix size={14} className="text-zinc-400" weight="bold" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">API Settings</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <X size={14} className="text-zinc-400" weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-7">
          {/* ── Record Producer (Anthropic) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <span className="text-[9px] text-blue-400 font-bold">AI</span>
              </div>
              <span className="text-xs font-semibold text-zinc-300">Record Producer (Anthropic)</span>
            </div>
            <div className="flex gap-3 px-4 py-3 rounded-xl bg-blue-500/6 border border-blue-500/12">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" weight="fill" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Powers the AI session with Marcus Vellum. Get a key at{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">
                  console.anthropic.com
                </a>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <Key size={10} /> Anthropic API Key
              </label>
              <div className="relative">
                <input
                  type={showAnthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={e => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-…"
                  className="w-full px-4 py-2.5 pr-16 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-colors font-mono"
                />
                <button onClick={() => setShowAnthropic(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors">
                  {showAnthropic ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800/60" />

          {/* ── Suno / kie.ai ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <span className="text-[9px] text-emerald-400 font-bold">S</span>
              </div>
              <span className="text-xs font-semibold text-zinc-300">Suno via kie.ai</span>
            </div>
            <div className="flex gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Get your API key at{' '}
                <a href="https://kie.ai/api-key" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-2">
                  kie.ai/api-key
                </a>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <Key size={10} /> kie.ai API Key
              </label>
              <div className="relative">
                <input
                  type={showSuno ? 'text' : 'password'}
                  value={sunoKey}
                  onChange={e => { setSunoKey(e.target.value); setPingStatus(null) }}
                  placeholder="your-kie-ai-key"
                  className="w-full px-4 py-2.5 pr-16 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-colors font-mono"
                />
                <button onClick={() => setShowSuno(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors">
                  {showSuno ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block">Suno Model</label>
              <div className="grid grid-cols-3 gap-1.5">
                {MODELS.map(m => (
                  <button key={m.value} onClick={() => setModel(m.value)}
                    className={`px-2 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                      model === m.value
                        ? 'bg-blue-500/10 border-blue-500/30 text-zinc-200'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{m.label}</div>
                    <div className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{m.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Test */}
            <div className="space-y-2.5">
              <button onClick={handleTestSuno} disabled={!sunoKey.trim() || pingStatus === 'checking'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
              >
                <ArrowsClockwise size={12} weight="bold" className={pingStatus === 'checking' ? 'animate-spin' : ''} />
                Test Suno Key
              </button>
              {pingStatus === 'ok' && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-400" weight="fill" />
                  <span className="text-xs text-emerald-400">Connected</span>
                </motion.div>
              )}
              {pingStatus === 'fail' && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
                  <WarningCircle size={13} className="text-red-400" weight="fill" />
                  <span className="text-xs text-red-400">Invalid or unreachable</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-zinc-800/60 flex justify-end gap-3 sticky bottom-0 glass-panel">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!sunoKey.trim() && !anthropicKey.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-400 rounded-xl transition-colors active:scale-[0.97] disabled:opacity-40"
          >
            {saved ? <><CheckCircle size={15} weight="fill" />Saved!</> : 'Save Settings'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
