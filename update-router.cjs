const fs = require('fs');
const path = require('path');

const content = `import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { LoginPage } from '@/modules/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { UsersPage } from '@/modules/admin/users/UsersPage';
import { RolesPage } from '@/modules/admin/roles/RolesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'crm', element: <div className='p-4'><h2>CRM - Próximamente</h2></div> },
      { path: 'call-center', element: <div className='p-4'><h2>Call Center - Próximamente</h2></div> },
      { path: 'sales', element: <div className='p-4'><h2>Ventas - Próximamente</h2></div> },
      { path: 'operations', element: <div className='p-4'><h2>Operaciones - Próximamente</h2></div> },
      { path: 'inventory', element: <div className='p-4'><h2>Inventario - Próximamente</h2></div> },
      { path: 'finance', element: <div className='p-4'><h2>Finanzas - Próximamente</h2></div> },
      { path: 'cms', element: <div className='p-4'><h2>CMS - Próximamente</h2></div> },
      { path: 'reports', element: <div className='p-4'><h2>Informes - Próximamente</h2></div> },
      {
        path: 'admin',
        children: [
          { index: true, element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> }
        ]
      },
    ],
  },
  { path: '*', element: <Navigate to='/' replace /> },
]);`;

fs.writeFileSync('src/app/router.tsx', content, 'utf8');
console.log('✅ Router actualizado con las páginas de Administración.');
