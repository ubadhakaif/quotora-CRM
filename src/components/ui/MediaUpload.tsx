'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Film, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'

interface MediaUploadProps {
  images: string[]
  onImagesChange: (urls: string[]) => void
  videoUrl: string | null
  onVideoChange: (url: string | null) => void
  folder?: string
}

export function MediaUpload({
  images,
  onImagesChange,
  videoUrl,
  onVideoChange,
  folder = 'catalog'
}: MediaUploadProps) {
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [tempVideoUrl, setTempVideoUrl] = useState('')
  const imageFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Handle uploading a single image to the images array
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      const file = files[0]
      const ext = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      onImagesChange([...images, publicUrl])
    } catch (err) {
      console.error('Image upload failed:', err)
    } finally {
      setUploadingImage(false)
      if (imageFileRef.current) imageFileRef.current.value = ''
    }
  }

  // Handle uploading a video file
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingVideo(true)
    try {
      const file = files[0]
      const ext = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}_video_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName)

      onVideoChange(publicUrl)
      setShowVideoInput(false)
    } catch (err) {
      console.error('Video upload failed:', err)
    } finally {
      setUploadingVideo(false)
      if (videoFileRef.current) videoFileRef.current.value = ''
    }
  }

  const handleRemoveImage = (indexToRemove: number) => {
    onImagesChange(images.filter((_, idx) => idx !== indexToRemove))
  }

  const handleRemoveVideo = () => {
    onVideoChange(null)
  }

  const handleLinkVideo = () => {
    if (tempVideoUrl.trim()) {
      onVideoChange(tempVideoUrl.trim())
      setTempVideoUrl('')
      setShowVideoInput(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Images Section ─── */}
      <div className="space-y-3">
        <label className="text-sm text-slate-600 pl-4 block">Images Gallery (Upload multiple)</label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((url, idx) => (
            <div key={url + idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group">
              <img
                src={url}
                alt={`Gallery image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-2 right-2 bg-slate-900/90 text-white rounded-full p-1.5 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[9px] bg-slate-900/85 text-white rounded-md font-bold uppercase select-none">
                {idx === 0 ? 'Cover' : `#${idx + 1}`}
              </span>
            </div>
          ))}

          {/* Add Image Button */}
          <button
            type="button"
            onClick={() => imageFileRef.current?.click()}
            disabled={uploadingImage}
            className="aspect-square rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploadingImage ? (
              <span className="text-xs font-semibold">Uploading...</span>
            ) : (
              <>
                <Upload size={18} className="stroke-[1.5]" />
                <span className="text-xs font-semibold">Add image</span>
              </>
            )}
          </button>
        </div>

        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* ─── Video Section ─── */}
      <div className="space-y-3">
        <label className="text-sm text-slate-600 pl-4 block">Feature Video</label>

        {videoUrl ? (
          <div className="relative inline-block w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Film size={20} className="text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Video File / Link Attached</p>
                  <a href={videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:underline truncate block">
                    {videoUrl}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="bg-slate-950 text-white rounded-full p-2 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Local Video Preview if it is a direct link to video file */}
            {videoUrl.match(/\.(mp4|webm|ogg|mov)/i) && (
              <div className="mt-3 aspect-video w-full rounded-xl overflow-hidden bg-black">
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!showVideoInput ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => videoFileRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer text-xs font-bold disabled:opacity-50"
                >
                  <Upload size={14} />
                  {uploadingVideo ? 'Uploading...' : 'Upload Video File'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoInput(true)}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer text-xs font-bold"
                >
                  <LinkIcon size={14} />
                  Link Video URL
                </button>
              </div>
            ) : (
              <div className="flex gap-2 max-w-lg bg-slate-50 border border-slate-200 rounded-full p-1.5 pl-4 items-center">
                <LinkIcon size={14} className="text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={tempVideoUrl}
                  onChange={e => setTempVideoUrl(e.target.value)}
                  placeholder="Paste video URL (mp4 link, YouTube, etc.)"
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none border-none"
                />
                <button
                  type="button"
                  onClick={handleLinkVideo}
                  className="bg-slate-900 text-white rounded-full px-4 py-2 text-[10px] font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Attach
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideoInput(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}
