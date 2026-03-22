'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperPlaneTilt, Waveform, Equalizer } from '@phosphor-icons/react'
import { sendMessage, parseStream, parseSettings, stripSettings } from '../lib/producerApi.js'
import { useAppStore } from '../store/useAppStore.js'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-3 px-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-600"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function ProducerBadge() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center">
          <Equalizer size={14} className="text-blue-400" weight="fill" />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-zinc-950" />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isProducer = msg.role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isProducer ? 'items-start' : 'items-start justify-end'}`}
    >
      {isProducer && <ProducerBadge />}

      <div className={`max-w-[82%] ${isProducer ? '' : 'text-right'}`}>
        {isProducer && (
          <div className="text-[10px] font-mono text-zinc-600 mb-1.5 ml-0.5">Marcus Vellum</div>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isProducer
              ? 'bg-zinc-900 border border-zinc-800/60 text-zinc-200 rounded-tl-sm'
              : 'bg-blue-500/15 border border-blue-500/20 text-zinc-200 rounded-tr-sm'
          }`}
        >
          {msg.content}
          {msg.settingsApplied && (
            <div className="mt-2 pt-2 border-t border-zinc-700/40 flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Board updated
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function RecordProducer() {
  const { setGenParams, setError } = useAppStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(false)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with producer's opening message
  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    const apiKey = localStorage.getItem('resonance_anthropic_key')
    if (!apiKey) return
    startStream([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startStream = useCallback(async (history) => {
    const apiKey = localStorage.getItem('resonance_anthropic_key')
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: "Hey — I'm Marcus. To get started, add your Anthropic API key in Settings so I can guide your session.",
        settingsApplied: false,
      }])
      return
    }

    setIsStreaming(true)
    abortRef.current = false

    const streamingId = Date.now()
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', settingsApplied: false, streaming: true }])

    try {
      const body = await sendMessage(history, apiKey)
      let fullText = ''

      for await (const chunk of parseStream(body)) {
        if (abortRef.current) break
        fullText += chunk
        const display = stripSettings(fullText)
        setMessages(prev =>
          prev.map(m => m.id === streamingId ? { ...m, content: display } : m)
        )
      }

      // Process settings
      const settings = parseSettings(fullText)
      let settingsApplied = false
      if (settings) {
        const mapped = {}
        if (settings.genre !== undefined) mapped.genre = settings.genre
        if (settings.mood !== undefined) mapped.mood = settings.mood
        if (settings.energy !== undefined) mapped.energy = settings.energy
        if (settings.tempo !== undefined) mapped.tempo = settings.tempo
        if (settings.reverb !== undefined) mapped.reverb = settings.reverb
        if (settings.warmth !== undefined) mapped.warmth = settings.warmth
        if (settings.complexity !== undefined) mapped.complexity = settings.complexity
        if (settings.instrumental !== undefined) mapped.instrumental = settings.instrumental
        if (settings.style !== undefined) mapped.style = settings.style
        setGenParams(mapped)
        settingsApplied = true
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === streamingId ? { ...m, streaming: false, settingsApplied } : m
        )
      )
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== streamingId))
      setError(err.message)
    } finally {
      setIsStreaming(false)
    }
  }, [setGenParams, setError])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg = { id: Date.now(), role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')

    // Build history for API (exclude streaming placeholders, strip display format)
    const history = newMessages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }))

    await startStream(history)
  }, [input, isStreaming, messages, startStream])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasApiKey = !!localStorage.getItem('resonance_anthropic_key')

  return (
    <div className="glass-panel rounded-[1.5rem] flex flex-col" style={{ height: '640px' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Waveform size={14} className="text-blue-400" weight="bold" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100 leading-none">Record Producer</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">Marcus Vellum</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          {isStreaming ? 'producing...' : 'in session'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Equalizer size={24} className="text-zinc-700" weight="fill" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">
                {hasApiKey ? 'Starting session…' : 'Add your Anthropic key in Settings'}
              </p>
              <p className="text-xs text-zinc-700 mt-1 max-w-[24ch]">
                {hasApiKey
                  ? 'Marcus will guide you through the creative process'
                  : 'Settings → Anthropic API Key to activate the producer'}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <div key={msg.id}>
              {msg.streaming && msg.content === '' ? (
                <div className="flex gap-3 items-start">
                  <ProducerBadge />
                  <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl rounded-tl-sm px-4">
                    <TypingIndicator />
                  </div>
                </div>
              ) : (
                <Message msg={msg} />
              )}
            </div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-zinc-800/60 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Marcus is producing…' : 'Tell Marcus what you\'re feeling…'}
            disabled={isStreaming}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-700 resize-none focus:outline-none focus:border-blue-500/40 transition-colors leading-relaxed disabled:opacity-50"
            style={{ maxHeight: '80px' }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors shrink-0 self-end"
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </motion.button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-2 font-mono">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
