import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Form } from 'react-bootstrap';
import { getSalesReport } from '@/services/api/reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#20c997', '#fd7e14'];

export function SalesReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getSalesReport(startDate || undefined, endDate || undefined);
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
    draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada', converted: 'Convertida'
  };

  const pieData = Object.entries(report.byStatus).map(([key, value]: any) => ({
    name: statusLabels[key] || key,
    value
  }));

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">📊 Reporte de Ventas</h2>
          <p className="text-muted mb-0">Análisis de cotizaciones y conversiones</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group><Form.Label>Fecha Inicio</Form.Label>
                <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Fecha Fin</Form.Label>
                <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <button className="btn btn-primary w-100" onClick={loadReport}>Aplicar Filtros</button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Cotizaciones por Estado</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {pieData.map((entry: any, index: number) => (
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
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Top 5 Clientes</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString('es-CO')}`} />
                  <Bar dataKey="value" fill="#0d6efd" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pt-3">
          <h5 className="mb-0">Resumen de Ventas</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <div className="text-muted small">Total Cotizaciones</div>
              <div className="fs-3 fw-bold">{report.quotes.length}</div>
            </Col>
            <Col md={4}>
              <div className="text-muted small">Ingresos por Ventas</div>
              <div className="fs-3 fw-bold text-success">${report.totalRevenue.toLocaleString('es-CO')}</div>
            </Col>
            <Col md={4}>
              <div className="text-muted small">Tasa de Conversión</div>
              <div className="fs-3 fw-bold text-primary">
                {report.quotes.length > 0 ? Math.round(((report.byStatus.approved || 0) + (report.byStatus.converted || 0)) / report.quotes.length * 100) : 0}%
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
