import { useEffect, useState } from 'react';
import { Card, Table, Badge, Spinner, Button, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { DollarSign, Receipt, Calendar, User, CheckCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

export function MyCollectionsPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el Modal de Pago
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await (supabase.from('accounts_receivable') as any)
        .select(`
          *,
          customers ( full_name, company_name, whatsapp_phone )
        `)
        .neq('status', 'paid') // Solo mostramos las que no están pagadas al 100%
        .order('issue_date', { ascending: true });

      if (!error && data) setInvoices(data);
    } catch (error) {
      console.error("Error cargando facturas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedInvoice || !paymentAmount || paymentAmount <= 0) {
      alert("Por favor, ingresa un valor válido.");
      return;
    }

    const newPaidAmount = (selectedInvoice.paid_amount || 0) + Number(paymentAmount);
    if (newPaidAmount > selectedInvoice.total_amount) {
      alert("El abono no puede ser mayor al saldo pendiente.");
      return;
    }

    setLoadingAction(true);
    try {
      // 1. Determinar el nuevo estado
      let newStatus = 'partial';
      if (newPaidAmount >= selectedInvoice.total_amount) {
        newStatus = 'paid';
      }

      // 2. Actualizar la factura
      const { error } = await (supabase.from('accounts_receivable') as any)
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          payment_notes: `${selectedInvoice.payment_notes || ''}\nAbono: $${paymentAmount} (${paymentMethod}) - ${new Date().toLocaleDateString()}`
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      alert('¡Abono registrado exitosamente!');
      setShowModal(false);
      setPaymentAmount('');
      fetchInvoices(); // Recargar tabla
    } catch (error) {
      console.error(error);
      alert('Error al registrar el pago');
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fmtMoney = (val: number) => '$' + Math.round(val || 0).toLocaleString('es-CO');

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold m-0"><DollarSign className="me-2" /> Mis Cobros Pendientes</h3>
          <p className="text-muted small m-0">Gestiona los abonos y pagos de los clientes</p>
        </div>
        
        {/* Buscador */}
        <div className="d-flex align-items-center bg-white border rounded px-2 shadow-sm">
          <Search size={18} className="text-muted" />
          <Form.Control
            type="text"
            placeholder="Buscar cliente..."
            className="border-0 shadow-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted fw-bold">Total por Cobrar</h6>
              <h3 className="fw-bold text-dark mb-0">
                {fmtMoney(invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0))}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {filteredInvoices.length === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <CheckCircle size={48} className="text-success mb-3" />
            <h5>¡Cartera al día!</h5>
            <p className="text-muted">No hay facturas pendientes de cobro en este momento.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th>Factura / Cliente</th>
                <th>Fecha Emisión</th>
                <th>Valor Total</th>
                <th>Abonado</th>
                <th>Saldo Pendiente</th>
                <th>Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const saldo = inv.total_amount - (inv.paid_amount || 0);
                
                return (
                  <tr key={inv.id}>
                    <td>
                      {/* 👇 CORRECCIÓN APLICADA AQUÍ */}
                      <div className="fw-bold"><Receipt size={14} className="me-1" /> Factura #{String(inv.id).substring(0,6)}</div>
                      <div className="small text-muted"><User size={12} className="me-1" /> {inv.customers?.full_name}</div>
                    </td>
                    <td><Calendar size={14} className="me-1 text-secondary" /> {format(new Date(inv.issue_date), 'dd/MM/yyyy')}</td>
                    <td className="fw-bold">{fmtMoney(inv.total_amount)}</td>
                    <td className="text-success">{fmtMoney(inv.paid_amount)}</td>
                    <td className="fw-bold text-danger">{fmtMoney(saldo)}</td>
                    <td>
                      <Badge bg={inv.status === 'partial' ? 'info' : 'warning'} text="dark">
                        {inv.status === 'partial' ? 'Abono Parcial' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPaymentAmount(saldo); // Pre-llenar con el saldo total
                          setShowModal(true);
                        }}
                      >
                        <DollarSign size={14} className="me-1" /> Cobrar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* MODAL PARA REGISTRAR ABONO */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>Registrar Pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            Cliente: <strong>{selectedInvoice?.customers?.full_name}</strong> <br/>
            Saldo Pendiente: <strong className="text-danger">{fmtMoney(selectedInvoice?.total_amount - (selectedInvoice?.paid_amount || 0))}</strong>
          </Alert>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Valor a Abonar (COP) *</Form.Label>
              <Form.Control 
                type="number" 
                min="1"
                max={selectedInvoice?.total_amount - (selectedInvoice?.paid_amount || 0)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Método de Pago</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Nequi/Daviplata">Nequi / Daviplata</option>
                <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleRegisterPayment} disabled={loadingAction}>
            {loadingAction ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}