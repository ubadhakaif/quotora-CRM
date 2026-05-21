'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, User, Mail, Shield, Building, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compress image client-side and upload to Supabase Storage bucket
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file.', 'error')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      addToast('Image must be under 8MB.', 'error')
      return
    }

    setCompressing(true)
    try {
      const base64Str = await compressImage(file)
      
      // Convert Base64 back to Blob for storage upload
      const blob = dataURLtoBlob(base64Str)
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `avatars/${profile?.id || 'user'}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, blob, { 
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          cacheControl: '3600', 
          upsert: true 
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      setAvatar(publicUrl)
      addToast('Profile picture uploaded successfully! Click save to apply changes.', 'success')
    } catch (err: any) {
      console.error('Error uploading image:', err)
      addToast(`Upload failed: ${err.message || 'Please check storage bucket config.'}`, 'error')
    } finally {
      setCompressing(false)
    }
  }

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 250
          const MAX_HEIGHT = 250
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8) // High quality compress
          resolve(dataUrl)
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    if (!name.trim()) {
      addToast('Name field cannot be empty.', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          avatar_url: avatar,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      addToast('Profile updated successfully!', 'success')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      addToast(err.message || 'Failed to update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'dealer_admin': return 'Dealer Administrator'
      case 'branch_manager': return 'Branch Manager'
      default: return 'Sales Executive'
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-8 max-w-2xl mx-auto shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl text-slate-900 font-semibold tracking-tight">Your User Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your avatar, personal identifiers, and review role access levels.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 border border-slate-200/50 p-5 rounded-[2rem]">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-2 border-white ring-4 ring-slate-100 transition-all group-hover:brightness-90"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-semibold text-slate-600 border-2 border-white ring-4 ring-slate-100 transition-all group-hover:brightness-95">
                {(name || profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full border-2 border-white shadow-md transition-transform active:scale-90">
              <Camera size={14} />
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <h4 className="font-semibold text-slate-800 text-sm">Profile Picture</h4>
            {compressing && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 justify-center sm:justify-start">
                <RefreshCw size={10} className="animate-spin" /> Processing image...
              </p>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-3 flex items-center gap-1.5">
              <User size={12} /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-slate-900 transition-all outline-none text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-3 flex items-center gap-1.5">
              <Mail size={12} /> Registered Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              placeholder="Your email address"
              className="w-full rounded-full py-3 px-5 bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed outline-none text-sm font-medium"
              title="Registered email cannot be modified directly"
            />
          </div>
        </div>

        {/* Info Badges (Metadata) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
            <Shield size={16} className="text-slate-500 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Role Level</p>
              <p className="text-xs font-semibold text-slate-700">{profile ? getRoleLabel(profile.role) : 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
            <Building size={16} className="text-slate-500 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Branch Scope</p>
              <p className="text-xs font-semibold text-slate-700">
                {profile?.role === 'dealer_admin' ? 'Global Dealership tenant' : profile?.branch_id ? 'Assigned Branch Office' : 'Not assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || compressing}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3.5 px-8 text-sm font-medium transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Save Changes
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
