import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import './MainLayout.css'

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

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
