import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getUsers, deleteUser } from '@/services/api/users';
import { UserPlus, Search, Edit2, Trash2 } from 'lucide-react';
import { UserForm } from './UserForm';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data || []);
    } catch (err: any) {
      setError('Error al cargar los usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteUser(id);
        loadUsers();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Usuarios</h2>
          <p className="text-muted mb-0">Gestiona los usuarios del sistema S24</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingUser(null); setShowForm(true); }}>
          <UserPlus size={18} className="me-2" /> Nuevo Usuario
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text><Search size={18} /></InputGroup.Text>
            <Form.Control placeholder="Buscar por nombre o correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Usuario</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No hay usuarios registrados.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontWeight: 'bold' }}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="fw-semibold">{user.full_name}</div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td><Badge bg="info">{user.roles?.name || 'Sin rol'}</Badge></td>
                    <td><Badge bg={user.is_active ? 'success' : 'secondary'}>{user.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingUser(user); setShowForm(true); }}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(user.id)}>
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

      <UserForm show={showForm} onHide={() => setShowForm(false)} user={editingUser} onSuccess={loadUsers} />
    </div>
  );
}
