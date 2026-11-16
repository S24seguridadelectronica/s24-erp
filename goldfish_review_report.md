Status: in_review

# Goldfish Annotated Review Report

**Target:** `consolidated_review_report.md` (hallazgos sobre el códigobase de s24-qwen; `TargetFile` efectivo = código fuente)

## Prioritized Findings & AI Suggestions

### [F1] Regenerar `database.ts` y eliminar casts `as any` — Severity: Blocker
*   **Affected Scope:** 66+ ocurrencias en `src/services/api/*`, `src/modules/**`, `src/app/*`
*   **Discrepancy Description:** El tipado generado de Supabase está anulado por casts `as any` en toda la capa de datos.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Es la deuda más rentable: habilita que el compilador detecte el resto. Requiere regenerar tipos (`npx supabase gen types`) y retirar casts archivo por archivo. Es un cambio mecánico pero extenso (~20 archivos).
*   **Proposed Edit:**
    *   Location: `src/types/database.ts` + todos los `(supabase.from('x') as any)`
    *   Change: Regenerar tipos desde el esquema real de Supabase; reemplazar cada cast por el tipado nativo. Trabajo de varias sesiones; se ejecuta módulo por módulo.

### [F2] Autorización en el servidor (RPC + RLS por rol) — Severity: Blocker
*   **Affected Scope:** `src/app/RoleGuard.tsx`, `src/app/router.tsx`, `src/hooks/usePermissions.ts`, migraciones SQL
*   **Discrepancy Description:** El rol se decide en el cliente; con RLS permisivo un usuario puede auto-elevarse a admin.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Vulnerabilidad real, no teórica. Fix en dos partes: (a) migración SQL con `get_my_role()` SECURITY DEFINER + políticas por rol + `user_roles` solo editable por admin_super; (b) frontend consume la RPC. Nota: la parte SQL requiere acceso al proyecto Supabase para aplicarla; el archivo de migración puedo escribirlo ya.
*   **Proposed Edit:**
    *   Location: `supabase/migrations/007_server_side_authorization.sql` (nuevo)
    *   Change: RPC `get_my_role()`, políticas RLS restrictivas, revocar escritura directa a `user_roles`.

### [F3] Endurecer políticas RLS `USING (true)` — Severity: Blocker
*   **Affected Scope:** `supabase/migrations/003_work_order_photos.sql` (líneas 25-39), `006_pdf_catalog_import.sql` (líneas 126-180)
*   **Discrepancy Description:** Cualquier autenticado puede escribir/borrar fotos de work orders, lotes de import y productos.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Fix acotado y de alto valor: nueva migración 008 que reemplace las políticas abiertas por políticas con verificación de rol (admin/técnico según tabla) o propiedad del registro. Requiere decidir qué roles escriben en cada tabla — decisión que puede necesitar tu input (ver puerta).
*   **Proposed Edit:**
    *   Location: `supabase/migrations/008_tighten_rls.sql` (nuevo)
    *   Change: DROP + CREATE de políticas con `get_my_role()` y `WITH CHECK` por propiedad.

### [F4] Contraseña por defecto hardcodeada `'S24Temp2024!'` — Severity: Blocker
*   **Affected Scope:** `src/modules/admin/users/UserForm.tsx:90`
*   **Discrepancy Description:** Password inicial de usuarios creados visible en el bundle público.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Trivial de corregir: generar contraseña aleatoria por usuario y mostrarla una sola vez en el modal de confirmación (el flujo ya muestra `createdPassword`), eliminando el fallback constante. Exponerla en el bundle permite a cualquiera autenticarse como usuario nuevo.
*   **Proposed Edit:**
    *   Location: `UserForm.tsx`, línea ~90
    *   Change: `const password = data.password || generarPasswordAleatoria();` con helper local (16 chars, letras/números/símbolos).

### [F5] Hardcode de admin por email en DashboardPage — Severity: Blocker
*   **Affected Scope:** `src/modules/dashboard/DashboardPage.tsx:65`
*   **Discrepancy Description:** `isAdmin = user.email === 's24hseguridad@gmail.com'`.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Depende de F1/F2 (necesita el rol ya disponible en un hook), pero el cambio local es directo: eliminar la línea y confiar solo en el rol de BD. Si se aplica antes de F2, basta con quitar el hardcode dejando la consulta existente.
*   **Proposed Edit:**
    *   Location: `DashboardPage.tsx:65`
    *   Change: Eliminar la asignación por email; `isAdmin` derivado solo de `roleName`.

### [F6] Hook único `useUserRole()` — Severity: Major
*   **Affected Scope:** RoleGuard, router.tsx, Sidebar, DashboardPage, QuoteForm, OpportunitiesPage, CustomersPage
*   **Discrepancy Description:** Consulta de rol duplicada 7 veces con parseos distintos; queries repetidas por sesión.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Consolidación mecánica: crear `src/hooks/useUserRole.tsx` con caché en Context (o sobre React Query si se adopta), y reemplazar los 7 sitios. Reduce latencia en móvil y elimina divergencia de parseo. Bien delimitado.
*   **Proposed Edit:**
    *   Location: `src/hooks/useUserRole.tsx` (nuevo) + 7 reemplazos
    *   Change: Hook con fetch único por sesión + helper `isAdminRole(role)`.

### [F7] Vocabulario de roles código vs. BD — Severity: Major
*   **Affected Scope:** `router.tsx:106`, `DashboardPage`, `CommissionsDashboard`, `001_initial_schema.sql:210-219`
*   **Discrepancy Description:** El código reconoce roles que la BD no define (`admin`, `administrador`, `vendedor`, `cobrador`, `cerrador`…) y la BD define roles que el código ignora.
*   **AI Suggestion:** ESCALATE
*   **Justification:** Requiere conocimiento de negocio: qué roles existen realmente en la operación de S24 y qué puede ver cada uno. Cambiar nombres de roles en BD sin ese mapa rompería logins. Necesito de ti la lista canónica de roles y su mapping; con ella, el fix es una migración de datos + constantes tipadas en el frontend.
*   **Proposed Edit:**
    *   Location: pendiente de tu input
    *   Change: migración de normalización de roles + `src/types/roles.ts` con union type.

### [F8] React Query instalado pero sin usar — Severity: Major
*   **Affected Scope:** `src/app/providers.tsx`, toda la capa de fetching
*   **Discrepancy Description:** QueryClientProvider montado, cero uso de `useQuery`/`useMutation`.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Dos caminos válidos y excluyentes: (a) adoptarlo migrando los listados principales (quotes, customers, products) a `useQuery` — mejora caché/invalidación y se integra con F6; (b) desinstalarlo para reducir bundle. Recomiendo (a) pero es una decisión de dirección, no un fix textual — la ejecución la haré según lo que elijas en la puerta.
*   **Proposed Edit:**
    *   Location: `providers.tsx` + páginas de listado
    *   Change: Opción (a): migrar fetch principal a `useQuery`. Opción (b): `npm uninstall @tanstack/react-query` y simplificar providers.

### [F9] Tests del motor de cálculo `calc.ts` — Severity: Major
*   **Affected Scope:** `src/modules/sales/quotes/calcular-servicios/calc.ts` (+ `draft.ts`, `savedStore.ts`)
*   **Discrepancy Description:** Cero tests en el proyecto; el módulo con más riesgo de negocio es puro y testeable.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** `buildQuote`, `addMaintenanceLines`, `calcularMontoCableado` y los topes son funciones puras deterministas. Instalar Vitest + un suite inicial que cubra: topes de mano de obra, excedentes de distancia/altura, recargos sobre servicios (no materiales), y casos de diagnóstico. Alto valor por esfuerzo.
*   **Proposed Edit:**
    *   Location: `vitest.config.ts` (nuevo) + `src/modules/sales/quotes/calcular-servicios/__tests__/calc.test.ts`
    *   Change: ~15-20 casos de prueba sobre las funciones exportadas.

### [F10] Falta de frontera entre módulos (escrituras cruzadas) — Severity: Major
*   **Affected Scope:** `QuoteForm.tsx` → work_orders; `OpportunityForm.tsx` → tasks
*   **Discrepancy Description:** Páginas escriben a tablas de otros módulos directamente.
*   **AI Suggestion:** DECLINE (por ahora)
*   **Justification:** Es un Nit estructural en la práctica actual: el equipo es pequeño, las escrituras cruzadas son flujos de negocio legítimos (cotización aprobada → orden de trabajo), y encasillarlo en contratos formales ahora añadiría ceremonia sin beneficio medible. Se revisitafirm if the team grows. No lo corrijo; queda registrado como trade-off aceptado.

### [F11] Carpetas `backup-*` dentro del repo — Severity: Major
*   **Affected Scope:** `backup-calcular-20261107-183443/`, `backup-responsive-20261027-183347/`
*   **Discrepancy Description:** Respaldos manuales versionados; Git ya es el historial.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Eliminación segura: el contenido está en el historial de Git si alguna vez se necesita. Reduce ruido de búsquedas y riesgo de que Vite incluya algo accidentalmente. Uso `git rm -r` para preservar historia.
*   **Proposed Edit:**
    *   Location: raíz del repo
    *   Change: `git rm -r backup-calcular-20261107-183443 backup-responsive-20261027-183347` + entrada en `.gitignore` para `backup-*`.

### [F12] Bundle Android compilado committeado — Severity: Major
*   **Affected Scope:** `android/app/src/main/assets/public/`
*   **Discrepancy Description:** Cada build genera diffs enormes; el artefacto no debería estar versionado.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** `cap sync` regenera esa carpeta; solo se necesita en build, no en el repo. Añadir a `.gitignore` y `git rm -r --cached`. Precaución: el APK actualmente instalado se construye desde esos assets — hay que confirmar que el flujo `build:capacitor` los regenera siempre (lo hace: `vite build && cap sync`).
*   **Proposed Edit:**
    *   Location: `.gitignore`
    *   Change: Añadir `android/app/src/main/assets/public/` y `git rm -r --cached android/app/src/main/assets/public`.

### [F13] `console.log` con datos sensibles en producción — Severity: Major
*   **Affected Scope:** `DashboardPage.tsx`, `router.tsx` (RoleGuard), `emailService.ts`, otros
*   **Discrepancy Description:** Logs de emails, facturas y rol en la consola del navegador.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Eliminación directa de las líneas de depuración identificadas (los `console.error` de manejo de errores se conservan; se retiran los `console.log` informativos con datos de negocio).
*   **Proposed Edit:**
    *   Location: ~8-10 líneas identificadas por grep
    *   Change: Borrar `console.log` informativos; mantener `console.error` de excepciones.

### [F14] Despliegue de ERP en GitHub Pages sin staging — Severity: Major
*   **Affected Scope:** `package.json` scripts, flujo de despliegue
*   **Discrepancy Description:** Sin entorno de staging, monitoreo ni rollback rápido para un sistema con datos de clientes.
*   **AI Suggestion:** ESCALATE
*   **Justification:** Es una decisión de infraestructura y presupuesto (Vercel/Cloudflare Pages vs. GH Pages, proyecto Supabase separado para staging, quién paga y quién opera). Puedo preparar la config, pero elegir plataforma y crear el segundo proyecto Supabase es tuyo.
*   **Proposed Edit:**
    *   Location: N/A hasta decisión
    *   Change: pendiente.

### [F15] Queries sin paginación (`limit(10000)`, selects completos) — Severity: Major
*   **Affected Scope:** `import.ts:139`, `getCustomers`, `getProducts`, dashboard
*   **Discrepancy Description:** Listados cargan conjuntos completos; degradarán con miles de registros.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Introducir paginación real cambia UX (tablas, filtros) y depende de F8 (React Query facilita cursor paging). Propuesta: aplicar solo donde el riesgo es inmediato (`checkDuplicates` baja a paginación por lotes; dashboard usa counts con `head:true` que ya es eficiente) y dejar paginación de tablas para cuando se decida F8. Fix parcial, acotado.
*   **Proposed Edit:**
    *   Location: `src/services/api/import.ts:138-165`
    *   Change: Procesar duplicados en lotes de 1000 con filtro por campos clave en vez de traer 10k filas.

### [F16] Orden de migraciones 002/003/004 — Severity: Nit
*   **Affected Scope:** `supabase/migrations/`
*   **Discrepancy Description:** Numeración no estrictamente secuencial en fechas.
*   **AI Suggestion:** DECLINE
*   **Justification:** Nit sin efecto real: las migraciones ya aplicadas no se reordenan sin romper el historial de Supabase. Queda registrado.

### [F17] `any` en firmas públicas de la capa API — Severity: Major
*   **Affected Scope:** `quotes.ts` (`createQuote(quote: any...)`), `work-orders.ts` (`order: any`), otros
*   **Discrepancy Description:** Contratos entre módulos inexistentes.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Es la cara visible de F1: una vez regenerados los tipos, definir interfaces explícitas (`QuoteInput`, `WorkOrderInput`) es natural. Se ejecuta junto con F1, módulo por módulo, no como cambio separado.
*   **Proposed Edit:**
    *   Location: mismo plan de trabajo que F1
    *   Change: Interfaces tipadas en cada servicio durante la pasada de F1.

### [F18] RLS de `user_roles` ambigua — Severity: Major
*   **Affected Scope:** migraciones revisadas (no se localizó política de escritura para `user_roles`)
*   **Discrepancy Description:** No aparece política INSERT/UPDATE/DELETE explícita para `user_roles` en las migraciones 001-006.
*   **AI Suggestion:** PROPOSE FIX
*   **Justification:** Se cubre dentro de F2 (migración 007): añadir políticas explícitas — SELECT para el propio usuario, todas las escrituras reservadas a admin_super. Si `user_roles` hoy no tiene políticas de escritura, RLS ya la bloquea (comportamiento seguro por defecto), pero dejarlo explícito elimina la ambigüedad.
*   **Proposed Edit:**
    *   Location: `supabase/migrations/007_server_side_authorization.sql` (mismo archivo de F2)
    *   Change: Políticas explícitas sobre `user_roles`.

---

## Resumen

| Categoría | Hallazgos |
|---|---|
| PROPOSE FIX | F1, F2, F3, F4, F5, F6, F8, F9, F11, F12, F13, F15, F17, F18 |
| ESCALATE | F7 (mapa de roles), F14 (plataforma de despliegue) |
| DECLINE | F10 (fronteras entre módulos), F16 (numeración de migraciones) |

**Orden de ejecución propuesto si aceptas:** F4 + F5 + F13 (quick wins de seguridad/higiene, una pasada) → F2 + F3 + F18 (migraciones SQL 007/008) → F6 (hook de rol) → F11 + F12 (limpieza de repo) → F1 + F17 (tipado, varias sesiones) → F9 (tests) → F15 (paginación puntual) → F8 (según tu decisión).
