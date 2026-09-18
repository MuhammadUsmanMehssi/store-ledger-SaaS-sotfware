import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import { mediaUrl } from '@/utils/mediaUrl'
import type { Sale } from '@/types'

function Row({
  label,
  value,
  strong,
  large,
}: {
  label: string
  value: string
  strong?: boolean
  large?: boolean
}) {
  return (
    <div
      className={`rcpt-row${strong ? ' rcpt-row--strong' : ''}${large ? ' rcpt-row--large' : ''}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function ReceiptPrint({ sale }: { sale: Sale | null }) {
  const { t } = useTranslation(['receipt', 'common'])
  const { tenant, user } = useAuth()
  if (!sale) return null

  const symbol = tenant?.currencySymbol || 'Rs'
  const storeName = tenant?.businessName || tenant?.name || 'Store'
  const items = sale.items ?? []
  const logo = mediaUrl(tenant?.logoUrl)

  return (
    <div id="receipt-print-root" className="receipt-print" aria-hidden="true">
      <header className="rcpt-header">
        {logo ? (
          <img src={logo} alt="" className="rcpt-logo" />
        ) : (
          <div className="rcpt-mark">{storeName.slice(0, 1).toUpperCase()}</div>
        )}
        <h1 className="rcpt-store">{storeName}</h1>
        {tenant?.address ? <p className="rcpt-meta">{tenant.address}</p> : null}
        <p className="rcpt-meta">
          {[tenant?.phone ? t('tel', { phone: tenant.phone }) : null, tenant?.email ? tenant.email : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      <div className="rcpt-rule" />

      <section className="rcpt-meta-block">
        <Row label={t('invoice')} value={sale.invoiceNumber} strong />
        <Row label={t('date')} value={formatDateTime(sale.saleDate)} />
        <Row label={t('cashier')} value={user?.fullName || t('common:dash')} />
        <Row label={t('customer')} value={sale.customer?.name || t('walkIn')} />
      </section>

      <div className="rcpt-rule" />

      <table className="rcpt-table">
        <thead>
          <tr>
            <th className="rcpt-th-item">{t('item')}</th>
            <th className="rcpt-th-qty">{t('qty')}</th>
            <th className="rcpt-th-amt">{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="rcpt-empty">
                {t('noItems')}
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const qty = toNumber(item.quantity)
              const price = toNumber(item.unitPrice)
              const line = toNumber(item.lineTotal)
              const discount = toNumber(item.discount)
              return (
                <tr key={item.id || `${item.productId}-${idx}`}>
                  <td className="rcpt-td-item">
                    <div className="rcpt-item-name">{item.product?.name || t('itemFallback')}</div>
                    <div className="rcpt-item-sub">
                      {qty} × {formatMoney(price, symbol, 2)}
                      {discount > 0 ? ` (−${formatMoney(discount, symbol, 2)})` : ''}
                    </div>
                  </td>
                  <td className="rcpt-td-qty">{qty}</td>
                  <td className="rcpt-td-amt">{formatMoney(line, symbol, 2)}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className="rcpt-rule" />

      <section className="rcpt-totals">
        <Row label={t('subtotal')} value={formatMoney(sale.subtotal, symbol)} />
        {toNumber(sale.discountAmount) > 0 ? (
          <Row label={t('discount')} value={`−${formatMoney(sale.discountAmount, symbol)}`} />
        ) : null}
        {toNumber(sale.taxAmount) > 0 ? (
          <Row label={t('tax')} value={formatMoney(sale.taxAmount, symbol)} />
        ) : null}
        <div className="rcpt-total-box">
          <Row label={t('total')} value={formatMoney(sale.grandTotal, symbol)} strong large />
        </div>
        <Row
          label={t('paidWithMethod', { method: sale.paymentMethod })}
          value={formatMoney(sale.paidAmount, symbol)}
        />
        <Row label={t('change')} value={formatMoney(sale.changeAmount ?? 0, symbol)} />
      </section>

      <div className="rcpt-rule rcpt-rule--double" />

      <footer className="rcpt-footer">
        <p className="rcpt-thanks">{tenant?.receiptFooter || t('defaultThanks')}</p>
        <p className="rcpt-powered">{t('poweredBy')}</p>
      </footer>
    </div>
  )
}
