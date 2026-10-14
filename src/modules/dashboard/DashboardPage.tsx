import { Card, Row, Col } from 'react-bootstrap'
import { Users, Phone, FileText, ShoppingCart, Wrench, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import './DashboardPage.css'

interface StatCardProps { title: string; value: string | number; icon: React.ElementType; trend?: string; trendUp?: boolean; color: string }

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
  return (
    <Card className="stat-card">
      <Card.Body>
        <div className="stat-header">
          <div className="stat-icon" style={{ backgroundColor: color }}><Icon size={24} color="white" /></div>
          {trend && <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}><TrendingUp size={14} /><span>{trend}</span></div>}
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </Card.Body>
    </Card>
  )
}

export function DashboardPage() {
  const stats = [
    { title: 'Clientes Activos', value: 0, icon: Users, trend: '+0%', trendUp: true, color: '#007bff' },
    { title: 'Llamadas Hoy', value: 0, icon: Phone, trend: '+0%', trendUp: true, color: '#28a745' },
    { title: 'Cotizaciones Pendientes', value: 0, icon: FileText, color: '#ffc107' },
    { title: 'Ventas del Mes', value: '$0', icon: ShoppingCart, trend: '+0%', trendUp: true, color: '#6f42c1' },
    { title: 'Órdenes en Progreso', value: 0, icon: Wrench, color: '#fd7e14' },
    { title: 'Cuentas por Cobrar', value: '$0', icon: DollarSign, color: '#dc3545' },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-header"><h2>Dashboard</h2><p>Resumen general del sistema</p></div>
      <Row className="g-3 mb-4">{stats.map((stat, index) => <Col key={index} xs={12} sm={6} lg={4} xl={2}><StatCard {...stat} /></Col>)}</Row>
      <Row className="g-3">
        <Col lg={8}>
          <Card className="dashboard-card"><Card.Header><h5>Actividad Reciente</h5></Card.Header><Card.Body><div className="empty-state"><AlertCircle size={48} color="#6c757d" /><p>No hay actividad reciente para mostrar</p></div></Card.Body></Card>
        </Col>
        <Col lg={4}>
          <Card className="dashboard-card"><Card.Header><h5>Tareas Pendientes</h5></Card.Header><Card.Body><div className="empty-state"><AlertCircle size={48} color="#6c757d" /><p>No hay tareas pendientes</p></div></Card.Body></Card>
        </Col>
      </Row>
    </div>
  )
}