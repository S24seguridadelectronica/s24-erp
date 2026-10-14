import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { getInventoryReport } from '@/services/api/reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#20c997', '#fd7e14'];

export function InventoryReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await getInventoryReport();
      setReport(data);
    } catch (err: any) {
      setError('Error al cargar reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"> Reporte de Inventario</h2>
          <p className="text-muted mb-0">Análisis de stock y valor del inventario</p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Valor Total</div>
              <div className="fs-3 fw-bold text-primary">${report.totalValue.toLocaleString('es-CO')}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Unidades en Stock</div>
              <div className="fs-3 fw-bold text-info">{report.totalUnits}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Stock Bajo</div>
              <div className="fs-3 fw-bold text-warning">{report.lowStockCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Agotados</div>
              <div className="fs-3 fw-bold text-danger">{report.outOfStockCount}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Valor por Categoría</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString('es-CO')}`} />
                  <Bar dataKey="value" fill="#0d6efd" name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3"><h5 className="mb-0">Top 5 Productos (por valor)</h5></Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={report.topProducts} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                    {report.topProducts.map((entry: any, index: number) => (
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

      {report.lowStockProducts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-warning bg-opacity-10 border-0 pt-3">
            <h5 className="mb-0 text-warning">⚠️ Productos con Stock Bajo</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {report.lowStockProducts.map((p: any) => (
                  <tr key={p.id}>
                    <td className="ps-4 fw-semibold">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category || '-'}</td>
                    <td className="fw-bold text-danger">{p.stock_quantity}</td>
                    <td>{p.min_stock}</td>
                    <td>
                      <Badge bg={p.stock_quantity === 0 ? 'danger' : 'warning'}>
                        {p.stock_quantity === 0 ? 'Agotado' : 'Stock Bajo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
