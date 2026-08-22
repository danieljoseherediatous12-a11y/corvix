'use client'

import React, { useEffect, useCallback } from "react"
import { X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

interface ModalProps {
  open:         boolean
  onClose:      () => void
  title?:       React.ReactNode
  children?:    React.ReactNode
  footer?:      React.ReactNode
  size?:        ModalSize
  /** Prevent closing when clicking backdrop */
  persistent?:  boolean
  /** Remove inner padding */
  noPad?:       boolean
  className?:   string
}

// ─── Width map ────────────────────────────────────────────────────────────────

const sizeClasses: Record<ModalSize, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-2xl",
  full: "max-w-full mx-4",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size       = "md",
  persistent = false,
  noPad      = false,
  className  = "",
}: ModalProps) {

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose()
    },
    [onClose, persistent]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener("keydown", handleKeyDown)
    // Prevent body scroll while open
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !persistent && onClose()}
      />

      {/* Dialog panel */}
      <div
        className={[
          "relative w-full bg-white rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90vh]",
          sizeClasses[size],
          className,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition rounded-lg p-1 hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition rounded-lg p-1 hover:bg-gray-100 z-10"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        )}

        {/* Body */}
        <div className={["overflow-y-auto flex-1", noPad ? "" : "px-6 py-5"].join(" ")}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
