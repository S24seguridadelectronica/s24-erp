import { useEffect, useState } from 'react';
import { Card, Button, Spinner, Badge, Row, Col, Modal, Form, Alert } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { MapPin, Phone, DollarSign, Navigation, CheckCircle } from 'lucide-react';

export function MyFieldCollectionsPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    fetchFieldInvoices();
  }, []);

  const fetchFieldInvoices = async () => {
    try {
      // Traemos las facturas pendientes o parciales
      const { data, error } = await (supabase.from('accounts_receivable') as any)
        .select(`
          *,
          customers ( full_name, company_name, whatsapp_phone, address, city )
        `)
        .neq('status', 'paid')
        .order('issue_date', { ascending: true });

      if (!error && data) setInvoices(data);
    } catch (error) {
      console.error("Error cargando facturas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedInvoice || !paymentAmount || paymentAmount <= 0) return;

    const newPaidAmount = (selectedInvoice.paid_amount || 0) + Number(paymentAmount);
    setLoadingAction(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let newStatus = newPaidAmount >= selectedInvoice.total_amount ? 'paid' : 'partial';

      const { error } = await (supabase.from('accounts_receivable') as any)
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          collector_id: user?.id, // 👈 Guardamos quién hizo el cobro físico
          payment_notes: `${selectedInvoice.payment_notes || ''}\nCobro en calle por $${paymentAmount} - ${new Date().toLocaleDateString()}`
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      alert('¡Cobro registrado exitosamente!');
      setShowModal(false);
      setPaymentAmount('');
      fetchFieldInvoices();
    } catch (error) {
      console.error(error);
      alert('Error al registrar el cobro');
    } finally {
      setLoadingAction(false);
    }
  };

  const fmtMoney = (val: number) => '$' + Math.round(val || 0).toLocaleString('es-CO');

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-3">
      <div className="mb-4">
        <h3 className="fw-bold m-0">Ruta de Cobro</h3>
        <p className="text-muted small">Visita a los clientes y registra los pagos en efectivo.</p>
      </div>

      <Row className="g-3">
        {invoices.map((inv) => {
          const saldo = inv.total_amount - (inv.paid_amount || 0);
          
          // Formatear número de teléfono para WhatsApp
          const phone = inv.customers?.whatsapp_phone?.replace(/\D/g, '');
          const waLink = phone ? `https://wa.me/57${phone}` : '#';
          
          // Formatear dirección para Google Maps
          const addressQuery = encodeURIComponent(`${inv.customers?.address}, ${inv.customers?.city}`);
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

          return (
            <Col xs={12} md={6} xl={4} key={inv.id}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-warning bg-opacity-25 border-0 d-flex justify-content-between align-items-center">
                  <strong>Factura #{inv.id.substring(0, 6)}</strong>
                  <Badge bg="danger" className="fs-6">{fmtMoney(saldo)}</Badge>
                </Card.Header>
                <Card.Body>
                  <h5 className="fw-bold mb-1">{inv.customers?.full_name}</h5>
                  <p className="text-muted small mb-3">{inv.customers?.company_name || 'Persona Natural'}</p>
                  
                  <div className="d-flex align-items-start gap-2 mb-2 text-secondary">
                    <MapPin size={18} className="mt-1 flex-shrink-0" />
                    <span className="small">{inv.customers?.address}, {inv.customers?.city}</span>
                  </div>

                  <Row className="g-2 mt-3">
                    <Col>
                      <Button variant="outline-secondary" className="w-100" href={mapLink} target="_blank">
                        <Navigation size={16} className="me-1" /> Ir
                      </Button>
                    </Col>
                    <Col>
                      <Button variant="outline-success" className="w-100" href={waLink} target="_blank">
                        <Phone size={16} className="me-1" /> Llamar
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
                <Card.Footer className="bg-white border-0 p-3">
                  <Button 
                    variant="success" 
                    className="w-100 fw-bold py-2"
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setPaymentAmount(saldo);
                      setShowModal(true);
                    }}
                  >
                    <DollarSign size={18} className="me-1" /> Cobrar en Sitio
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* MODAL DE COBRO FÍSICO */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>Registrar Cobro Físico</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small">
            Cliente: <strong>{selectedInvoice?.customers?.full_name}</strong> <br/>
            Total Factura: {fmtMoney(selectedInvoice?.total_amount)} <br/>
            Saldo Pendiente: <strong className="text-danger">{fmtMoney(selectedInvoice?.total_amount - (selectedInvoice?.paid_amount || 0))}</strong>
          </Alert>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Valor Recibido (COP) *</Form.Label>
              <Form.Control 
                type="number" 
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleRegisterPayment} disabled={loadingAction}>
            {loadingAction ? 'Registrando...' : 'Confirmar Recibido'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}