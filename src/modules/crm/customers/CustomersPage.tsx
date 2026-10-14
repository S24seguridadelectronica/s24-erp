import { useState, useEffect } from 'react';
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
}
