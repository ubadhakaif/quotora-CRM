// ─── Roles ───
export const ROLES = {
  DEALER_ADMIN: 'dealer_admin',
  BRANCH_MANAGER: 'branch_manager',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// ─── Permissions ───
export enum Permission {
  // Branch management
  CREATE_BRANCH = 'create_branch',
  EDIT_BRANCH = 'edit_branch',
  DEACTIVATE_BRANCH = 'deactivate_branch',
  ASSIGN_BRANCH_MANAGER = 'assign_branch_manager',

  // Employee management
  CREATE_EMPLOYEE = 'create_employee',
  EDIT_EMPLOYEE = 'edit_employee',
  DEACTIVATE_EMPLOYEE = 'deactivate_employee',
  MANAGE_PERMISSIONS = 'manage_permissions',

  // Vehicle & pricing
  MODIFY_PRICING = 'modify_pricing',
  MANAGE_CATALOG = 'manage_catalog',

  // Quotations
  CREATE_QUOTATION = 'create_quotation',
  APPROVE_QUOTATION = 'approve_quotation',
  VIEW_ALL_QUOTATIONS = 'view_all_quotations',
  REOPEN_QUOTATION = 'reopen_quotation',

  // Reports
  VIEW_REPORTS = 'view_reports',
  VIEW_BRANCH_ANALYTICS = 'view_branch_analytics',

  // Finance
  MANAGE_FINANCE = 'manage_finance',

  // Settings
  MANAGE_SETTINGS = 'manage_settings',

  // Leads
  MANAGE_LEADS = 'manage_leads',
  ASSIGN_LEADS = 'assign_leads',

  // Follow-ups
  VIEW_ALL_FOLLOWUPS = 'view_all_followups',

  // Exchange
  ADD_EXCHANGE_VEHICLE = 'add_exchange_vehicle',
}

// ─── Role → Permission Map ───
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  dealer_admin: Object.values(Permission), // Full access
  branch_manager: [
    Permission.EDIT_EMPLOYEE,
    Permission.CREATE_QUOTATION,
    Permission.APPROVE_QUOTATION,
    Permission.VIEW_ALL_QUOTATIONS,
    Permission.VIEW_BRANCH_ANALYTICS,
    Permission.MANAGE_LEADS,
    Permission.ASSIGN_LEADS,
    Permission.VIEW_ALL_FOLLOWUPS,
    Permission.ADD_EXCHANGE_VEHICLE,
  ],
  employee: [
    Permission.CREATE_QUOTATION,
    Permission.ADD_EXCHANGE_VEHICLE,
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// ─── Home Routes ───
export function getHomeRoute(role: Role): string {
  switch (role) {
    case ROLES.DEALER_ADMIN:
      return '/dashboard'
    case ROLES.BRANCH_MANAGER:
      return '/branch'
    case ROLES.EMPLOYEE:
      return '/sales'
    default:
      return '/dashboard'
  }
}

// ─── Portal Route Prefixes ───
const PORTAL_ROUTES: Record<Role, string> = {
  dealer_admin: '/dashboard',
  branch_manager: '/branch',
  employee: '/sales',
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const allowedPrefix = PORTAL_ROUTES[role]
  if (!allowedPrefix) return false
  return pathname.startsWith(allowedPrefix)
}

// ─── Nav Item Type ───
export interface NavItem {
  href: string
  label: string
  icon: string // lucide icon name
}

// ─── Per-Portal Navigation ───
export const DEALER_ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/branches', label: 'Branches', icon: 'Building2' },
  { href: '/dashboard/employees', label: 'Employees', icon: 'Users' },
  { href: '/dashboard/catalog', label: 'Catalog', icon: 'Settings' },
  { href: '/dashboard/models', label: 'Models', icon: 'Car' },
  { href: '/dashboard/accessories', label: 'Accessories', icon: 'Wrench' },
  { href: '/dashboard/leads', label: 'Leads', icon: 'Target' },
  { href: '/dashboard/quotations', label: 'Quotations', icon: 'FileText' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: 'Clock' },
  { href: '/dashboard/leave', label: 'Leave', icon: 'CalendarDays' },
  { href: '/dashboard/finance', label: 'Finance', icon: 'Landmark' },
  { href: '/dashboard/reports', label: 'Reports', icon: 'BarChart3' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
]

export const BRANCH_MANAGER_NAV: NavItem[] = [
  { href: '/branch', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/branch/employees', label: 'Employees', icon: 'Users' },
  { href: '/branch/models', label: 'Models', icon: 'Car' },
  { href: '/branch/accessories', label: 'Accessories', icon: 'Wrench' },
  { href: '/branch/leads', label: 'Leads', icon: 'Target' },
  { href: '/branch/attendance', label: 'Attendance', icon: 'Clock' },
  { href: '/branch/leave', label: 'Leave', icon: 'CalendarDays' },
  { href: '/branch/quotations', label: 'Quotations', icon: 'FileText' },
  { href: '/branch/follow-ups', label: 'Follow-ups', icon: 'PhoneCall' },
  { href: '/branch/analytics', label: 'Analytics', icon: 'BarChart3' },
]

export const SALES_EXECUTIVE_NAV: NavItem[] = [
  { href: '/sales', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/sales/quotations', label: 'Quotations', icon: 'FileText' },
  { href: '/sales/models', label: 'Models', icon: 'Car' },
  { href: '/sales/accessories', label: 'Accessories', icon: 'Wrench' },
  { href: '/sales/attendance', label: 'Attendance', icon: 'Clock' },
  { href: '/sales/leave', label: 'Leave', icon: 'CalendarDays' },
  { href: '/sales/follow-ups', label: 'Follow-ups', icon: 'PhoneCall' },
]

// ─── Per-Portal Route Titles ───
export const DEALER_ADMIN_ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/branches': 'Branches',
  '/dashboard/employees': 'Employees',
  '/dashboard/catalog': 'Catalog',
  '/dashboard/catalog/models': 'Models',
  '/dashboard/catalog/variants': 'Variants',
  '/dashboard/catalog/accessories': 'Accessories',
  '/dashboard/models': 'Vehicle Models',
  '/dashboard/accessories': 'Accessories',
  '/dashboard/leads': 'Leads',
  '/dashboard/quotations': 'Quotations',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/leave': 'Leave Management',
  '/dashboard/finance': 'Finance',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
  '/dashboard/profile': 'Profile',
}

export const BRANCH_MANAGER_ROUTE_TITLES: Record<string, string> = {
  '/branch': 'Dashboard',
  '/branch/employees': 'Employees',
  '/branch/models': 'Vehicle Models',
  '/branch/accessories': 'Accessories',
  '/branch/leads': 'Leads',
  '/branch/attendance': 'Attendance',
  '/branch/leave': 'Leave Management',
  '/branch/quotations': 'Quotations',
  '/branch/follow-ups': 'Follow-ups',
  '/branch/analytics': 'Analytics',
  '/branch/profile': 'Profile',
}

export const SALES_EXECUTIVE_ROUTE_TITLES: Record<string, string> = {
  '/sales': 'Dashboard',
  '/sales/quotations': 'Quotations',
  '/sales/models': 'Vehicle Models',
  '/sales/accessories': 'Accessories',
  '/sales/attendance': 'Attendance',
  '/sales/leave': 'Leave',
  '/sales/follow-ups': 'Follow-ups',
  '/sales/profile': 'Profile',
}
