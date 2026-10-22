import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Modal, Row, Col } from 'react-bootstrap';
import { getQuotes, deleteQuote, updateQuote, createQuote } from '@/services/api/quotes';
import { FileText, Search, Edit2, Trash2, Send, CheckCircle, XCircle, Copy, FileDown, Filter, Clock, MessageCircle, Award, Receipt } from 'lucide-react';
import { QuoteForm } from './QuoteForm';
import { generateQuotePdf } from '@/services/api/quotePdf';
import { supabase } from '@/services/supabase/client';
import { uploadQuotePdf, sendQuoteByEmail, sendQuoteByWhatsApp, logSend, getSendHistory } from '@/services/api/sendQuoteService';
import { createReceivable, getNextInvoiceNumber } from '@/services/api/finance';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  sent: { label: 'Enviada', color: 'info' },
  approved: { label: 'Aprobada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'danger' },
  converted: { label: 'Convertida', color: 'primary' },
  completed: { label: 'Completada', color: 'dark' },
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email' | 'both'>('email');
  const [sending, setSending] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyQuote, setHistoryQuote] = useState<any | null>(null);
  const [sendHistory, setSendHistory] = useState<any[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => { loadQuotes(); }, []);

  async function loadQuotes() {
    try {
      setLoading(true);
      const data = await getQuotes();
      setQuotes(data || []);
    } catch (err: any) {
      setError('Error al cargar las cotizaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta cotización?')) {
      try {
        await deleteQuote(id);
        loadQuotes();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleDuplicate = async (quote: any) => {
    try {
      const newQuoteData = {
        quote_number: `COT-${String(Date.now()).slice(-6)}`,
        customer_id: quote.customer_id,
        opportunity_id: quote.opportunity_id || null,
        status: 'draft',
        subtotal: quote.subtotal || 0,
        tax_amount: quote.tax_amount || 0,
        discount_amount: quote.discount_amount || 0,
        total: quote.total || 0,
        valid_until: '',
        terms: quote.terms || null,
        notes: `[Copia de ${quote.quote_number}] ${quote.notes || ''}`
      };
      const items = (quote.items || []).map((item: any) => ({
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        tax_rate: item.tax_rate || 19
      }));
      await createQuote(newQuoteData, items);
      alert('✅ Cotización duplicada exitosamente');
      loadQuotes();
    } catch (err: any) {
      alert('Error al duplicar: ' + err.message);
    }
  };

  const handleSendQuote = async () => {
    if (!selectedQuote) return;
    setSending(true);
    setWhatsappUrl(null);
    
    try {
      let customerData = selectedQuote.customers;
      if (selectedQuote.customer_id) {
        const { data: cust } = await (supabase.from('customers') as any).select('*').eq('id', selectedQuote.customer_id).single();
        if (cust) customerData = cust;
      }

      const { data: itemsData } = await (supabase.from('quote_items') as any).select('*').eq('quote_id', selectedQuote.id);

      const quoteWithAllData = { 
        ...selectedQuote, 
        customers: customerData || {},
        items: itemsData || [] 
      };

      const pdfResult = await uploadQuotePdf(quoteWithAllData);

      if (sendMethod === 'email' || sendMethod === 'both') {
        await sendQuoteByEmail(quoteWithAllData, pdfResult);
      }
      
      if (sendMethod === 'whatsapp' || sendMethod === 'both') {
        const waUrl = sendQuoteByWhatsApp(quoteWithAllData, pdfResult.url);
        if (!waUrl) setWhatsappUrl(waUrl);
      }

      await logSend(selectedQuote.id, sendMethod, pdfResult.url);
      await updateQuote(selectedQuote.id, { status: 'sent' });

      alert('✅ Cotización procesada exitosamente');
      setShowSendModal(false);
      loadQuotes();
    } catch (err: any) {
      console.error('Error fatal al enviar:', err);
      alert('Error al enviar: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleViewHistory = async (quote: any) => {
    setHistoryQuote(quote);
    const history = await getSendHistory(quote.id);
    setSendHistory(history);
    setShowHistoryModal(true);
  };

  const handleStatusChange = async (quoteId: number, newStatus: string) => {
    try {
      await updateQuote(quoteId, { status: newStatus });
      loadQuotes();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const handleGenerarFactura = async (quote: any) => {
    if (!window.confirm('¿Generar factura para esta cotización?\n\nEsto creará una factura real en el módulo de Cuentas por Cobrar.')) return;
    
    try {
      const invoiceNumber = await getNextInvoiceNumber();
      const hoy = new Date().toISOString().split('T')[0];
      const vencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await createReceivable({
        invoice_number: invoiceNumber,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        issue_date: hoy,
        due_date: vencimiento,
        total_amount: quote.total || 0,
        paid_amount: 0,
        status: 'pending',
        notes: 'Factura generada desde cotizacion ' + quote.quote_number
      });
      
      await updateQuote(quote.id, { status: 'converted' });
      alert('✅ Factura ' + invoiceNumber + ' generada exitosamente.\n\nYa la puedes ver en Finanzas > Cuentas por Cobrar');
      loadQuotes();
    } catch (err: any) {
      console.error('Error generando factura:', err);
      alert('Error al generar factura: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleDownloadPdf = async (quote: any) => {
    try {
      const { data: itemsData } = await (supabase.from('quote_items') as any).select('*').eq('quote_id', quote.id);
      await generateQuotePdf({ ...quote, items: itemsData || [] });
    } catch (err: any) {
      alert('Error al generar PDF: ' + err.message);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    converted: quotes.filter(q => q.status === 'converted').length,
    completed: quotes.filter(q => q.status === 'completed').length,
    expired: quotes.filter(q => q.valid_until && new Date(q.valid_until) < new Date() && !['approved', 'rejected', 'converted', 'completed'].includes(q.status)).length,
    totalValue: quotes.filter(q => ['approved', 'converted', 'completed'].includes(q.status)).reduce((sum, q) => sum + (q.total || 0), 0)
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Cotizaciones</h2>
          <p className="text-muted mb-0">Gestiona las cotizaciones y propuestas comerciales de S24</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingQuote(null); setShowForm(true); }}>
          <FileText size={18} className="me-2" /> Nueva Cotización
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 mb-3">
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-primary">{stats.total}</div>
              <div className="small text-muted">Total</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-secondary">{stats.draft}</div>
              <div className="small text-muted">Borrador</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-info">{stats.sent}</div>
              <div className="small text-muted">Enviadas</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-success">{stats.approved}</div>
              <div className="small text-muted">Aprobadas</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-danger">{stats.rejected}</div>
              <div className="small text-muted">Rechazadas</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-primary">{stats.converted}</div>
              <div className="small text-muted">Convertidas</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center bg-dark bg-opacity-10">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-dark"><Award size={20} className="mb-1" /><br/>{stats.completed}</div>
              <div className="small text-muted">Completadas</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2} sm={4} xs={6}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-danger">{stats.expired}</div>
              <div className="small text-muted">Vencidas</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8} sm={8} xs={12}>
          <Card className="border-0 shadow-sm text-center bg-success bg-opacity-10">
            <Card.Body className="p-2">
              <div className="fs-4 fw-bold text-success">${(stats.totalValue / 1000000).toFixed(1)}M</div>
              <div className="small text-muted">Vendidas (Aprobadas + Convertidas + Completadas)</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por número de cotización o cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text><Filter size={18} /></InputGroup.Text>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Todas las cotizaciones</option>
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviadas</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                  <option value="converted">Convertidas</option>
                  <option value="completed">Completadas</option>
                </Form.Select>
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Número</th>
                <th>Cliente</th>
                <th>Oportunidad</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Validez</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No hay cotizaciones registradas.</td></tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const status = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG];
                  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && !['approved', 'rejected', 'converted', 'completed'].includes(quote.status);
                  return (
                    <tr key={quote.id} className={isExpired ? 'bg-danger bg-opacity-10' : ''}>
                      <td className="ps-4 fw-semibold">{quote.quote_number}</td>
                      <td>{quote.customers?.full_name || 'N/A'}</td>
                      <td>{quote.opportunities?.title || '-'}</td>
                      <td>
                        <Badge bg={status.color}>{status.label}</Badge>
                        {isExpired && <Badge bg="danger" className="ms-1">Vencida</Badge>}
                      </td>
                      <td className="fw-bold">${(quote.total || 0).toLocaleString('es-CO')}</td>
                      <td>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-CO') : '-'}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex gap-1 justify-content-end flex-wrap">
                          {quote.status === 'draft' && (
                            <>
                              <Button variant="outline-success" size="sm" onClick={async () => { 
                                const { data: freshCustomer } = await (supabase.from('customers') as any).select('*').eq('id', quote.customer_id).single();
                                setSelectedQuote({ ...quote, customers: freshCustomer || quote.customers });
                                setShowSendModal(true);
                              }} title="Enviar Cotización"><Send size={14} /></Button>
                              <Button variant="outline-primary" size="sm" onClick={() => { setEditingQuote(quote); setShowForm(true); }} title="Editar"><Edit2 size={14} /></Button>
                              <Button variant="outline-secondary" size="sm" onClick={() => handleDuplicate(quote)} title="Duplicar"><Copy size={14} /></Button>
                              <Button variant="outline-info" size="sm" onClick={() => handleDownloadPdf(quote)} title="Descargar PDF"><FileDown size={14} /></Button>
                            </>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <Button variant="outline-success" size="sm" onClick={() => handleStatusChange(quote.id, 'approved')} title="Aprobar"><CheckCircle size={14} /></Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleStatusChange(quote.id, 'rejected')} title="Rechazar"><XCircle size={14} /></Button>
                              <Button variant="outline-info" size="sm" onClick={() => handleDownloadPdf(quote)} title="Descargar PDF"><FileDown size={14} /></Button>
                            </>
                          )}
                          {quote.status === 'approved' && (
                            <>
                              <Button variant="outline-primary" size="sm" onClick={() => handleGenerarFactura(quote)} title="Generar Factura">
                                <Receipt size={14} className="me-1" /> Factura
                              </Button>
                              <Button variant="outline-info" size="sm" onClick={() => handleDownloadPdf(quote)} title="Descargar PDF"><FileDown size={14} /></Button>
                            </>
                          )}
                          {quote.status === 'converted' && (
                            <>
                              <Button variant="outline-dark" size="sm" onClick={() => handleStatusChange(quote.id, 'completed')} title="Marcar como Completada"><CheckCircle size={14} /></Button>
                              <Button variant="outline-info" size="sm" onClick={() => handleDownloadPdf(quote)} title="Descargar PDF"><FileDown size={14} /></Button>
                            </>
                          )}
                          {['completed', 'rejected'].includes(quote.status) && (
                            <Button variant="outline-info" size="sm" onClick={() => handleDownloadPdf(quote)} title="Descargar PDF"><FileDown size={14} /></Button>
                          )}
                          <Button variant="outline-secondary" size="sm" onClick={() => handleViewHistory(quote)} title="Historial de Envíos"><Clock size={14} /></Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(quote.id)} title="Eliminar"><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <QuoteForm show={showForm} onHide={() => setShowForm(false)} quote={editingQuote} onSuccess={loadQuotes} />

      <Modal show={showSendModal} onHide={() => setShowSendModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Enviar Cotización {selectedQuote?.quote_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedQuote && (
            <div className="mb-3 p-3 bg-light rounded">
              <p className="mb-1"><strong>Cliente:</strong> {selectedQuote.customers?.full_name || 'N/A'}</p>
              <p className="mb-1"><strong>Email:</strong> {selectedQuote.customers?.email || 'No registrado'}</p>
              <p className="mb-1"><strong>Teléfono:</strong> {selectedQuote.customers?.phone || 'No registrado'}</p>
              <p className="mb-1"><strong>WhatsApp:</strong> {selectedQuote.customers?.whatsapp_phone || selectedQuote.customers?.phone || 'No registrado'}</p>
              <p className="mb-0"><strong>Total:</strong> ${selectedQuote.total?.toLocaleString('es-CO')}</p>
            </div>
          )}
          <Form.Group>
            <Form.Label className="fw-bold">Selecciona el método de envío:</Form.Label>
            <Form.Select value={sendMethod} onChange={(e) => setSendMethod(e.target.value as any)} className="mb-3">
              <option value="email">📧 Correo Electrónico (con PDF adjunto)</option>
              <option value="whatsapp">📱 WhatsApp (Mensaje con link al PDF)</option>
              <option value="both">📧📱 Ambos (Correo con PDF + WhatsApp)</option>
            </Form.Select>
          </Form.Group>
          
          {whatsappUrl && (
            <Alert variant="warning" className="mb-3">
              <div className="d-flex align-items-center">
                <MessageCircle className="me-2" />
                <div>
                  <strong>El navegador bloqueó la ventana de WhatsApp</strong>
                  <br />
                  <small>Haz clic en el botón de abajo para abrir WhatsApp manualmente:</small>
                </div>
              </div>
              <Button variant="success" className="mt-2" onClick={() => window.open(whatsappUrl, '_blank')}>
                <MessageCircle size={16} className="me-2" /> Abrir WhatsApp Ahora
              </Button>
            </Alert>
          )}
          
          <Alert variant="info" className="mb-0">
            <small>💡 <strong>Nota:</strong> El correo se enviará con el PDF adjunto. WhatsApp abrirá una pestaña con el mensaje y el enlace al PDF.</small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSendModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSendQuote} disabled={sending}>
            {sending ? <><Spinner animation="border" size="sm" className="me-2" /> Procesando...</> : 'Enviar Cotización'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><Clock size={18} className="me-2" />Historial de Envíos - {historyQuote?.quote_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sendHistory.length === 0 ? (
            <p className="text-muted text-center py-3">No hay registros de envío para esta cotización.</p>
          ) : (
            <Table responsive size="sm" className="mb-0">
              <thead className="bg-light">
                <tr><th>Fecha y Hora</th><th>Método</th><th>Link PDF</th></tr>
              </thead>
              <tbody>
                {sendHistory.map((log: any, idx: number) => (
                  <tr key={idx}>
                    <td>{new Date(log.sent_at).toLocaleString('es-CO')}</td>
                    <td>
                      <Badge bg={log.method === 'email' ? 'primary' : log.method === 'whatsapp' ? 'success' : 'info'}>
                        {log.method === 'email' ? '📧 Correo' : log.method === 'whatsapp' ? '📱 WhatsApp' : ' Ambos'}
                      </Badge>
                    </td>
                    <td>
                      {log.pdf_url ? (
                        <a href={log.pdf_url} target="_blank" rel="noopener noreferrer" className="small">Ver PDF</a>
                      ) : (
                        <span className="text-muted small">No disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}