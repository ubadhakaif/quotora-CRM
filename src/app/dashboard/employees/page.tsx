'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, User, Mail, Search, Building2 } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
  is_active: boolean
}

interface Branch {
  id: string
  name: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('employee')
  const [formBranchId, setFormBranchId] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const [empResult, branchResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).order('created_at'),
      supabase.from('branches').select('id, name').eq('is_active', true),
    ])

    if (empResult.error) addToast(empResult.error.message, 'error')
    else setEmployees(empResult.data || [])

    if (branchResult.error) addToast(branchResult.error.message, 'error')
    else setBranches(branchResult.data || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closePanel = () => {
    setPanelOpen(false)
    setFormName('')
    setFormEmail('')
    setFormRole('employee')
    setFormBranchId('')
  }

  const handleSaveEmployee = async () => {
    if (!formName.trim() || !formEmail.trim() || !profile) return
    setSaving(true)

    try {
      // 1. Check if the user exists in auth.users by calling our RPC function
      const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
        p_email: formEmail.trim().toLowerCase(),
      })

      if (rpcError) throw rpcError

      if (!userId) {
        throw new Error(`No registered user found with email "${formEmail}". Please ask the employee to sign up first.`)
      }

      // 2. Insert/upsert the profile linked to the employee
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          tenant_id: profile.tenant_id,
          branch_id: formBranchId || null,
          role: formRole,
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          is_active: true,
        })

      if (profileError) throw profileError

      addToast('Employee profile added successfully', 'success')
      closePanel()
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  )

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return null
    return branches.find(b => b.id === branchId)?.name || null
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'dealer_admin': return 'Admin'
      case 'branch_manager': return 'Manager'
      default: return 'Employee'
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="employee-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen ? closePanel : () => setPanelOpen(true)}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />}
          {panelOpen ? 'Close panel' : 'Add employee'}
        </button>
      </div>

      {/* Info note */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">New employee</h3>
          <p className="text-sm text-slate-500 pl-2">
            Employees must sign up themselves. Use this form to record their profile after they sign up.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="emp-name" className="text-sm text-slate-600 pl-4">Full name</label>
              <div className="relative">
                <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="emp-name"
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Employee name"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="emp-email" className="text-sm text-slate-600 pl-4">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="emp-email"
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="emp-role" className="text-sm text-slate-600 pl-4">Role</label>
                <select
                  id="emp-role"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="employee">Employee</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="dealer_admin">Dealer Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="emp-branch" className="text-sm text-slate-600 pl-4">Branch</label>
                <select
                  id="emp-branch"
                  value={formBranchId}
                  onChange={e => setFormBranchId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="">No branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={closePanel}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEmployee}
              disabled={!formName.trim() || !formEmail.trim() || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Saving...' : 'Add employee'}
            </button>
          </div>
        </div>
      )}

      {/* Employees List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[3rem]" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div />
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredEmployees.map(emp => (
              <div
                key={emp.id}
                className="p-4 md:p-8 px-6 md:px-12 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-600 shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 truncate">{emp.name}</p>
                  <p className="text-sm text-slate-500 truncate">{emp.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getBranchName(emp.branch_id) && (
                    <span className="text-xs bg-slate-50 text-slate-500 rounded-full px-3 py-1 hidden md:inline-flex items-center gap-1">
                      <Building2 size={12} />
                      {getBranchName(emp.branch_id)}
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1">
                    {roleLabel(emp.role)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
