import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createOpportunity, updateOpportunity, type Opportunity } from '@/services/api/opportunities';
import { getCustomers } from '@/services/api/customers';

const schema = z.object({
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  title: z.string().min(3, 'Título es requerido'),
  stage: z.string().min(1, 'Etapa es requerida'),
  value: z.coerce.number().min(0, 'Valor debe ser mayor o igual a 0'),
  probability: z.coerce.number().min(0).max(100, 'Probabilidad entre 0 y 100'),
  expected_close_date: z.string().min(1, 'Fecha es requerida'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STAGES = [
  { value: 'new', label: 'Prospecto Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'interested', label: 'Interesado' },
  { value: 'quote_sent', label: 'Cotización Enviada' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

interface OpportunityFormProps {
  show: boolean;
  onHide: () => void;
  opportunity?: any | null;
  onSuccess: () => void;
}

export function OpportunityForm({ show, onHide, opportunity, onSuccess }: OpportunityFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: opportunity || { stage: 'new', probability: 20, value: 0 }
  });

  useEffect(() => {
    if (show) {
      loadCustomers();
      if (opportunity) {
        reset({ ...opportunity, expected_close_date: opportunity.expected_close_date ? opportunity.expected_close_date.split('T')[0] : '' });
      } else {
        reset({ stage: 'new', probability: 20, value: 0, expected_close_date: '' });
      }
    }
  }, [opportunity, show, reset]);

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
      if (opportunity?.id) await updateOpportunity(opportunity.id, data);
      else await createOpportunity(data);
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la oportunidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{opportunity ? 'Editar Oportunidad' : 'Nueva Oportunidad'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={12}>
              <Form.Group><Form.Label>Cliente *</Form.Label>
                <Form.Select isInvalid={!!errors.customer_id} {...register('customer_id')}>
                  <option value="">Selecciona un cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? '(' + c.company_name + ')' : ''}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.customer_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Título de la Oportunidad *</Form.Label>
                <Form.Control isInvalid={!!errors.title} {...register('title')} placeholder="Ej: Instalación de 4 cámaras CCTV" />
                <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Etapa *</Form.Label>
                <Form.Select isInvalid={!!errors.stage} {...register('stage')}>
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.stage?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Valor Estimado (COP) *</Form.Label>
                <Form.Control type="number" isInvalid={!!errors.value} {...register('value')} />
                <Form.Control.Feedback type="invalid">{errors.value?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Probabilidad de Cierre (%) *</Form.Label>
                <Form.Control type="number" min="0" max="100" isInvalid={!!errors.probability} {...register('probability')} />
                <Form.Control.Feedback type="invalid">{errors.probability?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Fecha Estimada de Cierre *</Form.Label>
                <Form.Control type="date" isInvalid={!!errors.expected_close_date} {...register('expected_close_date')} />
                <Form.Control.Feedback type="invalid">{errors.expected_close_date?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Notas / Detalles</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('notes')} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Oportunidad'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
