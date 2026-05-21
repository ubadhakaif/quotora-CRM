'use client'

import { useState } from 'react'
import { Car, Layers, Wrench, Fuel, Settings } from 'lucide-react'
import ModelsTab from './models/page'
import VariantsTab from './variants/page'
import AccessoriesTab from './accessories/page'
import FuelsTab from './fuels/page'
import TransmissionsTab from './transmissions/page'

const tabs = [
  { id: 'models', label: 'Models', icon: Car },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'fuels', label: 'Fuel Types', icon: Fuel },
  { id: 'transmissions', label: 'Transmissions', icon: Settings },
  { id: 'accessories', label: 'Accessories', icon: Wrench },
]

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('models')

  return (
    <div className="space-y-6">
      {/* Quick Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2.5 px-5 py-4 rounded-[2rem] text-sm font-bold transition-all cursor-pointer border
                ${isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
      {activeTab === 'fuels' && <FuelsTab />}
      {activeTab === 'transmissions' && <TransmissionsTab />}
      {activeTab === 'accessories' && <AccessoriesTab />}
    </div>
  )
}
