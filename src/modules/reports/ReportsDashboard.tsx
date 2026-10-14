import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { getExecutiveSummary } from '@/services/api/reports';
import { Users, Target, DollarSign, Package, TrendingUp, TrendingDown, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ReportsDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { loadSummary(); }, []);

  async function loadSummary() {
    try {
      setLoading(true);
      const data = await getExecutiveSummary();
      setSummary(data);
    } catch (err: any) {
      setError('Error al cargar resumen: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const formatCurrency = (amount: number) => `$${(amount || 0).toLocaleString('es-CO')}`;

  const cards = [
    { title: 'Clientes Totales', value: summary.totalCustomers, icon: Users, color: 'primary', path: '/crm' },
    { title: 'Oportunidades Activas', value: summary.totalOpportunities, icon: Target, color: 'info', path: '/crm/opportunities' },
    { title: 'Valor del Pipeline', value: formatCurrency(summary.pipelineValue), icon: TrendingUp, color: 'success', path: '/crm/opportunities' },
    { title: 'Ingresos por Ventas', value: formatCurrency(summary.salesRevenue), icon: DollarSign, color: 'success', path: '/sales' },
    { title: 'Órdenes Completadas', value: summary.completedOrders, icon: Wrench, color: 'primary', path: '/operations' },
    { title: 'Órdenes Pendientes', value: summary.pendingOrders, icon: Wrench, color: 'warning', path: '/operations' },
    { title: 'Valor del Inventario', value: formatCurrency(summary.inventoryValue), icon: Package, color: 'info', path: '/inventory' },
    { title: 'Productos Stock Bajo', value: summary.lowStockProducts, icon: AlertTriangle, color: 'danger', path: '/inventory' },
    { title: 'Por Cobrar', value: formatCurrency(summary.totalReceivable), icon: TrendingUp, color: 'danger', path: '/finance/receivables' },
    { title: 'Por Pagar', value: formatCurrency(summary.totalPayable), icon: TrendingDown, color: 'warning', path: '/finance/payables' },
    { title: 'Ingresos Totales', value: formatCurrency(summary.totalIncome), icon: DollarSign, color: 'success', path: '/finance/transactions' },
    { title: 'Flujo de Caja', value: formatCurrency(summary.cashFlow), icon: DollarSign, color: summary.cashFlow >= 0 ? 'success' : 'danger', path: '/finance' },
  ];

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Informes y Reportes</h2>
          <p className="text-muted mb-0">Panel ejecutivo con métricas clave del negocio</p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Col md={3} key={index}>
              <Card 
                className="border-0 shadow-sm h-100" 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(card.path)}
              >
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div className={`bg-${card.color} bg-opacity-10 p-3 rounded me-3`}>
                      <Icon size={24} className={`text-${card.color}`} />
                    </div>
                    <div>
                      <div className="text-muted small">{card.title}</div>
                      <div className={`fs-4 fw-bold text-${card.color}`}>{card.value}</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Accesos Rápidos a Reportes</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" onClick={() => navigate('/reports/sales')}>📊 Reporte de Ventas</Button>
                <Button variant="outline-success" onClick={() => navigate('/reports/financial')}> Reporte Financiero</Button>
                <Button variant="outline-info" onClick={() => navigate('/reports/inventory')}>📦 Reporte de Inventario</Button>
                <Button variant="outline-warning" onClick={() => navigate('/reports/operations')}> Reporte de Operaciones</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Resumen Ejecutivo</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="text-muted small">Rentabilidad Neta</div>
                <div className={`fs-3 fw-bold ${summary.cashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(summary.cashFlow)}
                </div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Conversión de Oportunidades</div>
                <div className="fs-5 fw-bold">{summary.totalOpportunities > 0 ? Math.round((summary.salesRevenue / summary.pipelineValue) * 100) || 0 : 0}%</div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Eficiencia Operativa</div>
                <div className="fs-5 fw-bold">{summary.completedOrders} órdenes completadas</div>
              </div>
              <div>
                <div className="text-muted small">Salud del Inventario</div>
                <div className="fs-5 fw-bold">{summary.lowStockProducts} productos con stock bajo</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
