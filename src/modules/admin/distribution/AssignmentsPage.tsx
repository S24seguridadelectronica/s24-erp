import { useState, useEffect } from 'react';
import { Card, Button, Alert, Row, Col, Form, Table, Badge, Modal } from 'react-bootstrap';
import { 
  getAssignments, 
  reassignCustomer,
  getAllSellerConfigs,
  getDistributionStats
} from '@/services/api/distribution';
import { Users, ArrowRightLeft, BarChart3, Filter } from 'lucide-react';

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({ seller_id: '', is_active: true });
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [newSellerId, setNewSellerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  useEffect(() => { loadData(); }, [filters]);

  async function loadData() {
    try {
      setLoading(true);
      const [assignmentsData, sellersData, statsData] = await Promise.all([
        getAssignments(filters as any),
        getAllSellerConfigs(),
        getDistributionStats()
      ]);
      setAssignments(assignmentsData || []);
      setSellers(sellersData || []);
      setStats(statsData || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleReassign = async () => {
    if (!selectedAssignment || !newSellerId) return;
    try {
      await reassignCustomer(
        selectedAssignment.customer_id,
        newSellerId,
        'admin',
        reassignReason
      );
      setSuccess('Cliente reasignado exitosamente');
      setShowReassignModal(false);
      setNewSellerId('');
      setReassignReason('');
      loadData();
    } catch (err: any) {
      setError('Error: ' + err.message);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><ArrowRightLeft size={28} className="me-2" />Gestión de Asignaciones</h2>
          <p className="text-muted mb-0">Consulta y reasigna clientes entre vendedores</p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      {/* Estadísticas */}
      <Row className="g-3 mb-4">
        {stats.map(stat => (
          <Col md={3} key={stat.seller_id}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="fs-5 fw-bold text-primary">{stat.seller_name}</div>
                <div className="fs-3 fw-bold">{stat.assigned_count}</div>
                <div className="small text-muted">Clientes Asignados</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label><Filter size={16} className="me-2" />Filtrar por vendedor</Form.Label>
                <Form.Select value={filters.seller_id} onChange={(e) => setFilters({ ...filters, seller_id: e.target.value })}>
                  <option value="">Todos los vendedores</option>
                  {sellers.map(s => (
                    <option key={s.seller_id} value={s.seller_id}>{s.seller_name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select value={filters.is_active ? 'active' : 'inactive'} onChange={(e) => setFilters({ ...filters, is_active: e.target.value === 'active' })}>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de asignaciones */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Cliente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ciudad</th>
                <th>Vendedor Asignado</th>
                <th>Fecha Asignación</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No hay asignaciones registradas</td></tr>
              ) : (
                assignments.map(a => (
                  <tr key={a.id}>
                    <td className="ps-4 fw-semibold">{a.customers?.full_name || 'N/A'}</td>
                    <td>{a.customers?.phone || '-'}</td>
                    <td>{a.customers?.email || '-'}</td>
                    <td>{a.customers?.city || '-'}</td>
                    <td><Badge bg="primary">{a.profiles?.full_name || 'Sin asignar'}</Badge></td>
                    <td><small>{new Date(a.assignment_date).toLocaleDateString('es-CO')}</small></td>
                    <td className="text-end pe-4">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(a);
                          setShowReassignModal(true);
                        }}
                      >
                        <ArrowRightLeft size={14} className="me-1" />
                        Reasignar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal de reasignación */}
      <Modal show={showReassignModal} onHide={() => setShowReassignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reasignar Cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAssignment && (
            <>
              <p><strong>Cliente:</strong> {selectedAssignment.customers?.full_name}</p>
              <p><strong>Vendedor actual:</strong> {selectedAssignment.profiles?.full_name}</p>
              <hr />
              <Form.Group className="mb-3">
                <Form.Label>Nuevo vendedor *</Form.Label>
                <Form.Select value={newSellerId} onChange={(e) => setNewSellerId(e.target.value)}>
                  <option value="">Selecciona un vendedor...</option>
                  {sellers.map(s => (
                    <option key={s.seller_id} value={s.seller_id}>{s.seller_name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Motivo de la reasignación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Opcional"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReassignModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleReassign} disabled={!newSellerId}>
            Confirmar Reasignación
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
