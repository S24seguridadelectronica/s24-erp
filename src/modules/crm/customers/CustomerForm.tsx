import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCustomer, updateCustomer, type Customer } from '@/services/api/customers';
import { supabase } from '@/services/supabase/client';

const schema = z.object({
  customer_type: z.enum(['individual', 'company']),
  full_name: z.string().min(3, 'Nombre completo es requerido'),
  document_number: z.string().min(5, 'Documento es requerido'),
  company_name: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().min(7, 'Teléfono es requerido'),
  whatsapp_phone: z.string().optional(),
  city: z.string().min(2, 'Ciudad es requerida'),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormProps {
  show: boolean;
  onHide: () => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export function CustomerForm({ show, onHide, customer, onSuccess }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer || { customer_type: 'individual', full_name: '', document_number: '', phone: '', city: '' }
  });

  useEffect(() => {
    if (customer) reset(customer);
    else reset({ customer_type: 'individual', full_name: '', document_number: '', phone: '', city: '' });
  }, [customer, show, reset]);

  const onSubmit = async (data: FormData) => {
    // 🔥 PRUEBA DE FUEGO: Si ves esta alerta, el código nuevo está funcionando.
    alert("✅ ¡ESTE ES EL CÓDIGO NUEVO! El assigned_to se va a guardar.");
    
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener el usuario actual que está creando el cliente
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 USUARIO ACTUAL ID:', user?.id);
      
      if (customer?.id) {
        // Si es edición, actualizamos manteniendo el assigned_to original
        await updateCustomer(customer.id, data);
      } else {
        // Si es creación nueva, asignamos el cliente al usuario actual
        const newCustomerData = {
          ...data,
          assigned_to: user?.id ? String(user.id) : null
        } as any; // <-- FIX: Resuelve el error de TypeScript
        
        console.log('🚀 ENVIANDO A BD CON assigned_to:', newCustomerData.assigned_to);
        await createCustomer(newCustomerData);
      }
      
      onSuccess();
      onHide();
    } catch (err: any) {
      console.error('💥 ERROR AL GUARDAR:', err);
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tipo de Cliente *</Form.Label>
                <Form.Select {...register('customer_type')}>
                  <option value="individual">Persona Natural</option>
                  <option value="company">Empresa</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nombre Completo / Razón Social *</Form.Label>
                <Form.Control isInvalid={!!errors.full_name} {...register('full_name')} />
                <Form.Control.Feedback type="invalid">{errors.full_name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Documento / NIT *</Form.Label>
                <Form.Control isInvalid={!!errors.document_number} {...register('document_number')} />
                <Form.Control.Feedback type="invalid">{errors.document_number?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nombre de la Empresa (si aplica)</Form.Label>
                <Form.Control {...register('company_name')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Teléfono *</Form.Label>
                <Form.Control isInvalid={!!errors.phone} {...register('phone')} placeholder="Teléfono principal" />
                <Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>WhatsApp (si es diferente)</Form.Label>
                <Form.Control {...register('whatsapp_phone')} placeholder="Número de WhatsApp" />
                <Form.Text className="text-muted">Si está vacío, se usará el teléfono principal para WhatsApp</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Correo Electrónico</Form.Label>
                <Form.Control type="email" isInvalid={!!errors.email} {...register('email')} />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Ciudad *</Form.Label>
                <Form.Control isInvalid={!!errors.city} {...register('city')} />
                <Form.Control.Feedback type="invalid">{errors.city?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Dirección</Form.Label>
                <Form.Control {...register('address')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Notas / Observaciones</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Cliente'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}