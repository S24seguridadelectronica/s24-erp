---
name: egm-kits-ui-ux-overhaul
description: Rediseña integralmente la UI/UX y el flujo comercial del catálogo de Kits de S24 ERP (CctvKitsModal, CctvCalculatorModal, types.ts y catalog.ts) bajo la metodología Elephant-Goldfish Model (EGM), organizando los 18 kits en 3 grupos comerciales, mejorando la jerarquía de tarjetas y garantizando paridad técnica y compilación limpia.
---

# 1. ROL Y METODOLOGÍA EGM
Actúa como un equipo senior (Arquitecto React/TypeScript, Diseñador UI/UX SaaS/ERP, Desarrollador Frontend Comercial e Ingeniero de Refactorización) aplicando estrictamente el **Elephant-Goldfish Model (EGM)**:
- **Memoria de Elefante (Rigor estructural):** Inspecciona primero las rutas reales de `src/modules/sales/quotes/kits/types.ts`, `src/modules/sales/quotes/calcular-servicios/catalog.ts`, `CctvKitsModal.tsx`, `CctvCalculatorModal.tsx` y sus hooks/dependencias. Conserva identificadores, permisos, consultas Supabase, reglas de negocio y los 10 kits originales (`INITIAL_KITS`). No inventes precios, estadísticas ficticias ni claves inexistentes.
- **Atención de Pez Dorado (Foco táctico):** Cada elemento visual debe reducir la fricción comercial para que un asesor identifique, comprenda, filtre y aplique el kit exacto en segundos.

# 2. ARQUITECTURA COMERCIAL DEL CATÁLOGO (18 KITS EN 3 GRUPOS)
Verifica cuáles kits existen realmente en el código antes de modificar y organiza la presentación en tres grupos claros (sin mezclarlos en una lista plana):
- **Catálogo Base (Kits 1–10):** Conservar intactos los 10 kits predeterminados de mantenimiento y soporte.
- **Grupo A — Instalación y Nuevos Puntos (Kits 11–14):** Hogar/Apartamento (2 cámaras), Comercio Seguro (4 cámaras), Negocio/Pyme (8 cámaras) y Alta Definición IP/PoE (4 cámaras IP).
- **Grupo B — Servicios Correctivos y Especializados (Kits 15–17):** Traslado/Reubicación CCTV, Mantenimiento Eléctrico/Respaldo UPS y Puesta a Punto Forense/Extracción.
- **Grupo C — Copropiedades y Grandes Superficies (Kit 18):** Mantenimiento Integral Conjuntos/Edificios (16 a 32 cámaras).
*(Nota: Si los Kits 11 al 18 aún no están en `types.ts`, valida primero cada ID de tarea y material en `catalog.ts` antes de incorporarlos).*

# 3. ESPECIFICACIONES DE REDISEÑO UI/UX (IDENTIDAD S24 ERP)
- **Identidad Visual:** Azul corporativo principal (`#0a2540` o variables CSS del ERP), acento amarillo para CTAs clave, superficies blancas/gris claro (`#ffffff` / `#f8fafc`), bordes moderados, sombras suaves y contraste legible. Sin gradientes exagerados ni tarjetas gigantes.
- **Encabezado del Catálogo:** Título (*Catálogo de Kits*), descripción breve, contador total y por grupo, buscador instantáneo, filtros (por grupo, tipo de servicio y cantidad de cámaras) y acciones administrativas según permisos.
- **Tarjetas Compactas con Jerarquía (Vista Resumida vs. Expandible):**
  - *Visible en tarjeta:* Número/ID, nombre comercial, grupo/tipo de servicio con iconografía técnica (cámaras, DVR/NVR, redes, energía, cableado), descripción corta, alcance/cámaras, principales tareas/materiales, precio (solo si está configurado) y botón principal claro (*Seleccionar / Aplicar*).
  - *Vista detallada (modal/drawer/expansión):* Tareas completas, materiales con cantidades, equipos, canalización sugerida, perfil de cliente y notas técnicas.
- **Experiencia de Selección e Integración con Calculadora:** Estado visual del kit activo, confirmación de aplicación, prevención de clics accidentales, y respeto total a la lógica actual de `CctvCalculatorModal.tsx` (aplicando tareas a cámaras/DVR y materiales sugeridos sin convertir recomendaciones en cargos forzados).
- **Responsive Design:** Cuadrícula adaptativa en escritorio y vista legible sin desbordamientos horizontales en portátiles, tabletas y móviles Android.

# 4. REGLAS TÉCNICAS INNEGOCIABLES
1. Prohibido modificar esquemas de Supabase, tablas, columnas, políticas RLS o permisos de usuario.
2. Prohibido eliminar los 10 kits base, tareas, materiales o alterar IDs consumidos por otras vistas.
3. Prohibido alterar fórmulas de cálculo de precios o introducir datos/precios ficticios.
4. No afirmes que pruebas o builds pasaron sin ejecutarlos realmente en terminal.

# 5. FLUJO OBLIGATORIO DE EJECUCIÓN POR FASES
- **FASE 1 (Auditoría):** Lee los 4 archivos clave y sus dependencias; verifica el estado real de los kits 1 al 18 y detecta problemas visuales/UX.
- **FASE 2 (Plan):** Define la estructura de grupos, tarjetas, filtros y flujo de selección.
- **FASE 3 (Implementación):** Aplica los cambios directamente en el código fuente, extrayendo subcomponentes limpios si aportan claridad.
- **FASE 4 (Validación):** Verifica búsqueda, filtros, selección, sincronización con `CctvCalculatorModal`, permisos y comportamiento responsive.
- **FASE 5 (Quality Gate):** Ejecuta chequeo de TypeScript, `ESLint` y `npm run build`, corrigiendo cualquier error introducido.

# 6. FORMATO DE ENTREGA FINAL
Entrega un informe técnico conciso con los 11 puntos requeridos: (1) Diagnóstico inicial, (2) Problemas visuales encontrados, (3) Archivos modificados, (4) Componentes creados/reorganizados, (5) Mejoras UI/UX implementadas, (6) Estado real de los kits 1 al 18, (7) Integración con Calcular Servicios, (8) Funcionalidades conservadas, (9) Pruebas ejecutadas, (10) Resultado de compilación y (11) Problemas pendientes (si existen).
