import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { Calculator, Copy, Wrench, Video, RotateCcw, Settings, Globe, Smartphone, Key, HardDrive, Power, PlusCircle } from 'lucide-react';

interface CalcularServiciosProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: any[]) => void;
}

const SERVICES: Record<string, { icon: any; label: string; desc: string }> = {
  maintenance: { icon: Wrench, label: 'Mantenimiento preventivo', desc: 'Limpieza, revisión y pruebas.' },
  video: { icon: Video, label: 'Pérdida de video', desc: 'Una o varias cámaras sin imagen.' },
  reset: { icon: RotateCcw, label: 'Reseteo DVR/NVR', desc: 'Restablecimiento del equipo.' },
  configuration: { icon: Settings, label: 'Configuración DVR/NVR', desc: 'Parámetros y puesta a punto.' },
  remote: { icon: Globe, label: 'Acceso remoto', desc: 'Ver cámaras desde celular.' },
  app: { icon: Smartphone, label: 'Configuración de app', desc: 'Instalación y vinculación.' },
  password: { icon: Key, label: 'Contraseña', desc: 'Cambio o recuperación.' },
  recording: { icon: HardDrive, label: 'Revisión de grabación', desc: 'Configuración o revisión inicial.' },
  power: { icon: Power, label: 'Revisión de alimentación', desc: 'Fuente, conexión o alimentación.' },
  other: { icon: PlusCircle, label: 'Otro servicio', desc: 'Evaluación personalizada.' }
};

const SERVICE_NAMES: Record<string, string> = {
  maintenance: 'Mantenimiento preventivo',
  video: 'Pérdida de video',
  reset: 'Reseteo DVR/NVR',
  configuration: 'Configuración DVR/NVR',
  remote: 'Configuración de acceso remoto',
  app: 'Configuración de aplicación',
  password: 'Cambio / recuperación de contraseña',
  recording: 'Revisión de grabación',
  power: 'Revisión de alimentación',
  other: 'Otro servicio'
};

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export function CalcularServicios({ show, onHide, onAddItems }: CalcularServiciosProps) {
  const [selectedService, setSelectedService] = useState('maintenance');
  const [showPrices, setShowPrices] = useState(false);

  const [data, setData] = useState({
    cameras: 8,
    device: 'DVR',
    cleaning: 'yes',
    knownCause: 'yes',
    affected: '1',
    internet: 'yes',
    otherText: '',
    travel: 20000,
    materials: 0,
    extraLabor: 0
  });

  const [prices, setPrices] = useState({
    pMaintenance: 18000,
    pDeviceMaintenance: 50000,
    pCleaning: 5000,
    pReset: 80000,
    pConfiguration: 100000,
    pRemote: 90000,
    pApp: 60000,
    pPassword: 70000,
    pRecording: 90000,
    pVisit: 80000,
    pPower: 80000,
    pOther: 80000
  });

  const [result, setResult] = useState({
    direct: true,
    lines: [] as any[],
    title: 'Se puede cotizar directamente',
    text: '',
    script: '',
    total: 0
  });

  const updateField = (field: string, value: any) => setData(prev => ({ ...prev, [field]: value }));
  const updatePrice = (field: string, value: number) => setPrices(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (show) calculate();
  }, [selectedService, data, prices, show]);

  const calculate = () => {
    const cams = Math.max(1, Number(data.cameras) || 1);
    const travel = Number(data.travel) || 0;
    const materials = Number(data.materials) || 0;
    const extra = Number(data.extraLabor) || 0;
    const cleaning = data.cleaning === 'yes';
    const known = data.knownCause === 'yes';
    const internet = data.internet;

    let direct = true;
    let base = 0;
    let lines: any[] = [];
    let title = 'Se puede cotizar directamente';
    let text = 'El servicio está suficientemente definido para ofrecer un precio.';
    let script = '';

    switch (selectedService) {
      case 'maintenance':
        base = cams * prices.pMaintenance + prices.pDeviceMaintenance;
        lines.push(['Mantenimiento de cámaras', cams + ' x ' + fmt(prices.pMaintenance), cams * prices.pMaintenance]);
        lines.push(['Revisión y mantenimiento DVR/NVR', '1 x ' + fmt(prices.pDeviceMaintenance), prices.pDeviceMaintenance]);
        if (cleaning) {
          const v = cams * prices.pCleaning;
          base += v;
          lines.push(['Limpieza de cámaras', cams + ' x ' + fmt(prices.pCleaning), v]);
        }
        script = 'Podemos programar el mantenimiento preventivo. El servicio se cotiza según la cantidad de cámaras y el equipo que se revisará.';
        break;
      case 'video':
        if (!known) {
          direct = false; base = prices.pVisit; title = 'Requiere visita técnica';
          text = 'La causa de la pérdida de video no está confirmada. El vendedor no debe prometer una reparación ni diagnosticar por teléfono.';
          script = 'Para determinar exactamente qué está ocasionando la pérdida de video necesitamos que un técnico revise el sistema en sitio. Podemos coordinar la visita.';
        } else {
          const map: Record<string, number> = { '1': 0.75, '2-4': 1, '5-8': 1.5, '9+': 2 };
          const labels: Record<string, string> = { '1': '1 cámara', '2-4': '2 a 4 cámaras', '5-8': '5 a 8 cámaras', '9+': 'Más de 8 cámaras' };
          const v = prices.pPower * (map[data.affected] || 1);
          base = v;
          lines.push(['Atención inicial de pérdida de video', labels[data.affected] || data.affected, v]);
          script = 'Como la causa está identificada, podemos cotizar la atención inicial. Si aparece una falla adicional, se informa antes de realizar trabajos no contemplados.';
        }
        break;
      case 'reset':
        base = prices.pReset; lines.push(['Reseteo DVR/NVR', '1 x ' + fmt(base), base]);
        script = 'El valor corresponde al procedimiento de reseteo del equipo. Si el fabricante exige un procedimiento especial no incluido, se informa antes de continuar.';
        break;
      case 'configuration':
        base = prices.pConfiguration; lines.push(['Configuración DVR/NVR', '1 x ' + fmt(base), base]);
        script = 'Podemos realizar la configuración del DVR/NVR. El valor corresponde al servicio y no incluye repuestos.';
        break;
      case 'remote':
        if (internet !== 'yes') {
          direct = false; base = prices.pVisit; title = 'Requiere visita técnica';
          text = 'No se puede confirmar la configuración remota sin verificar la conexión y el equipo.';
          script = 'Para configurar el acceso desde el celular necesitamos verificar el equipo y la conexión a internet. Podemos coordinar una visita técnica.';
        } else {
          base = prices.pRemote; lines.push(['Configuración de acceso remoto', '1 x ' + fmt(base), base]);
          script = 'Podemos configurar el acceso remoto siempre que exista internet y el equipo sea compatible.';
        }
        break;
      case 'app':
        if (internet !== 'yes') {
          direct = false; base = prices.pVisit; title = 'Requiere visita técnica';
          text = 'Se necesita verificar la conexión y el equipo antes de prometer la configuración.';
          script = 'Primero necesitamos verificar la conexión y el equipo en sitio. Podemos coordinar la visita técnica.';
        } else {
          base = prices.pApp; lines.push(['Configuración de aplicación', '1 x ' + fmt(base), base]);
          script = 'Realizamos la configuración de la aplicación y vinculamos el sistema, siempre que el equipo sea compatible.';
        }
        break;
      case 'password':
        base = prices.pPassword; lines.push(['Cambio / recuperación de contraseña', '1 x ' + fmt(base), base]);
        script = 'Podemos realizar el procedimiento cuando el equipo y el método de recuperación sean compatibles.';
        break;
      case 'recording':
        if (!known) {
          direct = false; base = prices.pVisit; title = 'Requiere visita técnica';
          text = 'No está confirmada la causa del problema de grabación.';
          script = 'Para saber si el problema está en configuración, almacenamiento o equipo, necesitamos revisar el sistema en sitio.';
        } else {
          base = prices.pRecording; lines.push(['Revisión de grabación', '1 x ' + fmt(base), base]);
          script = 'Atenderemos la revisión indicada. Si se identifica un daño de hardware, se informa antes de cotizar el repuesto.';
        }
        break;
      case 'power':
        if (!known) {
          direct = false; base = prices.pVisit; title = 'Requiere visita técnica';
          text = 'Una revisión de alimentación sin causa confirmada requiere diagnóstico en sitio.';
          script = 'Para determinar si la falla corresponde a fuente, cableado, conectores o equipo, necesitamos revisar el sistema en sitio.';
        } else {
          base = prices.pPower; lines.push(['Revisión de alimentación', '1 x ' + fmt(base), base]);
          script = 'Atenderemos la revisión indicada. Los materiales o repuestos adicionales se cotizan aparte si son necesarios.';
        }
        break;
      case 'other':
        direct = false; base = prices.pOther; title = 'Requiere evaluación técnica';
        text = 'El servicio no está parametrizado. Es mejor evaluar el caso antes de prometer un precio de reparación.';
        script = 'Cuéntenos exactamente qué está ocurriendo. Si el caso requiere diagnóstico, coordinaremos una revisión técnica.';
        break;
    }

    if (!lines.length && base) lines.push([direct ? 'Servicio técnico' : 'Visita / diagnóstico técnico', '1 x ' + fmt(base), base]);
    if (travel) lines.push(['Desplazamiento', '1 x ' + fmt(travel), travel]);
    if (materials) lines.push(['Materiales / repuestos', 'Según necesidad', materials]);
    if (extra) lines.push(['Mano de obra adicional', '1 x ' + fmt(extra), extra]);

    const total = base + travel + materials + extra;
    setResult({ direct, lines, title, text, script, total });
  };

  const handleAddToQuote = () => {
    const itemsToAdd = result.lines.map(line => ({
      item_type: line[0] === 'Materiales / repuestos' ? ('product' as const) : ('service' as const),
      description: line[0] + ' (' + SERVICE_NAMES[selectedService] + ')',
      quantity: 1,
      unit_price: Math.round(line[2])
    }));
    onAddItems(itemsToAdd);
    onHide();
  };

  const copyQuote = () => {
    const text = 'COTIZACIÓN S24 - SERVICIOS CCTV\nServicio: ' + SERVICE_NAMES[selectedService] + '\nResultado: ' + result.title + '\n\n' +
      result.lines.map(l => l[0] + ' (' + l[1] + '): ' + fmt(l[2])).join('\n') +
      '\n\nTOTAL ESTIMADO: ' + fmt(result.total) + '\n\nObservación: ' + result.text;
    navigator.clipboard.writeText(text).then(() => alert('Cotización copiada al portapapeles'));
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title><Calculator size={20} className="me-2" />Calculadora de Servicios CCTV</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Alert variant="info" className="mb-3">
          <small>Cotice mantenimientos, pérdidas de video, reseteos y otros servicios. El sistema indica cuándo se puede cotizar directo y cuándo requiere visita técnica.</small>
        </Alert>

        <Row className="g-4">
          <Col lg={7}>
            {/* PASO 1 */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div><h6 className="mb-0 fw-bold">1. Seleccione el servicio</h6><small className="text-muted">El sistema mostrará las preguntas correspondientes.</small></div>
                <Badge bg="secondary">Paso 1</Badge>
              </Card.Header>
              <Card.Body>
                <Row className="g-2">
                  {Object.entries(SERVICES).map(([key, service]) => {
                    const Icon = service.icon;
                    const isActive = selectedService === key;
                    return (
                      <Col md={6} key={key}>
                        <div
                          onClick={() => setSelectedService(key)}
                          className={'p-3 rounded-3 border h-100 ' + (isActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary bg-white')}
                          style={{ cursor: 'pointer' }}
                        >
                          <Icon size={22} className={isActive ? 'text-primary' : 'text-secondary'} />
                          <div className={'fw-bold mt-2 ' + (isActive ? 'text-primary' : '')}>{service.label}</div>
                          <div className="small text-muted mt-1">{service.desc}</div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>

            {/* PASO 2 */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div><h6 className="mb-0 fw-bold">2. Datos del servicio</h6><small className="text-muted">Complete únicamente los datos solicitados.</small></div>
                <Badge bg="secondary">Paso 2</Badge>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group><Form.Label className="small fw-bold">Cantidad de cámaras</Form.Label>
                      <Form.Control type="number" min={1} value={data.cameras} onChange={(e) => updateField('cameras', e.target.value)} /></Form.Group>
                  </Col>
                  {['maintenance', 'reset', 'configuration', 'remote', 'app', 'password', 'recording'].includes(selectedService) && (
                    <Col md={6}>
                      <Form.Group><Form.Label className="small fw-bold">Equipo principal</Form.Label>
                        <Form.Select value={data.device} onChange={(e) => updateField('device', e.target.value)}>
                          <option>DVR</option><option>NVR</option><option>DVR + NVR</option><option>No sabe</option>
                        </Form.Select></Form.Group>
                    </Col>
                  )}
                  {selectedService === 'maintenance' && (
                    <Col md={6}>
                      <Form.Group><Form.Label className="small fw-bold">¿Incluye limpieza de cámaras?</Form.Label>
                        <Form.Select value={data.cleaning} onChange={(e) => updateField('cleaning', e.target.value)}>
                          <option value="yes">Sí</option><option value="no">No</option>
                        </Form.Select></Form.Group>
                    </Col>
                  )}
                  {['video', 'power', 'recording'].includes(selectedService) && (
                    <Col md={6}>
                      <Form.Group><Form.Label className="small fw-bold">¿La causa está identificada?</Form.Label>
                        <Form.Select value={data.knownCause} onChange={(e) => updateField('knownCause', e.target.value)}>
                          <option value="yes">Sí, está claramente identificada</option>
                          <option value="no">No / no se sabe</option>
                        </Form.Select></Form.Group>
                    </Col>
                  )}
                  {selectedService === 'video' && (
                    <Col md={6}>
                      <Form.Group><Form.Label className="small fw-bold">Cámaras afectadas</Form.Label>
                        <Form.Select value={data.affected} onChange={(e) => updateField('affected', e.target.value)}>
                          <option value="1">1 cámara</option><option value="2-4">2 a 4 cámaras</option>
                          <option value="5-8">5 a 8 cámaras</option><option value="9+">Más de 8 cámaras</option>
                        </Form.Select></Form.Group>
                    </Col>
                  )}
                  {['remote', 'app'].includes(selectedService) && (
                    <Col md={6}>
                      <Form.Group><Form.Label className="small fw-bold">¿Hay internet disponible?</Form.Label>
                        <Form.Select value={data.internet} onChange={(e) => updateField('internet', e.target.value)}>
                          <option value="yes">Sí</option><option value="no">No</option><option value="unknown">No sabe</option>
                        </Form.Select></Form.Group>
                    </Col>
                  )}
                  {selectedService === 'other' && (
                    <Col md={12}>
                      <Form.Group><Form.Label className="small fw-bold">Descripción breve</Form.Label>
                        <Form.Control as="textarea" rows={2} value={data.otherText} onChange={(e) => updateField('otherText', e.target.value)} placeholder="Describa el servicio solicitado" /></Form.Group>
                    </Col>
                  )}
                  <Col md={4}>
                    <Form.Group><Form.Label className="small fw-bold">Desplazamiento</Form.Label>
                      <Form.Control type="number" min={0} value={data.travel} onChange={(e) => updateField('travel', e.target.value)} /></Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group><Form.Label className="small fw-bold">Materiales / repuestos</Form.Label>
                      <Form.Control type="number" min={0} value={data.materials} onChange={(e) => updateField('materials', e.target.value)} /></Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group><Form.Label className="small fw-bold">Mano de obra adicional</Form.Label>
                      <Form.Control type="number" min={0} value={data.extraLabor} onChange={(e) => updateField('extraLabor', e.target.value)} /></Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* PASO 3 */}
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div><h6 className="mb-0 fw-bold">3. Precios editables</h6><small className="text-muted">Tarifas provisionales: modifíquelas según su negocio.</small></div>
                <Button variant="link" size="sm" className="p-0" onClick={() => setShowPrices(!showPrices)}>
                  {showPrices ? 'Ocultar precios' : 'Mostrar precios'}
                </Button>
              </Card.Header>
              {showPrices && (
                <Card.Body>
                  <Row className="g-3">
                    {Object.entries([
                      ['pMaintenance', 'Mantenimiento por cámara'],
                      ['pDeviceMaintenance', 'Mantenimiento DVR/NVR'],
                      ['pCleaning', 'Limpieza por cámara'],
                      ['pReset', 'Reseteo DVR/NVR'],
                      ['pConfiguration', 'Configuración DVR/NVR'],
                      ['pRemote', 'Acceso remoto'],
                      ['pApp', 'Configuración de aplicación'],
                      ['pPassword', 'Cambio / recuperación de contraseña'],
                      ['pRecording', 'Revisión de grabación'],
                      ['pVisit', 'Visita / diagnóstico técnico'],
                      ['pPower', 'Revisión de alimentación'],
                      ['pOther', 'Otro servicio / evaluación']
                    ]).map(([key, label]) => (
                      <Col md={6} key={key}>
                        <Form.Group><Form.Label className="small text-muted">{label}</Form.Label>
                          <Form.Control type="number" value={(prices as any)[key]} onChange={(e) => updatePrice(key, Number(e.target.value))} /></Form.Group>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              )}
            </Card>
          </Col>

          {/* RESULTADO */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div><h6 className="mb-0 fw-bold">Resultado</h6><small className="text-muted">{SERVICE_NAMES[selectedService]}</small></div>
                <Badge bg="secondary">Paso 3</Badge>
              </Card.Header>
              <Card.Body>
                <Alert variant={result.direct ? 'success' : 'warning'} className="mb-3">
                  <div className="small fw-bold text-uppercase">Resultado comercial</div>
                  <div className="fw-bold mt-1">{result.title}</div>
                  <div className="small mt-2 mb-0">{result.text}</div>
                </Alert>

                <div>
                  {result.lines.map((line, idx) => (
                    <div key={idx} className="d-flex justify-content-between py-2 border-bottom">
                      <span className="text-muted small">{line[0]}<br /><small className="text-secondary">{line[1]}</small></span>
                      <strong className="small">{fmt(line[2])}</strong>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between align-items-end mt-3 pt-3 border-top">
                  <div>
                    <div className="small text-uppercase text-muted fw-bold">Total estimado</div>
                    <div className="fs-3 fw-bold text-primary">{fmt(result.total)}</div>
                  </div>
                </div>

                <Card className="bg-light border-0 mt-3">
                  <Card.Body>
                    <div className="small text-uppercase text-muted fw-bold">Guion recomendado para el vendedor</div>
                    <p className="small mt-2 mb-0">{result.script}</p>
                  </Card.Body>
                </Card>

                <Button variant="success" className="w-100 mt-3" onClick={handleAddToQuote}>
                  Agregar a Cotización
                </Button>
                <Button variant="outline-secondary" className="w-100 mt-2" onClick={copyQuote}>
                  <Copy size={16} className="me-2" />Copiar cotización
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}
