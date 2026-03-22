import { Midi } from '@tonejs/midi'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export async function parseMidiFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const midi = new Midi(arrayBuffer)
  return analyzeMidi(midi)
}

function analyzeMidi(midi) {
  const { header, tracks, duration } = midi

  const bpm = header.tempos.length > 0
    ? Math.round(header.tempos[0].bpm)
    : 120

  const keySig = header.keySignatures.length > 0
    ? header.keySignatures[0]
    : { key: 'C', scale: 'major' }

  const timeSig = header.timeSignatures.length > 0
    ? header.timeSignatures[0]
    : { timeSignature: [4, 4] }

  // Filter tracks with actual notes
  const activeTracks = tracks
    .map((track, idx) => ({
      index: idx,
      name: track.name || `Track ${idx + 1}`,
      instrument: track.instrument?.name || 'Unknown',
      percussion: track.instrument?.percussion ?? false,
      noteCount: track.notes.length,
      notes: track.notes,
    }))
    .filter(t => t.noteCount > 0)

  const allNotes = activeTracks.flatMap(t => t.notes)

  // Pitch analysis
  const midiNumbers = allNotes.map(n => n.midi)
  const minPitch = midiNumbers.length > 0 ? Math.min(...midiNumbers) : 0
  const maxPitch = midiNumbers.length > 0 ? Math.max(...midiNumbers) : 0
  const avgPitch = midiNumbers.length > 0
    ? Math.round(midiNumbers.reduce((a, b) => a + b, 0) / midiNumbers.length)
    : 60

  // Note density
  const noteDensity = duration > 0
    ? parseFloat((allNotes.length / duration).toFixed(1))
    : 0

  // Pitch class histogram (for visualization)
  const pitchHistogram = computePitchHistogram(allNotes)

  // Instruments list
  const instruments = [
    ...new Set(
      activeTracks
        .filter(t => !t.percussion && t.instrument !== 'Unknown')
        .map(t => t.instrument)
    ),
  ]

  // Visual notes sample (for piano roll preview)
  const visualNotes = allNotes
    .slice(0, 300)
    .map(n => ({
      time: n.time,
      pitch: n.midi,
      duration: Math.max(n.duration, 0.05),
      velocity: n.velocity,
    }))
    .sort((a, b) => a.time - b.time)

  // Complexity score (0-100)
  const complexity = computeComplexity(allNotes, activeTracks.length, bpm)

  return {
    bpm,
    key: keySig.key || 'C',
    scale: keySig.scale || 'major',
    timeSignature: timeSig.timeSignature || [4, 4],
    duration: Math.round(duration),
    trackCount: activeTracks.length,
    totalNotes: allNotes.length,
    noteDensity,
    pitchRange: { min: minPitch, max: maxPitch, avg: avgPitch },
    instruments,
    tracks: activeTracks.map(t => ({
      name: t.name,
      instrument: t.instrument,
      noteCount: t.noteCount,
      percussion: t.percussion,
    })),
    pitchHistogram,
    visualNotes,
    complexity,
  }
}

function computePitchHistogram(notes) {
  const counts = new Array(12).fill(0)
  notes.forEach(n => {
    counts[n.midi % 12]++
  })
  const max = Math.max(...counts, 1)
  return counts.map((v, i) => ({
    name: NOTE_NAMES[i],
    value: v / max,
    count: v,
  }))
}

function computeComplexity(notes, trackCount, bpm) {
  if (notes.length === 0) return 0
  const densityScore = Math.min(notes.length / 200, 1) * 30
  const trackScore = Math.min(trackCount / 8, 1) * 25
  const tempoScore = (Math.abs(bpm - 120) / 120) * 20
  const uniquePitches = new Set(notes.map(n => n.midi)).size
  const pitchScore = Math.min(uniquePitches / 36, 1) * 25
  return Math.round(densityScore + trackScore + tempoScore + pitchScore)
}

export function midiDataToPrompt(midiData, overrides = {}) {
  const {
    bpm,
    key,
    scale,
    instruments,
    noteDensity,
    timeSignature,
    complexity,
  } = midiData

  const tempoDesc = getTempoDescription(bpm)
  const moodDesc = getMoodDescription(bpm, scale, noteDensity)
  const genreGuess = overrides.genre || guessGenre(instruments)
  const instrumentList = instruments.slice(0, 4).join(', ')

  let parts = []
  parts.push(`${tempoDesc} ${genreGuess}`)
  parts.push(`key of ${key} ${scale}`)
  parts.push(`${timeSignature[0]}/${timeSignature[1]} time`)
  if (instrumentList) parts.push(`featuring ${instrumentList}`)
  parts.push(`${moodDesc} feel`)
  parts.push(`${bpm} BPM`)
  if (complexity > 60) parts.push('complex harmonic structure')
  parts.push('high quality studio production')

  const basePrompt = parts.join(', ')

  if (overrides.style) {
    return `${overrides.style}. ${basePrompt}`
  }
  return basePrompt.charAt(0).toUpperCase() + basePrompt.slice(1) + '.'
}

function getTempoDescription(bpm) {
  if (bpm < 55) return 'very slow, languid'
  if (bpm < 75) return 'slow, contemplative'
  if (bpm < 95) return 'moderate, flowing'
  if (bpm < 115) return 'medium tempo'
  if (bpm < 135) return 'upbeat, energetic'
  if (bpm < 160) return 'fast, driving'
  return 'very fast, intense'
}

function getMoodDescription(bpm, scale, density) {
  if (scale === 'minor' && bpm < 85) return 'dark, melancholic, introspective'
  if (scale === 'minor' && bpm >= 85) return 'intense, dramatic, powerful'
  if (scale === 'major' && bpm < 85) return 'peaceful, serene, warm'
  if (scale === 'major' && bpm >= 135) return 'joyful, triumphant, celebratory'
  return 'balanced, expressive'
}

function guessGenre(instruments) {
  if (!instruments.length) return 'instrumental'
  const lower = instruments.map(i => i.toLowerCase())
  if (lower.some(i => i.includes('violin') || i.includes('cello') || i.includes('orchestra') || i.includes('choir'))) {
    return 'orchestral'
  }
  if (lower.some(i => i.includes('piano') && !lower.some(j => j.includes('electric')))) {
    return 'classical piano'
  }
  if (lower.some(i => i.includes('electric guitar') || i.includes('distortion'))) {
    return 'rock'
  }
  if (lower.some(i => i.includes('trumpet') || i.includes('saxophone') || i.includes('trombone'))) {
    return 'jazz'
  }
  if (lower.some(i => i.includes('synth') || i.includes('lead') || i.includes('pad'))) {
    return 'electronic'
  }
  if (lower.some(i => i.includes('guitar') || i.includes('acoustic'))) {
    return 'acoustic'
  }
  return 'instrumental'
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function midiNoteToName(midiNote) {
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[midiNote % 12]}${octave}`
}
