import { useEffect, useRef, useState } from 'react'

export type MenuItem = {
  label: string
  onSelect: () => void
  danger?: boolean
}

type Props = {
  label: string
  items: MenuItem[]
}

const MENU_WIDTH = 260
const EDGE = 12

type Position = { top: number; left: number; width: number }

export function TripMenu({ label, items }: Props) {
  const [position, setPosition] = useState<Position | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = position !== null

  useEffect(() => {
    if (!open) return
    menuRef.current
      ?.querySelector<HTMLElement>('[role=menuitem]')
      ?.focus({ preventScroll: true })
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target))
        setPosition(null)
    }
    const dismiss = () => setPosition(null)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [open])

  const toggle = () => {
    if (open || !buttonRef.current) {
      setPosition(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const width = Math.min(MENU_WIDTH, window.innerWidth - EDGE * 2)
    const left = Math.min(
      Math.max(rect.right - width, EDGE),
      window.innerWidth - width - EDGE
    )
    setPosition({ top: rect.bottom + 6, left, width })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const entries = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])
    ]
    const index = entries.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => {
      event.preventDefault()
      entries[(next + entries.length) % entries.length]?.focus()
    }
    if (event.key === 'ArrowDown') focusAt(index + 1)
    else if (event.key === 'ArrowUp') focusAt(index - 1)
    else if (event.key === 'Home') focusAt(0)
    else if (event.key === 'End') focusAt(entries.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      setPosition(null)
      buttonRef.current?.focus()
    } else if (event.key === 'Tab') setPosition(null)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type='button'
        className='pill-menu'
        aria-label={label}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={toggle}
      >
        <svg width='18' height='18' viewBox='0 0 18 18' fill='currentColor' aria-hidden='true'>
          <circle cx='3' cy='9' r='1.7' />
          <circle cx='9' cy='9' r='1.7' />
          <circle cx='15' cy='9' r='1.7' />
        </svg>
      </button>
      {position && (
        <div
          ref={menuRef}
          role='menu'
          aria-label={label}
          className='trip-menu'
          style={position}
          onKeyDown={onKeyDown}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type='button'
              role='menuitem'
              className={item.danger ? 'menu-item danger' : 'menu-item'}
              onClick={() => {
                setPosition(null)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
