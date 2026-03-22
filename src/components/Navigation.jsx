'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Waveform, GearSix, ArrowDown } from '@phosphor-icons/react'

export default function Navigation({ onSettingsClick }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled
          ? 'glass-panel border-b border-zinc-800/50'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:border-blue-500/40 transition-colors">
            <Waveform size={16} className="text-blue-400" weight="bold" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Resonance
          </span>
        </a>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {['Studio', 'Gallery', 'Docs'].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50 transition-all duration-200"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50 transition-all duration-200"
          >
            <GearSix size={16} weight="bold" />
            <span className="hidden sm:inline">API Settings</span>
          </button>
          <a
            href="#studio"
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-zinc-900 bg-blue-400 hover:bg-blue-300 rounded-lg transition-all duration-200 active:scale-[0.97]"
          >
            Open Studio
            <ArrowDown size={14} weight="bold" />
          </a>
        </div>
      </div>
    </motion.header>
  )
}
