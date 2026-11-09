import { memo } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { PRICE_CONFIG, SERVICE_ENTRIES } from './catalog';
import type { PriceKey, Prices, ServiceKey } from './catalog';
import type { ServiceLine } from './types';
import { money } from './calc';

/* =========================================================================
 * Subcomponentes memoizados del panel
 * ========================================================================= */

export const ServiceGrid = memo(function ServiceGrid({ selected, onSelect }: {
  selected: ServiceKey; onSelect: (key: ServiceKey) => void;
}) {
  return (
    <Row className="g-2">
      {SERVICE_ENTRIES.map(([key, { icon: Icon, label, description }]) => {
        const active = selected === key;
        return (
          <Col sm={6} key={key}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(key)}
              className={`btn text-start w-100 h-100 p-3 rounded-3 ${active ? 'btn-outline-primary border-2 bg-primary bg-opacity-10' : 'btn-outline-secondary border'}`}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <Icon size={20} className={active ? 'text-primary' : 'text-secondary'} />
                {active && <CheckCircle2 size={16} className="ms-auto text-primary" />}
              </div>
              <div className={`fw-semibold small ${active ? 'text-primary' : 'text-dark'}`}>{label}</div>
              <div className="small text-muted mt-1">{description}</div>
            </button>
          </Col>
        );
      })}
    </Row>
  );
});

export const PriceSettings = memo(function PriceSettings({ prices, taxRate, onChange, onTaxRateChange, onReset }: {
  prices: Prices; taxRate: number;
  onChange: (key: PriceKey, value: string) => void;
  onTaxRateChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <Card.Body>
      <Alert variant="info" className="small">
        Los precios y el IVA se guardan en este dispositivo y se <strong>sincronizan con la empresa</strong> a través de
        <code> site_settings</code>. Si no tienes permisos de escritura sobre la configuración, quedan al menos en tu equipo.
      </Alert>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="price-tax-rate">
            <Form.Label className="small text-muted">IVA (%) aplicado a la cotización</Form.Label>
            <InputGroup>
              <Form.Control type="number" min={0} max={100} value={taxRate} onChange={e => onTaxRateChange(e.target.value)} />
              <InputGroup.Text>%</InputGroup.Text>
            </InputGroup>
          </Form.Group>
        </Col>
        {PRICE_CONFIG.map(({ key, label }) => (
          <Col md={6} key={key}>
            <Form.Group controlId={`price-${key}`}>
              <Form.Label className="small text-muted">{label}</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control type="number" min={0} value={prices[key]} onChange={e => onChange(key, e.target.value)} />
              </InputGroup>
            </Form.Group>
          </Col>
        ))}
      </Row>
      <div className="text-end mt-3">
        <Button variant="outline-secondary" size="sm" onClick={onReset}>
          <RotateCcw size={14} className="me-1" />Restablecer valores iniciales
        </Button>
      </div>
    </Card.Body>
  );
});

export const LineItemRow = memo(function LineItemRow({ line }: { line: ServiceLine }) {
  return (
    <div className={`d-flex justify-content-between gap-3 py-3 border-bottom ${line.id.startsWith('cam-') ? 'ps-3 ms-2 border-start border-3 border-primary' : ''}`}>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="small fw-semibold">
          {line.itemType === 'product' && (
            <Badge bg="info" text="dark" className="me-2" style={{ fontSize: '0.6rem' }}>Material</Badge>
          )}
          {line.description}
        </div>
        <div className="small text-muted">{line.detail}</div>
        {line.photos.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-2">
            {line.photos.map((photo, index) => (
              <img key={index} src={photo} alt={`Evidencia ${index + 1}`} className="rounded border shadow-sm"
                style={{ maxHeight: 90, maxWidth: 140, objectFit: 'cover' }} />
            ))}
          </div>
        )}
      </div>
      <div className="small fw-semibold text-nowrap">{money(line.amount)}</div>
    </div>
  );
});
