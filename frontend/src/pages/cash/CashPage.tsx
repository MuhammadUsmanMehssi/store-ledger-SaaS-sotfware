import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cashApi } from '@/api/cashApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { Banknote, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatDateTime } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'

export default function CashPage() {
  const { t } = useTranslation(['cash', 'common'])
  const { tenant, user } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const canManage = user?.storeRole === 'OWNER' || user?.storeRole === 'MANAGER'
  const toast = useToast()
  const qc = useQueryClient()

  const [openAmount, setOpenAmount] = useState('0')
  const [closeAmount, setCloseAmount] = useState('')
  const [editOpening, setEditOpening] = useState('')
  const [editClosing, setEditClosing] = useState('')

  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [openingModal, setOpeningModal] = useState(false)
  const [closingModal, setClosingModal] = useState(false)
  const [reopenConfirm, setReopenConfirm] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const session = useQuery({
    queryKey: ['cash-today'],
    queryFn: async () => (await cashApi.today()).data,
  })

  const refresh = () => void qc.invalidateQueries({ queryKey: ['cash-today'] })

  const open = useMutation({
    mutationFn: async () => cashApi.open({ openingCash: Number(openAmount) || 0 }),
    onSuccess: () => {
      toast.success(t('sessionOpened'))
      setOpenModal(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotOpen')),
  })

  const close = useMutation({
    mutationFn: async () => cashApi.close({ actualCash: Number(closeAmount) || 0 }),
    onSuccess: () => {
      toast.success(t('sessionClosed'))
      setCloseModal(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotClose')),
  })

  const reopen = useMutation({
    mutationFn: async () => cashApi.reopen(),
    onSuccess: () => {
      toast.success(t('sessionReopened'), t('sessionReopenedDetail'))
      setReopenConfirm(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotReopen')),
  })

  const cancel = useMutation({
    mutationFn: async () => cashApi.cancel(),
    onSuccess: () => {
      toast.success(t('sessionCancelled'), t('sessionCancelledDetail'))
      setCancelConfirm(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotCancel')),
  })

  const updateOpening = useMutation({
    mutationFn: async () => cashApi.updateOpening({ openingCash: Number(editOpening) || 0 }),
    onSuccess: () => {
      toast.success(t('openingUpdated'))
      setOpeningModal(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotUpdate')),
  })

  const updateClosing = useMutation({
    mutationFn: async () => cashApi.updateClosing({ actualCash: Number(editClosing) || 0 }),
    onSuccess: () => {
      toast.success(t('countedUpdated'))
      setClosingModal(false)
      refresh()
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotUpdate')),
  })

  if (session.isLoading) return <LoadingState label={t('loading')} />

  const data = session.data

  if (!data) {
    return (
      <div>
        <PageHeader title={t('title')} description={t('descriptionEmpty')} />
        <EmptyState
          title={t('noSessionTitle')}
          description={t('noSessionDescription')}
          actionLabel={t('openSession')}
          onAction={() => setOpenModal(true)}
        />
        <Modal open={openModal} onClose={() => setOpenModal(false)} title={t('openSessionTitle')}>
          <div className="space-y-3">
            <Input
              label={t('openingCash')}
              type="number"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
            />
            <Button fullWidth loading={open.isPending} onClick={() => open.mutate()}>
              {t('open')}
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  const difference = data.difference == null ? null : toNumber(data.difference)

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data.isClosed ? (
              <>
                <Badge tone="default">{t('closed')}</Badge>
                {canManage ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditClosing(String(data.actualCash ?? data.expectedCash ?? ''))
                        setClosingModal(true)
                      }}
                    >
                      {t('fixCountedCash')}
                    </Button>
                    <Button variant="accent" size="sm" onClick={() => setReopenConfirm(true)}>
                      {t('reopenSession')}
                    </Button>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Badge tone="success">{t('openBadge')}</Badge>
                {canManage ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditOpening(String(data.openingCash ?? 0))
                        setOpeningModal(true)
                      }}
                    >
                      {t('editOpening')}
                    </Button>
                    {data.canCancel ? (
                      <Button variant="ghost" size="sm" onClick={() => setCancelConfirm(true)}>
                        {t('cancelOpen')}
                      </Button>
                    ) : null}
                    <Button variant="accent" size="sm" onClick={() => setCloseModal(true)}>
                      {t('closeSession')}
                    </Button>
                  </>
                ) : (
                  <Button variant="accent" size="sm" onClick={() => setCloseModal(true)} disabled>
                    {t('closeOwnerManager')}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('stats.opening')} value={formatMoney(data.openingCash, symbol)} icon={Banknote} />
        <StatCard
          label={t('stats.cashIn')}
          value={formatMoney(data.cashIn, symbol)}
          icon={ArrowDownLeft}
          tone="success"
        />
        <StatCard
          label={t('stats.cashOut')}
          value={formatMoney(data.cashOut, symbol)}
          icon={ArrowUpRight}
          tone="danger"
        />
        <StatCard
          label={t('stats.expected')}
          value={formatMoney(data.expectedCash, symbol)}
          icon={Banknote}
          tone="accent"
        />
      </div>

      {data.isClosed ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatCard
            label={t('stats.actualCounted')}
            value={formatMoney(data.actualCash ?? 0, symbol)}
            icon={Banknote}
          />
          <StatCard
            label={t('stats.difference')}
            value={formatMoney(difference ?? 0, symbol)}
            icon={Banknote}
            tone={(difference ?? 0) === 0 ? 'success' : (difference ?? 0) < 0 ? 'danger' : 'accent'}
          />
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <h2 className="font-display text-sm font-semibold">{t('transactions')}</h2>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={data.transactions ?? []}
            rowKey={(r) => r.id}
            emptyTitle={t('noMovements')}
            columns={[
              { key: 'time', header: t('columns.time'), render: (r) => formatDateTime(r.createdAt) },
              { key: 'type', header: t('columns.type'), render: (r) => r.type },
              {
                key: 'dir',
                header: t('columns.direction'),
                render: (r) => <Badge>{r.direction}</Badge>,
              },
              {
                key: 'amt',
                header: t('columns.amount'),
                render: (r) => formatMoney(r.amount, symbol),
              },
              { key: 'notes', header: t('columns.notes'), render: (r) => r.notes || t('common:dash') },
            ]}
          />
        </CardBody>
      </Card>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title={t('closeTitle')}>
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('expectedCash', { amount: formatMoney(data.expectedCash, symbol) })}
          </p>
          <Input
            label={t('actualCashCounted')}
            type="number"
            value={closeAmount}
            onChange={(e) => setCloseAmount(e.target.value)}
          />
          <Button fullWidth loading={close.isPending} onClick={() => close.mutate()}>
            {t('closeSession')}
          </Button>
        </div>
      </Modal>

      <Modal open={openingModal} onClose={() => setOpeningModal(false)} title={t('editOpeningTitle')}>
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('currentOpeningHint', { amount: formatMoney(data.openingCash, symbol) })}
          </p>
          <Input
            label={t('correctOpeningCash')}
            type="number"
            value={editOpening}
            onChange={(e) => setEditOpening(e.target.value)}
          />
          <Button fullWidth loading={updateOpening.isPending} onClick={() => updateOpening.mutate()}>
            {t('saveOpening')}
          </Button>
        </div>
      </Modal>

      <Modal open={closingModal} onClose={() => setClosingModal(false)} title={t('fixCountedTitle')}>
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('expectedAndCount', {
              expected: formatMoney(data.expectedCash, symbol),
              actual: formatMoney(data.actualCash ?? 0, symbol),
            })}
          </p>
          <Input
            label={t('correctActualCash')}
            type="number"
            value={editClosing}
            onChange={(e) => setEditClosing(e.target.value)}
          />
          <Button fullWidth loading={updateClosing.isPending} onClick={() => updateClosing.mutate()}>
            {t('saveCount')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={reopenConfirm}
        onClose={() => setReopenConfirm(false)}
        onConfirm={() => reopen.mutate()}
        title={t('reopenTitle')}
        description={t('reopenDescription')}
        confirmLabel={t('reopen')}
        tone="primary"
        loading={reopen.isPending}
      />

      <ConfirmDialog
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => cancel.mutate()}
        title={t('cancelOpenTitle')}
        description={t('cancelOpenDescription')}
        confirmLabel={t('cancelOpen')}
        tone="danger"
        loading={cancel.isPending}
      />
    </div>
  )
}
