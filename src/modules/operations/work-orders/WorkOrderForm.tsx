import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createWorkOrder, updateWorkOrder, getNextWorkOrderNumber, getTechnicians, type WorkOrderMaterial } from '@/services/api/work-orders';
import { getCustomers } from '@/services/api/customers';
import { Plus, Trash2 } from 'lucide-react';

const schema = z.object({
  order_number: z.string().min(1, 'Número es requerido'),
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  service_type: z.string().min(1, 'Tipo de servicio es requerido'),
  status: z.enum(['pending', 'scheduled', 'assigned', 'in_transit', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  scheduled_at: z.string().optional(),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  materials_cost: z.coerce.number().min(0),
  labor_cost: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const SERVICE_TYPES = [
  'Instalación de CCTV',
  'Instalación de Alarma',
  'Instalación de Control de Acceso',
  'Mantenimiento Preventivo',
  'Mantenimiento Correctivo',
  'Diagnóstico Técnico',
  'Reparación de Equipos',
  'Configuración de Sistema',
  'Otro',
];

interface WorkOrderFormProps {
  show: boolean;
  onHide: () => void;
  order?: any | null;
  onSuccess: () => void;
}

export function WorkOrderForm({ show, onHide, order, onSuccess }: WorkOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [materials, setMaterials] = useState<WorkOrderMaterial[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: order || { status: 'pending', priority: 'medium', materials_cost: 0, labor_cost: 0 }
  });

  useEffect(() => {
    if (show) {
      loadData();
      if (order) {
        reset({
          ...order,
          scheduled_at: order.scheduled_at ? order.scheduled_at.slice(0, 16) : '',
          materials_cost: order.materials_cost || 0,
          labor_cost: order.labor_cost || 0,
        });
        setMaterials(order.items || []);
      } else {
        reset({ status: 'pending', priority: 'medium', materials_cost: 0, labor_cost: 0, order_number: 'OT-0001' });
        setMaterials([]);
        getNextWorkOrderNumber().then(num => reset({ status: 'pending', priority: 'medium', materials_cost: 0, labor_cost: 0, order_number: num }));
      }
    }
  }, [order, show, reset]);

  async function loadData() {
    try {
      const [custData, techData] = await Promise.all([getCustomers(), getTechnicians()]);
      setCustomers(custData || []);
      setTechnicians(techData || []);
    } catch (err) { console.error(err); }
  }

  const addMaterial = () => {
    setMaterials([...materials, { product_name: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof WorkOrderMaterial, value: any) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newMaterials[index].total = (newMaterials[index].quantity || 0) * (newMaterials[index].unit_price || 0);
    }
    setMaterials(newMaterials);
  };

  const totalMaterials = materials.reduce((sum, m) => sum + (m.total || 0), 0);

  const onSubmit = async (data: FormData) => {
    if (materials.length > 0 && data.materials_cost === 0) {
      data.materials_cost = totalMaterials;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (order?.id) {
        await updateWorkOrder(order.id, data);
      } else {
        await createWorkOrder(data, materials);
      }
      onSuccess();
      onHide();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al guardar la orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{order ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <h5 className="mb-3">Información General</h5>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Group><Form.Label>Número *</Form.Label>
                <Form.Control {...register('order_number')} readOnly />
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
              <Form.Group><Form.Label>Tipo de Servicio *</Form.Label>
                <Form.Select isInvalid={!!errors.service_type} {...register('service_type')}>
                  <option value="">Selecciona...</option>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.service_type?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Estado *</Form.Label>
                <Form.Select {...register('status')}>
                  <option value="pending">Pendiente</option>
                  <option value="scheduled">Programada</option>
                  <option value="assigned">Asignada</option>
                  <option value="in_transit">En Camino</option>
                  <option value="in_progress">En Ejecución</option>
                  <option value="completed">Finalizada</option>
                  <option value="cancelled">Cancelada</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Prioridad *</Form.Label>
                <Form.Select {...register('priority')}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Fecha y Hora Programada</Form.Label>
                <Form.Control type="datetime-local" {...register('scheduled_at')} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Costo de Materiales</Form.Label>
                <Form.Control type="number" min="0" {...register('materials_cost')} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Costo de Mano de Obra</Form.Label>
                <Form.Control type="number" min="0" {...register('labor_cost')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Dirección del Servicio</Form.Label>
                <Form.Control {...register('address')} placeholder="Dirección donde se realizará el trabajo" />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Nombre de Contacto</Form.Label>
                <Form.Control {...register('contact_name')} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Teléfono de Contacto</Form.Label>
                <Form.Control {...register('contact_phone')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Descripción del Trabajo</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('description')} placeholder="Describe el trabajo a realizar..." />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Notas / Observaciones</Form.Label>
                <Form.Control as="textarea" rows={2} {...register('notes')} />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Materiales Utilizados</h5>
            <Button variant="outline-primary" size="sm" onClick={addMaterial}>
              <Plus size={16} className="me-2" />Agregar Material
            </Button>
          </div>
          
          {materials.length > 0 && (
            <Table responsive bordered size="sm">
              <thead className="bg-light">
                <tr>
                  <th>Producto / Material</th>
                  <th style={{width: '100px'}}>Cantidad</th>
                  <th style={{width: '120px'}}>Precio Unit.</th>
                  <th style={{width: '120px'}}>Total</th>
                  <th style={{width: '50px'}}></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => (
                  <tr key={index}>
                    <td><Form.Control value={material.product_name} onChange={(e) => updateMaterial(index, 'product_name', e.target.value)} placeholder="Nombre del material" /></td>
                    <td><Form.Control type="number" min="1" value={material.quantity} onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                    <td><Form.Control type="number" min="0" value={material.unit_price} onChange={(e) => updateMaterial(index, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                    <td className="fw-bold">${(material.total || 0).toLocaleString('es-CO')}</td>
                    <td><Button variant="outline-danger" size="sm" onClick={() => removeMaterial(index)}><Trash2 size={14} /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-end fw-bold">Total Materiales:</td>
                  <td className="fw-bold">${totalMaterials.toLocaleString('es-CO')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>
          )}

          <div className="mt-4 p-3 bg-light rounded">
            <Row>
              <Col md={6}></Col>
              <Col md={6}>
                <div className="d-flex justify-content-between mb-2"><span>Materiales:</span><span>${(typeof materials_cost === 'number' ? materials_cost : 0).toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between mb-2"><span>Mano de Obra:</span><span>${(typeof labor_cost === 'number' ? labor_cost : 0).toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2">
                  <span>TOTAL ORDEN:</span>
                  <span>${((typeof materials_cost === 'number' ? materials_cost : 0) + (typeof labor_cost === 'number' ? labor_cost : 0)).toLocaleString('es-CO')}</span>
                </div>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Orden'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
