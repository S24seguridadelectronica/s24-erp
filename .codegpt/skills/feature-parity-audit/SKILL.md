---
name: feature-parity-audit
description: Audita y compara funcionalmente dos módulos o flujos de negocio en React/TypeScript (como CalcularServicios vs CctvKitsModal) para detectar brechas de lógica, cálculos faltantes, duplicación de código y generar un plan de paridad técnica.
---

# Objetivo
Actúa como un Arquitecto de Software Senior y Tech Lead especializado en sistemas ERP en React y TypeScript. Tu misión es realizar una auditoría técnica de paridad funcional estricta entre dos módulos del proyecto S24 ERP, basándote **exclusivamente en el código real del repositorio** (sin inventar funcionalidades inexistentes).

# Alcance Obligatorio de la Revisión (Checklist Técnico)
Debes inspeccionar y comparar línea por línea cómo cada módulo maneja los siguientes puntos:
1. **Variables físicas y entorno:** Cálculo por altura y cálculo por distancia.
2. **Control de estado:** Función de reset para limpiar/restaurar estado y valores por defecto.
3. **Granularidad de mantenimiento:** Mantenimiento general del sistema, mantenimiento independiente por cada cámara y mantenimiento independiente por cada DVR/NVR.
4. **Motor de costos:** Cálculo de tareas, materiales, mano de obra (labor) asociada y validación de cantidades/totales.
5. **Reglas comerciales y recargos:** Manejo de descuentos, viáticos/viajes, urgencias, horario nocturno, dominicales/festivos y otros recargos.
6. **Arquitectura de hardware:** Cálculo diferenciado por sistema (analógico, IP, etc.) y lógica para agrupar cámaras y DVRs.
7. **Salida y persistencia:** Generación final de ítems para cotización, consolidación del total final, integración con el flujo de cita/cotización y persistencia de configuraciones o precios.

# Preguntas Clave que Debes Responder Explícitamente
- ¿Faltan la altura, la distancia y el reset en el módulo comparado?
- ¿Cuenta con mantenimiento general y mantenimiento independiente por cámara/DVR?
- ¿Tiene el módulo base integradas todas las funciones necesarias para un paquete completo?
- ¿Qué más debe incluirse para alcanzar paridad funcional total?
- ¿Existe lógica duplicada, incompleta o inconsistente entre ambos módulos?
- ¿Qué correcciones son necesarias para unificar o complementar ambos flujos sin pérdida de funcionalidad?

# Estructura Obligatoria del Entregable
Organiza tu respuesta como un documento técnico accionable para un desarrollador:
1. **Matriz de Paridad Funcional:** Tabla comparativa diferenciando claramente entre: Implementado, Parcial / Incompleto (explicando exactamente qué falta) y Ausente.
2. **Diagnóstico de Lógica Duplicada e Inconsistencias:** Señala archivos, funciones o hooks que repiten cálculos o divergen en reglas de negocio.
3. **Lista Priorizada de Brechas (Backlog Técnico):** Ordenada por impacto en el cálculo financiero y flujo de cotización (Alta, Media, Baja).
4. **Recomendaciones Concretas de Refactorización:** Propuesta arquitectónica para compartir la lógica de cálculo (ej. extraer funciones puras o custom hooks compartidos) y mejoras de UX para unificar ambos flujos.
