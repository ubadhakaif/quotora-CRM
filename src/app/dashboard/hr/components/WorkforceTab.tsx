'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, User, Mail, Search, Building2, Lock, Eye, EyeOff, Phone } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
  is_active: boolean
  phone: string | null
  permissions?: Record<string, boolean>
}

interface Branch {
  id: string
  name: string
}

export function WorkforceTab() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState('employee')
  const [formBranchId, setFormBranchId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPermissions, setFormPermissions] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on search filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

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
      supabase.from('profiles').select('*').order('created_at'),
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
    setFormPhone('')
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
    setFormPhone(emp.phone || '')
    setFormPassword('')
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
    setFormPhone('')
    setFormPassword('')
    setFormRole('employee')
    setFormBranchId('')
    setFormIsActive(true)
    setFormPermissions({})
    setShowPassword(false)
  }

  const handlePhoneChange = (val: string) => {
    const numericVal = val.replace(/\D/g, '')
    if (numericVal.length <= 10) {
      setFormPhone(numericVal)
    }
  }

  const handleSaveEmployee = async () => {
    if (!formName.trim() || !profile) return

    // If phone number is supplied, it must be exactly 10 digits
    if (formPhone.trim() && formPhone.trim().length !== 10) {
      addToast('Phone number must be exactly 10 digits', 'error')
      return
    }

    setSaving(true)

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formName.trim(),
            phone: formPhone.trim() || null,
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
            phone: formPhone.trim() || null,
            role: formRole,
            branch_id: formBranchId || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create employee')
        
        const createdUserId = data.user?.id || data.user_id
        if (createdUserId && Object.keys(formPermissions).length > 0) {
          await supabase.from('profiles').update({ permissions: formPermissions }).eq('id', createdUserId)
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
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.phone && e.phone.includes(search))
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
            placeholder="Search employees by name, email, or phone..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen && !editingEmployee ? closePanel : openAddPanel}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto cursor-pointer"
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
                  className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700">Active Account</span>
              </label>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="emp-name" className="text-sm text-slate-600 pl-4 font-semibold">Full name</label>
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
                <label htmlFor="emp-email" className="text-sm text-slate-600 pl-4 font-semibold">Email</label>
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

              <div className="space-y-2">
                <label htmlFor="emp-phone" className="text-sm text-slate-600 pl-4 font-semibold">Phone number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="emp-phone"
                    type="text"
                    value={formPhone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {!editingEmployee && (
              <div className="space-y-2">
                <label htmlFor="emp-password" className="text-sm text-slate-600 pl-4 font-semibold">Password</label>
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
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="emp-role" className="text-sm text-slate-600 pl-4 font-semibold">Role</label>
                <select
                  id="emp-role"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="dealer_admin">Dealer Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="emp-branch" className="text-sm text-slate-600 pl-4 font-semibold">Branch</label>
                <select
                  id="emp-branch"
                  value={formBranchId}
                  onChange={e => setFormBranchId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
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
              <label className="text-sm font-semibold text-slate-900 pl-2">Custom Permissions</label>
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
                      className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all cursor-pointer"
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
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEmployee}
              disabled={!formName.trim() || (!editingEmployee && (!formEmail.trim() || !formPassword.trim() || formPassword.length < 6)) || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto cursor-pointer"
            >
              {saving ? 'Saving...' : editingEmployee ? 'Update employee' : 'Create employee'}
            </button>
          </div>
        </div>
      )}

      {/* Employees Table List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[2rem]" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center">
          <User className="mx-auto text-slate-300 mb-3" size={42} />
          <p className="text-sm text-slate-500 font-medium">No employees found matching search criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Employee</th>
                  <th className="py-5 px-6">Phone Number</th>
                  <th className="py-5 px-6">Branch</th>
                  <th className="py-5 px-6">Role</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(emp => {
                  const empBranchName = getBranchName(emp.branch_id)
                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors ${!emp.is_active ? 'opacity-60' : ''}`}>
                      {/* Employee Name & Email */}
                      <td className="py-5 px-6 md:px-8 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{emp.name}</p>
                            <p className="text-[11px] text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                        {emp.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            {emp.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="py-5 px-6 min-w-[150px]">
                        {empBranchName ? (
                          <span className="text-xs bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-3 py-1 font-semibold inline-flex items-center gap-1">
                            <Building2 size={11} />
                            {empBranchName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-5 px-6 min-w-[120px]">
                        <span className="text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1 font-bold">
                           {roleLabel(emp.role)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-5 px-6 min-w-[100px]">
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                          emp.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                        <button
                          onClick={() => openEditPanel(emp)}
                          className="bg-slate-900 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows)
              setCurrentPage(1)
            }}
          />
        </div>
      )}
    </div>
  )
}
