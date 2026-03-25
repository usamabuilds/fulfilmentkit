'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { StockLevelBadge } from '@/components/modules/inventory/StockLevelBadge'
import { useInventory } from '@/lib/hooks/useInventory'
import { useLocations } from '@/lib/hooks/useLocations'

export default function InventoryPage() {
  const [page, setPage] = useState(1)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const pageSize = 20

  const { data, isLoading } = useInventory({
    page,
    pageSize,
    locationId: selectedLocationId || undefined,
    search: search || undefined,
  })
  const { data: locationsData, isLoading: isLocationsLoading } = useLocations()

  const items = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const locations = locationsData?.data?.items ?? []

  const handleLocationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocationId(event.target.value)
    setPage(1)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Inventory</h1>
        <p className="mt-1 text-body text-text-secondary">
          {total > 0 ? `${total} items` : 'No inventory yet'}
        </p>
      </div>

      <div className="glass-panel p-4">
        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by SKU or name"
            className="w-full rounded-[10px] border border-border-subtle bg-transparent px-3 py-2 text-body text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-border-strong"
          />
          <button
            type="submit"
            className="rounded-[8px] border border-border-subtle px-4 py-2 text-subhead text-text-secondary transition-all hover:bg-black/5"
          >
            Search
          </button>
        </form>

        <label htmlFor="location-filter" className="mb-2 block text-subhead text-text-secondary">
          Location
        </label>
        <select
          id="location-filter"
          value={selectedLocationId}
          onChange={handleLocationChange}
          disabled={isLocationsLoading}
          className="w-full rounded-[10px] border border-border-subtle bg-transparent px-3 py-2 text-body text-text-primary outline-none transition-colors focus:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.code} · {location.name}
            </option>
          ))}
        </select>
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
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Available</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Reserved</th>
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
                    <td className="px-5 py-3 text-body text-text-primary">{item.available}</td>
                    <td className="px-5 py-3 text-body text-text-primary">{item.reserved}</td>
                    <td className="px-5 py-3 text-body text-text-primary">{item.onHand}</td>
                    <td className="px-5 py-3">
                      <StockLevelBadge
                        onHand={item.available}
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
