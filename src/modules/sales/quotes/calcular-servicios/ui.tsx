import { memo, type ChangeEvent, type ReactNode } from 'react';
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { Camera, MapPin, X } from 'lucide-react';
import type { CatalogItem, Difficulties, DifficultyState, Items, MaterialState, Option } from './types';
import { lineTotal, money, nonNegative } from './calc';
import { compressImage } from '@/utils/image';

/* =========================================================================
 * Subcomponentes UI genéricos
 * ========================================================================= */

export const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <div className="d-flex align-items-center gap-2">
    <span className="rounded-circle bg-primary text-white px-2 py-1 small fw-bold">{n}</span>
    {children}
  </div>
);

export const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`border rounded-3 p-3 bg-light ${className}`}>{children}</div>
);

export const PanelHeader = ({ title, hint, badge }: { title: ReactNode; hint: ReactNode; badge?: ReactNode }) => (
  <div className="d-flex justify-content-between align-items-center mb-2">
    <div>
      <div className="fw-semibold small">{title}</div>
      <div className="text-muted small">{hint}</div>
    </div>
    {badge}
  </div>
);

export const Row2 = ({ l, r, className = '' }: { l: ReactNode; r: ReactNode; className?: string }) => (
  <div className={`d-flex justify-content-between ${className}`}><span>{l}</span><span>{r}</span></div>
);

export const Breakdown = ({ rows }: { rows: [ReactNode, number][] }) => (
  <div className="small text-muted mt-2" style={{ lineHeight: 1.4 }}>
    {rows.map(([label, amount], i) => <Row2 key={i} l={label} r={money(amount)} />)}
  </div>
);

export const PriceInput = memo(function PriceInput({ value, onChange, disabled, maxWidth }: {
  value: number | string; onChange: (v: string) => void; disabled?: boolean; maxWidth?: number;
}) {
  return (
    <InputGroup size="sm" style={maxWidth ? { maxWidth } : undefined}>
      <InputGroup.Text>$</InputGroup.Text>
      <Form.Control type="number" min={0} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />
    </InputGroup>
  );
});

export interface NumFieldProps {
  id: string; label: string; value: string | number; onChange: (v: string) => void;
  icon?: typeof MapPin; unit?: string; prefix?: string; size?: 'sm'; compact?: boolean;
}

export const NumField = memo(function NumField({ id, label, value, onChange, icon: Icon, unit, prefix, size, compact }: NumFieldProps) {
  return (
    <Form.Group controlId={id}>
      <Form.Label className={`small fw-semibold ${compact ? 'mb-0' : ''}`}>
        {Icon && <Icon size={compact ? 12 : 14} className="me-1" />}{label}
      </Form.Label>
      <InputGroup size={size}>
        {prefix && <InputGroup.Text>{prefix}</InputGroup.Text>}
        <Form.Control type="number" min={0} step={1} value={value} onChange={e => onChange(e.target.value)} />
        {unit && <InputGroup.Text>{unit}</InputGroup.Text>}
      </InputGroup>
    </Form.Group>
  );
});

export const SelectField = memo(function SelectField({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: Option[];
}) {
  return (
    <Form.Group controlId={id}>
      <Form.Label className="small fw-semibold">{label}</Form.Label>
      <Form.Select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </Form.Select>
    </Form.Group>
  );
});

/* --- Fila de ítem memoizada (evita re-render de todas las filas) --- */

export interface ItemRowProps {
  def: CatalogItem;
  state: MaterialState;
  patch: (key: string, p: Partial<MaterialState>) => void;
  labelWidth: number;
  priceWidth: number;
  totalOf?: (key: string) => number;
  disabled?: boolean;
}

export const ItemRow = memo(function ItemRow({ def, state, patch, labelWidth, priceWidth, totalOf, disabled }: ItemRowProps) {
  return (
    <div className={`border-top py-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <Form.Check
          type="checkbox" className="me-2" checked={state.selected} disabled={disabled}
          onChange={e => patch(def.key, { selected: e.target.checked })}
          label={<span className="small fw-semibold">{def.label}</span>}
          style={{ minWidth: labelWidth }}
        />
        <Form.Control
          type="number" min={1} size="sm" value={state.quantity} disabled={!state.selected || disabled}
          onChange={e => patch(def.key, { quantity: Math.max(1, nonNegative(e.target.value)) })}
          style={{ maxWidth: 80 }}
        />
        <span className="small text-muted">{def.unit}</span>
        <PriceInput
          value={state.unitPrice}
          disabled={!state.selected || disabled}
          maxWidth={priceWidth}
          onChange={v => patch(def.key, { unitPrice: nonNegative(v) })}
        />
        <span className="small fw-semibold ms-auto">{money(totalOf ? totalOf(def.key) : lineTotal(state))}</span>
      </div>
    </div>
  );
});

export interface ItemRowsProps {
  defs: CatalogItem[]; state: Items;
  patch: (key: string, p: Partial<MaterialState>) => void;
  labelWidth: number; priceWidth?: number;
  totalOf?: (key: string) => number; disabled?: boolean;
}

export function ItemRows({ defs, state, patch, labelWidth, priceWidth = 160, totalOf, disabled }: ItemRowsProps) {
  return (
    <>
      {defs.map(def => (
        <ItemRow
          key={def.key}
          def={def}
          state={state[def.key]}
          patch={patch}
          labelWidth={labelWidth}
          priceWidth={priceWidth}
          totalOf={totalOf}
          disabled={disabled}
        />
      ))}
    </>
  );
}

export function PhotoGallery({ photos, label, size = 60, max = 3, icon: Icon, onChange }: {
  photos: string[]; label: string; size?: number; max?: number;
  icon: typeof Camera; onChange: (photos: string[]) => void;
}) {
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      onChange([...photos, compressed].slice(0, max));
    } catch { window.alert('No fue posible cargar la imagen.'); }
  };

  const removeAt = (index: number) => onChange(photos.filter((_, i) => i !== index));

  return (
    <div className="mt-3 p-2 border rounded bg-white">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="small fw-semibold">{label}</div>
        <span className={`small ${photos.length >= max ? 'text-success' : 'text-muted'}`}>{photos.length}/{max}</span>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="position-relative">
            <img src={photo} alt={`${label} ${index + 1}`}
              style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8 }} />
            <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-1"
              style={{ transform: 'translate(50%, -50%)' }} onClick={() => removeAt(index)}
              title="Quitar foto">
              <X size={12} />
            </Button>
          </div>
        ))}

        {photos.length < max && (
          <label className="btn btn-outline-primary btn-sm mb-0 d-flex align-items-center justify-content-center"
            style={{ width: size, height: size }} title="Tomar o elegir foto">
            <Icon size={size / 3} />
            <input type="file" accept="image/*" capture="environment" className="d-none" onChange={handleFile} />
          </label>
        )}
      </div>

      {photos.length >= max && (
        <div className="small text-muted mt-2">Máximo {max} fotos por equipo.</div>
      )}
    </div>
  );
}

/* --- Fila de dificultad memoizada --- */

export interface DifficultyRowProps {
  idPrefix: string;
  def: { key: string; label: string };
  state: DifficultyState;
  onPatch: (key: string, patch: Partial<DifficultyState>) => void;
}

export const DifficultyRow = memo(function DifficultyRow({ idPrefix, def, state, onPatch }: DifficultyRowProps) {
  return (
    <Col sm={12}>
      <Form.Check type="switch" id={`${idPrefix}-${def.key}`} label={<span className="small">{def.label}</span>}
        checked={state.selected} onChange={e => onPatch(def.key, { selected: e.target.checked })} />
      <PriceInput value={state.price} maxWidth={120} onChange={v => onPatch(def.key, { price: nonNegative(v) })} />
    </Col>
  );
});

export function DifficultyList({ idPrefix, defs, state, colSm, onPatch }: {
  idPrefix: string; defs: { key: string; label: string }[];
  state: Difficulties; colSm: number;
  onPatch: (key: string, patch: Partial<DifficultyState>) => void;
}) {
  return (
    <Row className="g-2">
      {defs.map(def => (
        <Col sm={colSm} key={def.key}>
          <DifficultyRow idPrefix={idPrefix} def={def} state={state[def.key]} onPatch={onPatch} />
        </Col>
      ))}
    </Row>
  );
}
