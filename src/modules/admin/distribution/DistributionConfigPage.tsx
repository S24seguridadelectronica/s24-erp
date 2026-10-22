import { useState, useEffect } from 'react';
import { Card, Button, Alert, Row, Col, Form, Table, Badge, Modal } from 'react-bootstrap';
import { 
  getAllSellerConfigs, 
  updateSellerConfig,
  getDistributionStats
} from '@/services/api/distribution';
import { Users, ToggleLeft, ToggleRight, Save, BarChart3, UserX, UserCheck } from 'lucide-react';

export function DistributionConfigPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSeller, setEditingSeller] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sellersData, statsData] = await Promise.all([
        getAllSellerConfigs(),
        getDistributionStats()
      ]);
      setSellers(sellersData || []);
      setStats(statsData || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleEligible = async (seller: any) => {
    try {
      await updateSellerConfig(seller.seller_id, {
        is_eligible: !seller.is_eligible
      });
      setSuccess(`${seller.seller_name} ${!seller.is_eligible ? 'habilitado' : 'deshabilitado'}`);
      loadData();
    } catch (err: any) {
      setError('Error: ' + err.message);
    }
  };

  const handleToggleExcluded = async (seller: any) => {
    try {
      await updateSellerConfig(seller.seller_id, {
        is_excluded: !seller.is_excluded
      });
      setSuccess(`${seller.seller_name} ${!seller.is_excluded ? 'excluido' : 'reincluido'}`);
      loadData();
    } catch (err: any) {
      setError('Error: ' + err.message);
    }
  };

  const handleSaveWeight = async () => {
    if (!editingSeller) return;
    try {
      await updateSellerConfig(editingSeller.seller_id, {
        weight_percentage: editingSeller.weight_percentage
      });
      setSuccess('Porcentaje actualizado');
      setEditingSeller(null);
      loadData();
    } catch (err: any) {
      setError('Error: ' + err.message);
    }
  };

  const totalWeight = sellers.reduce((sum, s) => sum + (s.weight_percentage || 0), 0);

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Users size={28} className="me-2" />Configuración de Distribución</h2>
          <p className="text-muted mb-0">Gestiona qué vendedores reciben clientes y cómo</p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      {/* Estadísticas rápidas */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <Users size={32} className="text-primary mb-2" />
              <div className="fs-4 fw-bold">{sellers.length}</div>
              <div className="small text-muted">Vendedores Configurados</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <UserCheck size={32} className="text-success mb-2" />
              <div className="fs-4 fw-bold">{sellers.filter(s => s.is_eligible && !s.is_excluded).length}</div>
              <div className="small text-muted">Activos</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <UserX size={32} className="text-warning mb-2" />
              <div className="fs-4 fw-bold">{sellers.filter(s => s.is_excluded).length}</div>
              <div className="small text-muted">Excluidos</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <BarChart3 size={32} className="text-info mb-2" />
              <div className="fs-4 fw-bold">{totalWeight}%</div>
              <div className="small text-muted">Peso Total</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de vendedores */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pt-3">
          <h5 className="mb-0">Vendedores y Configuración</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Vendedor</th>
                <th>Email</th>
                <th>Elegible</th>
                <th>Excluido</th>
                <th>Peso (%)</th>
                <th>Orden Round-Robin</th>
                <th>Clientes Asignados</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">No hay vendedores configurados</td></tr>
              ) : (
                sellers.map(seller => {
                  const stat = stats.find(s => s.seller_id === seller.seller_id);
                  return (
                    <tr key={seller.seller_id}>
                      <td className="ps-4 fw-semibold">{seller.seller_name}</td>
                      <td><small>{seller.seller_email}</small></td>
                      <td>
                        <Button
                          variant={seller.is_eligible ? 'success' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleToggleEligible(seller)}
                        >
                          {seller.is_eligible ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          <span className="ms-1">{seller.is_eligible ? 'Sí' : 'No'}</span>
                        </Button>
                      </td>
                      <td>
                        <Button
                          variant={seller.is_excluded ? 'danger' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleToggleExcluded(seller)}
                        >
                          {seller.is_excluded ? <UserX size={16} /> : <UserCheck size={16} />}
                          <span className="ms-1">{seller.is_excluded ? 'Excluido' : 'Activo'}</span>
                        </Button>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          max="100"
                          value={seller.weight_percentage || 0}
                          onChange={(e) => setEditingSeller({ ...seller, weight_percentage: parseFloat(e.target.value) || 0 })}
                          style={{ width: '80px' }}
                          size="sm"
                        />
                      </td>
                      <td><Badge bg="info">{seller.round_robin_order}</Badge></td>
                      <td>
                        <Badge bg="primary">{stat?.assigned_count || 0}</Badge>
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleSaveWeight}
                          disabled={!editingSeller || editingSeller.seller_id !== seller.seller_id}
                        >
                          <Save size={14} />
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

      {totalWeight !== 100 && totalWeight > 0 && (
        <Alert variant="warning" className="mt-3">
          <strong>Advertencia:</strong> La suma de porcentajes es {totalWeight}%. Debería ser 100% para distribución ponderada.
        </Alert>
      )}
    </div>
  );
}
