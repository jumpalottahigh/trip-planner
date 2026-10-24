import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className='event-editor'
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className='editor-heading'>
        <h2 id={titleId}>{title}</h2>
        <button
          type='button'
          className='icon-btn'
          aria-label='Close'
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}
