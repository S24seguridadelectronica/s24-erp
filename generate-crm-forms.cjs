const fs = require('fs');
const path = require('path');

const files = {
  'src/services/api/customers.ts': `import { supabase } from '../supabase/client';

export interface Customer {
  id?: number;
  customer_type: 'individual' | 'company';
  document_number: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  contact_person: string;
  source: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number, customer: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: number) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
}`,

  'src/services/api/opportunities.ts': `import { supabase } from '../supabase/client';

export interface Opportunity {
  id?: number;
  customer_id: number;
  title: string;
  stage: string;
  value: number;
  probability: number;
  expected_close_date: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export async function getOpportunities() {
  const { data, error } = await supabase.from('opportunities').select('*, customers(full_name, company_name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createOpportunity(opp: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('opportunities').insert(opp).select().single();
  if (error) throw error;
  return data as Opportunity;
}

export async function updateOpportunity(id: number, opp: Partial<Opportunity>) {
  const { data, error } = await supabase.from('opportunities').update(opp).eq('id', id).select().single();
  if (error) throw error;
  return data as Opportunity;
}`,

  'src/modules/crm/customers/CustomerForm.tsx': `import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCustomer, updateCustomer, type Customer } from '@/services/api/customers';

const schema = z.object({
  customer_type: z.enum(['individual', 'company']),
  full_name: z.string().min(3, 'Nombre completo es requerido'),
  document_number: z.string().min(5, 'Documento es requerido'),
  company_name: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().min(7, 'Teléfono es requerido'),
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
    setLoading(true);
    setError(null);
    try {
      if (customer?.id) await updateCustomer(customer.id, data);
      else await createCustomer(data);
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group><Form.Label>Tipo de Cliente *</Form.Label>
                <Form.Select {...register('customer_type')}><option value="individual">Persona Natural</option><option value="company">Empresa</option></Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Nombre Completo / Razón Social *</Form.Label>
                <Form.Control isInvalid={!!errors.full_name} {...register('full_name')} />
                <Form.Control.Feedback type="invalid">{errors.full_name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Documento / NIT *</Form.Label>
                <Form.Control isInvalid={!!errors.document_number} {...register('document_number')} />
                <Form.Control.Feedback type="invalid">{errors.document_number?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Nombre de la Empresa (si aplica)</Form.Label>
                <Form.Control {...register('company_name')} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Teléfono *</Form.Label>
                <Form.Control isInvalid={!!errors.phone} {...register('phone')} />
                <Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Correo Electrónico</Form.Label>
                <Form.Control type="email" isInvalid={!!errors.email} {...register('email')} />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Ciudad *</Form.Label>
                <Form.Control isInvalid={!!errors.city} {...register('city')} />
                <Form.Control.Feedback type="invalid">{errors.city?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Dirección</Form.Label>
                <Form.Control {...register('address')} />
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
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Cliente'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}`,

  'src/modules/crm/opportunities/OpportunityForm.tsx': `import { useState, useEffect } from 'react';
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
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? \`(\${c.company_name})\` : ''}</option>)}
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
}`
};

const pages = {
  'src/modules/crm/customers/CustomersPage.tsx': \`import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getCustomers, deleteCustomer, type Customer } from '@/services/api/customers';
import { UserPlus, Search, Edit2, Trash2 } from 'lucide-react';
import { CustomerForm } from './CustomerForm';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      setError('Error al cargar los clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await deleteCustomer(id);
        loadCustomers();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h2 className="mb-1">Clientes</h2><p className="text-muted mb-0">Gestiona la base de datos de clientes de S24</p></div>
        <Button variant="primary" onClick={() => { setEditingCustomer(null); setShowForm(true); }}><UserPlus size={18} className="me-2" /> Nuevo Cliente</Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text><Search size={18} /></InputGroup.Text>
            <Form.Control placeholder="Buscar por nombre, correo o teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </InputGroup>
        </Card.Body>
      </Card>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr><th className="ps-4">Cliente</th><th>Tipo</th><th>Contacto</th><th>Teléfono</th><th>Ciudad</th><th className="text-end pe-4">Acciones</th></tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No hay clientes registrados.</td></tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontWeight: 'bold' }}>{customer.full_name.charAt(0).toUpperCase()}</div>
                        <div><div className="fw-semibold">{customer.full_name}</div>{customer.company_name && <small className="text-muted">{customer.company_name}</small>}</div>
                      </div>
                    </td>
                    <td><Badge bg={customer.customer_type === 'company' ? 'info' : 'secondary'}>{customer.customer_type === 'company' ? 'Empresa' : 'Natural'}</Badge></td>
                    <td><div>{customer.email || '-'}</div>{customer.contact_person && <small className="text-muted">Contacto: {customer.contact_person}</small>}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.city || '-'}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingCustomer(customer); setShowForm(true); }}><Edit2 size={16} /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(customer.id!)}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <CustomerForm show={showForm} onHide={() => setShowForm(false)} customer={editingCustomer} onSuccess={loadCustomers} />
    </div>
  );
}\`,

  'src/modules/crm/opportunities/OpportunitiesPage.tsx': \`import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { getOpportunities } from '@/services/api/opportunities';
import { Plus, TrendingUp, DollarSign, Calendar, Edit2 } from 'lucide-react';
import { OpportunityForm } from './OpportunityForm';

const STAGES = [
  { key: 'new', label: 'Prospecto Nuevo', color: 'secondary' },
  { key: 'contacted', label: 'Contactado', color: 'info' },
  { key: 'interested', label: 'Interesado', color: 'primary' },
  { key: 'quote_sent', label: 'Cotización Enviada', color: 'warning' },
  { key: 'negotiation', label: 'Negociación', color: 'purple' },
  { key: 'won', label: 'Ganado', color: 'success' },
  { key: 'lost', label: 'Perdido', color: 'danger' },
];

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any | null>(null);

  useEffect(() => { loadOpportunities(); }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await getOpportunities();
      setOpportunities(data || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h2 className="mb-1">Oportunidades</h2><p className="text-muted mb-0">Embudo de ventas y prospectos comerciales</p></div>
        <Button variant="primary" onClick={() => { setEditingOpp(null); setShowForm(true); }}><Plus size={18} className="me-2" /> Nueva Oportunidad</Button>
      </div>
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded me-3"><TrendingUp size={24} className="text-primary" /></div>
              <div><div className="text-muted small">Total Oportunidades</div><div className="fs-4 fw-bold">{opportunities.length}</div></div>
            </div>
          </Card.Body></Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="d-flex align-items-center">
              <div className="bg-success bg-opacity-10 p-3 rounded me-3"><DollarSign size={24} className="text-success" /></div>
              <div><div className="text-muted small">Valor Total Pipeline</div><div className="fs-4 fw-bold">$ {totalValue.toLocaleString('es-CO')}</div></div>
            </div>
          </Card.Body></Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><Calendar size={24} className="text-warning" /></div>
              <div><div className="text-muted small">Por Cerrar Este Mes</div><div className="fs-4 fw-bold">0</div></div>
            </div>
          </Card.Body></Card>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead className="bg-light">
                <tr><th className="ps-4">Título</th><th>Cliente</th><th>Etapa</th><th>Valor</th><th>Probabilidad</th><th className="text-end pe-4">Acciones</th></tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">No hay oportunidades registradas.</td></tr>
                ) : (
                  opportunities.map((opp) => {
                    const stage = STAGES.find(s => s.key === opp.stage);
                    return (
                      <tr key={opp.id}>
                        <td className="ps-4 fw-semibold">{opp.title}</td>
                        <td>{opp.customers?.full_name || 'N/A'}</td>
                        <td><Badge bg={stage?.color || 'secondary'}>{stage?.label || opp.stage}</Badge></td>
                        <td>$ {(opp.value || 0).toLocaleString('es-CO')}</td>
                        <td>{opp.probability || 0}%</td>
                        <td className="text-end pe-4">
                          <Button variant="outline-primary" size="sm" onClick={() => { setEditingOpp(opp); setShowForm(true); }}><Edit2 size={16} /></Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
      <OpportunityForm show={showForm} onHide={() => setShowForm(false)} opportunity={editingOpp} onSuccess={loadOpportunities} />
    </div>
  );
}\`
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
});

Object.entries(pages).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('✅ Formularios del CRM integrados exitosamente.');
