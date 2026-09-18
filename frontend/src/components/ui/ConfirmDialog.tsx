import { Button } from './Button'
import { Modal } from './Modal'
import { useTranslation } from 'react-i18next'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
  tone = 'danger',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  loading?: boolean
  tone?: 'danger' | 'primary'
}) {
  const { t } = useTranslation('common')
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel || t('confirm')}
        </Button>
      </div>
    </Modal>
  )
}
