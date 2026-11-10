import { Fragment, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Briefcase, Camera, FileText, History, ImageOff } from 'lucide-react';
import { getWorkOrdersByCustomer } from '@/services/api/work-orders';
import { getQuoteItems, getQuotesByCustomer, quoteItemPhotos } from '@/services/api/quotes';
import { getPhotosForOrders, type WorkOrderPhoto } from '@/services/api/work-order-photos';
import { evidenceUrl } from '@/services/api/storage';

interface CustomerHistoryModalProps {
  show: boolean;
  onHide: () => void;
  customer: HistoryCustomer | null;
}

interface HistoryCustomer {
  id: number;
  full_name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  created_at?: string | null;
}

interface WorkOrderRow {
  id: number;
  order_number: string;
  status: string;
  service_type: string;
  description?: string | null;
  address?: string | null;
  total_cost?: number | null;
  scheduled_at?: string | null;
  created_at?: string | null;
}

interface QuoteRow {
  id: number;
  quote_number: string;
  status: string;
  total?: number | null;
  created_at?: string | null;
}

interface QuoteItemRow {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  photo?: string | null;
  photos?: string[] | null;
}

const ORDER_STATUS: Record<string, { label: string; bg: string }> = {
  pending: { label: 'Pendiente', bg: 'secondary' },
  scheduled: { label: 'Programada', bg: 'info' },
  assigned: { label: 'Asignada', bg: 'primary' },
  in_transit: { label: 'En camino', bg: 'primary' },
  in_progress: { label: 'En ejecución', bg: 'warning' },
  completed: { label: 'Finalizada', bg: 'success' },
  cancelled: { label: 'Cancelada', bg: 'danger' },
};

const QUOTE_STATUS: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Borrador', bg: 'secondary' },
  sent: { label: 'Enviada', bg: 'info' },
  approved: { label: 'Aprobada', bg: 'success' },
  rejected: { label: 'Rechazada', bg: 'danger' },
  converted: { label: 'Facturada', bg: 'primary' },
};

const money = (value: number) =>
  '$' + Math.round(Number(value) || 0).toLocaleString('es-CO');

const dateOf = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—';

/**
 * Historial completo de un cliente: servicios ejecutados con sus evidencias
 * fotográficas y las cotizaciones asociadas.
 */
export function CustomerHistoryModal({ show, onHide, customer }: CustomerHistoryModalProps) {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const [quoteItems, setQuoteItems] = useState<Record<number, QuoteItemRow[]>>({});

  const toggleQuote = async (quoteId: number) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null);
      return;
    }

    setExpandedQuoteId(quoteId);
    if (quoteItems[quoteId]) return;

    try {
      const items = await getQuoteItems(quoteId);
      setQuoteItems(prev => ({ ...prev, [quoteId]: items }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle de la cotización.');
    }
  };

  useEffect(() => {
    if (!show || !customer?.id) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setOrders([]);
        setQuotes([]);
        setPhotos([]);

        const [ordersData, quotesData] = await Promise.all([
          getWorkOrdersByCustomer(customer.id),
          getQuotesByCustomer(customer.id),
        ]);

        const photosData = await getPhotosForOrders(ordersData.map(order => order.id));

        if (cancelled) return;
        setOrders(ordersData);
        setQuotes(quotesData);
        setPhotos(photosData);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [show, customer?.id]);

  const photosByOrder = useMemo(() => {
    const map = new Map<number, WorkOrderPhoto[]>();
    for (const photo of photos) {
      const list = map.get(photo.work_order_id) || [];
      list.push(photo);
      map.set(photo.work_order_id, list);
    }
    return map;
  }, [photos]);

  const totals = useMemo(() => ({
    cotizado: quotes.reduce((sum, quote) => sum + (Number(quote.total) || 0), 0),
    ejecutado: orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (Number(order.total_cost) || 0), 0),
    completados: orders.filter(order => order.status === 'completed').length,
  }), [orders, quotes]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <History size={20} className="text-primary" />
          Historial del cliente
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        {customer && (
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h5 className="mb-1">{customer.full_name}</h5>
                  <div className="small text-muted">
                    {customer.company_name ? `${customer.company_name} · ` : ''}
                    {customer.phone || 'sin teléfono'}
                    {customer.email ? ` · ${customer.email}` : ''}
                    {customer.city ? ` · ${customer.city}` : ''}
                  </div>
                </div>
                <div className="text-end">
                  <div className="small text-muted">Cliente desde</div>
                  <div className="fw-semibold">{dateOf(customer.created_at)}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="small text-uppercase text-muted fw-bold">Servicios</div>
                <div className="fs-4 fw-bold">{orders.length}</div>
                <div className="small text-muted">{totals.completados} finalizados</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="small text-uppercase text-muted fw-bold">Cotizado</div>
                <div className="fs-4 fw-bold">{money(totals.cotizado)}</div>
                <div className="small text-muted">{quotes.length} cotizaciones</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="small text-uppercase text-muted fw-bold">Ejecutado</div>
                <div className="fs-4 fw-bold text-success">{money(totals.ejecutado)}</div>
                <div className="small text-muted">Solo trabajos finalizados</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-2 mb-2">
              <Briefcase size={18} className="text-primary" />
              <h6 className="fw-bold mb-0">Servicios realizados</h6>
            </div>

            {orders.length === 0 ? (
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="text-center text-muted py-4">
                  Este cliente todavía no tiene órdenes de trabajo.
                </Card.Body>
              </Card>
            ) : orders.map(order => {
              const status = ORDER_STATUS[order.status] || { label: order.status, bg: 'secondary' };
              const orderPhotos = photosByOrder.get(order.id) || [];

              return (
                <Card key={order.id} className="border-0 shadow-sm mb-3">
                  <Card.Header className="bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="fw-bold">{order.order_number}</span>
                      <Badge bg={status.bg}>{status.label}</Badge>
                      <span className="small text-muted">{order.service_type}</span>
                    </div>
                    <div className="d-flex align-items-center gap-3 small text-muted">
                      <span>{dateOf(order.scheduled_at || order.created_at)}</span>
                      <span className="fw-semibold text-dark">{money(order.total_cost)}</span>
                    </div>
                  </Card.Header>

                  <Card.Body>
                    {order.description && (
                      <p className="small text-muted mb-2">{order.description}</p>
                    )}
                    {order.address && (
                      <div className="small text-muted mb-2">Dirección: {order.address}</div>
                    )}

                    <div className="small fw-semibold text-secondary mb-2">
                      <Camera size={14} className="me-1" />
                      Evidencias ({orderPhotos.length})
                    </div>

                    {orderPhotos.length === 0 ? (
                      <div className="small text-muted fst-italic d-flex align-items-center gap-2">
                        <ImageOff size={14} /> Sin fotos registradas para este trabajo.
                      </div>
                    ) : (
                      <div className="d-flex flex-wrap gap-3">
                        {orderPhotos.map(photo => (
                          <div key={photo.id} style={{ width: 170 }}>
                            <img src={photo.photo} alt={photo.caption || 'Evidencia'} className="border rounded w-100"
                              style={{ height: 120, objectFit: 'cover' }} />
                            {photo.caption && (
                              <div className="small text-muted text-truncate" title={photo.caption}>
                                {photo.caption}
                              </div>
                            )}
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {dateOf(photo.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              );
            })}

            <div className="d-flex align-items-center gap-2 mb-2 mt-4">
              <FileText size={18} className="text-primary" />
              <h6 className="fw-bold mb-0">Cotizaciones</h6>
            </div>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                {quotes.length === 0 ? (
                  <div className="text-center text-muted py-4">Sin cotizaciones registradas.</div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-3">Número</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th className="text-end pe-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map(quote => {
                        const status = QUOTE_STATUS[quote.status] || { label: quote.status, bg: 'secondary' };
                        const isOpen = expandedQuoteId === quote.id;
                        const items = quoteItems[quote.id];

                        return (
                          <Fragment key={quote.id}>
                            <tr>
                              <td className="ps-3 fw-semibold">{quote.quote_number}</td>
                              <td>{dateOf(quote.created_at)}</td>
                              <td><Badge bg={status.bg}>{status.label}</Badge></td>
                              <td className="text-end pe-3">
                                <span className="me-3">{money(quote.total)}</span>
                                <Button variant="link" size="sm" className="p-0 text-decoration-none"
                                  onClick={() => toggleQuote(quote.id)}>
                                  {isOpen ? 'Ocultar' : 'Ver detalle'}
                                </Button>
                              </td>
                            </tr>

                            {isOpen && (
                              <tr>
                                <td colSpan={4} className="bg-light">
                                  {!items ? (
                                    <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                                  ) : items.length === 0 ? (
                                    <div className="small text-muted py-2">Esta cotización no tiene conceptos.</div>
                                  ) : (
                                    <div className="d-flex flex-column gap-3 py-2">
                                      {items.map(item => {
                                        const itemPhotos = quoteItemPhotos(item).map(evidenceUrl);
                                        return (
                                          <div key={item.id} className="d-flex justify-content-between gap-3 border-bottom pb-2">
                                            <div style={{ minWidth: 0 }}>
                                              <div className="small fw-semibold">{item.description}</div>
                                              <div className="small text-muted">
                                                {item.quantity} × {money(item.unit_price)}
                                                {itemPhotos.length > 0 ? ` · ${itemPhotos.length} foto(s)` : ''}
                                              </div>
                                              {itemPhotos.length > 0 && (
                                                <div className="d-flex flex-wrap gap-2 mt-2">
                                                  {itemPhotos.map((src, index) => (
                                                    <img key={index} src={src} alt={`Evidencia ${index + 1}`}
                                                      className="border rounded" style={{ height: 80, width: 110, objectFit: 'cover' }} />
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <div className="small fw-semibold text-nowrap">
                                              {money(item.quantity * item.unit_price)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
