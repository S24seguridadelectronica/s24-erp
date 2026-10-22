import { CctvCalculator } from '@/modules/tools/CctvCalculator';
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { LoginPage } from '@/modules/auth/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { UsersPage } from '@/modules/admin/users/UsersPage'
import { RolesPage } from '@/modules/admin/roles/RolesPage'
import { AuditLogsPage } from '@/modules/admin/audit/AuditLogsPage'
import { ImportPage } from '@/modules/admin/import/ImportPage'
import { DistributionConfigPage } from '@/modules/admin/distribution/DistributionConfigPage'
import { AssignmentsPage } from '@/modules/admin/distribution/AssignmentsPage'
import { CustomersPage } from '@/modules/crm/customers/CustomersPage'
import { OpportunitiesPage } from '@/modules/crm/opportunities/OpportunitiesPage'
import { SpreadsheetPage } from '@/modules/crm/spreadsheet/SpreadsheetPage'
import { QuotesPage } from '@/modules/sales/quotes/QuotesPage'
import { WorkOrdersPage } from '@/modules/operations/work-orders/WorkOrdersPage'
import { ProductsPage } from '@/modules/inventory/products/ProductsPage'
import { MovementsPage } from '@/modules/inventory/movements/MovementsPage'
import { SuppliersPage } from '@/modules/inventory/suppliers/SuppliersPage'
import { FinanceDashboard } from '@/modules/finance/FinanceDashboard'
import { ReceivablesPage } from '@/modules/finance/receivables/ReceivablesPage'
import { PayablesPage } from '@/modules/finance/payables/PayablesPage'
import { TransactionsPage } from '@/modules/finance/transactions/TransactionsPage'
import { ReportsDashboard } from '@/modules/reports/ReportsDashboard'
import { SalesReport } from '@/modules/reports/SalesReport'
import { FinancialReport } from '@/modules/reports/FinancialReport'
import { InventoryReport } from '@/modules/reports/InventoryReport'
import { OperationsReport } from '@/modules/reports/OperationsReport'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'crm', children: [
          { index: true, element: <CustomersPage /> },
          { path: 'opportunities', element: <OpportunitiesPage /> },
          { path: 'spreadsheet', element: <SpreadsheetPage /> }
        ]
      },
      { path: 'sales', children: [
          { index: true, element: <QuotesPage /> }
        ]
      },
      { path: 'operations', children: [
          { index: true, element: <WorkOrdersPage /> }
        ]
      },
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
    ],
  },
  { path: '*', element: <Navigate to='/' replace /> },
])

