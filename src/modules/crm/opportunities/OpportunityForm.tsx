import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createOpportunity, updateOpportunity } from '@/services/api/opportunities';
import { getCustomers, updateCustomer } from '@/services/api/customers';
import { supabase } from '@/services/supabase/client';
import { User, Phone, MapPin, FileText, Building, Calendar, UserCheck } from 'lucide-react';
import { SellerAssignmentModal } from './SellerAssignmentModal'; // Asegúrate que el archivo exista aquí

const schema = z.object({
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  title: z.string().min(3, 'Título es requerido'),
  stage: z.string().min(1, 'Etapa es requerida'),
  value: z.coerce.number().min(0, 'Valor debe ser mayor o igual a 0'),
  probability: z.coerce.number().min(0).max(100, 'Probabilidad entre 0 y 100'),
  expected_close_date: z.string().min(1, 'Fecha es requerida'),
  contact_log: z.string().optional(),
  technical_survey: z.string().optional(),
  loss_reason: z.string().optional(),
  notes: z.string().optional(),
  client_category: z.string().default('Residencial'),
  next_action: z.string().default('visita'),
  assigned_to: z.string().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const STAGES = [
  { value: 'asignado', label: '1. Cliente Asignado (Por contactar)', color: 'secondary', probability: 10 },
  { value: 'contacto', label: '2. En Gestión de Contacto', color: 'info', probability: 30 },
  { value: 'oportunidad', label: '3. Oportunidad Calificada', color: 'primary', probability: 50 },
  { value: 'visita', label: '4. Visita Técnica / Levantamiento', color: 'warning', probability: 60 },
  { value: 'propuesta', label: '5. Cotización Enviada', color: 'orange', probability: 75 },
  { value: 'negociacion', label: 'En Negociación', color: 'purple', probability: 85 },
  { value: 'ganado', label: '✅ Cierre: Ganado', color: 'success', probability: 100 },
  { value: 'perdido', label: '❌ Cierre: Perdido', color: 'danger', probability: 0 }
];

const LOSS_REASONS = [
  'Precio demasiado alto', 'Eligió a la competencia', 'Proyecto cancelado',
  'No contesta / No responde', 'No tiene presupuesto', 'Cambió de opinión', 'Otro motivo'
];

interface OpportunityFormProps {
  show: boolean;
  onHide: () => void;
  opportunity?: any | null;
  preselectedCustomer?: any | null;
  onSuccess: () => void;
}

export function OpportunityForm({ show, onHide, opportunity, preselectedCustomer, onSuccess }: OpportunityFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('asignado');
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [selectedSellerName, setSelectedSellerName] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: opportunity || { 
      stage: 'asignado', probability: 10, value: 0, client_category: 'Residencial', next_action: 'visita' 
    }
  });

  const watchedStage = watch('stage', opportunity?.stage || 'asignado');
  const watchedCustomerId = watch('customer_id');
  const watchedNextAction = watch('next_action');
  const watchedAssignedTo = watch('assigned_to');

  useEffect(() => {
    if (show) {
      loadCustomers();
      if (opportunity) {
        reset({
          ...opportunity,
          expected_close_date: opportunity.expected_close_date ? opportunity.expected_close_date.split('T')[0] : '',
          contact_log: opportunity.contact_log || '',
          technical_survey: opportunity.technical_survey || '',
          loss_reason: opportunity.loss_reason || '',
          client_category: opportunity.client_category || 'Residencial',
          next_action: opportunity.next_action || 'visita',
          assigned_to: opportunity.assigned_to || '',
          scheduled_date: opportunity.scheduled_date ? opportunity.scheduled_date.slice(0,16) : '',
        });
        setSelectedStage(opportunity.stage || 'asignado');
        if (opportunity.customer_id) {
          const cust = customers.find(c => Number(c.id) === Number(opportunity.customer_id));
          if (cust) setCustomerData(cust);
        }
      } else if (preselectedCustomer) {
        reset({
          customer_id: preselectedCustomer.id,
          stage: 'asignado',
          probability: 10,
          value: 0,
          expected_close_date: '',
          title: `Oportunidad con ${preselectedCustomer.full_name}`,
          contact_log: '', technical_survey: '', loss_reason: '',
          client_category: 'Residencial', next_action: 'visita', assigned_to: '', scheduled_date: ''
        });
        setSelectedStage('asignado');
        setCustomerData(preselectedCustomer);
      } else {
        reset({ 
          stage: 'asignado', probability: 10, value: 0, expected_close_date: '', 
          contact_log: '', technical_survey: '', loss_reason: '',
          client_category: 'Residencial', next_action: 'visita', assigned_to: '', scheduled_date: ''
        });
        setSelectedStage('asignado');
        setSelectedCustomerData(null);
        setSelectedSellerName('');
      }
    }
  }, [opportunity, preselectedCustomer, show, reset]);

  useEffect(() => {
    const stage = STAGES.find(s => s.value === watchedStage);
    if (stage && !opportunity) {
      reset(prev => ({ ...prev, probability: stage.probability }));
    }
  }, [watchedStage, opportunity, reset]);

  useEffect(() => {
    if (watchedCustomerId && customers.length > 0 && !opportunity && !preselectedCustomer) {
      const cust = customers.find(c => Number(c.id) === Number(watchedCustomerId));
      if (cust) setCustomerData(cust);
      else setSelectedCustomerData(null);
    }
  }, [watchedCustomerId, customers, opportunity, preselectedCustomer]);

  const setCustomerData = (cust: any) => {
    setSelectedCustomerData({
      id: cust.id,
      document_number: cust.document_number || '',
      full_name: cust.full_name || '',
      company_name: cust.company_name || '',
      contact_person: cust.contact_person || '',
      whatsapp_phone: cust.whatsapp_phone || '',
      address: cust.address || '',
      city: cust.city || '',
      email: cust.email || ''
    });
  };

  const updateCustomerField = (field: string, value: string) => {
    if (selectedCustomerData) {
      setSelectedCustomerData({ ...selectedCustomerData, [field]: value });
    }
  };

  async function loadCustomers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleData } = await (supabase.from('user_roles') as any).select('roles(name)').eq('user_id', user?.id).maybeSingle();
      const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
      const isSalesperson = roleName === 'salesperson' || roleName === 'vendedor';
      const data = await getCustomers(isSalesperson ? user?.id : undefined);
      setCustomers(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const oppData = {
        ...data,
        seller_id: user?.id,
        contact_log: data.contact_log || null,
        technical_survey: data.technical_survey || null,
        loss_reason: data.stage === 'perdido' ? (data.loss_reason || 'No especificado') : null,
        client_category: data.client_category,
        next_action: data.next_action,
        assigned_to: data.assigned_to || null,
        scheduled_date: data.scheduled_date || null
      };

      let oppId = opportunity?.id;
      if (oppId) {
        await updateOpportunity(oppId, oppData as any);
      } else {
        const newOpp = await createOpportunity(oppData as any);
        oppId = newOpp.id;
      }

      if ((data.next_action === 'visita' || data.next_action === 'llamada') && data.assigned_to) {
        const { error: taskError } = await (supabase.from('tasks') as any).insert([{
          title: `${data.next_action === 'visita' ? 'Visita Técnica' : 'Asesoría Telefónica'} - ${data.title}`,
          opportunity_id: oppId,
          assigned_to: data.assigned_to,
          due_date: data.scheduled_date || new Date().toISOString(),
          type: data.next_action,
          description: data.notes || data.contact_log || 'Sin descripción'
        }]);
        if (taskError) console.error("Error creando tarea para vendedor:", taskError);
      }

      if (selectedCustomerData && data.customer_id) {
        await updateCustomer(data.customer_id, {
          document_number: selectedCustomerData.document_number,
          full_name: selectedCustomerData.full_name,
          company_name: selectedCustomerData.company_name,
          contact_person: selectedCustomerData.contact_person,
          whatsapp_phone: selectedCustomerData.whatsapp_phone,
          address: selectedCustomerData.address,
          city: selectedCustomerData.city,
          email: selectedCustomerData.email
        });
      }

      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la oportunidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{opportunity ? 'Editar Oportunidad' : 'Nueva Oportunidad'}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            
            {selectedCustomerData && (
              <Card className="mb-4 border-info">
                <Card.Header className="bg-info bg-opacity-10">
                  <h6 className="mb-0"><User size={18} className="me-2" />Datos del Cliente (Confirmar o Actualizar)</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold"><FileText size={14} className="me-1" />NIT / Cédula</Form.Label>
                        <Form.Control value={selectedCustomerData.document_number} onChange={(e) => updateCustomerField('document_number', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold"><Building size={14} className="me-1" />Razón Social / Empresa</Form.Label>
                        <Form.Control value={selectedCustomerData.company_name} onChange={(e) => updateCustomerField('company_name', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold"><User size={14} className="me-1" />Nombre del Dueño / Contacto</Form.Label>
                        <Form.Control value={selectedCustomerData.contact_person} onChange={(e) => updateCustomerField('contact_person', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold"><Phone size={14} className="me-1" />WhatsApp</Form.Label>
                        <Form.Control value={selectedCustomerData.whatsapp_phone} onChange={(e) => updateCustomerField('whatsapp_phone', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label className="small fw-bold"><MapPin size={14} className="me-1" />Dirección Real</Form.Label>
                        <Form.Control value={selectedCustomerData.address} onChange={(e) => updateCustomerField('address', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Ciudad</Form.Label>
                        <Form.Control value={selectedCustomerData.city} onChange={(e) => updateCustomerField('city', e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            <Row className="g-3">
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Cliente *</Form.Label>
                  <Form.Select isInvalid={!!errors.customer_id} {...register('customer_id')} disabled={!!preselectedCustomer && !opportunity}>
                    <option value="">Selecciona un cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? '(' + c.company_name + ')' : ''}</option>)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.customer_id?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Categoría del Cliente</Form.Label>
                  <Form.Select {...register('client_category')}>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="VIP">VIP / Mayorista</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Título de la Oportunidad *</Form.Label>
                  <Form.Control isInvalid={!!errors.title} {...register('title')} placeholder="Ej: Instalación de 8 cámaras CCTV" />
                  <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <div className="p-3 bg-light rounded border mb-2">
                  <h6 className="fw-bold text-primary mb-3">Gestión de la Visita / Acción</h6>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>¿Qué requiere el cliente? *</Form.Label>
                        <Form.Select {...register('next_action')}>
                          <option value="visita">Agendar Visita Física</option>
                          <option value="llamada">Asesoría Telefónica</option>
                          <option value="cotizacion">Cotización Inmediata</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {(watchedNextAction === 'visita' || watchedNextAction === 'llamada') && (
                      <>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Vendedor / Técnico</Form.Label>
                            <Button 
                              type="button"
                              variant={watchedAssignedTo ? "success" : "outline-primary"} 
                              className="w-100 text-truncate"
                              onClick={() => setShowSellerModal(true)}
                            >
                              <UserCheck size={16} className="me-2" />
                              {watchedAssignedTo ? selectedSellerName || 'Vendedor Asignado' : 'Asignar Vendedor'}
                            </Button>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label><Calendar size={14} className="me-1"/> Fecha y Hora</Form.Label>
                            <Form.Control type="datetime-local" {...register('scheduled_date')} />
                          </Form.Group>
                        </Col>
                      </>
                    )}
                  </Row>
                </div>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Etapa en el Embudo *</Form.Label>
                  <Form.Select isInvalid={!!errors.stage} {...register('stage')} onChange={(e) => setSelectedStage(e.target.value)}>
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Valor Estimado (COP) *</Form.Label>
                  <Form.Control type="number" isInvalid={!!errors.value} {...register('value')} />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Probabilidad (%) *</Form.Label>
                  <Form.Control type="number" min="0" max="100" isInvalid={!!errors.probability} {...register('probability')} />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Fecha Estimada de Cierre *</Form.Label>
                  <Form.Control type="date" isInvalid={!!errors.expected_close_date} {...register('expected_close_date')} />
                </Form.Group>
              </Col>

              {(selectedStage === 'asignado' || selectedStage === 'contacto') && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>📞 Bitácora de Contacto / Seguimiento</Form.Label>
                    <Form.Control as="textarea" rows={3} {...register('contact_log')} placeholder="Registra las llamadas realizadas..." />
                  </Form.Group>
                </Col>
              )}

              {(selectedStage === 'visita' || selectedStage === 'propuesta' || selectedStage === 'negociacion') && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>🔧 Levantamiento Técnico / Requerimientos</Form.Label>
                    <Form.Control as="textarea" rows={3} {...register('technical_survey')} placeholder="Detalles del levantamiento técnico..." />
                  </Form.Group>
                </Col>
              )}

              {selectedStage === 'perdido' && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="text-danger">❌ Motivo de Pérdida *</Form.Label>
                    <Form.Select isInvalid={!!errors.loss_reason} {...register('loss_reason')}>
                      <option value="">Selecciona el motivo...</option>
                      {LOSS_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notas Generales</Form.Label>
                  <Form.Control as="textarea" rows={2} {...register('notes')} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Oportunidad'}
            </Button>
          </Modal.Footer> {/* 👈 ESTA ES LA LÍNEA QUE FALTABA CORREGIR */}
        </Form>
      </Modal>

      <SellerAssignmentModal 
        show={showSellerModal} 
        onHide={() => setShowSellerModal(false)}
        onSelectSeller={(id, name) => {
          setValue('assigned_to', id);
          setSelectedSellerName(name);
          setShowSellerModal(false);
        }}
      />
    </>
  );
}