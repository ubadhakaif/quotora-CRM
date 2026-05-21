'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, User, Mail, Search, Building2, Lock, Eye, EyeOff } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
  is_active: boolean
  permissions?: Record<string, boolean>
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
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState('employee')
  const [formBranchId, setFormBranchId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPermissions, setFormPermissions] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  // We'll define a quick list of key permissions here for the UI
  const availablePermissions = [
    { key: 'create_quotation', label: 'Create Quotations' },
    { key: 'approve_quotation', label: 'Approve Quotations' },
    { key: 'manage_leads', label: 'Manage Leads' },
    { key: 'view_branch_analytics', label: 'View Branch Analytics' },
    { key: 'add_exchange_vehicle', label: 'Add Exchange Vehicles' }
  ]

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

  const openAddPanel = () => {
    setEditingEmployee(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('employee')
    setFormBranchId('')
    setFormIsActive(true)
    setFormPermissions({})
    setShowPassword(false)
    setPanelOpen(true)
  }

  const openEditPanel = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormName(emp.name)
    setFormEmail(emp.email)
    setFormPassword('') // Cannot edit password easily here
    setFormRole(emp.role)
    setFormBranchId(emp.branch_id || '')
    setFormIsActive(emp.is_active)
    setFormPermissions(emp.permissions || {})
    setShowPassword(false)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingEmployee(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('employee')
    setFormBranchId('')
    setFormIsActive(true)
    setFormPermissions({})
    setShowPassword(false)
  }

  const handleSaveEmployee = async () => {
    if (!formName.trim() || !profile) return
    setSaving(true)

    try {
      if (editingEmployee) {
        // Update existing profile (Dealer Admin has access to do this)
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formName.trim(),
            role: formRole,
            branch_id: formBranchId || null,
            is_active: formIsActive,
            permissions: formPermissions,
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
        addToast('Employee updated successfully', 'success')
        closePanel()
        fetchData()
      } else {
        // Create new employee via API
        if (!formEmail.trim() || !formPassword.trim()) {
          throw new Error('Email and password are required for new employees')
        }
        if (formPassword.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        const res = await fetch('/api/employees/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail.trim().toLowerCase(),
            password: formPassword,
            name: formName.trim(),
            role: formRole,
            branch_id: formBranchId || null,
            // the API currently doesn't accept permissions, we'd have to update them after, 
            // but default is fine for new employees
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create employee')
        
        // If we set permissions, we should update the newly created profile
        if (Object.keys(formPermissions).length > 0) {
          await supabase.from('profiles').update({ permissions: formPermissions }).eq('id', data.user.id)
        }

        addToast('Employee created successfully', 'success')
        closePanel()
        fetchData()
      }
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
          onClick={panelOpen && !editingEmployee ? closePanel : openAddPanel}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto"
        >
          {panelOpen && !editingEmployee ? <X size={18} /> : <Plus size={18} />}
          {panelOpen && !editingEmployee ? 'Close panel' : 'Add employee'}
        </button>
      </div>

      {/* Edit/Add Employee Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg text-slate-900 pl-2">{editingEmployee ? 'Edit employee' : 'New employee'}</h3>
              {!editingEmployee && (
                <p className="text-sm text-slate-500 pl-2">
                  Create a login account for the employee.
                </p>
              )}
            </div>
            {editingEmployee && (
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Active Account</span>
              </label>
            )}
          </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="emp-email" className="text-sm text-slate-600 pl-4">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="emp-email"
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    disabled={!!editingEmployee}
                    placeholder="employee@company.com"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div className="space-y-2">
                  <label htmlFor="emp-password" className="text-sm text-slate-600 pl-4">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="emp-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full rounded-full py-4 pl-14 pr-14 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
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
            
            {/* Permissions Section */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-slate-900 pl-2">Custom Permissions</label>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {availablePermissions.map(perm => (
                  <label key={perm.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!formPermissions[perm.key]}
                      onChange={(e) => {
                        setFormPermissions(prev => ({
                          ...prev,
                          [perm.key]: e.target.checked
                        }))
                      }}
                      className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{perm.label}</span>
                  </label>
                ))}
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
              disabled={!formName.trim() || (!editingEmployee && (!formEmail.trim() || !formPassword.trim() || formPassword.length < 6)) || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Saving...' : editingEmployee ? 'Update employee' : 'Create employee'}
            </button>
          </div>
        </div>
      )}

      {/* Employees List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[2rem]" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div />
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => openEditPanel(emp)}
                className={`w-full text-left p-4 md:p-8 px-6 md:px-12 flex items-center gap-4 hover:bg-slate-50 transition-colors ${!emp.is_active ? 'opacity-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-600 shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 truncate">{emp.name}</p>
                    {!emp.is_active && (
                      <span className="text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">Inactive</span>
                    )}
                  </div>
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
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
