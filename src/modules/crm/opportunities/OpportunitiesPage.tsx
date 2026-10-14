import { useState, useEffect } from 'react';
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
        <div>
          <h2 className="mb-1">Oportunidades</h2>
          <p className="text-muted mb-0">Embudo de ventas y prospectos comerciales</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingOpp(null); setShowForm(true); }}>
          <Plus size={18} className="me-2" /> Nueva Oportunidad
        </Button>
      </div>
      
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3"><TrendingUp size={24} className="text-primary" /></div>
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
                <div className="bg-success bg-opacity-10 p-3 rounded me-3"><DollarSign size={24} className="text-success" /></div>
                <div>
                  <div className="text-muted small">Valor Total Pipeline</div>
                  <div className="fs-4 fw-bold">$ {totalValue.toLocaleString('es-CO')}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><Calendar size={24} className="text-warning" /></div>
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
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th>Valor</th>
                  <th>Probabilidad</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
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
                          <Button variant="outline-primary" size="sm" onClick={() => { setEditingOpp(opp); setShowForm(true); }}>
                            <Edit2 size={16} />
                          </Button>
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

      <OpportunityForm 
        show={showForm} 
        onHide={() => setShowForm(false)} 
        opportunity={editingOpp} 
        onSuccess={loadOpportunities} 
      />
    </div>
  );
}
