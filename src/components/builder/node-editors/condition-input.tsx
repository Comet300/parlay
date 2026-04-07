import { useState, useRef } from 'react'
import { useBuilderStore } from '~/lib/stores/builder-store'

interface ConditionInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function ConditionInput({ value, onChange, placeholder }: ConditionInputProps) {
  const allSlugs = useBuilderStore((s) => s.slugs)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = filter
    ? allSlugs.filter((s) => s.slug.startsWith(filter))
    : allSlugs

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)

    // Extract the word at cursor position
    const pos = e.target.selectionStart ?? val.length
    setCursorPos(pos)
    const before = val.slice(0, pos)
    const wordMatch = before.match(/([a-z0-9-]+)$/)
    if (wordMatch) {
      setFilter(wordMatch[1])
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  function insertSlug(slug: string) {
    const before = value.slice(0, cursorPos)
    const wordMatch = before.match(/([a-z0-9-]+)$/)
    const prefixLen = wordMatch ? wordMatch[1].length : 0
    const newValue =
      value.slice(0, cursorPos - prefixLen) + slug + value.slice(cursorPos)
    onChange(newValue)
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={(e) => {
          const pos = e.target.selectionStart ?? value.length
          const before = value.slice(0, pos)
          const wordMatch = before.match(/([a-z0-9-]+)$/)
          if (wordMatch && allSlugs.length > 0) {
            setFilter(wordMatch[1])
            setShowDropdown(true)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((s) => (
            <button
              key={s.nodeId}
              onMouseDown={(e) => {
                e.preventDefault()
                insertSlug(s.slug)
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-sm hover:bg-blue-50"
            >
              <code className="text-xs text-blue-600 font-mono">{s.slug}</code>
              <span className="text-xs text-gray-400 truncate">{s.label}</span>
              <span className="ml-auto text-[10px] text-gray-300">{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
