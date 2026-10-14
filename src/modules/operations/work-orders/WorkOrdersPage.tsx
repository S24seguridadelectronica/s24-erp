import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { getWorkOrders, deleteWorkOrder } from '@/services/api/work-orders';
import { Wrench, Search, Edit2, Trash2, Plus, Filter } from 'lucide-react';
import { WorkOrderForm } from './WorkOrderForm';

const STATUS_CONFIG: any = {
  pending: { label: 'Pendiente', color: 'secondary' },
  scheduled: { label: 'Programada', color: 'info' },
  assigned: { label: 'Asignada', color: 'primary' },
  in_transit: { label: 'En Camino', color: 'warning' },
  in_progress: { label: 'En Ejecución', color: 'warning' },
  completed: { label: 'Finalizada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'danger' },
};

const PRIORITY_CONFIG: any = {
  low: { label: 'Baja', color: 'secondary' },
  medium: { label: 'Media', color: 'info' },
  high: { label: 'Alta', color: 'warning' },
  urgent: { label: 'Urgente', color: 'danger' },
};

export function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await getWorkOrders();
      setOrders(data || []);
    } catch (err: any) {
      setError('Error al cargar las órdenes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta orden de trabajo?')) {
      try {
        await deleteWorkOrder(id);
        loadOrders();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: orders.filter(o => o.status === 'pending' || o.status === 'scheduled').length,
    inProgress: orders.filter(o => o.status === 'in_progress' || o.status === 'in_transit').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Órdenes de Trabajo</h2>
          <p className="text-muted mb-0">Gestiona las instalaciones y servicios técnicos de S24</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingOrder(null); setShowForm(true); }}>
          <Plus size={18} className="me-2" /> Nueva Orden
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><Wrench size={24} className="text-warning" /></div>
              <div>
                <div className="text-muted small">Pendientes</div>
                <div className="fs-4 fw-bold">{stats.pending}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded me-3"><Wrench size={24} className="text-primary" /></div>
              <div>
                <div className="text-muted small">En Progreso</div>
                <div className="fs-4 fw-bold">{stats.inProgress}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-success bg-opacity-10 p-3 rounded me-3"><Wrench size={24} className="text-success" /></div>
              <div>
                <div className="text-muted small">Finalizadas</div>
                <div className="fs-4 fw-bold">{stats.completed}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por número de orden o cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]: any) => (
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
                <th className="ps-4">Número</th>
                <th>Cliente</th>
                <th>Tipo de Servicio</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Programada</th>
                <th>Total</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">No hay órdenes de trabajo registradas.</td></tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status];
                  const priority = PRIORITY_CONFIG[order.priority || 'medium'];
                  return (
                    <tr key={order.id}>
                      <td className="ps-4 fw-semibold">{order.order_number}</td>
                      <td>{order.customers?.full_name || 'N/A'}</td>
                      <td>{order.service_type}</td>
                      <td><Badge bg={status.color}>{status.label}</Badge></td>
                      <td><Badge bg={priority.color} className="bg-opacity-75">{priority.label}</Badge></td>
                      <td>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString('es-CO') : '-'}</td>
                      <td className="fw-bold">${(order.total_cost || 0).toLocaleString('es-CO')}</td>
                      <td className="text-end pe-4">
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingOrder(order); setShowForm(true); }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(order.id)}>
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

      <WorkOrderForm show={showForm} onHide={() => setShowForm(false)} order={editingOrder} onSuccess={loadOrders} />
    </div>
  );
}
