import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupplier, updateSupplier } from '@/services/api/inventory';

const schema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  contact_person: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface SupplierFormProps {
  show: boolean;
  onHide: () => void;
  supplier?: any | null;
  onSuccess: () => void;
}

export function SupplierForm({ show, onHide, supplier, onSuccess }: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: supplier || { is_active: true }
  });

  useEffect(() => {
    if (supplier) reset(supplier);
    else reset({ is_active: true });
  }, [supplier, show, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      if (supplier?.id) {
        await updateSupplier(supplier.id, data);
      } else {
        await createSupplier(data);
      }
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={12}>
              <Form.Group><Form.Label>Nombre / Razón Social *</Form.Label>
                <Form.Control isInvalid={!!errors.name} {...register('name')} />
                <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Persona de Contacto</Form.Label>
                <Form.Control {...register('contact_person')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>NIT / RUT</Form.Label>
                <Form.Control {...register('tax_id')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Teléfono</Form.Label>
                <Form.Control {...register('phone')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Email</Form.Label>
                <Form.Control type="email" isInvalid={!!errors.email} {...register('email')} />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Ciudad</Form.Label>
                <Form.Control {...register('city')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Condiciones de Pago</Form.Label>
                <Form.Control {...register('payment_terms')} placeholder="Ej: 30 días" />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Dirección</Form.Label>
                <Form.Control {...register('address')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Notas</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Check type="switch" label="Proveedor activo" {...register('is_active')} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Proveedor'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
