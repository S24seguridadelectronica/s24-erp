import { Outlet } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import './MainLayout.css'

export function MainLayout() {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <Container fluid className="content-wrapper">
          <Outlet />
        </Container>
      </div>
    </div>
  )
}