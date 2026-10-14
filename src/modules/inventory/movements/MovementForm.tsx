import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMovement, getProducts } from '@/services/api/inventory';

const schema = z.object({
  product_id: z.coerce.number().min(1, 'Selecciona un producto'),
  movement_type: z.enum(['entry', 'exit', 'adjustment']),
  quantity: z.coerce.number().min(1, 'Cantidad debe ser mayor a 0'),
  unit_cost: z.coerce.number().min(0).optional(),
  reference_type: z.string().optional(),
  reference_id: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface MovementFormProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

export function MovementForm({ show, onHide, onSuccess }: MovementFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { movement_type: 'entry', quantity: 1, unit_cost: 0 }
  });

  useEffect(() => {
    if (show) {
      loadProducts();
      reset({ movement_type: 'entry', quantity: 1, unit_cost: 0 });
    }
  }, [show, reset]);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await createMovement(data);
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>Nuevo Movimiento</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={12}>
              <Form.Group><Form.Label>Producto *</Form.Label>
                <Form.Select isInvalid={!!errors.product_id} {...register('product_id')}>
                  <option value="">Selecciona un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) - Stock: {p.stock_quantity}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.product_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Tipo de Movimiento *</Form.Label>
                <Form.Select {...register('movement_type')}>
                  <option value="entry">Entrada (Compra/Devolución)</option>
                  <option value="exit">Salida (Venta/Uso)</option>
                  <option value="adjustment">Ajuste de Inventario</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Cantidad *</Form.Label>
                <Form.Control type="number" min="1" isInvalid={!!errors.quantity} {...register('quantity')} />
                <Form.Control.Feedback type="invalid">{errors.quantity?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Costo Unitario (COP)</Form.Label>
                <Form.Control type="number" min="0" {...register('unit_cost')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Tipo de Referencia</Form.Label>
                <Form.Select {...register('reference_type')}>
                  <option value="">Sin referencia</option>
                  <option value="order">Orden de Trabajo</option>
                  <option value="quote">Cotización</option>
                  <option value="purchase">Compra</option>
                  <option value="return">Devolución</option>
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
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Registrar Movimiento'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
