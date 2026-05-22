'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalItems: number
  rowsPerPage: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rows: number) => void
  rowsPerPageOptions?: number[]
}

export function Pagination({
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))

  // Ensure currentPage doesn't exceed totalPages if totalItems decreases
  React.useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages)
    }
  }, [totalPages, currentPage, onPageChange])

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
  const endItem = Math.min(totalItems, currentPage * rowsPerPage)

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-5 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Records Info Summary */}
      <div className="text-xs text-slate-600 font-semibold">
        Showing <span className="text-slate-900">{startItem}</span> to{' '}
        <span className="text-slate-900">{endItem}</span> of{' '}
        <span className="text-slate-900">{totalItems}</span> records
      </div>

      {/* Spacing & Controls Group */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Rows Per Page Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="rounded-full py-1.5 px-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none hover:bg-slate-100 cursor-pointer transition-all"
          >
            {rowsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Page Switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-40 disabled:hover:text-slate-700 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center border border-slate-200"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>

          <span className="text-xs text-slate-500 font-semibold px-2 select-none">
            Page <span className="text-slate-900">{currentPage}</span> of{' '}
            <span className="text-slate-900">{totalPages}</span>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-40 disabled:hover:text-slate-700 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center border border-slate-200"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
