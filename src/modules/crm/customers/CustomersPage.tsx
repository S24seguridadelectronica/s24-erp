import { useState, useEffect } from 'react';
import { Card, Button, Form, Badge, Modal, Row, Col } from 'react-bootstrap';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/services/api/customers';
import { OpportunityForm } from '@/modules/crm/opportunities/OpportunityForm';
import { UserPlus, Edit, Trash2, Users, Target, CheckCircle, AlertCircle, Flame } from 'lucide-react';

interface CustomerFormProps {
  show: boolean;
  onHide: () => void;
  customer?: any;
  onSuccess: () => void;
}

function CustomerForm({ show, onHide, customer, onSuccess }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    full_name: '', company_name: '', customer_type: 'individual' as 'individual' | 'company',
    document_number: '', phone: '', email: '', city: '', address: '', contact_person: '', source: 'Web', notes: ''
  });

  useEffect(() => {
    if (customer) setFormData(customer);
    else setFormData({ full_name: '', company_name: '', customer_type: 'individual', document_number: '', phone: '', email: '', city: '', address: '', contact_person: '', source: 'Web', notes: '' });
  }, [customer, show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (customer?.id) await updateCustomer(customer.id, formData);
      else await createCustomer(formData);
      onSuccess(); onHide();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton><Modal.Title>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6"><Form.Group><Form.Label>Nombre Completo *</Form.Label><Form.Control required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></Form.Group></div>
            <div className="col-md-6"><Form.Group><Form.Label>Empresa</Form.Label><Form.Control value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} /></Form.Group></div>
            <div className="col-md-6"><Form.Group><Form.Label>Teléfono</Form.Label><Form.Control value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></Form.Group></div>
            <div className="col-md-6"><Form.Group><Form.Label>Correo</Form.Label><Form.Control type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Form.Group></div>
            <div className="col-md-6"><Form.Group><Form.Label>Ciudad</Form.Label><Form.Control value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></Form.Group></div>
            <div className="col-md-6"><Form.Group><Form.Label>Dirección</Form.Label><Form.Control value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></Form.Group></div>
            <div className="col-md-12"><Form.Group><Form.Label>Observaciones</Form.Label><Form.Control as="textarea" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Form.Group></div>
          </div>
          <Modal.Footer className="mt-4">
            <Button variant="secondary" onClick={onHide}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerForOpportunity, setSelectedCustomerForOpportunity] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  // @ts-ignore - Map para almacenar la etapa de oportunidad por customer_id
  const [customerOpportunityStage, setCustomerOpportunityStage] = useState<Map<any, string>>(new Map());

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { filterCustomers(); }, [customers, searchTerm]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      let currentRole: string | null = null;
      if (user) {
        const { data: roleData } = await (supabase.from('user_roles') as any).select('roles(name)').eq('user_id', user.id).maybeSingle();
        const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
        if (roleName === 'salesperson' || roleName === 'vendedor') currentRole = 'salesperson';
        else currentRole = roleName || 'admin';
        setUserRole(currentRole);
      }

      const sellerId = currentRole === 'salesperson' ? user?.id : undefined;
      const data = await (getCustomers as any)(sellerId);
      setCustomers(data || []);

      if (user) {
        const { data: opportunities } = await (supabase.from('opportunities') as any)
          .select('customer_id, stage')
          .eq('seller_id', user.id);
        
        const oppMap = new Map<any, string>();
        opportunities?.forEach((opp: any) => {
          if (opp.customer_id) oppMap.set(opp.customer_id, opp.stage || 'new');
        });
        setCustomerOpportunityStage(oppMap);
      }
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  function filterCustomers() {
    if (!searchTerm) { setFilteredCustomers(customers); return; }
    const term = searchTerm.toLowerCase();
    const filtered = customers.filter((c: any) =>
      c.full_name?.toLowerCase().includes(term) || c.company_name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) || c.email?.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term)
    );
    setFilteredCustomers(filtered);
  }

  const handleEdit = (customer: any) => { setSelectedCustomer(customer); setShowForm(true); };
  const handleCreateOpportunity = (customer: any) => { setSelectedCustomerForOpportunity(customer); setShowOpportunityForm(true); };
  const handleOpportunitySuccess = () => { loadCustomers(); };

  const handleDelete = async (id: number) => {
    if (userRole === 'salesperson') { alert(' No tienes permisos para eliminar clientes.'); return; }
    if (window.confirm('¿Eliminar este cliente?')) {
      try { await deleteCustomer(id); await loadCustomers(); } 
      catch (err: any) { alert('Error: ' + err.message); }
    }
  };
  
  const handleSuccess = () => { loadCustomers(); setSelectedCustomer(null); };
  const canDelete = userRole !== 'salesperson';

  const customersWithProposal = Array.from(customerOpportunityStage.values()).filter(s => s === 'propuesta').length;
  const totalWithOpportunity = customerOpportunityStage.size;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Users size={28} className="me-2" />Clientes</h2>
          <p className="text-muted mb-0">{userRole === 'salesperson' ? 'Tus clientes asignados' : 'Gestiona la base de datos de clientes de S24'}</p>
        </div>
        <Button variant="primary" onClick={() => { setSelectedCustomer(null); setShowForm(true); }}>
          <UserPlus size={18} className="me-2" /> Nuevo Cliente
        </Button>
      </div>

      {userRole === 'salesperson' && (
        <div className="alert alert-info">
          <strong>📋 Vista de Vendedor:</strong> Solo estás viendo los clientes que te han sido asignados.
          <br />
          <small className="text-muted">
            <Flame size={14} className="me-1 text-danger" />
            <strong className="text-danger">Rojo:</strong> Cliente con propuesta activa (¡prioridad!) | 
            <CheckCircle size={14} className="ms-2 me-1 text-success" />
            <strong className="text-success">Verde:</strong> Oportunidad en otra etapa | 
            <AlertCircle size={14} className="ms-2 me-1 text-warning" />
            <strong className="text-warning">Normal:</strong> Sin oportunidad
          </small>
        </div>
      )}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Form.Control type="text" placeholder="Buscar por nombre, empresa, teléfono, correo o ciudad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="py-2" />
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Cargando...</span></div></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center p-5">
              <Users size={64} className="text-muted mb-3" />
              <h5>No hay clientes</h5>
              <p className="text-muted">{userRole === 'salesperson' ? 'No tienes clientes asignados aún.' : 'Comienza agregando tu primer cliente.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4">Cliente</th>
                    <th>Tipo</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Ciudad</th>
                    <th>Oportunidad</th>
                    <th className="text-end pe-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer: any) => {
                    const stage = customerOpportunityStage.get(customer.id);
                    const hasOpportunity = stage !== undefined;
                    const isProposal = stage === 'propuesta';
                    
                    let rowClass = '';
                    if (isProposal) rowClass = 'bg-danger bg-opacity-10';
                    else if (hasOpportunity) rowClass = 'bg-success bg-opacity-10';
                    
                    return (
                      <tr key={customer.id} className={rowClass}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="me-3 bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: '50%' }}>
                              {customer.full_name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div className="fw-semibold">{customer.full_name}</div>
                              {customer.company_name && <small className="text-muted">{customer.company_name}</small>}
                            </div>
                          </div>
                        </td>
                        <td><Badge bg={customer.customer_type === 'company' ? 'info' : 'secondary'}>{customer.customer_type === 'company' ? 'Empresa' : 'Individual'}</Badge></td>
                        <td><div>{customer.email || '-'}</div>{customer.contact_person && <small className="text-muted">{customer.contact_person}</small>}</td>
                        <td>{customer.phone || '-'}</td>
                        <td>{customer.city || '-'}</td>
                        <td>
                          {isProposal ? (
                            <Badge bg="danger" className="d-flex align-items-center gap-1">
                              <Flame size={14} />
                              Propuesta Activa
                            </Badge>
                          ) : hasOpportunity ? (
                            <Badge bg="success" className="d-flex align-items-center">
                              <CheckCircle size={14} className="me-1" />
                              {stage === 'new' && 'Prospecto'}
                              {stage === 'contacted' && 'Contactado'}
                              {stage === 'interested' && 'Interesado'}
                              {stage === 'quote_sent' && 'Cotización Enviada'}
                              {stage === 'negotiation' && 'Negociación'}
                              {stage === 'won' && 'Ganada'}
                              {stage === 'lost' && 'Perdida'}
                            </Badge>
                          ) : (
                            <Badge bg="warning" text="dark" className="d-flex align-items-center">
                              <AlertCircle size={14} className="me-1" />
                              Pendiente
                            </Badge>
                          )}
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex gap-1 justify-content-end">
                            <Button 
                              variant={hasOpportunity ? "outline-secondary" : "success"} 
                              size="sm" 
                              onClick={() => handleCreateOpportunity(customer)}
                              title={hasOpportunity ? `Ya tiene oportunidad (${stage})` : "Crear oportunidad"}
                              disabled={hasOpportunity}
                            >
                              <Target size={16} />
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => handleEdit(customer)}>
                              <Edit size={16} />
                            </Button>
                            {canDelete && (
                              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(customer.id)}>
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
        {!loading && filteredCustomers.length > 0 && (
          <Card.Footer className="bg-white border-0 text-muted">
            Mostrando {filteredCustomers.length} de {customers.length} clientes
            {userRole === 'salesperson' && (
              <span className="ms-3">
                | <Flame size={14} className="text-danger me-1" />
                <strong className="text-danger">{customersWithProposal} propuestas activas</strong>
                <span className="ms-2">|</span>
                <CheckCircle size={14} className="text-success ms-2 me-1" />
                {totalWithOpportunity} con oportunidad creada
              </span>
            )}
          </Card.Footer>
        )}
      </Card>

      <CustomerForm show={showForm} onHide={() => setShowForm(false)} customer={selectedCustomer} onSuccess={handleSuccess} />
      <OpportunityForm 
        show={showOpportunityForm} 
        onHide={() => setShowOpportunityForm(false)} 
        preselectedCustomer={selectedCustomerForOpportunity} 
        onSuccess={handleOpportunitySuccess} 
      />
    </div>
  );
}
