'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

/**
 * Euro currency input that formats as you type.
 * Displays: € 25.000 while editing shows raw number.
 * Stores the raw number value internally.
 */
export default function CurrencyInput({ value, onChange, className = '', placeholder = '€ 0' }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const [display, setDisplay] = useState('')

  // Format number to Dutch currency display
  const formatDisplay = (num: number): string => {
    if (!num && num !== 0) return ''
    if (num === 0) return ''
    return `€ ${num.toLocaleString('nl-NL')}`
  }

  // Parse user input to number (strip everything except digits)
  const parseInput = (input: string): number => {
    const digits = input.replace(/[^0-9]/g, '')
    return digits ? parseInt(digits, 10) : 0
  }

  useEffect(() => {
    if (!focused) {
      setDisplay(formatDisplay(value))
    }
  }, [value, focused])

  const handleFocus = () => {
    setFocused(true)
    // Show raw number when focused for easy editing
    setDisplay(value ? value.toString() : '')
  }

  const handleBlur = () => {
    setFocused(false)
    setDisplay(formatDisplay(value))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Allow empty
    if (!raw.trim()) {
      setDisplay('')
      onChange(0)
      return
    }

    const num = parseInput(raw)
    setDisplay(num ? `€ ${num.toLocaleString('nl-NL')}` : '')
    onChange(num)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  )
}
