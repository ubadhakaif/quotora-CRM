'use client'

import { useState } from 'react'
import { Car, Layers, Wrench } from 'lucide-react'
import ModelsTab from './models/page'
import VariantsTab from './variants/page'
import AccessoriesTab from './accessories/page'

const tabs = [
  { id: 'models', label: 'Models', icon: Car },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'accessories', label: 'Accessories', icon: Wrench },
]

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('models')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1.5 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all
                ${isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'models' && <ModelsTab />}
      {activeTab === 'variants' && <VariantsTab />}
      {activeTab === 'accessories' && <AccessoriesTab />}
    </div>
  )
}
