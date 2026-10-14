const fs = require('fs');
const path = require('path');

const files = {
  'src/services/api/customers.ts': `import { supabase } from '../supabase/client';

export interface Customer {
  id: number;
  customer_type: 'individual' | 'company';
  document_number: string | null;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  contact_person: string | null;
  source: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Customer[];
}

export async function getCustomerById(id: number) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Customer;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();
  
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number, customer: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: number) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}`,

  'src/services/api/opportunities.ts': `import { supabase } from '../supabase/client';

export interface Opportunity {
  id: number;
  customer_id: number;
  title: string;
  stage: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  assigned_to: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getOpportunities() {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Opportunity[];
}

export async function createOpportunity(opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('opportunities')
    .insert(opportunity)
    .select()
    .single();
  
  if (error) throw error;
  return data as Opportunity;
}

export async function updateOpportunity(id: number, opportunity: Partial<Opportunity>) {
  const { data, error } = await supabase
    .from('opportunities')
    .update(opportunity)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Opportunity;
}`,

  'src/modules/crm/customers/CustomersPage.tsx': `import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getCustomers, type Customer } from '@/services/api/customers';
import { UserPlus, Search, Edit2, Trash2, Building2, User } from 'lucide-react';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

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

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando clientes...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Clientes</h2>
          <p className="text-muted mb-0">Gestiona la base de datos de clientes de S24</p>
        </div>
        <Button variant="primary">
          <UserPlus size={18} className="me-2" />
          Nuevo Cliente
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text><Search size={18} /></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por nombre, correo o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Cliente</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Fecha de Registro</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    {searchTerm ? 'No se encontraron clientes con ese criterio de búsqueda.' : 'No hay clientes registrados. ¡Crea el primero!'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '16px', fontWeight: 'bold' }}>
                          {customer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold">{customer.full_name}</div>
                          {customer.company_name && <small className="text-muted">{customer.company_name}</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg={customer.customer_type === 'company' ? 'info' : 'secondary'} className="px-3 py-2">
                        {customer.customer_type === 'company' ? <><Building2 size={14} className="me-1" />Empresa</> : <><User size={14} className="me-1" />Natural</>}
                      </Badge>
                    </td>
                    <td>
                      <div>{customer.email || '-'}</div>
                      {customer.contact_person && <small className="text-muted">Contacto: {customer.contact_person}</small>}
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.city || '-'}</td>
                    <td>{new Date(customer.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2">
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="outline-danger" size="sm">
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}`,

  'src/modules/crm/opportunities/OpportunitiesPage.tsx': `import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { getOpportunities, type Opportunity } from '@/services/api/opportunities';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';

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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await getOpportunities();
      setOpportunities(data || []);
    } catch (err: any) {
      setError('Error al cargar las oportunidades: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando oportunidades...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Oportunidades</h2>
          <p className="text-muted mb-0">Embudo de ventas y prospectos comerciales</p>
        </div>
        <Button variant="primary">
          <Plus size={18} className="me-2" />
          Nueva Oportunidad
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <TrendingUp size={24} className="text-primary" />
                </div>
                <div>
                  <div className="text-muted small">Total Oportunidades</div>
                  <div className="fs-4 fw-bold">{opportunities.length}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <DollarSign size={24} className="text-success" />
                </div>
                <div>
                  <div className="text-muted small">Valor Total Pipeline</div>
                  <div className="fs-4 fw-bold">${totalValue.toLocaleString('es-CO')}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <Calendar size={24} className="text-warning" />
                </div>
                <div>
                  <div className="text-muted small">Por Cerrar Este Mes</div>
                  <div className="fs-4 fw-bold">0</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Título</th>
                  <th>Etapa</th>
                  <th>Valor</th>
                  <th>Probabilidad</th>
                  <th>Cierre Esperado</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No hay oportunidades registradas. ¡Crea la primera!
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => {
                    const stage = STAGES.find(s => s.key === opp.stage);
                    return (
                      <tr key={opp.id}>
                        <td className="ps-4 fw-semibold">{opp.title}</td>
                        <td>
                          <Badge bg={stage?.color || 'secondary'} className="px-3 py-2">
                            {stage?.label || opp.stage}
                          </Badge>
                        </td>
                        <td>${(opp.value || 0).toLocaleString('es-CO')}</td>
                        <td>{opp.probability || 0}%</td>
                        <td>{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('es-CO') : '-'}</td>
                        <td className="text-end pe-4">
                          <Button variant="outline-primary" size="sm">Editar</Button>
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
    </div>
  );
}`
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('✅ Archivos de la Fase 4 (CRM) creados exitosamente.');
