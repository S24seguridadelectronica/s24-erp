import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createTransaction } from '@/services/api/finance';
import { getCustomers } from '@/services/api/customers';

const schema = z.object({
  transaction_type: z.enum(['income', 'expense', 'payment', 'refund']),
  amount: z.coerce.number().min(0.01, 'Monto debe ser mayor a 0'),
  currency: z.string(),
  description: z.string().optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'other']).optional(),
  customer_id: z.coerce.number().optional(),
  transaction_date: z.string().min(1, 'Fecha es requerida'),
});

type FormData = z.infer<typeof schema>;

interface TransactionFormProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export function TransactionForm({ show, onHide, onSuccess }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { transaction_type: 'income', amount: 0, currency: 'COP', payment_method: 'bank_transfer' }
  });

  useEffect(() => {
    if (show) {
      loadCustomers();
      reset({ transaction_type: 'income', amount: 0, currency: 'COP', payment_method: 'bank_transfer', transaction_date: new Date().toISOString().split('T')[0] });
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
      await createTransaction(data);
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
        <Modal.Header closeButton><Modal.Title>Nueva Transacción</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group><Form.Label>Tipo de Transacción *</Form.Label>
                <Form.Select {...register('transaction_type')}>
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                  <option value="payment">Pago</option>
                  <option value="refund">Reembolso</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Monto (COP) *</Form.Label>
                <Form.Control type="number" min="0.01" step="0.01" isInvalid={!!errors.amount} {...register('amount')} />
                <Form.Control.Feedback type="invalid">{errors.amount?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Fecha *</Form.Label>
                <Form.Control type="date" isInvalid={!!errors.transaction_date} {...register('transaction_date')} />
                <Form.Control.Feedback type="invalid">{errors.transaction_date?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Método de Pago</Form.Label>
                <Form.Select {...register('payment_method')}>
                  <option value="">Selecciona...</option>
                  <option value="cash">Efectivo</option>
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="check">Cheque</option>
                  <option value="other">Otro</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Cliente (opcional)</Form.Label>
                <Form.Select {...register('customer_id')}>
                  <option value="">Sin cliente</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Descripción *</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('description')} placeholder="Describe la transacción..." />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Transacción'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
