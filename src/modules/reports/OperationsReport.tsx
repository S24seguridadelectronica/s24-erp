import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { getOperationsReport } from '@/services/api/reports';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#20c997', '#fd7e14'];

export function OperationsReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getOperationsReport();
      setReport(data);
    } catch (err: any) {
      setError('Error al cargar reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const statusLabels: any = {
    pending: 'Pendiente', scheduled: 'Programada', assigned: 'Asignada',
    in_transit: 'En Camino', in_progress: 'En Ejecución', completed: 'Finalizada', cancelled: 'Cancelada'
  };

  const statusPieData = Object.entries(report.byStatus).map(([key, value]: any) => ({
    name: statusLabels[key] || key,
    value
  }));

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">🔧 Reporte de Operaciones</h2>
          <p className="text-muted mb-0">Análisis de órdenes de trabajo y servicios</p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Total Órdenes</div>
              <div className="fs-3 fw-bold text-primary">{report.workOrders.length}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Completadas</div>
              <div className="fs-3 fw-bold text-success">{report.completedCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Pendientes</div>
              <div className="fs-3 fw-bold text-warning">{report.pendingCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Ingresos por Servicios</div>
              <div className="fs-3 fw-bold text-info">${report.totalRevenue.toLocaleString('es-CO')}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Órdenes por Estado</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {statusPieData.map((entry: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Órdenes por Tipo de Servicio</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.serviceTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#198754" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pt-3">
          <h5 className="mb-0">Últimas Órdenes de Trabajo</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Número</th>
                <th>Cliente</th>
                <th>Tipo de Servicio</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.workOrders.slice(0, 10).map((o: any) => (
                <tr key={o.id}>
                  <td className="ps-4 fw-semibold">{o.order_number}</td>
                  <td>{o.customers?.full_name || 'N/A'}</td>
                  <td>{o.service_type}</td>
                  <td><Badge bg={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>{statusLabels[o.status] || o.status}</Badge></td>
                  <td className="fw-bold">${(o.total_cost || 0).toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
