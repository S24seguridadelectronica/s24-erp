import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Badge, Spinner, Button, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { Calendar, MapPin, User, Phone, CheckCircle, Edit3, FileText, ClipboardCheck, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
// 👇 IMPORTAMOS EL MODAL DE TRAZABILIDAD
import { TrackOpportunityModal } from '../opportunities/TrackOpportunityModal';

export function MyTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // ESTADO PARA EL FILTRO DESPLEGABLE
  const [activeFilter, setActiveFilter] = useState('todas');

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [newStage, setNewStage] = useState('visita');
  const [taskStatus, setTaskStatus] = useState('completada');
  const [technicalSurvey, setTechnicalSurvey] = useState('');
  const [lossReason, setLossReason] = useState('');

  // 👇 ESTADOS PARA EL MODAL DE PROGRESO
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          opportunities (
            id, title, stage, technical_survey, customer_id,
            customers ( full_name, address, whatsapp_phone, city )
          )
        `)
        .eq('assigned_to', user.id)
        .order('due_date', { ascending: true });

      if (!error && data) setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await (supabase.from('tasks') as any).update({ status: newStatus }).eq('id', taskId);
      fetchMyTasks(); 
    } catch (error) {
      console.error("Error actualizando estado", error);
    }
  };

  const handleCotizar = (task: any) => {
    navigate('/sales', {
      state: {
        customerId: task.opportunities?.customer_id || task.opportunities?.customers?.id,
        opportunityId: task.opportunities?.id,
        title: task.opportunities?.title,
        origin: 'my-tasks'
      }
    });
  };

  const handleUpdateOpportunity = async () => {
    if (!selectedTask?.opportunities?.id) return;
    
    if (newStage === 'perdido' && !lossReason) {
      alert("Por favor, escribe el motivo de la pérdida.");
      return;
    }

    setLoadingAction(true);
    try {
      const { error: oppError } = await (supabase.from('opportunities') as any)
        .update({ 
          stage: newStage,
          technical_survey: technicalSurvey || selectedTask.opportunities?.technical_survey,
          loss_reason: newStage === 'perdido' ? lossReason : null
        })
        .eq('id', selectedTask.opportunities.id);
        
      if (oppError) throw oppError;

      await (supabase.from('tasks') as any)
        .update({ status: taskStatus })
        .eq('id', selectedTask.id);

      alert('¡Reporte de visita guardado exitosamente!');
      setShowModal(false);
      fetchMyTasks();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar la oportunidad');
    } finally {
      setLoadingAction(false);
    }
  };

  // 🎨 FUNCIÓN PARA OBTENER EL ESTADO GENERAL, COLOR Y ETIQUETA
  const getTaskStateInfo = (task: any) => {
    const stage = task.opportunities?.stage;
    const status = task.status;

    if (stage === 'ganado') return { label: '✅ Ganada', color: '#198754', bg: 'success', filter: 'cerradas' };
    if (stage === 'perdido') return { label: '❌ Perdida', color: '#dc3545', bg: 'danger', filter: 'cerradas' };
    if (stage === 'propuesta' || stage === 'negociacion') return { label: '📄 Cotizada', color: '#6f42c1', bg: 'primary', filter: 'cotizadas' };
    if (status === 'completada') return { label: '👁️ Visitada', color: '#0dcaf0', bg: 'info', filter: 'visitadas' };
    if (status === 'rechazada') return { label: '🚫 Cancelada', color: '#6c757d', bg: 'secondary', filter: 'cerradas' };
    
    return { label: '⏳ Pendiente', color: '#ffc107', bg: 'warning', filter: 'pendientes' };
  };

  // 👇 LÓGICA DE FILTRADO
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'todas') return tasks;
    return tasks.filter(task => {
      const info = getTaskStateInfo(task);
      return info.filter === activeFilter;
    });
  }, [tasks, activeFilter]);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-4">
      {/* CABECERA CON EL FILTRO DESPLEGABLE */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="fw-bold m-0">Mi Agenda de Visitas</h3>
        
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold text-muted" style={{ whiteSpace: 'nowrap' }}>Filtrar por:</span>
          <Form.Select 
            value={activeFilter} 
            onChange={(e) => setActiveFilter(e.target.value)}
            className="fw-bold shadow-sm"
            style={{ width: '250px', cursor: 'pointer' }}
          >
            <option value="todas">📋 Todas las visitas ({tasks.length})</option>
            <option value="pendientes">⏳ Pendientes ({tasks.filter(t => getTaskStateInfo(t).filter === 'pendientes').length})</option>
            <option value="visitadas">👁️ Visitadas ({tasks.filter(t => getTaskStateInfo(t).filter === 'visitadas').length})</option>
            <option value="cotizadas">📄 Cotizadas ({tasks.filter(t => getTaskStateInfo(t).filter === 'cotizadas').length})</option>
            <option value="cerradas">🏁 Cerradas/Ganadas ({tasks.filter(t => getTaskStateInfo(t).filter === 'cerradas').length})</option>
          </Form.Select>
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <CheckCircle size={48} className="text-muted mb-3" />
            <h5>No hay visitas en esta categoría</h5>
            <p className="text-muted">Prueba seleccionando otro filtro en el menú desplegable.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th>Oportunidad</th>
                <th>Cliente / Contacto</th>
                <th>Ubicación</th>
                <th>Fecha Programada</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const info = getTaskStateInfo(task);
                const isClosed = task.opportunities?.stage === 'ganado' || task.opportunities?.stage === 'perdido' || task.status === 'rechazada';

                return (
                  <tr key={task.id} style={{ borderLeft: `6px solid ${info.color}` }}>
                    <td>
                      <strong>{task.opportunities?.title || task.title}</strong>
                      <div className="small text-muted">Etapa: {task.opportunities?.stage}</div>
                    </td>
                    
                    <td style={{ backgroundColor: `${info.color}15` }}>
                      <div className="fw-bold" style={{ color: info.color }}>
                        <User size={14} className="me-1" />
                        {task.opportunities?.customers?.full_name}
                      </div>
                      <div className="small text-muted">
                        <Phone size={12} className="me-1" />
                        {task.opportunities?.customers?.whatsapp_phone || 'Sin teléfono'}
                      </div>
                    </td>

                    <td>
                      <MapPin size={14} className="me-1 text-secondary" />
                      {task.opportunities?.customers?.address}
                    </td>
                    <td>
                      <Calendar size={14} className="me-1 text-secondary" />
                      {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy HH:mm') : 'Sin fecha'}
                    </td>
                    
                    <td className="text-center">
                      <Badge bg={info.bg} text={info.bg === 'warning' || info.bg === 'info' ? 'dark' : 'white'} className="px-3 py-2">
                        {info.label}
                      </Badge>
                    </td>
                    
                    <td>
                      <div className="d-flex gap-2 justify-content-center">
                        {/* 👇 BOTÓN DE PROGRESO (Siempre visible) */}
                        <Button 
                          variant="outline-info" 
                          size="sm" 
                          onClick={() => {
                            setSelectedOppId(String(task.opportunities?.id));
                            setShowTrackModal(true);
                          }}
                          title="Ver estado de la venta"
                        >
                          <Activity size={14} className="me-1" /> Progreso
                        </Button>

                        {/* Botones de acción (Solo si no está cerrada) */}
                        {!isClosed && (
                          <>
                            <Button variant="warning" size="sm" onClick={() => handleCotizar(task)}>
                              <FileText size={14} className="me-1" /> Cotizar
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={() => {
                                setSelectedTask(task);
                                setNewStage(task.opportunities?.stage || 'visita');
                                setTaskStatus(task.status);
                                setTechnicalSurvey(task.opportunities?.technical_survey || '');
                                setLossReason('');
                                setShowModal(true);
                              }}
                            >
                              <Edit3 size={14} className="me-1" /> Reporte
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* MODAL REPORTE DE VISITA */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><ClipboardCheck className="me-2"/> Reporte de Visita Técnica</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small">
            Cliente: <strong>{selectedTask?.opportunities?.customers?.full_name}</strong> <br/>
            Oportunidad: {selectedTask?.opportunities?.title}
          </Alert>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">¿Se pudo realizar la visita?</Form.Label>
              <Form.Select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                <option value="completada">✅ Sí, se realizó la visita</option>
                <option value="rechazada">❌ No se pudo (Cliente canceló / No estaba)</option>
                <option value="pendiente">⏳ Quedó pendiente (Reagendar)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Levantamiento Técnico / Observaciones</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Ej: Se necesitan 8 cámaras, DVR de 8 canales, 50 metros de cable..."
                value={technicalSurvey}
                onChange={(e) => setTechnicalSurvey(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Siguiente Etapa en el Embudo</Form.Label>
              <Form.Select value={newStage} onChange={(e) => setNewStage(e.target.value)}>
                <option value="visita">4. Visita Realizada (Listo para cotizar)</option>
                <option value="propuesta">5. Cotización Enviada</option>
                <option value="negociacion">En Negociación</option>
                <option value="ganado">✅ Cierre: Ganado (Venta Exitosa)</option>
                <option value="perdido">❌ Cierre: Perdido (No se vendió)</option>
              </Form.Select>
            </Form.Group>

            {newStage === 'perdido' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-danger">Motivo de Pérdida *</Form.Label>
                <Form.Select value={lossReason} onChange={(e) => setLossReason(e.target.value)} required>
                  <option value="">Seleccione un motivo...</option>
                  <option value="Precio muy alto">Precio muy alto</option>
                  <option value="Eligió competencia">Eligió a la competencia</option>
                  <option value="No tiene presupuesto">No tiene presupuesto</option>
                  <option value="Proyecto cancelado">Proyecto cancelado</option>
                </Form.Select>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleUpdateOpportunity} disabled={loadingAction}>
            {loadingAction ? 'Guardando...' : 'Guardar Reporte'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 👇 MODAL DE LÍNEA DE TIEMPO / PROGRESO */}
      <TrackOpportunityModal 
        show={showTrackModal} 
        onHide={() => setShowTrackModal(false)} 
        opportunityId={selectedOppId} 
      />
    </div>
  );
}