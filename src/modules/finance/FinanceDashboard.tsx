import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { getFinanceSummary } from '@/services/api/finance';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function FinanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSummary(); }, []);

  async function loadSummary() {
    try {
      setLoading(true);
      const data = await getFinanceSummary();
      setSummary(data);
    } catch (err: any) {
      setError('Error al cargar resumen financiero: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const formatCurrency = (amount: number) => `$${(amount || 0).toLocaleString('es-CO')}`;

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h2 className="mb-1">Dashboard Financiero</h2>
        <p className="text-muted mb-0">Resumen del estado financiero de S24</p>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 p-3 rounded me-3">
                  <ArrowUpRight size={24} className="text-danger" />
                </div>
                <div>
                  <div className="text-muted small">Por Cobrar</div>
                  <div className="fs-4 fw-bold text-danger">{formatCurrency(summary.totalReceivable)}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <ArrowDownRight size={24} className="text-warning" />
                </div>
                <div>
                  <div className="text-muted small">Por Pagar</div>
                  <div className="fs-4 fw-bold text-warning">{formatCurrency(summary.totalPayable)}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <TrendingUp size={24} className="text-success" />
                </div>
                <div>
                  <div className="text-muted small">Ingresos Totales</div>
                  <div className="fs-4 fw-bold text-success">{formatCurrency(summary.totalIncome)}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <DollarSign size={24} className="text-primary" />
                </div>
                <div>
                  <div className="text-muted small">Flujo de Caja</div>
                  <div className={`fs-4 fw-bold ${summary.cashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(summary.cashFlow)}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Alertas</h5>
            </Card.Header>
            <Card.Body>
              {summary.overdueReceivables > 0 && (
                <Alert variant="danger" className="mb-2">
                  <AlertCircle size={18} className="me-2" />
                  <strong>{summary.overdueReceivables}</strong> factura(s) por cobrar vencida(s)
                </Alert>
              )}
              {summary.overduePayables > 0 && (
                <Alert variant="warning" className="mb-2">
                  <AlertCircle size={18} className="me-2" />
                  <strong>{summary.overduePayables}</strong> factura(s) por pagar vencida(s)
                </Alert>
              )}
              {summary.overdueReceivables === 0 && summary.overduePayables === 0 && (
                <div className="text-center text-muted py-4">
                  <TrendingUp size={48} className="mb-3 text-success" />
                  <p className="mb-0">¡No hay alertas financieras!</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Resumen de Transacciones</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <div className="text-muted small">Ingresos</div>
                  <div className="fs-5 fw-bold text-success">{formatCurrency(summary.totalIncome)}</div>
                </div>
                <TrendingUp size={32} className="text-success" />
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <div className="text-muted small">Egresos</div>
                  <div className="fs-5 fw-bold text-danger">{formatCurrency(summary.totalExpense)}</div>
                </div>
                <TrendingDown size={32} className="text-danger" />
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Balance Neto</div>
                  <div className={`fs-5 fw-bold ${summary.cashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(summary.cashFlow)}
                  </div>
                </div>
                <DollarSign size={32} className={summary.cashFlow >= 0 ? 'text-success' : 'text-danger'} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
