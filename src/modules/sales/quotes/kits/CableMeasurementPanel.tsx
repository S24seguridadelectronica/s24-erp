import { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';
import { Calculator, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';
import type { DvrGroup } from '../calcular-servicios/types';
import type { SystemType } from '../calcular-servicios/catalog';

interface CableMeasurementPanelProps {
  system: SystemType;
  dvrGroups: DvrGroup[];
  onApplyCableDistances: (distances: { camId: string; distance: number; height: number }[]) => void;
  /** Emite en tiempo real la distancia promedio y altura promedio calculadas para actualizar las tarjetas de kits */
  onSiteParamsChange?: (params: { avgDistance: number; avgHeight: number; isActive: boolean }) => void;
}

export function CableMeasurementPanel({
  system,
  dvrGroups,
  onApplyCableDistances,
  onSiteParamsChange,
}: CableMeasurementPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sideA, setSideA] = useState(25);
  const [sideB, setSideB] = useState(30);
  const [height, setHeight] = useState(3);
  const [isolatedCams, setIsolatedCams] = useState(0);
  const [isolatedDist, setIsolatedDist] = useState(40);
  const [useCustomIpDistances, setUseCustomIpDistances] = useState(false);
  const [customIpDistances, setCustomIpDistances] = useState<number[]>([]);

  // Cámaras totales activas
  const allCameras = useMemo(() => {
    return dvrGroups.flatMap(dvr =>
      dvr.cameras.map(c => ({
        ...c,
        dvrId: dvr.id,
        dvrLabel: dvr.label || 'Grabador',
      }))
    );
  }, [dvrGroups]);

  const totalCams = Math.max(1, allCameras.length);
  const isAnalog = system === 'analog';

  // Sincronizar distancias IP personalizadas con la cantidad de cámaras
  const effectiveIpDistances = useMemo(() => {
    const list = [...customIpDistances];
    const baseRoute = Math.ceil((Math.max(sideA, sideB) / 2) * totalCams + sideA + sideB + (height * totalCams));
    const defaultDist = Math.max(1, Math.round(baseRoute / totalCams));
    while (list.length < totalCams) {
      list.push(defaultDist);
    }
    return list.slice(0, totalCams);
  }, [totalCams, customIpDistances, sideA, sideB, height]);

  // Cálculo según Modelo v2.0
  const calculation = useMemo(() => {
    let routeMeters = 0;
    let distancesPerCam: number[] = [];

    if (isAnalog) {
      if (isolatedCams === 1 || isolatedCams === 2) {
        const camsBase = Math.max(1, totalCams - isolatedCams);
        const metrosBase = (Math.max(sideA, sideB) / 2) * camsBase + sideA + sideB + (height * camsBase);
        const metrosAislados = (isolatedDist * isolatedCams) + (height * isolatedCams);
        routeMeters = Math.ceil(metrosBase + metrosAislados);
        const avgBase = Math.round(metrosBase / camsBase);
        distancesPerCam = Array(camsBase).fill(avgBase).concat(Array(isolatedCams).fill(isolatedDist));
      } else {
        routeMeters = Math.ceil((Math.max(sideA, sideB) / 2) * totalCams + sideA + sideB + (height * totalCams));
        const avg = Math.round(routeMeters / totalCams);
        distancesPerCam = Array(totalCams).fill(avg);
      }
    } else {
      // Rama IP
      if (useCustomIpDistances) {
        distancesPerCam = effectiveIpDistances;
        routeMeters = Math.ceil(distancesPerCam.reduce((a, b) => a + b, 0));
      } else {
        if (isolatedCams === 1 || isolatedCams === 2) {
          const camsBase = Math.max(1, totalCams - isolatedCams);
          const metrosBase = (Math.max(sideA, sideB) / 2) * camsBase + sideA + sideB + (height * camsBase);
          const metrosAislados = (isolatedDist * isolatedCams) + (height * isolatedCams);
          routeMeters = Math.ceil(metrosBase + metrosAislados);
          const avgBase = Math.round(metrosBase / camsBase);
          distancesPerCam = Array(camsBase).fill(avgBase).concat(Array(isolatedCams).fill(isolatedDist));
        } else {
          routeMeters = Math.ceil((Math.max(sideA, sideB) / 2) * totalCams + sideA + sideB + (height * totalCams));
          const avg = Math.round(routeMeters / totalCams);
          distancesPerCam = Array(totalCams).fill(avg);
        }
      }
    }

    const avgDistExact = totalCams > 0 ? routeMeters / totalCams : 0;
    const avgDist = Math.round(avgDistExact);

    // Switches regeneradores IP (regla IEEE 802.3 >100m)
    let extraSwitches = 0;
    if (!isAnalog) {
      distancesPerCam.forEach(d => {
        if (d > 100) extraSwitches += Math.floor((d - 1) / 100);
      });
    }

    return {
      routeMeters,
      avgDist,
      distancesPerCam,
      extraSwitches,
    };
  }, [isAnalog, isolatedCams, isolatedDist, sideA, sideB, height, totalCams, useCustomIpDistances, effectiveIpDistances]);

  // Notificar al componente padre los parámetros del sitio si la medición está abierta o activa
  useEffect(() => {
    onSiteParamsChange?.({
      avgDistance: calculation.avgDist,
      avgHeight: height,
      isActive: isOpen,
    });
  }, [calculation.avgDist, height, isOpen, onSiteParamsChange]);

  // Aplicar las distancias calculadas a las tarjetas de cámaras existentes
  const handleApplyToCameras = () => {
    const updates = allCameras.map((cam, idx) => ({
      camId: cam.id,
      distance: calculation.distancesPerCam[idx] ?? calculation.avgDist,
      height,
    }));
    onApplyCableDistances(updates);
    setIsOpen(false);
  };

  return (
    <Card className="border-info border-opacity-50 shadow-sm mb-3 bg-white">
      <Card.Header
        className="bg-info bg-opacity-10 py-2 d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="d-flex align-items-center gap-2">
          <Calculator size={18} className="text-info" />
          <strong className="small text-dark">
            📐 Medición Inteligente de Cableado (Modelo v2.0)
          </strong>
          <Badge bg="info" text="dark" className="small">
            Nuevo o Cambio de Cableado Antiguo
          </Badge>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted fw-semibold">
            {calculation.routeMeters} m totales ({calculation.avgDist} m/cámara)
          </span>
          <Button variant="link" size="sm" className="p-0 text-secondary">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </div>
      </Card.Header>

      <Collapse in={isOpen}>
        <Card.Body className="p-3 bg-light border-top">
          <div className="small text-muted mb-3 d-flex align-items-start gap-2">
            <Info size={16} className="text-info flex-shrink-0 mt-1" />
            <span>
              Esta herramienta aplica el <strong>Modelo v2.0 de Perímetro y Red</strong> para calcular con exactitud los metros de cable necesarios (tanto para instalaciones nuevas como para reemplazo de cableado antiguo por nuevo). Los metros resultantes se asignan a cada cámara en el concepto <em>Cambio de cableado</em>.
            </span>
          </div>

          <Row className="g-2 mb-3">
            <Col sm={6} md={3}>
              <Form.Group>
                <Form.Label className="small mb-1 fw-semibold">Lado 1 del área (m)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="1"
                  value={sideA}
                  onChange={e => setSideA(Math.max(1, +e.target.value || 0))}
                />
              </Form.Group>
            </Col>
            <Col sm={6} md={3}>
              <Form.Group>
                <Form.Label className="small mb-1 fw-semibold">Lado 2 del área (m)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min="1"
                  value={sideB}
                  onChange={e => setSideB(Math.max(1, +e.target.value || 0))}
                />
              </Form.Group>
            </Col>
            <Col sm={6} md={3}>
              <Form.Group>
                <Form.Label className="small mb-1 fw-semibold">Altura promedio (m)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  step="0.5"
                  min="0"
                  value={height}
                  onChange={e => setHeight(Math.max(0, +e.target.value || 0))}
                />
              </Form.Group>
            </Col>
            <Col sm={6} md={3}>
              <Form.Group>
                <Form.Label className="small mb-1 fw-semibold">Cámaras a medir</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  readOnly
                  disabled
                  value={`${totalCams} cámara(s)`}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* CRITERIO DE CÁMARAS AISLADAS O DISTANCIAS IP */}
          <div className="p-2 border rounded bg-white mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small fw-bold text-secondary">
                {isAnalog ? 'Criterio de Perímetro (Analógico)' : 'Criterio de Red y Perímetro (IP)'}
              </span>
              {!isAnalog && (
                <Form.Check
                  type="switch"
                  id="kits-custom-ip"
                  label={<span className="small">Detallar distancias por cámara IP</span>}
                  checked={useCustomIpDistances}
                  onChange={e => setUseCustomIpDistances(e.target.checked)}
                />
              )}
            </div>

            {/* Cámaras aisladas (para analógico o IP perimétrico) */}
            {(isAnalog || !useCustomIpDistances) && (
              <Row className="g-2 align-items-center">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small mb-1">Cámaras fuera del perímetro base ({sideA}×{sideB}m):</Form.Label>
                    <Form.Select
                      size="sm"
                      value={isolatedCams}
                      onChange={e => setIsolatedCams(Math.min(totalCams - 1, Math.max(0, +e.target.value)))}
                    >
                      <option value={0}>0 — Todas dentro del perímetro</option>
                      <option value={1}>1 cámara aislada (ej: portería, patio lejano)</option>
                      {totalCams > 2 && <option value={2}>2 cámaras aisladas</option>}
                    </Form.Select>
                  </Form.Group>
                </Col>
                {isolatedCams > 0 && (
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small mb-1">Distancia cámara aislada (m):</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        min="1"
                        value={isolatedDist}
                        onChange={e => setIsolatedDist(Math.max(1, +e.target.value || 0))}
                      />
                    </Form.Group>
                  </Col>
                )}
              </Row>
            )}

            {/* Distancias individuales para IP */}
            {!isAnalog && useCustomIpDistances && (
              <div>
                <small className="text-muted d-block mb-2">
                  Metros lineales de cableado hacia cada cámara IP:
                </small>
                <Row className="g-2 row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 mb-2">
                  {effectiveIpDistances.map((dist, idx) => {
                    const isLong = dist > 100;
                    return (
                      <Col key={idx}>
                        <div className={`p-1 border rounded ${isLong ? 'bg-danger bg-opacity-10 border-danger' : 'bg-light'}`}>
                          <div className="d-flex justify-content-between small fw-bold" style={{ fontSize: '0.75rem' }}>
                            <span>Cám {idx + 1}</span>
                            {isLong && <Badge bg="danger" style={{ fontSize: '0.6rem' }}>&gt;100m</Badge>}
                          </div>
                          <Form.Control
                            size="sm"
                            type="number"
                            min="1"
                            value={dist}
                            onChange={e => {
                              const val = Math.max(1, +e.target.value || 1);
                              setCustomIpDistances(prev => {
                                const next = [...effectiveIpDistances];
                                next[idx] = val;
                                return next;
                              });
                            }}
                          />
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )}
          </div>

          {/* RESULTADOS RÁPIDOS Y BOTÓN DE APLICAR */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
            <div>
              <span className="small text-muted me-2">Cable total requerido:</span>
              <strong className="text-primary fs-6">{calculation.routeMeters} metros</strong>
              <span className="small text-muted ms-2">
                (~{calculation.avgDist} m promedio por punto)
              </span>
              {calculation.extraSwitches > 0 && (
                <Badge bg="danger" className="ms-2">
                  ⚠️ {calculation.extraSwitches} switch(es) intermedio(s) requeridos (&gt;100m)
                </Badge>
              )}
            </div>

            <Button
              variant="success"
              size="sm"
              onClick={handleApplyToCameras}
              className="d-flex align-items-center gap-1 shadow-sm"
            >
              <CheckCircle size={15} />
              Aplicar metrajes a las {totalCams} cámaras del kit
            </Button>
          </div>
        </Card.Body>
      </Collapse>
    </Card>
  );
}
