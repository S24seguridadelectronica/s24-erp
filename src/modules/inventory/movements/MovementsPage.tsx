import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { getMovements, deleteMovement } from '@/services/api/inventory';
import { ArrowDownCircle, ArrowUpCircle, Search, Trash2, Plus } from 'lucide-react';
import { MovementForm } from './MovementForm';

const MOVEMENT_TYPES: any = {
  entry: { label: 'Entrada', color: 'success', icon: ArrowDownCircle },
  exit: { label: 'Salida', color: 'danger', icon: ArrowUpCircle },
  adjustment: { label: 'Ajuste', color: 'warning', icon: ArrowUpCircle },
};

export function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadMovements(); }, []);

  async function loadMovements() {
    try {
      setLoading(true);
      const data = await getMovements();
      setMovements(data || []);
    } catch (err: any) {
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este movimiento?')) {
      try {
        await deleteMovement(id);
        loadMovements();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || movement.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Movimientos de Inventario</h2>
          <p className="text-muted mb-0">Registro de entradas, salidas y ajustes</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={18} className="me-2" /> Nuevo Movimiento
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por producto o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Todos los tipos</option>
                {Object.entries(MOVEMENT_TYPES).map(([key, config]: any) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Costo Unit.</th>
                <th>Referencia</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">No hay movimientos registrados.</td></tr>
              ) : (
                filteredMovements.map((movement) => {
                  const type = MOVEMENT_TYPES[movement.movement_type];
                  const Icon = type.icon;
                  return (
                    <tr key={movement.id}>
                      <td className="ps-4">{new Date(movement.created_at).toLocaleString('es-CO')}</td>
                      <td>
                        <Badge bg={type.color} className="d-flex align-items-center gap-1 w-fit">
                          <Icon size={14} /> {type.label}
                        </Badge>
                      </td>
                      <td>{movement.products?.name || 'N/A'}</td>
                      <td><code>{movement.products?.sku || '-'}</code></td>
                      <td className={movement.movement_type === 'exit' ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                        {movement.movement_type === 'exit' ? '-' : '+'}{movement.quantity}
                      </td>
                      <td>{movement.unit_cost ? `$${movement.unit_cost.toLocaleString('es-CO')}` : '-'}</td>
                      <td>{movement.reference_type ? `${movement.reference_type} #${movement.reference_id}` : '-'}</td>
                      <td className="text-end pe-4">
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(movement.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <MovementForm show={showForm} onHide={() => setShowForm(false)} onSuccess={loadMovements} />
    </div>
  );
}
