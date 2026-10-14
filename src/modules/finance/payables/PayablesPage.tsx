import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Row, Col, Modal } from 'react-bootstrap';
import { getPayables, deletePayable, recordPayablePayment } from '@/services/api/finance';
import { FileText, Search, Trash2, Plus, DollarSign } from 'lucide-react';
import { PayableForm } from './PayableForm';

const STATUS_CONFIG: any = {
  pending: { label: 'Pendiente', color: 'warning' },
  partial: { label: 'Pago Parcial', color: 'info' },
  paid: { label: 'Pagada', color: 'success' },
  overdue: { label: 'Vencida', color: 'danger' },
  cancelled: { label: 'Cancelada', color: 'secondary' },
};

export function PayablesPage() {
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDescription, setPaymentDescription] = useState('');

  useEffect(() => { loadPayables(); }, []);

  async function loadPayables() {
    try {
      setLoading(true);
      const data = await getPayables();
      setPayables(data || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta por pagar?')) {
      try {
        await deletePayable(id);
        loadPayables();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleOpenPayment = (payable: any) => {
    setSelectedPayable(payable);
    setPaymentAmount(payable.balance || 0);
    setPaymentDescription('');
    setPaymentMethod('bank_transfer');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (paymentAmount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    try {
      await recordPayablePayment(selectedPayable.id, paymentAmount, paymentMethod, paymentDescription);
      setShowPaymentModal(false);
      loadPayables();
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  const filteredPayables = payables.filter(p => {
    const matchesSearch = p.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPending = payables.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((sum, p) => sum + (p.balance || 0), 0);

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Cuentas por Pagar</h2>
          <p className="text-muted mb-0">Facturas de proveedores y obligaciones pendientes</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={18} className="me-2" /> Nueva Factura
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><DollarSign size={24} className="text-warning" /></div>
              <div>
                <div className="text-muted small">Total Pendiente</div>
                <div className="fs-4 fw-bold text-warning">${totalPending.toLocaleString('es-CO')}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><FileText size={24} className="text-warning" /></div>
              <div>
                <div className="text-muted small">Facturas Pendientes</div>
                <div className="fs-4 fw-bold">{payables.filter(p => p.status === 'pending' || p.status === 'overdue').length}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-success bg-opacity-10 p-3 rounded me-3"><DollarSign size={24} className="text-success" /></div>
              <div>
                <div className="text-muted small">Facturas Pagadas</div>
                <div className="fs-4 fw-bold">{payables.filter(p => p.status === 'paid').length}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por número de factura o proveedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]: any) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Factura</th>
                <th>Proveedor</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">No hay cuentas por pagar registradas.</td></tr>
              ) : (
                filteredPayables.map((p) => {
                  const status = STATUS_CONFIG[p.status];
                  const isOverdue = new Date(p.due_date) < new Date() && p.status !== 'paid' && p.status !== 'cancelled';
                  return (
                    <tr key={p.id} className={isOverdue ? 'table-danger' : ''}>
                      <td className="ps-4 fw-semibold">{p.bill_number}</td>
                      <td>{p.suppliers?.name || 'N/A'}</td>
                      <td>{new Date(p.issue_date).toLocaleDateString('es-CO')}</td>
                      <td>{new Date(p.due_date).toLocaleDateString('es-CO')}</td>
                      <td>${(p.total_amount || 0).toLocaleString('es-CO')}</td>
                      <td className="fw-bold">${(p.balance || 0).toLocaleString('es-CO')}</td>
                      <td><Badge bg={status.color}>{status.label}</Badge></td>
                      <td className="text-end pe-4">
                        {p.status !== 'paid' && p.status !== 'cancelled' && (
                          <Button variant="outline-success" size="sm" className="me-2" onClick={() => handleOpenPayment(p)}>
                            <DollarSign size={16} />
                          </Button>
                        )}
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <PayableForm show={showForm} onHide={() => setShowForm(false)} onSuccess={loadPayables} />

      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Registrar Pago a Proveedor</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedPayable && (
            <>
              <p><strong>Factura:</strong> {selectedPayable.bill_number}</p>
              <p><strong>Proveedor:</strong> {selectedPayable.suppliers?.name}</p>
              <p><strong>Saldo pendiente:</strong> ${selectedPayable.balance?.toLocaleString('es-CO')}</p>
              <hr />
              <Form.Group className="mb-3">
                <Form.Label>Monto a pagar *</Form.Label>
                <Form.Control type="number" min="0.01" max={selectedPayable.balance} value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Método de pago *</Form.Label>
                <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Efectivo</option>
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="check">Cheque</option>
                  <option value="other">Otro</option>
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Descripción / Observaciones</Form.Label>
                <Form.Control as="textarea" rows={2} value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleConfirmPayment}>Confirmar Pago</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
