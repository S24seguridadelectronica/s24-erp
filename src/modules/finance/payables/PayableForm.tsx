import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPayable, getNextBillNumber } from '@/services/api/finance';
import { getSuppliers } from '@/services/api/inventory';

const schema = z.object({
  bill_number: z.string().min(1, 'Número es requerido'),
  supplier_id: z.coerce.number().min(1, 'Selecciona un proveedor'),
  issue_date: z.string().min(1, 'Fecha de emisión es requerida'),
  due_date: z.string().min(1, 'Fecha de vencimiento es requerida'),
  total_amount: z.coerce.number().min(0.01, 'Monto debe ser mayor a 0'),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PayableFormProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export function PayableForm({ show, onHide, onSuccess }: PayableFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending', total_amount: 0 }
  });

  useEffect(() => {
    if (show) {
      loadSuppliers();
      reset({ status: 'pending', total_amount: 0 });
      getNextBillNumber().then(num => reset({ status: 'pending', total_amount: 0, bill_number: num, issue_date: new Date().toISOString().split('T')[0] }));
    }
  }, [show, reset]);

  async function loadSuppliers() {
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await createPayable(data);
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
        <Modal.Header closeButton><Modal.Title>Nueva Cuenta por Pagar</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={4}>
              <Form.Group><Form.Label>Número de Factura *</Form.Label>
                <Form.Control {...register('bill_number')} />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group><Form.Label>Proveedor *</Form.Label>
                <Form.Select isInvalid={!!errors.supplier_id} {...register('supplier_id')}>
                  <option value="">Selecciona un proveedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.supplier_id?.message}</Form.Control.Feedback>
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
