'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, RefreshCw, Check, Upload, X, MapPin, AlertCircle, HelpCircle } from 'lucide-react'

interface AttendanceCheckInPanelProps {
  profile: {
    id: string
    tenant_id: string
    branch_id: string | null
  }
  onSuccess: (attendanceRecord: any) => void
  onCancel: () => void
}

export function AttendanceCheckInPanel({ profile, onSuccess, onCancel }: AttendanceCheckInPanelProps) {
  const [cameraMode, setCameraMode] = useState<'live' | 'fallback' | 'loading'>('loading')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'success' | 'error'>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Initialize location tracking
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error')
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    setLocationStatus('detecting')
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationStatus('success')
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationStatus('error')
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please allow location access to check-in.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location details are unavailable. Check device GPS.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.')
            break
          default:
            setLocationError('An unknown error occurred while retrieving location.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Initialize camera stream
  const startCamera = async () => {
    setCameraMode('loading')
    setErrorMessage(null)
    
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraMode('fallback')
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      
      setStream(mediaStream)
      setCameraMode('live')
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      // If user denied or hardware error, fallback to system image capture/file upload
      setCameraMode('fallback')
    }
  }

  // Clean up camera stream on unmount
  useEffect(() => {
    detectLocation()
    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Start video when stream changes or mode changes
  useEffect(() => {
    if (cameraMode === 'live' && stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [cameraMode, stream])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video stream dimensions
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    // Mirror horizontal canvas draw since front-facing video is usually mirrored locally
    context.translate(width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, width, height)
    // Reset transform matrix
    context.setTransform(1, 0, 0, 1, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob)
          const previewUrl = URL.createObjectURL(blob)
          setPhotoPreview(previewUrl)
          
          // Turn off camera tracks since we have captured the image
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
          }
        }
      },
      'image/jpeg',
      0.9
    )
  }

  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoBlob(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
  }

  const retakePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoBlob(null)
    setPhotoPreview(null)
    setErrorMessage(null)
    startCamera()
  }

  const handleCheckInSubmit = async () => {
    if (!photoBlob) {
      setErrorMessage('Please capture or upload a selfie first.')
      return
    }

    if (!location) {
      setErrorMessage('Location coordinates are required. Please enable GPS and allow location access.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const timestamp = Date.now()
      const ext = photoBlob.type === 'image/png' ? 'png' : 'jpg'
      const filePath = `selfies/${profile.id}/${todayStr}_${timestamp}.${ext}`

      // 1. Upload selfie image to storage bucket 'images'
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, photoBlob, {
          contentType: photoBlob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw new Error(`Selfie upload failed: ${uploadError.message}`)

      // 2. Fetch the uploaded file's public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // 3. Insert record into employee_attendance
      const newEntry = {
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id,
        profile_id: profile.id,
        date: todayStr,
        check_in: new Date().toISOString(),
        status: 'present',
        selfie_url: publicUrl,
        latitude: location.latitude,
        longitude: location.longitude,
      }

      const { data, error: insertError } = await supabase
        .from('employee_attendance')
        .insert(newEntry)
        .select()
        .single()

      if (insertError) throw insertError

      onSuccess(data)
    } catch (err: any) {
      console.error('Check-in error:', err)
      setErrorMessage(err.message || 'An error occurred during check-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-6 space-y-6 mt-4 transition-all">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Camera size={16} className="text-slate-500" /> Verify Identity & Location
        </h4>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors"
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selfie Capture Section */}
        <div className="space-y-4">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Selfie Verification</span>

          {photoPreview ? (
            <div className="relative w-full h-64 rounded-[2rem] overflow-hidden border border-slate-200 bg-black">
              <img
                src={photoPreview}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={retakePhoto}
                className="absolute bottom-4 right-4 bg-slate-900/90 text-white hover:bg-slate-900 rounded-full px-4 py-2 text-xs flex items-center gap-2 transition-all"
              >
                <RefreshCw size={12} /> Retake
              </button>
            </div>
          ) : (
            <div className="relative w-full h-64 rounded-[2rem] overflow-hidden border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-4">
              {cameraMode === 'loading' && (
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
                  <p className="text-xs text-slate-400">Initializing camera...</p>
                </div>
              )}

              {cameraMode === 'live' && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 py-3 text-xs font-semibold flex items-center gap-2 transition-all shadow-none"
                  >
                    <Camera size={14} /> Capture Selfie
                  </button>
                </>
              )}

              {cameraMode === 'fallback' && (
                <div className="text-center space-y-4 max-w-xs">
                  <Camera size={32} className="text-slate-500 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">Camera Access Blocked / Unavailable</p>
                    <p className="text-[10px] text-slate-400">Please snap a picture using your device camera instead.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 py-3 text-xs font-semibold flex items-center gap-2 mx-auto transition-all shadow-none"
                  >
                    <Upload size={14} /> Open Device Camera
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFallbackFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Location Section */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Location Verification</span>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-5 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={18} className={`mt-0.5 ${location ? 'text-slate-800' : 'text-slate-400'}`} />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {locationStatus === 'detecting' && 'Detecting your coordinates...'}
                    {locationStatus === 'success' && 'GPS Location Secured'}
                    {locationStatus === 'error' && 'Location Detection Failed'}
                    {locationStatus === 'idle' && 'GPS Geolocation'}
                  </p>
                  
                  {locationStatus === 'success' && location && (
                    <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                      Latitude: {location.latitude.toFixed(6)}<br />
                      Longitude: {location.longitude.toFixed(6)}
                    </div>
                  )}

                  {locationStatus === 'error' && (
                    <div className="text-xs text-rose-500 mt-1 flex items-start gap-1">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>{locationError}</span>
                    </div>
                  )}

                  {locationStatus === 'detecting' && (
                    <p className="text-[10px] text-slate-400">Requesting high-accuracy GPS satellite fix...</p>
                  )}
                </div>
              </div>

              {locationStatus === 'error' && (
                <button
                  type="button"
                  onClick={detectLocation}
                  className="w-full mt-2 bg-slate-900 text-white rounded-full py-2 text-xs font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} /> Retry GPS Fetch
                </button>
              )}
            </div>
          </div>

          {/* Error and Actions */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2 text-xs text-rose-600">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 rounded-full py-3 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !photoBlob || !location}
                onClick={handleCheckInSubmit}
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 rounded-full py-3 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-none cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Checking in...
                  </>
                ) : (
                  <>
                    <Check size={12} /> Confirm Check-In
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
