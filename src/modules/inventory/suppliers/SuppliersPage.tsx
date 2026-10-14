import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getSuppliers, deleteSupplier } from '@/services/api/inventory';
import { Truck, Search, Edit2, Trash2, Plus } from 'lucide-react';
import { SupplierForm } from './SupplierForm';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err: any) {
      setError('Error al cargar proveedores: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      try {
        await deleteSupplier(id);
        loadSuppliers();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Proveedores</h2>
          <p className="text-muted mb-0">Gestión de proveedores y contactos comerciales</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingSupplier(null); setShowForm(true); }}>
          <Plus size={18} className="me-2" /> Nuevo Proveedor
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text><Search size={18} /></InputGroup.Text>
            <Form.Control placeholder="Buscar por nombre o contacto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Proveedor</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No hay proveedores registrados.</td></tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontWeight: 'bold' }}>
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="fw-semibold">{supplier.name}</div>
                      </div>
                    </td>
                    <td>{supplier.contact_person || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.email || '-'}</td>
                    <td>{supplier.city || '-'}</td>
                    <td><Badge bg={supplier.is_active ? 'success' : 'secondary'}>{supplier.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(supplier.id)}>
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

      <SupplierForm show={showForm} onHide={() => setShowForm(false)} supplier={editingSupplier} onSuccess={loadSuppliers} />
    </div>
  );
}
