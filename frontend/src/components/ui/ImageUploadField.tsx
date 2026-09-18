import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { cn } from '@/utils/cn'

type ImageUploadFieldProps = {
  label?: string
  hint?: string
  file: File | null
  /** Remote/existing image when no new file is selected */
  existingUrl?: string | null
  onChange: (file: File | null) => void
  accept?: string
  className?: string
}

export function ImageUploadField({
  label,
  hint,
  file,
  existingUrl,
  onChange,
  accept = 'image/png,image/jpeg,image/webp,image/gif',
  className,
}: ImageUploadFieldProps) {
  const { t } = useTranslation('common')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const displayLabel = label ?? t('image')

  useEffect(() => {
    if (!file) {
      setBlobUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preview = blobUrl || existingUrl || null
  const fileName = file?.name

  const openPicker = () => inputRef.current?.click()

  const applyFile = (next: File | null) => {
    onChange(next)
    if (!next && inputRef.current) inputRef.current.value = ''
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped && dropped.type.startsWith('image/')) applyFile(dropped)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayLabel ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-fg">
          {displayLabel}
        </label>
      ) : null}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onFileChange}
      />

      <motion.div
        layout
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={preview ? undefined : openPicker}
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-colors duration-300',
          preview
            ? 'border-border bg-surface-2'
            : 'cursor-pointer border-dashed border-border-strong bg-gradient-to-br from-surface-2 via-surface to-primary-50/40 dark:from-surface-2 dark:via-surface dark:to-primary-900/20',
          dragOver && 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/30 dark:bg-primary-900/30',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
            >
              <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-3 shadow-[var(--shadow-soft)] sm:mx-0 sm:h-32 sm:w-32">
                <motion.img
                  key={preview}
                  src={preview}
                  alt=""
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
              </div>

              <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <p className="truncate text-sm font-semibold text-fg">
                    {fileName || t('currentImage')}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {file
                      ? t('imageReadyUpload', { size: Math.max(1, Math.round(file.size / 1024)) })
                      : t('imageSavedReplace')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openPicker()
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-fg transition hover:border-primary-500/40 hover:bg-primary-50/50 dark:hover:bg-primary-900/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('changeImage')}
                  </button>
                  {file ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        applyFile(null)
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-danger transition hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('removeImage')}
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col items-center gap-3 px-4 py-8 text-center"
            >
              <motion.div
                animate={dragOver ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700/10 text-primary-700 shadow-sm"
              >
                {dragOver ? <Upload className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-fg">
                  {dragOver ? t('dropImageUpload') : t('dropImage')}
                </p>
                <p className="mt-1 text-xs text-fg-muted">{t('imageFormatsHint')}</p>
              </div>
              <span className="inline-flex h-9 items-center rounded-xl bg-primary-700 px-3.5 text-xs font-semibold text-white shadow-sm transition group-hover:bg-primary-800">
                {t('chooseImage')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {hint ? <p className="text-[11px] text-fg-subtle">{hint}</p> : null}
    </div>
  )
}
