import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createReceivable, getNextInvoiceNumber } from '@/services/api/finance';
import { getCustomers } from '@/services/api/customers';

const schema = z.object({
  invoice_number: z.string().min(1, 'Número es requerido'),
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  quote_id: z.coerce.number().optional(),
  issue_date: z.string().min(1, 'Fecha de emisión es requerida'),
  due_date: z.string().min(1, 'Fecha de vencimiento es requerida'),
  total_amount: z.coerce.number().min(0.01, 'Monto debe ser mayor a 0'),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ReceivableFormProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export function ReceivableForm({ show, onHide, onSuccess }: ReceivableFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending', total_amount: 0 }
  });

  useEffect(() => {
    if (show) {
      loadCustomers();
      reset({ status: 'pending', total_amount: 0 });
      getNextInvoiceNumber().then(num => reset({ status: 'pending', total_amount: 0, invoice_number: num, issue_date: new Date().toISOString().split('T')[0] }));
    }
  }, [show, reset]);

  async function loadCustomers() {
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await createReceivable(data);
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>Nueva Cuenta por Cobrar</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={4}>
              <Form.Group><Form.Label>Número de Factura *</Form.Label>
                <Form.Control {...register('invoice_number')} />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group><Form.Label>Cliente *</Form.Label>
                <Form.Select isInvalid={!!errors.customer_id} {...register('customer_id')}>
                  <option value="">Selecciona un cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.customer_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Fecha de Emisión *</Form.Label>
                <Form.Control type="date" {...register('issue_date')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Fecha de Vencimiento *</Form.Label>
                <Form.Control type="date" isInvalid={!!errors.due_date} {...register('due_date')} />
                <Form.Control.Feedback type="invalid">{errors.due_date?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Monto Total (COP) *</Form.Label>
                <Form.Control type="number" min="0.01" step="0.01" isInvalid={!!errors.total_amount} {...register('total_amount')} />
                <Form.Control.Feedback type="invalid">{errors.total_amount?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Estado *</Form.Label>
                <Form.Select {...register('status')}>
                  <option value="pending">Pendiente</option>
                  <option value="partial">Pago Parcial</option>
                  <option value="paid">Pagada</option>
                  <option value="overdue">Vencida</option>
                  <option value="cancelled">Cancelada</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Notas / Observaciones</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Factura'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
