import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { getOpportunities } from '@/services/api/opportunities';
import { Plus, TrendingUp, DollarSign, Calendar, Edit2, FileText, Activity } from 'lucide-react';
import { OpportunityForm } from './OpportunityForm';
import { QuoteForm } from '@/modules/sales/quotes/QuoteForm';
import { supabase } from '@/services/supabase/client';
// 👇 IMPORTAMOS EL MODAL DE PROGRESO
import { TrackOpportunityModal } from './TrackOpportunityModal';

const STAGES = [
  { key: 'asignado', label: '1. Asignado', color: 'secondary' },
  { key: 'contacto', label: '2. En Contacto', color: 'info' },
  { key: 'oportunidad', label: '3. Oportunidad', color: 'primary' },
  { key: 'visita', label: '4. Visita Técnica', color: 'warning' },
  { key: 'propuesta', label: '5. Cotización Enviada', color: 'orange' },
  { key: 'negociacion', label: 'Negociación', color: 'purple' },
  { key: 'ganado', label: '✅ Ganado', color: 'success' },
  { key: 'perdido', label: '❌ Perdido', color: 'danger' },
];

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [preselectedOppForQuote, setPreselectedOppForQuote] = useState<any | null>(null);

  // 👇 ESTADOS PARA EL MODAL DE PROGRESO
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  useEffect(() => { loadOpportunities(); }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleData } = await (supabase.from('user_roles') as any).select('roles(name)').eq('user_id', user?.id).maybeSingle();
      const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
      const isSalesperson = roleName === 'salesperson' || roleName === 'vendedor';
      const sellerId = isSalesperson ? user?.id : undefined;

      const data = await getOpportunities(sellerId);
      setOpportunities(data || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
  const wonCount = opportunities.filter(o => o.stage === 'ganado').length;
  const activeCount = opportunities.filter(o => !['ganado', 'perdido'].includes(o.stage)).length;

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
        <Col md={3}>
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
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3"><DollarSign size={24} className="text-success" /></div>
                <div>
                  <div className="text-muted small">Valor Total Pipeline</div>
                  <div className="fs-4 fw-bold">${totalValue.toLocaleString('es-CO')}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded me-3"><TrendingUp size={24} className="text-info" /></div>
                <div>
                  <div className="text-muted small">Oportunidades Activas</div>
                  <div className="fs-4 fw-bold">{activeCount}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3"><Calendar size={24} className="text-warning" /></div>
                <div>
                  <div className="text-muted small">Ganadas</div>
                  <div className="fs-4 fw-bold">{wonCount}</div>
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
                        <td>${(opp.value || 0).toLocaleString('es-CO')}</td>
                        <td>{opp.probability || 0}%</td>
                        <td className="text-end pe-4">
                          
                          {/* 👇 BOTÓN DE PROGRESO AQUÍ */}
                          <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="me-2" 
                            onClick={() => {
                              setSelectedOppId(String(opp.id));
                              setShowTrackModal(true);
                            }} 
                            title="Ver Progreso (Visita, Factura, Pagos)"
                          >
                            <Activity size={16} />
                          </Button>

                          <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingOpp(opp); setShowForm(true); }} title="Editar Oportunidad">
                            <Edit2 size={16} />
                          </Button>
                          {opp.stage !== 'perdido' && (
                            <Button variant="outline-success" size="sm" onClick={() => { setPreselectedOppForQuote(opp); setShowQuoteForm(true); }} title="Crear Cotización">
                              <FileText size={16} />
                            </Button>
                          )}
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
      
      <QuoteForm
        show={showQuoteForm}
        onHide={() => setShowQuoteForm(false)}
        preselectedOpportunity={preselectedOppForQuote}
        onSuccess={() => { setShowQuoteForm(false); loadOpportunities(); }}
      />

      {/* 👇 CONECTAMOS EL MODAL DE PROGRESO AL FINAL */}
      <TrackOpportunityModal 
        show={showTrackModal} 
        onHide={() => setShowTrackModal(false)} 
        opportunityId={selectedOppId} 
      />
    </div>
  );
}