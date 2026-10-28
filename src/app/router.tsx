import { useEffect, useState } from 'react';
import { createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { LoginPage } from '@/modules/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { UsersPage } from '@/modules/admin/users/UsersPage';
import { RolesPage } from '@/modules/admin/roles/RolesPage';
import { AuditLogsPage } from '@/modules/admin/audit/AuditLogsPage';
import { ImportPage } from '@/modules/admin/import/ImportPage';
import { DistributionConfigPage } from '@/modules/admin/distribution/DistributionConfigPage';
import { AssignmentsPage } from '@/modules/admin/distribution/AssignmentsPage';
import { CustomersPage } from '@/modules/crm/customers/CustomersPage';
import { OpportunitiesPage } from '@/modules/crm/opportunities/OpportunitiesPage';
import { SpreadsheetPage } from '@/modules/crm/spreadsheet/SpreadsheetPage';
import { QuotesPage } from '@/modules/sales/quotes/QuotesPage';
import { WorkOrdersPage } from '@/modules/operations/work-orders/WorkOrdersPage';
import { ProductsPage } from '@/modules/inventory/products/ProductsPage';
import { MovementsPage } from '@/modules/inventory/movements/MovementsPage';
import { SuppliersPage } from '@/modules/inventory/suppliers/SuppliersPage';
import { FinanceDashboard } from '@/modules/finance/FinanceDashboard';
import { ReceivablesPage } from '@/modules/finance/receivables/ReceivablesPage';
import { PayablesPage } from '@/modules/finance/payables/PayablesPage';
import { TransactionsPage } from '@/modules/finance/transactions/TransactionsPage';
import { ReportsDashboard } from '@/modules/reports/ReportsDashboard';
import { SalesReport } from '@/modules/reports/SalesReport';
import { FinancialReport } from '@/modules/reports/FinancialReport';
import { InventoryReport } from '@/modules/reports/InventoryReport';
import { OperationsReport } from '@/modules/reports/OperationsReport';
import { MyTasksPage } from '@/modules/crm/tasks/MyTasksPage';
import { MyCollectionsPage } from '@/modules/finance/MyCollectionsPage'; 
import { MyFieldCollectionsPage } from '@/modules/finance/MyFieldCollectionsPage';
import { CommissionsDashboard } from '@/modules/reports/CommissionsDashboard';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';

// 👇 EL GUARDIÁN CORREGIDO
function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { profile } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!profile?.id) { setLoading(false); return; }
      try {
        const { data, error } = await (supabase.from('user_roles') as any)
          .select('roles(name)')
          .eq('user_id', profile.id)
          .limit(1);
          
        if (error) throw error;
        
        const roleName = data?.[0]?.roles?.name?.toLowerCase().trim() || 'vendedor';
        console.log("🔍 El sistema detectó tu rol como:", roleName);
        setUserRole(roleName);
      } catch (error) {
        console.error("Error obteniendo el rol:", error);
        setUserRole('vendedor');
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [profile]);

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" /></div>;

  const isAllowed = userRole && allowedRoles.includes(userRole);
  
  if (!isAllowed) {
    if (userRole === 'cobrador' || userRole === 'cartera') return <Navigate to="/mis-cobros" replace />;
    if (userRole === 'cobrador_campo' || userRole === 'rutero') return <Navigate to="/mi-ruta-cobro" replace />;
    if (userRole === 'vendedor_campo' || userRole === 'field_sales' || userRole === 'cerrador') return <Navigate to="/mis-visitas" replace />;
    
    return (
      <div className="p-5 text-center">
        <h3 className="text-danger">Acceso Denegado</h3>
        <p>Tu rol actual es <strong>{userRole || 'Desconocido'}</strong>, el cual no tiene permisos para ver esta página.</p>
      </div>
    );
  }
  return <Outlet />;
}

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      // 👇 RUTAS COMPARTIDAS (Todos los usuarios logueados pueden entrar aquí)
      { path: 'mis-visitas', element: <MyTasksPage /> },
      { path: 'mis-cobros', element: <MyCollectionsPage /> }, 
      { path: 'mi-ruta-cobro', element: <MyFieldCollectionsPage /> }, 
      { path: 'commissions', element: <CommissionsDashboard /> }, // 👈 Dashboard de comisiones (Filtra internamente)
      { 
        path: 'sales', 
        children: [ { index: true, element: <QuotesPage /> } ]
      },

      // 👇 RUTAS PROTEGIDAS (Admin / Preventa)
      {
        element: <RoleGuard allowedRoles={['admin', 'admin_super', 'administrador', 'preventa', 'salesperson', 'vendedor']} />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'crm', children: [
              { index: true, element: <CustomersPage /> },
              { path: 'opportunities', element: <OpportunitiesPage /> },
              { path: 'spreadsheet', element: <SpreadsheetPage /> }
            ]
          },
          { path: 'operations', children: [ { index: true, element: <WorkOrdersPage /> } ] },
          { path: 'inventory', children: [
              { index: true, element: <ProductsPage /> },
              { path: 'movements', element: <MovementsPage /> },
              { path: 'suppliers', element: <SuppliersPage /> }
            ]
          },
          { path: 'finance', children: [
              { index: true, element: <FinanceDashboard /> },
              { path: 'receivables', element: <ReceivablesPage /> },
              { path: 'payables', element: <PayablesPage /> },
              { path: 'transactions', element: <TransactionsPage /> }
            ]
          },
          { path: 'reports', children: [
              { index: true, element: <ReportsDashboard /> },
              { path: 'sales', element: <SalesReport /> },
              { path: 'financial', element: <FinancialReport /> },
              { path: 'inventory', element: <InventoryReport /> },
              { path: 'operations', element: <OperationsReport /> }
            ]
          },
          { path: 'admin', children: [
              { index: true, element: <UsersPage /> },
              { path: 'roles', element: <RolesPage /> },
              { path: 'audit', element: <AuditLogsPage /> },
              { path: 'import', element: <ImportPage /> },
              { path: 'distribution', element: <DistributionConfigPage /> },
              { path: 'assignments', element: <AssignmentsPage /> }
            ]
          },
          { path: 'call-center', element: <div className='p-4'><h2>Call Center - Próximamente</h2></div> },
          { path: 'cms', element: <div className='p-4'><h2>CMS - Próximamente</h2></div> },
        ]
      },
    ],
  },
  { path: '*', element: <Navigate to='/' replace /> },
]);