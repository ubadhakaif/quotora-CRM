'use client'

import { Car, Layers, Wrench, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const catalogSections = [
  {
    href: '/dashboard/catalog/models',
    label: 'Models',
    description: 'Vehicle models organized by category',
    icon: Car,
  },
  {
    href: '/dashboard/catalog/variants',
    label: 'Variants',
    description: 'Trim levels, pricing, and specifications',
    icon: Layers,
  },
  {
    href: '/dashboard/catalog/accessories',
    label: 'Accessories',
    description: 'Optional accessories and add-ons',
    icon: Wrench,
  },
]

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {catalogSections.map(section => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 flex flex-col gap-4 hover:border-slate-300 transition-all"
            >
              <Icon size={22} className="text-slate-500 group-hover:text-slate-900 transition-colors" />
              <div className="space-y-1">
                <p className="text-slate-900">{section.label}</p>
                <p className="text-sm text-slate-500">{section.description}</p>
              </div>
              <div className="mt-auto pt-2">
                <span className="inline-flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-900 transition-colors">
                  Manage <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
