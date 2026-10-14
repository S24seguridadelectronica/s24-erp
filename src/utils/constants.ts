export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'S24 Seguridad Electrónica',
  timezone: import.meta.env.VITE_APP_TIMEZONE || 'America/Bogota',
  currency: import.meta.env.VITE_APP_CURRENCY || 'COP',
  locale: 'es-CO',
}

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { key: 'crm', label: 'CRM', icon: 'Users', path: '/crm' },
  { key: 'call_center', label: 'Call Center', icon: 'Phone', path: '/call-center' },
  { key: 'sales', label: 'Ventas', icon: 'ShoppingCart', path: '/sales' },
  { key: 'operations', label: 'Operaciones', icon: 'Wrench', path: '/operations' },
  { key: 'inventory', label: 'Inventario', icon: 'Package', path: '/inventory' },
  { key: 'finance', label: 'Finanzas', icon: 'DollarSign', path: '/finance' },
  { key: 'cms', label: 'CMS', icon: 'Globe', path: '/cms' },
  { key: 'reports', label: 'Informes', icon: 'BarChart', path: '/reports' },
  { key: 'admin', label: 'Administración', icon: 'Settings', path: '/admin' },
] as const