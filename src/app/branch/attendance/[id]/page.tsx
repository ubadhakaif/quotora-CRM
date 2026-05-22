'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { 
  ArrowLeft, User, Mail, MapPin, Calendar, Clock, 
  ExternalLink, ShieldAlert, ShieldCheck, Image as ImageIcon
} from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
}

interface AttendanceRecord {
  id: string
  date: string
  check_in: string
  check_out: string | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave'
  profile_id: string
  branch_id: string | null
  selfie_url: string | null
  latitude: number | null
  longitude: number | null
  profiles?: Profile | null
}

export default function BranchAttendanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile: managerProfile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()
  const id = params?.id as string

  const [log, setLog] = useState<AttendanceRecord | null>(null)
  const [branchName, setBranchName] = useState<string>('Branch Office')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!id || !managerProfile) return

    const fetchDetails = async () => {
      setLoading(true)
      try {
        // Fetch attendance record and join profile details
        const { data: logData, error: logError } = await supabase
          .from('employee_attendance')
          .select('*, profiles(id, name, email, role, branch_id)')
          .eq('id', id)
          .single()

        if (logError) throw logError
        if (!logData) throw new Error('Attendance record not found')

        const record = logData as AttendanceRecord

        // Security Check: Ensure the employee belongs to the manager's branch OR it is the manager's own log
        const isOwnLog = record.profile_id === managerProfile.id
        const isBranchStaff = record.profiles?.branch_id === managerProfile.branch_id

        if (!isOwnLog && !isBranchStaff) {
          addToast('Access denied: Record does not belong to your branch.', 'error')
          router.push('/branch/attendance')
          return
        }

        setLog(record)

        // Fetch branch name
        const branchId = record.profiles?.branch_id || record.branch_id
        if (branchId) {
          const { data: bData } = await supabase
            .from('branches')
            .select('name')
            .eq('id', branchId)
            .single()
          
          if (bData?.name) {
            setBranchName(bData.name)
          }
        }
      } catch (err: any) {
        addToast(err.message || 'Failed to fetch verification details', 'error')
        router.push('/branch/attendance')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id, managerProfile, supabase, router, addToast])

  const calculateHours = (inStr: string, outStr: string | null) => {
    if (!outStr) return 'Active'
    const diff = new Date(outStr).getTime() - new Date(inStr).getTime()
    const hours = diff / (1000 * 60 * 60)
    return `${hours.toFixed(2)} hrs`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-slate-100 border-t-slate-900 animate-spin" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Fetching details...</p>
        </div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="text-center py-20 text-slate-500 text-xs font-semibold">
        Attendance record details not found.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      {/* Back Link - Hidden on Mobile */}
      <div className="hidden md:block">
        <Link 
          href="/branch/attendance" 
          className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Attendance Desk
        </Link>
      </div>

      {/* Hero Header Block */}
      <div className="bg-white border border-slate-200 rounded-[3rem] p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification Log</span>
            <span
              className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                log.status === 'present'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : log.status === 'half_day'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {log.status}
            </span>
          </div>
          <h2 className="text-3xl text-slate-900 leading-tight">
            {log.profiles?.name || 'Employee Attendance'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              {new Date(log.date).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              {log.profiles?.role === 'branch_manager' ? 'Branch Manager' : 'Sales Executive'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{branchName}</span>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Shift Hours</p>
          <p className="text-4xl text-slate-900 leading-none mt-1 font-semibold">
            {calculateHours(log.check_in, log.check_out)}
          </p>
        </div>
      </div>

      {/* Verification details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Selfie Photo Verification */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
            <ImageIcon size={16} className="text-slate-400" /> Check-In Selfie Capture
          </h3>
          {log.selfie_url ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full aspect-square max-w-md rounded-[2rem] overflow-hidden border border-slate-200 bg-slate-50 relative">
                <img 
                  src={log.selfie_url} 
                  alt="Check-in Verification Selfie"
                  className="w-full h-full object-cover" 
                />
              </div>
              <a 
                href={log.selfie_url}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-start gap-3 bg-slate-900 text-white rounded-full py-3 px-6 text-xs font-semibold hover:bg-slate-800 transition-colors w-full md:w-auto"
              >
                View Fullscreen Selfie <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-[2rem] p-12 text-center text-slate-500 text-xs italic bg-slate-50">
              No check-in verification selfie was captured or uploaded for this shift.
            </div>
          )}
        </div>

        {/* Right: GPS Location & Shift Metadata */}
        <div className="space-y-8">
          {/* Geolocation Coordinate details */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <MapPin size={16} className="text-slate-400" /> Geolocation Verification
            </h3>
            {log.latitude && log.longitude ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Latitude</span>
                    <span className="text-slate-900 font-medium text-sm">{Number(log.latitude).toFixed(6)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Longitude</span>
                    <span className="text-slate-900 font-medium text-sm">{Number(log.longitude).toFixed(6)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs text-slate-600 leading-relaxed">
                  Checking in from localized coordinates. Geofencing parameters verify check-in timestamp matched proximity rules.
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-start gap-3 bg-white border border-slate-200 text-slate-700 rounded-full py-3 px-6 text-xs font-semibold hover:bg-slate-50 transition-colors w-full"
                >
                  <MapPin size={14} className="text-rose-500" /> Open Coordinates in Google Maps <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-[2rem] p-12 text-center text-slate-500 text-xs italic bg-slate-50">
                No GPS geolocation coordinates were captured for this attendance record.
              </div>
            )}
          </div>

          {/* Detailed Shift Logs Card */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Clock size={16} className="text-slate-400" /> Shift Timeline Details
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Check-In Time</span>
                <span className="font-bold text-slate-900">
                  {new Date(log.check_in).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Check-Out Time</span>
                <span className="font-bold text-slate-900">
                  {log.check_out ? (
                    new Date(log.check_out).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                      timeZone: 'Asia/Kolkata'
                    })
                  ) : (
                    <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold">Active Shift</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400 font-medium">Roster Date</span>
                <span className="font-bold text-slate-900">
                  {new Date(log.date).toLocaleDateString([], {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
