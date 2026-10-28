import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Container, Spinner } from 'react-bootstrap'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { usePermissions } from '@/hooks/usePermissions'
import './MainLayout.css'

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { loadingRole } = usePermissions()

  const closeMobileMenu = () => setMobileMenuOpen(false)

  // 👇 Bloqueamos la pantalla mientras carga el rol del usuario
  if (loadingRole) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando sistema...</span>
      </div>
    )
  }

  return (
    <div className="main-layout">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />

      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú de navegación"
          onClick={closeMobileMenu}
        />
      )}

      <div className="main-content">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <Container fluid className="content-wrapper">
          <Outlet />
        </Container>
      </div>
    </div>
  )
}