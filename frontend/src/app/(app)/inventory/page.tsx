'use client'

import { useState } from 'react'
import { StockLevelBadge } from '@/components/modules/inventory/StockLevelBadge'
import { useInventory } from '@/lib/hooks/useInventory'

export default function InventoryPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const { data, isLoading } = useInventory({ page, pageSize })

  const items = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Inventory</h1>
        <p className="mt-1 text-body text-text-secondary">
          {total > 0 ? `${total} items` : 'No inventory yet'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No inventory items found.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">SKU</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Name</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">On Hand</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={`${item.locationId}:${item.sku}`}
                    className="last:border-0 border-b border-border-subtle transition-colors hover:bg-black/[0.02]"
                  >
                    <td className="px-5 py-3 font-mono text-sm text-body text-text-primary">{item.sku}</td>
                    <td className="px-5 py-3 text-body text-text-primary">{item.name}</td>
                    <td className="px-5 py-3 text-body text-text-primary">{item.onHand}</td>
                    <td className="px-5 py-3">
                      <StockLevelBadge
                        onHand={item.onHand}
                        threshold={item.lowStockThreshold ?? 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-footnote text-text-secondary">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-[8px] px-3 py-1.5 text-subhead text-text-secondary transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-[8px] px-3 py-1.5 text-subhead text-text-secondary transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
