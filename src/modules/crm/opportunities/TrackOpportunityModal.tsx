import { useEffect, useState } from 'react';
import { Modal, Spinner, Badge, ProgressBar } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { CheckCircle, Clock, FileText, DollarSign, XCircle, User } from 'lucide-react';
import { format } from 'date-fns';

export function TrackOpportunityModal({ show, onHide, opportunityId }: { show: boolean, onHide: () => void, opportunityId: string | null }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show || !opportunityId) return;

    const fetchTracking = async () => {
      setLoading(true);
      const { data: trackingData } = await (supabase.from('v_tracking_oportunidades') as any)
        .select('*')
        .eq('opportunity_id', opportunityId)
        .maybeSingle();

      setData(trackingData);
      setLoading(false);
    };

    fetchTracking();
  }, [show, opportunityId]);

  const fmtMoney = (val: number) => '$' + Math.round(val || 0).toLocaleString('es-CO');
  const paymentPercent = data?.invoice_total > 0 ? Math.round((data.invoice_paid / data.invoice_total) * 100) : 0;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title><Clock className="me-2"/> Mapa de la Venta</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : !data ? (
          <div className="text-center py-5 text-muted">No hay información de seguimiento aún.</div>
        ) : (
          <div className="p-2">
            <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
              <User size={40} className="text-secondary me-3" />
              <div>
                <h5 className="mb-1">{data.customer_name}</h5>
                <p className="text-muted mb-0">{data.title}</p>
              </div>
              <Badge bg="dark" className="ms-auto fs-6">{data.opportunity_stage.toUpperCase()}</Badge>
            </div>

            <div className="position-relative ms-3 border-start border-3 border-primary" style={{ paddingLeft: '30px' }}>
              
              {/* 1. Visita */}
              <div className="mb-4 position-relative">
                <div className="position-absolute" style={{ left: '-46px', top: 0, backgroundColor: 'white', borderRadius: '50%' }}>
                  {data.task_status === 'completada' ? <CheckCircle size={30} className="text-success" /> : <Clock size={30} className="text-warning" />}
                </div>
                <h6 className="fw-bold mb-1">Visita Técnica</h6>
                <p className="text-muted small mb-0">
                  {data.task_status === 'completada' ? '✅ Visita realizada con éxito' : '⏳ Pendiente por realizar'}
                  {data.task_date && ` - Programada: ${format(new Date(data.task_date), 'dd/MM/yyyy')}`}
                </p>
              </div>

              {/* 2. Cotización */}
              <div className="mb-4 position-relative">
                <div className="position-absolute" style={{ left: '-46px', top: 0, backgroundColor: 'white', borderRadius: '50%' }}>
                  {data.quote_status ? <FileText size={30} className="text-primary" /> : <XCircle size={30} className="text-muted" />}
                </div>
                <h6 className="fw-bold mb-1">Cotización</h6>
                <p className="text-muted small mb-0">
                  {data.quote_status ? (
                    <>Cotización Nº {data.quote_number} por valor de <strong>{fmtMoney(data.quote_total)}</strong></>
                  ) : 'Aún no se ha generado cotización.'}
                </p>
              </div>

              {/* 3. Facturación y Cobro */}
              <div className="position-relative">
                <div className="position-absolute" style={{ left: '-46px', top: 0, backgroundColor: 'white', borderRadius: '50%' }}>
                  {data.invoice_id ? <DollarSign size={30} className="text-success" /> : <XCircle size={30} className="text-muted" />}
                </div>
                <h6 className="fw-bold mb-1">Facturación y Pago</h6>
                {data.invoice_id ? (
                  <div className="bg-light p-3 rounded border mt-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Método de Pago:</span>
                      <Badge bg="info">{data.payment_method}</Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Total Facturado:</span>
                      <strong>{fmtMoney(data.invoice_total)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2 text-success">
                      <span>Pagado ({paymentPercent}%):</span>
                      <strong>{fmtMoney(data.invoice_paid)}</strong>
                    </div>
                    <ProgressBar 
                      now={paymentPercent} 
                      variant={paymentPercent === 100 ? 'success' : paymentPercent > 0 ? 'info' : 'warning'} 
                      className="mt-2" 
                      style={{ height: '10px' }}
                    />
                    <div className="small text-muted mt-2 text-center fw-bold">
                      {data.invoice_status === 'paid' ? '✅ FACTURA PAGADA EN SU TOTALIDAD' : data.invoice_status === 'partial' ? '💸 ABONO PARCIAL RECIBIDO' : '⏳ PENDIENTE DE PAGO'}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">Aún no se ha generado factura.</p>
                )}
              </div>

            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}