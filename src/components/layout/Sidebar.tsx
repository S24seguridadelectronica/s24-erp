import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Users, Phone, ShoppingCart, Wrench, Package, DollarSign,
  Globe, BarChart, Settings, LogOut, Shield, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, UserCircle, Target, FileText, ClipboardList,
  ArrowDownUp, Truck, CreditCard, TrendingUp, Receipt, PieChart,
} from 'lucide-react';
import './Sidebar.css';

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Phone, ShoppingCart, Wrench, Package, DollarSign, Globe, BarChart, Settings,
};

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { key: 'crm', label: 'CRM', icon: 'Users', path: '/crm',
    children: [
      { key: 'customers', label: 'Clientes', path: '/crm' },
      { key: 'opportunities', label: 'Oportunidades', path: '/crm/opportunities' },
    ],
  },
  { key: 'sales', label: 'Ventas', icon: 'ShoppingCart', path: '/sales',
    children: [
      { key: 'quotes', label: 'Cotizaciones', path: '/sales' },
    ],
  },
  { key: 'operations', label: 'Operaciones', icon: 'Wrench', path: '/operations',
    children: [
      { key: 'work_orders', label: 'Órdenes de Trabajo', path: '/operations' },
    ],
  },
  { key: 'inventory', label: 'Inventario', icon: 'Package', path: '/inventory',
    children: [
      { key: 'products', label: 'Productos', path: '/inventory' },
      { key: 'movements', label: 'Movimientos', path: '/inventory/movements' },
      { key: 'suppliers', label: 'Proveedores', path: '/inventory/suppliers' },
    ],
  },
  { key: 'finance', label: 'Finanzas', icon: 'DollarSign', path: '/finance',
    children: [
      { key: 'dashboard', label: 'Dashboard', path: '/finance' },
      { key: 'receivables', label: 'Por Cobrar', path: '/finance/receivables' },
      { key: 'payables', label: 'Por Pagar', path: '/finance/payables' },
      { key: 'transactions', label: 'Transacciones', path: '/finance/transactions' },
    ],
  },
  { key: 'reports', label: 'Informes', icon: 'BarChart', path: '/reports',
    children: [
      { key: 'dashboard', label: 'Dashboard', path: '/reports' },
      { key: 'sales', label: 'Ventas', path: '/reports/sales' },
      { key: 'financial', label: 'Financiero', path: '/reports/financial' },
      { key: 'inventory', label: 'Inventario', path: '/reports/inventory' },
      { key: 'operations', label: 'Operaciones', path: '/reports/operations' },
    ],
  },
  { key: 'call_center', label: 'Call Center', icon: 'Phone', path: '/call-center' },
  { key: 'cms', label: 'CMS', icon: 'Globe', path: '/cms' },
  { key: 'admin', label: 'Administración', icon: 'Settings', path: '/admin' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['crm', 'sales', 'operations', 'inventory', 'finance', 'reports']);
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <Shield className="logo-icon" size={32} />
          {!collapsed && <span className="logo-text">S24</span>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {MENU_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus.includes(item.key);
          const isItemActive = isActive(item.path);

          return (
            <div key={item.key} className="menu-item-wrapper">
              {hasChildren ? (
                <>
                  <button className={`nav-item nav-toggle ${isItemActive ? 'active' : ''}`} onClick={() => toggleMenu(item.key)}>
                    {Icon && <Icon size={20} />}
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-arrow">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="submenu">
                      {item.children.map((child) => (
                        <NavLink key={child.key} to={child.path} className={({ isActive: isActiveLink }) => `submenu-item ${isActiveLink ? 'active' : ''}`}>
                          {child.key === 'customers' && <UserCircle size={16} />}
                          {child.key === 'opportunities' && <Target size={16} />}
                          {child.key === 'quotes' && <FileText size={16} />}
                          {child.key === 'work_orders' && <ClipboardList size={16} />}
                          {child.key === 'products' && <Package size={16} />}
                          {child.key === 'movements' && <ArrowDownUp size={16} />}
                          {child.key === 'suppliers' && <Truck size={16} />}
                          {child.key === 'dashboard' && <TrendingUp size={16} />}
                          {child.key === 'receivables' && <Receipt size={16} />}
                          {child.key === 'payables' && <CreditCard size={16} />}
                          {child.key === 'transactions' && <DollarSign size={16} />}
                          {child.key === 'sales' && <BarChart size={16} />}
                          {child.key === 'financial' && <DollarSign size={16} />}
                          {child.key === 'inventory' && <Package size={16} />}
                          {child.key === 'operations' && <Wrench size={16} />}
                          <span className="submenu-label">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink to={item.path} className={({ isActive: isActiveLink }) => `nav-item ${isActiveLink ? 'active' : ''}`}>
                  {Icon && <Icon size={20} />}
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && profile && (
          <div className="user-info">
            <div className="user-avatar">{profile.full_name?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{profile.full_name || 'Usuario'}</div>
              <div className="user-email">{profile.email}</div>
            </div>
          </div>
        )}
        <button className="logout-btn" onClick={signOut}>
          <LogOut size={20} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
