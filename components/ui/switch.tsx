'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

function Switch({ checked = false, onCheckedChange, id, disabled, className, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn('flex-shrink-0', className)}
      style={{
        position: 'relative',
        width: 52,
        height: 30,
        borderRadius: 9999,
        background: checked ? '#30d158' : 'rgba(255,255,255,0.18)',
        transition: 'background 0.2s ease',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        boxShadow: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 25 : 3,
          width: 24,
          height: 24,
          borderRadius: 9999,
          background: '#ffffff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

export { Switch }
