import { Calculator, ClipboardList, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import {
  LayoutDashboard, Users, Phone, ShoppingCart, Wrench, Package, DollarSign,
  Globe, BarChart, Settings, LogOut, Shield, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, UserCircle, Target, FileText, 
  ArrowDownUp, Truck, CreditCard, TrendingUp, Receipt, Activity, Upload, Table,
  ArrowRightLeft, BarChart3
} from 'lucide-react';
import './Sidebar.css';

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Phone, ShoppingCart, Wrench, Package, DollarSign, 
  Globe, BarChart, Settings, Calculator, ClipboardList, Navigation, 
  TrendingUp // 👈 Agregamos el ícono de comisiones
};

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['crm', 'sales']);
  const { signOut, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    onMobileClose();
  }, [location.pathname]);
  
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    loadUserRole();
  }, [profile]);

  async function loadUserRole() {
    if (!profile?.id) return;

    const { data: roleData } = await (supabase.from('user_roles') as any)
      .select('roles(name)')
      .eq('user_id', profile.id)
      .maybeSingle();

    const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
    
    if (roleName === 'vendedor_campo' || roleName === 'field_sales' || roleName === 'cerrador') {
      setUserRole('vendedor_campo');
    } else if (roleName === 'cobrador_campo' || roleName === 'rutero') {
      setUserRole('cobrador_campo'); 
    } else if (roleName === 'cobrador' || roleName === 'cartera' || roleName === 'finanzas') {
      setUserRole('cobrador');
    } else if (roleName === 'salesperson' || roleName === 'vendedor' || roleName === 'preventa') {
      setUserRole('salesperson');
    } else {
      setUserRole('admin');
    }
  }

  // 👇 Menús según el rol (Agregamos Comisiones a todos)
  const MENU_ITEMS = userRole === 'cobrador_campo'
    ? [
        { key: 'my-field-collections', label: 'Mi Ruta de Cobro', icon: 'Navigation', path: '/mi-ruta-cobro' },
        { key: 'commissions', label: 'Mis Comisiones', icon: 'TrendingUp', path: '/commissions' }, // 👈
      ]
    : userRole === 'cobrador'
    ? [
        { key: 'my-collections', label: 'Mis Cobros', icon: 'DollarSign', path: '/mis-cobros' },
        { key: 'commissions', label: 'Mis Comisiones', icon: 'TrendingUp', path: '/commissions' }, // 👈
      ]
    : userRole === 'vendedor_campo'
    ? [
        { key: 'my-tasks', label: 'Mis Visitas', icon: 'ClipboardList', path: '/mis-visitas' },
        { key: 'sales', label: 'Cotizaciones', icon: 'ShoppingCart', path: '/sales' },
        { key: 'commissions', label: 'Mis Comisiones', icon: 'TrendingUp', path: '/commissions' }, // 👈
      ]
    : userRole === 'salesperson' 
    ? [
        { key: 'dashboard', label: 'Mi Dashboard', icon: 'LayoutDashboard', path: '/' },
        { key: 'crm', label: 'Mis Clientes', icon: 'Users', path: '/crm',
          children: [
            { key: 'customers', label: 'Clientes Asignados', path: '/crm' },
            { key: 'opportunities', label: 'Mis Oportunidades', path: '/crm/opportunities' },
          ],
        },
        { key: 'sales', label: 'Mis Ventas', icon: 'ShoppingCart', path: '/sales',
          children: [
            { key: 'quotes', label: 'Mis Cotizaciones', path: '/sales' },
          ],
        },
        { key: 'commissions', label: 'Mis Comisiones', icon: 'TrendingUp', path: '/commissions' }, // 👈
      ]
    : [
        // MENÚ PARA EL ADMINISTRADOR (COMPLETO)
        { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
        { key: 'crm', label: 'CRM', icon: 'Users', path: '/crm',
          children: [
            { key: 'customers', label: 'Clientes', path: '/crm' },
            { key: 'opportunities', label: 'Oportunidades', path: '/crm/opportunities' },
            { key: 'spreadsheet', label: 'Hoja de Cálculo', path: '/crm/spreadsheet' },
          ],
        },
        { key: 'sales', label: 'Ventas', icon: 'ShoppingCart', path: '/sales',
          children: [
            { key: 'quotes', label: 'Cotizaciones', path: '/sales' },
            { key: 'calculator', label: 'Calculadora CCTV', icon: 'Calculator', path: '/calculator' },
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
        { key: 'commissions', label: 'Comisiones del Equipo', icon: 'TrendingUp', path: '/commissions' }, // 👈 Movido al nivel principal
        { key: 'reports', label: 'Informes', icon: 'BarChart', path: '/reports',
          children: [
            { key: 'dashboard', label: 'Dashboard', path: '/reports' },
            { key: 'sales', label: 'Ventas', path: '/reports/sales' },
            { key: 'financial', label: 'Financiero', path: '/reports/financial' },
            { key: 'inventory', label: 'Inventario', path: '/reports/inventory' },
            { key: 'operations', label: 'Operaciones', path: '/reports/operations' },
          ],
        },
        { key: 'admin', label: 'Administración', icon: 'Settings', path: '/admin',
          children: [
            { key: 'users', label: 'Usuarios', path: '/admin' },
            { key: 'roles', label: 'Roles', path: '/admin/roles' },
            { key: 'audit', label: 'Auditoría', path: '/admin/audit' },
            { key: 'import', label: 'Importación Masiva', path: '/admin/import' },
            { key: 'distribution', label: 'Config. Distribución', path: '/admin/distribution' },
            { key: 'assignments', label: 'Asignaciones', path: '/admin/assignments' },
          ],
        },
      ];

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
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
                          {child.key === 'spreadsheet' && <Table size={16} />}
                          {child.key === 'quotes' && <FileText size={16} />}
                          {child.key === 'calculator' && <Calculator size={16} />}
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
                          {child.key === 'users' && <Users size={16} />}
                          {child.key === 'roles' && <Shield size={16} />}
                          {child.key === 'audit' && <Activity size={16} />}
                          {child.key === 'import' && <Upload size={16} />}
                          {child.key === 'distribution' && <BarChart3 size={16} />}
                          {child.key === 'assignments' && <ArrowRightLeft size={16} />}
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
              
              {userRole === 'salesperson' && <div className="small text-warning">Preventa</div>}
              {userRole === 'vendedor_campo' && <div className="small text-warning">Vendedor de Campo</div>}
              {userRole === 'cobrador' && <div className="small text-warning">Cobrador Oficina</div>}
              {userRole === 'cobrador_campo' && <div className="small text-warning">Cobrador de Calle</div>}
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