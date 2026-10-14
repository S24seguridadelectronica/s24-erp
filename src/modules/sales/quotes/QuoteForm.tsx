import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createQuote, updateQuote, getNextQuoteNumber, type QuoteItem } from '@/services/api/quotes';
import { getCustomers } from '@/services/api/customers';
import { getOpportunities } from '@/services/api/opportunities';
import { Plus, Trash2 } from 'lucide-react';

const schema = z.object({
  quote_number: z.string().min(1, 'Número es requerido'),
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  opportunity_id: z.coerce.number().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'converted']),
  valid_until: z.string().min(1, 'Fecha de validez es requerida'),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface QuoteFormProps {
  show: boolean;
  onHide: () => void;
  quote?: any | null;
  onSuccess: () => void;
}

export function QuoteForm({ show, onHide, quote, onSuccess }: QuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: quote || { status: 'draft', quote_number: 'COT-001' }
  });

  useEffect(() => {
    if (show) {
      loadData();
      if (quote) {
        reset({
          ...quote,
          valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
          opportunity_id: quote.opportunity_id || undefined
        });
        setItems(quote.items || []);
      } else {
        reset({ status: 'draft', valid_until: '', quote_number: 'COT-001' });
        setItems([]);
        getNextQuoteNumber().then(num => reset({ status: 'draft', valid_until: '', quote_number: num }));
      }
    }
  }, [quote, show, reset]);

  async function loadData() {
    try {
      const [custData, oppData] = await Promise.all([getCustomers(), getOpportunities()]);
      setCustomers(custData || []);
      setOpportunities(oppData || []);
    } catch (err) { 
      console.error('Error cargando datos:', err);
      setError('Error al cargar clientes u oportunidades');
    }
  }

  const addItem = () => {
    setItems([...items, { item_type: 'service', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * (item.discount || 0) / 100), 0);
    const taxBase = subtotal - discountAmount;
    const taxAmount = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price * (1 - (item.discount || 0) / 100)) * (item.tax_rate || 19) / 100), 0);
    const total = taxBase + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  const onSubmit = async (data: FormData) => {
    console.log('Datos del formulario:', data);
    console.log('Items:', items);
    
    if (items.length === 0) {
      setError('Debes agregar al menos un item a la cotización');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const totals = calculateTotals();
      const quoteData = { ...data, ...totals };

      console.log('Guardando cotización:', quoteData);

      if (quote?.id) {
        await updateQuote(quote.id, quoteData);
        console.log('Cotización actualizada');
      } else {
        const result = await createQuote(quoteData, items);
        console.log('Cotización creada:', result);
      }
      
      onSuccess();
      onHide();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{quote ? 'Editar Cotización' : 'Nueva Cotización'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Group><Form.Label>Número *</Form.Label>
                <Form.Control {...register('quote_number')} readOnly />
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group><Form.Label>Cliente *</Form.Label>
                <Form.Select isInvalid={!!errors.customer_id} {...register('customer_id')}>
                  <option value="">Selecciona un cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.customer_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Oportunidad (opcional)</Form.Label>
                <Form.Select {...register('opportunity_id')}>
                  <option value="">Sin oportunidad</option>
                  {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Estado *</Form.Label>
                <Form.Select {...register('status')}>
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviada</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="converted">Convertida en Venta</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Válida hasta *</Form.Label>
                <Form.Control type="date" isInvalid={!!errors.valid_until} {...register('valid_until')} />
                <Form.Control.Feedback type="invalid">{errors.valid_until?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <h5 className="mb-3">Items de la Cotización</h5>
          <Table responsive bordered size="sm">
            <thead className="bg-light">
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th style={{width: '80px'}}>Cantidad</th>
                <th style={{width: '120px'}}>Precio Unit.</th>
                <th style={{width: '80px'}}>Desc. %</th>
                <th style={{width: '80px'}}>IVA %</th>
                <th style={{width: '120px'}}>Total</th>
                <th style={{width: '50px'}}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Form.Select value={item.item_type} onChange={(e) => updateItem(index, 'item_type', e.target.value)}>
                      <option value="product">Producto</option>
                      <option value="service">Servicio</option>
                    </Form.Select>
                  </td>
                  <td><Form.Control value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Descripción del item" /></td>
                  <td><Form.Control type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" max="100" value={item.discount || 0} onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" max="100" value={item.tax_rate || 19} onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)} /></td>
                  <td className="fw-bold">${((item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100) * (1 + (item.tax_rate || 19) / 100)).toLocaleString('es-CO')}</td>
                  <td><Button variant="outline-danger" size="sm" onClick={() => removeItem(index)}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Button variant="outline-primary" size="sm" onClick={addItem}><Plus size={16} className="me-2" />Agregar Item</Button>

          <Row className="mt-4">
            <Col md={6}>
              <Form.Group><Form.Label>Términos y Condiciones</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('terms')} placeholder="Términos de pago, garantía, etc." />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Notas Adicionales</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} placeholder="Observaciones internas" />
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-4 p-3 bg-light rounded">
            <Row>
              <Col md={6}></Col>
              <Col md={6}>
                <div className="d-flex justify-content-between mb-2"><span>Subtotal:</span><span>${totals.subtotal.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between mb-2"><span>Descuento:</span><span>-${totals.discountAmount.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between mb-2"><span>IVA (19%):</span><span>${totals.taxAmount.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2"><span>TOTAL:</span><span>${totals.total.toLocaleString('es-CO')}</span></div>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Cotización'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
