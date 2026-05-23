'use client'

import { useState, useEffect } from 'react'
import { Car, Layers, Wrench, Fuel, Settings, FileUp, HelpCircle, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { importVariantsFromCSV, importAccessoriesFromCSV, ImportProgress } from '@/lib/catalogImport'
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
  { id: 'import', label: 'Import CSV', icon: FileUp },
]

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('models')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [importType, setImportType] = useState<'variants' | 'accessories'>('variants')
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [copied, setCopied] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setProgress(null)
    }
  }

  const handleCopyTemplate = () => {
    const template = importType === 'variants'
      ? 'model_name,variant_name,base_price,fuel_type,transmission_type,variant_order\nNexon,XZ Plus,950000,Petrol,Manual,1\nNexon,EV Max,1450000,Electric,Automatic,2'
      : 'accessory_name,price,category_name\nAll-Weather Mats,4500,Protection\nPremium Seat Covers,8500,Comfort'

    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('Sample template copied to clipboard', 'success')
  }

  const handleImport = async () => {
    if (!file || !profile?.tenant_id) return
    setIsParsing(true)
    
    try {
      const text = await file.text()
      
      const onProgressUpdate = (currentProgress: ImportProgress) => {
        setProgress(currentProgress)
      }

      let finalResult: ImportProgress

      if (importType === 'variants') {
        finalResult = await importVariantsFromCSV(
          text,
          profile.tenant_id,
          supabase,
          onProgressUpdate
        )
      } else {
        finalResult = await importAccessoriesFromCSV(
          text,
          profile.tenant_id,
          supabase,
          onProgressUpdate
        )
      }

      if (finalResult.errors.length === finalResult.total && finalResult.total > 0) {
        addToast('CSV Import failed. Check error log.', 'error')
      } else {
        addToast(`Successfully imported ${finalResult.created + finalResult.updated} items!`, 'success')
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (err: any) {
      addToast(err.message || 'Error parsing file', 'error')
    } finally {
      setIsParsing(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setProgress(null)
    setIsParsing(false)
  }

  return (
    <div className="space-y-6">
      {/* Standard Underline Tab bar with Horizontal Hidden Scroll */}
      <div className="border-b border-slate-200 w-full relative">
        <nav className="flex -mb-px space-x-4 sm:space-x-8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tabs">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  // Auto-switch import type to match tab for better UX
                  if (tab.id === 'variants') setImportType('variants')
                  if (tab.id === 'accessories') setImportType('accessories')
                }}
                className={`
                  flex items-center justify-center sm:justify-start gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 sm:flex-initial
                  ${isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }
                `}
                title={tab.label}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* CSV Import Panel inside tab view */}
      {activeTab === 'import' && (
        <div className="bg-white border border-slate-200 rounded-none p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-950">Bulk CSV Pricing & Catalog Automation</h3>
              <p className="text-xs text-slate-500">Seed new records or update prices for variants and accessories in bulk.</p>
            </div>
            
            {/* Import Type Switcher */}
            <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-none self-start md:self-auto">
              <button
                onClick={() => { setImportType('variants'); resetImport(); }}
                className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  importType === 'variants' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Variants & Models
              </button>
              <button
                onClick={() => { setImportType('accessories'); resetImport(); }}
                className={`px-4 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  importType === 'accessories' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Accessories
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CSV Layout Requirements Card */}
            <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-5 rounded-none space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <HelpCircle size={15} />
                CSV Format Instructions
              </div>
              
              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                {importType === 'variants' ? (
                  <>
                    <p>Expects the following headers (case insensitive):</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong className="text-slate-900">model_name</strong> (required)</li>
                      <li><strong className="text-slate-900">variant_name</strong> (required)</li>
                      <li><strong className="text-slate-900">base_price</strong> (required, numeric values only)</li>
                      <li><strong>fuel_type</strong> (optional, e.g. Petrol, Diesel, Electric)</li>
                      <li><strong>transmission_type</strong> (optional, e.g. Manual, Automatic)</li>
                      <li><strong>variant_order</strong> (optional, integer sorting weight)</li>
                    </ul>
                    <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                      * If the model name, fuel type, or transmission type does not exist under your dealership account, they will be automatically created on the fly.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Expects the following headers (case insensitive):</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong className="text-slate-900">accessory_name</strong> (required)</li>
                      <li><strong className="text-slate-900">price</strong> (required, numeric values only)</li>
                      <li><strong>category_name</strong> (optional, accessory category e.g. Protection, Style)</li>
                    </ul>
                    <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                      * If the category name (accessory type) does not exist under your dealership account, it will be automatically created.
                    </p>
                  </>
                )}
              </div>

              {/* Copy template block */}
              <div className="pt-2">
                <button
                  onClick={handleCopyTemplate}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 py-2.5 rounded-none text-xs font-bold transition-all cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Template Copied!' : 'Copy Sample CSV Template'}
                </button>
              </div>
            </div>

            {/* Upload Zone & Action Block */}
            <div className="lg:col-span-2 space-y-4">
              {!progress ? (
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-none p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/20 relative group">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileUp size={36} className="text-slate-400 mb-3 group-hover:text-slate-500 transition-colors" />
                  
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">Click or drag CSV here to select</p>
                      <p className="text-xs text-slate-400">Accepts strictly formatted .csv files</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Import progress & result view */
                <div className="border border-slate-200 rounded-none p-5 space-y-4 bg-slate-50/30">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-900">Import Progress</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {progress.current} / {progress.total} Rows Processed
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {progress.total > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-slate-900 h-full rounded-full transition-all duration-150"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Pricing Stat Cards Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-none text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Created</p>
                      <p className="text-lg font-bold text-emerald-700">{progress.created}</p>
                    </div>
                    <div className="bg-sky-50 border border-sky-100 p-3 rounded-none text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-600">Updated</p>
                      <p className="text-lg font-bold text-sky-700">{progress.updated}</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-none text-center">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-rose-600">Failed</p>
                      <p className="text-lg font-bold text-rose-700">{progress.errors.length}</p>
                    </div>
                  </div>

                  {/* Detailed Error Logger */}
                  {progress.errors.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                        <AlertTriangle size={14} />
                        Error Summary ({progress.errors.length} failed rows)
                      </div>
                      <div className="bg-rose-50/50 border border-rose-100/70 p-3 rounded-none max-h-32 overflow-y-auto font-mono text-[10px] text-rose-700 space-y-1">
                        {progress.errors.map((err, idx) => (
                          <div key={idx} className="border-b border-rose-100/30 pb-0.5 last:border-b-0">
                            {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completion Notice */}
                  {progress.current === progress.total && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-150 p-3.5 rounded-none text-emerald-800 text-xs font-semibold leading-relaxed">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        Import process completed. Seeding updates have been written to database.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Execution Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {file && !progress && (
                  <>
                    <button
                      onClick={resetImport}
                      className="bg-white border border-slate-200 text-slate-600 rounded-none py-3.5 px-6 hover:bg-slate-50 transition-all text-xs font-bold cursor-pointer flex-1 sm:flex-initial"
                    >
                      Clear File
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isParsing}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-none py-3.5 px-8 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 flex-grow"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Importing Catalog...
                        </>
                      ) : (
                        'Process & Import Catalog'
                      )}
                    </button>
                  </>
                )}
                
                {progress && progress.current === progress.total && (
                  <button
                    onClick={resetImport}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-none py-3.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    Import Another File
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content passing refreshTrigger */}
      {activeTab === 'models' && <ModelsTab />}
      {activeTab === 'variants' && <VariantsTab refreshTrigger={refreshTrigger} />}
      {activeTab === 'fuels' && <FuelsTab />}
      {activeTab === 'transmissions' && <TransmissionsTab />}
      {activeTab === 'accessories' && <AccessoriesTab refreshTrigger={refreshTrigger} />}
    </div>
  )
}
