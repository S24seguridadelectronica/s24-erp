import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Form } from 'react-bootstrap';
import { getFinancialReport } from '@/services/api/reports';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#198754', '#dc3545', '#0d6efd', '#ffc107'];

export function FinancialReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getFinancialReport(startDate || undefined, endDate || undefined);
      setReport(data);
    } catch (err: any) {
      setError('Error al cargar reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const typeLabels: any = { income: 'Ingresos', expense: 'Egresos', payment: 'Pagos', refund: 'Reembolsos' };
  const pieData = Object.entries(report.byType).map(([key, value]: any) => ({
    name: typeLabels[key] || key,
    value
  }));

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">💰 Reporte Financiero</h2>
          <p className="text-muted mb-0">Flujo de caja y análisis de transacciones</p>
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
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Ingresos Totales</div>
              <div className="fs-3 fw-bold text-success">${report.totalIncome.toLocaleString('es-CO')}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Egresos Totales</div>
              <div className="fs-3 fw-bold text-danger">${report.totalExpense.toLocaleString('es-CO')}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Balance Neto</div>
              <div className={`fs-3 fw-bold ${report.netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                ${report.netBalance.toLocaleString('es-CO')}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Flujo de Caja en el Tiempo</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={report.cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString('es-CO')}`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#198754" name="Ingresos" />
                  <Line type="monotone" dataKey="expense" stroke="#dc3545" name="Egresos" />
                  <Line type="monotone" dataKey="balance" stroke="#0d6efd" name="Balance" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Distribución por Tipo</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString('es-CO')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
