'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, FileText } from 'lucide-react'

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  folder?: string
  accept?: string
  label?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  folder = 'catalog', 
  accept = 'image/*',
  label = 'Image'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

      onChange(publicUrl)
    } catch {
      console.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onChange(null)
  }

  const isPdf = value?.toLowerCase().includes('.pdf')

  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-slate-600 pl-4">{label}</label>}
      {value ? (
        <div className="relative inline-block">
          {isPdf ? (
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl w-24 h-24 flex-col justify-center text-center">
              <FileText className="text-slate-600" size={24} />
              <span className="text-[10px] text-slate-700 truncate w-full">PDF File</span>
            </div>
          ) : (
            <img
              src={value}
              alt="Uploaded"
              className="w-24 h-24 rounded-2xl object-cover border border-slate-200"
            />
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-3 px-6 py-4 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <span className="text-sm">Uploading...</span>
          ) : (
            <>
              <Upload size={16} />
              <span className="text-sm">Upload file</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
