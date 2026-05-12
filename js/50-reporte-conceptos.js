// ═══════════════════════════════════════════════════════════════════════════
// REPORTE DE CONCEPTOS DE NÓMINA
// ───────────────────────────────────────────────────────────────────────────
// Catálogo completo unificado de TODOS los conceptos del sistema:
//
//   1. CONCEPTOS HARDCODEADOS (definidos en js/17 buildConceptRows):
//      Sueldo, Antigüedad, Presentismo, SAC, Vacaciones, licencias,
//      aportes (jubilación, OS, PAMI, etc.), contribuciones patronales,
//      conceptos no remunerativos (Art. 103 bis LCT), embargos, etc.
//      Estos NO se pueden editar — son la base del sistema.
//
//   2. CONCEPTOS CUSTOM (definidos por RR.HH. en data/conceptos_custom.js):
//      Conceptos con fórmulas, tipo (REM/NO_REM/DESCUENTO/etc), vigencia
//      por sindicato/empresa/empleado, código asignado por el usuario,
//      estado (activo/pendiente/inactivo).
//
// SALIDA:
//   - Vista HTML con tabla agrupada por categoría, filtros y búsqueda
//   - Botón "Exportar a Excel" → .xlsx con todos los campos
// ═══════════════════════════════════════════════════════════════════════════

// Catálogo HARDCODED: refleja exactamente lo que buildConceptRows() arma en
// el recibo. Cualquier cambio en js/17 debe replicarse acá (es documentación
// viva). El orden es el mismo orden visual del recibo argentino estándar.
const CATALOGO_CONCEPTOS_HARDCODED = [
  // ═════════════════════ HABERES REMUNERATIVOS ════════════════════════
  { codigo: 1,     descripcion: 'Sueldo',                                    columna: 'HABERES', categoria: 'Sueldo básico',         tipo: 'REM',          calculo: 'auto',     formula: 'sueldoBasico * (diasTrab/habiles) * factorPeriodo', baseLegal: 'Art. 103 LCT' },
  { codigo: 100,   descripcion: 'Antigüedad',                                columna: 'HABERES', categoria: 'Adicionales',           tipo: 'REM',          calculo: 'auto',     formula: 'sueldoBasico × (años × pctAntigPorAnio%)', baseLegal: 'CCT — paritarias / Art. 245 LCT (cómputo)' },
  { codigo: 2,     descripcion: 'Horas Extras 50%',                          columna: 'HABERES', categoria: 'Horas extras',          tipo: 'REM',          calculo: 'novedad',  formula: '(bruto / 173) × 1.5 × cantidad', baseLegal: 'Art. 201 LCT — decisión empresarial divisor 173' },
  { codigo: 3,     descripcion: 'Horas Extras 100%',                         columna: 'HABERES', categoria: 'Horas extras',          tipo: 'REM',          calculo: 'novedad',  formula: '(bruto / 173) × 2.0 × cantidad', baseLegal: 'Art. 201 LCT — decisión empresarial divisor 173' },
  { codigo: 8000,  descripcion: 'Presentismo',                               columna: 'HABERES', categoria: 'Adicionales',           tipo: 'REM',          calculo: 'auto',     formula: 'sueldoBasico × pctPresentismo% (si no hay ausencias/suspensión)', baseLegal: 'CCT — paritarias' },
  { codigo: 9100,  descripcion: 'SAC Proporcional',                          columna: 'HABERES', categoria: 'SAC',                   tipo: 'REM',          calculo: 'novedad',  formula: 'sueldoMejor / 12 × proporciónSemestre', baseLegal: 'Art. 121-123 LCT — Ley 23.041' },
  { codigo: 6500,  descripcion: 'Feriados no trabajados (Art. 168 LCT)',     columna: 'HABERES', categoria: 'Feriados',              tipo: 'REM',          calculo: 'auto',     formula: '(bruto / 30) × feriadosNoTrabajados (calendario AR, excluye UOCRA)', baseLegal: 'Art. 168 LCT — Ley 27.399' },

  // ═════════════════════ LICENCIAS (Art. 155 LCT) ═════════════════════
  { codigo: 5800,  descripcion: 'Vacaciones (Art. 155 LCT)',                 columna: 'HABERES', categoria: 'Vacaciones',            tipo: 'REM',          calculo: 'auto',     formula: 'valorDiaVacaciones × diasVac', baseLegal: 'Art. 155 LCT' },
  { codigo: 5810,  descripcion: 'Lic. Matrimonio (Art. 158 LCT)',            columna: 'HABERES', categoria: 'Licencias especiales',  tipo: 'REM',          calculo: 'novedad',  formula: 'valorDia × 10 días', baseLegal: 'Art. 158 LCT' },
  { codigo: 5820,  descripcion: 'Lic. Nacimiento Hijo (Art. 158 LCT)',       columna: 'HABERES', categoria: 'Licencias especiales',  tipo: 'REM',          calculo: 'novedad',  formula: 'valorDia × 2 días', baseLegal: 'Art. 158 LCT' },
  { codigo: 5830,  descripcion: 'Lic. Fallecimiento (Art. 158 LCT)',         columna: 'HABERES', categoria: 'Licencias especiales',  tipo: 'REM',          calculo: 'novedad',  formula: 'valorDia × 3 días (cónyuge/hijos/padres)', baseLegal: 'Art. 158 LCT' },
  { codigo: 5840,  descripcion: 'Lic. Examen (Art. 158 LCT)',                columna: 'HABERES', categoria: 'Licencias especiales',  tipo: 'REM',          calculo: 'novedad',  formula: 'valorDia × 2 días por examen (máx. 10/año)', baseLegal: 'Art. 158 LCT' },
  { codigo: 5850,  descripcion: 'Otras licencias (día común)',               columna: 'HABERES', categoria: 'Licencias especiales',  tipo: 'REM',          calculo: 'novedad',  formula: 'valorDia × diasOtrasLic', baseLegal: 'CCT — convenios particulares' },

  // ═════════════════════ AJUSTES Y OTROS HABERES ══════════════════════
  { codigo: 9500,  descripcion: 'Ajuste de sueldo',                          columna: 'HABERES', categoria: 'Ajustes',               tipo: 'REM',          calculo: 'novedad',  formula: 'monto manual', baseLegal: 'Acuerdos paritarios — ajustes retroactivos' },
  { codigo: 9900,  descripcion: 'Otros haberes remunerativos',               columna: 'HABERES', categoria: 'Adicionales',           tipo: 'REM',          calculo: 'novedad',  formula: 'monto manual (genérico)', baseLegal: 'CCT' },

  // ═════════════════════ NO REMUNERATIVOS (ADICIONALES) ═══════════════
  { codigo: 58100, descripcion: 'Horas Extras Exentas (Art. 82 LIG)',        columna: 'ADICIONALES', categoria: 'Hs extras exentas', tipo: 'NO_REM',       calculo: 'novedad',  formula: 'monto manual', baseLegal: 'Art. 82 Ley Impuesto a las Ganancias' },
  { codigo: 58200, descripcion: 'Bono Productividad Exento',                 columna: 'ADICIONALES', categoria: 'Bonos exentos',     tipo: 'NO_REM',       calculo: 'novedad',  formula: 'monto manual', baseLegal: 'Ley 27.743 — Reforma Tributaria' },
  { codigo: 58300, descripcion: 'Indemnización Art. 180 bis LCT',            columna: 'ADICIONALES', categoria: 'Indemnizaciones',   tipo: 'NO_REM',       calculo: 'novedad',  formula: 'monto manual (no afecta jub. ni gan.)', baseLegal: 'Art. 180 bis LCT' },
  { codigo: 58400, descripcion: 'Otros conceptos exentos',                   columna: 'ADICIONALES', categoria: 'No remunerativos',  tipo: 'NO_REM',       calculo: 'novedad',  formula: 'monto manual genérico', baseLegal: 'Art. 103 bis LCT — beneficios sociales' },
  { codigo: 58500, descripcion: 'Asignación no remunerativa (Acuerdos paritarios)', columna: 'ADICIONALES', categoria: 'No remunerativos', tipo: 'NO_REM', calculo: 'auto', formula: 'paritaria × (diasTrab/habiles) × factorPeriodo (por sindicato)', baseLegal: 'Art. 103 bis LCT — paritarias' },
  { codigo: 58510, descripcion: 'Antigüedad s/ No Remunerativo (SEC)',       columna: 'ADICIONALES', categoria: 'No remunerativos SEC', tipo: 'NO_REM',     calculo: 'auto',     formula: 'mAsigNoRem × pctAntig% (solo SEC)', baseLegal: 'CCT 130/75 SEC — paritarias' },
  { codigo: 58520, descripcion: 'Presentismo s/ No Remunerativo (SEC)',      columna: 'ADICIONALES', categoria: 'No remunerativos SEC', tipo: 'NO_REM',     calculo: 'auto',     formula: '(mAsigNoRem + mAntigSobreNoRem) × pctPres% (solo SEC, si tiene pres.)', baseLegal: 'CCT 130/75 SEC — paritarias' },

  // ═════════════════════ APORTES DEL EMPLEADO (RETENCIONES) ═══════════
  { codigo: 20000, descripcion: 'Jubilación',                                columna: 'RETENCIONES', categoria: 'Aportes seg. social', tipo: 'APORTE',    calculo: 'auto',     formula: 'baseAportes × 11% (con tope Art. 9 Ley 24241)', baseLegal: 'Ley 24.241 — SIPA' },
  { codigo: 20100, descripcion: 'Ley 19032 (PAMI)',                          columna: 'RETENCIONES', categoria: 'Aportes seg. social', tipo: 'APORTE',    calculo: 'auto',     formula: 'baseAportes × 3% (con tope)', baseLegal: 'Ley 19.032 — INSSJyP' },
  { codigo: 20200, descripcion: 'Obra Social',                               columna: 'RETENCIONES', categoria: 'Aportes seg. social', tipo: 'APORTE',    calculo: 'auto',     formula: 'baseAportes × 3% (+ 3% sobre No Rem si SEC)', baseLegal: 'Ley 23.660 — Obras Sociales' },
  { codigo: 20400, descripcion: 'ANSSAL',                                    columna: 'RETENCIONES', categoria: 'Aportes seg. social', tipo: 'APORTE',    calculo: 'auto',     formula: 'baseAportes × 0,5% (+ 0,5% sobre No Rem si SEC)', baseLegal: 'Ley 23.661 — ANSSAL' },
  { codigo: 20900, descripcion: 'Sindicato (cuota gremial)',                 columna: 'RETENCIONES', categoria: 'Cuota sindical',      tipo: 'APORTE',    calculo: 'auto',     formula: 'totalHaberesRem × pctSindicato% (según código del empleado)', baseLegal: 'CCT — cuota sindical obligatoria' },

  // ═════════════════════ DESCUENTOS ═══════════════════════════════════
  { codigo: 90000, descripcion: 'Retención Imp. Ganancias',                  columna: 'RETENCIONES', categoria: 'Impuestos',           tipo: 'DESCUENTO', calculo: 'novedad',  formula: 'monto manual calculado en F.572 web', baseLegal: 'Ley 27.617 — Ganancias 4ª Categoría' },
  { codigo: 10500, descripcion: 'Descuento anticipo haberes',                columna: 'RETENCIONES', categoria: 'Anticipos',           tipo: 'DESCUENTO', calculo: 'auto',     formula: 'cuota mensual de anticipo aprobado', baseLegal: 'Art. 130 LCT — adelantos de haberes' },
  { codigo: 10600, descripcion: 'Embargo judicial',                          columna: 'RETENCIONES', categoria: 'Embargos',            tipo: 'DESCUENTO', calculo: 'auto',     formula: 'según oficio judicial — array embargos[] (alimentos sin tope + comunes 20%)', baseLegal: 'Art. 147 LCT — Art. 132 bis LCT' },
  { codigo: 9901,  descripcion: 'Otros descuentos',                          columna: 'RETENCIONES', categoria: 'Otros',               tipo: 'DESCUENTO', calculo: 'novedad',  formula: 'monto manual genérico (préstamos, mutual, etc.)', baseLegal: 'Art. 132 LCT — descuentos autorizados' },

  // ═════════════════════ CONTRIBUCIONES PATRONALES ════════════════════
  { codigo: 80000, descripcion: 'Aportes patronales SIPA (Ley 24.241)',      columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 10,17%', baseLegal: 'Ley 24.241 - Dec. 814/01' },
  { codigo: 80200, descripcion: 'Contribución Obra Social patronal',         columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 6% (+ 6% sobre No Rem si SEC)', baseLegal: 'Ley 23.660' },
  { codigo: 80100, descripcion: 'Contribución Ley 19.032 (PAMI)',            columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 1,5%', baseLegal: 'Ley 19.032' },
  { codigo: 80300, descripcion: 'Fondo Nacional de Empleo (Ley 24.013)',     columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 0,89%', baseLegal: 'Ley 24.013' },
  { codigo: 80400, descripcion: 'ART (Ley 24.557)',                          columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 1,5% (alícuota por ART contratada)', baseLegal: 'Ley 24.557 — Riesgos del Trabajo' },
  { codigo: 80900, descripcion: 'Contribución Sindical Patronal',            columna: 'PATRONAL', categoria: 'Contrib. patronal',      tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × pctSindicatoPatronal% (CCT)', baseLegal: 'CCT — contribución solidaria' },

  // ═════════════════════ RÉGIMEN UOCRA (Ley 22.250) ═══════════════════
  { codigo: 80950, descripcion: 'FCL (Fondo Cese Laboral) - UOCRA',          columna: 'PATRONAL', categoria: 'UOCRA Ley 22.250',       tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 12% (primer año) o 8% (después)', baseLegal: 'Art. 15 Ley 22.250' },
  { codigo: 80960, descripcion: 'IERIC',                                     columna: 'PATRONAL', categoria: 'UOCRA Ley 22.250',       tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 1%', baseLegal: 'Decreto 1342/03 — IERIC' },
  { codigo: 80970, descripcion: 'Fondo Sanidad - UOCRA',                     columna: 'PATRONAL', categoria: 'UOCRA Ley 22.250',       tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 1,5%', baseLegal: 'Acuerdo paritario UOCRA' },
  { codigo: 80980, descripcion: 'CAR (Cuota Adicional UOCRA)',               columna: 'PATRONAL', categoria: 'UOCRA Ley 22.250',       tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 0,5%', baseLegal: 'Convenio colectivo UOCRA' },
  { codigo: 80990, descripcion: 'CESLU',                                     columna: 'PATRONAL', categoria: 'UOCRA Ley 22.250',       tipo: 'CONTRIBUCION_PATRONAL', calculo: 'auto', formula: 'totalHaberesRem × 0,4%', baseLegal: 'Convenio colectivo UOCRA' }
];

// ═══════════════════════════════════════════════════════════════════════════
// VISTA: Render principal del catálogo unificado
// ═══════════════════════════════════════════════════════════════════════════
async function renderReporteConceptos(){
  const cont = document.getElementById('panel-reporte-conceptos');
  if(!cont) return;

  // Mostrar loader mientras se cargan los custom
  cont.innerHTML = `<div style="text-align:center;padding:40px;color:var(--t3)">
    <div style="font-size:24px;margin-bottom:10px">⏳</div>
    <div>Cargando catálogo de conceptos...</div>
  </div>`;

  // Cargar custom
  let conceptosCustom = [];
  try {
    if(typeof getConceptosCustom === 'function'){
      conceptosCustom = await getConceptosCustom() || [];
    }
  } catch(e){
    console.warn('No se pudieron cargar conceptos custom:', e);
  }

  // Mapear custom al formato unificado del catálogo
  const customNormalizados = conceptosCustom.map(c => ({
    codigo: c.codigo || c.cod || '—',
    descripcion: c.descripcion || c.label || '(sin descripción)',
    columna: _columnaPorTipoCustom(c.tipo),
    categoria: c.categoria || _categoriaPorTipoCustom(c.tipo),
    tipo: c.tipo || '—',
    calculo: _calculoCustom(c),
    formula: c.formula || (_ccEsTipoManual && _ccEsTipoManual(c.tipo) ? 'Carga manual por empleado' : '—'),
    baseLegal: c.baseLegal || c.observacionesLegales || c.notasLegales || '—',
    // Campos extra solo de custom
    _esCustom: true,
    _estado: c.estado || 'activo',
    _vigenciaDesde: c.vigenciaDesde,
    _vigenciaHasta: c.vigenciaHasta,
    _sindicato: c.sindicato || c.cod_sindicato || 'Todos',
    _empresa: c.empresa || 'Todas',
    _creadoPor: c.creadoPor,
    _aprobadoPor: c.aprobadoPor
  }));

  // Unificar: hardcoded primero (marcados con _sistema), custom al final
  const todos = [
    ...CATALOGO_CONCEPTOS_HARDCODED.map(c => ({ ...c, _esCustom: false, _esSistema: true })),
    ...customNormalizados
  ];

  // Estado del filtro (se recarga al cambiarse)
  if(typeof window._reporteConceptosFiltro === 'undefined'){
    window._reporteConceptosFiltro = { texto:'', tipo:'', columna:'', origen:'' };
  }
  window._reporteConceptosDatos = todos; // para exportar después

  cont.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">

      <!-- BARRA SUPERIOR: filtros + exportar -->
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;flex-wrap:wrap;gap:12px;align-items:center">
        <div style="flex:1;min-width:220px">
          <input type="text" id="rc-busqueda" placeholder="🔍 Buscar por código, descripción o categoría..." oninput="_filtrarReporteConceptos()"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <select id="rc-filtro-origen" onchange="_filtrarReporteConceptos()"
          style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
          <option value="">Todos los orígenes</option>
          <option value="sistema">🔒 Sistema (hardcoded)</option>
          <option value="custom">✎ Custom (RR.HH.)</option>
        </select>
        <select id="rc-filtro-tipo" onchange="_filtrarReporteConceptos()"
          style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
          <option value="">Todos los tipos</option>
          <option value="REM">REM — Remunerativo</option>
          <option value="NO_REM">NO_REM — No Remunerativo</option>
          <option value="APORTE">APORTE — Aporte empleado</option>
          <option value="DESCUENTO">DESCUENTO — Descuento</option>
          <option value="CONTRIBUCION_PATRONAL">CONTRIB — Contrib. patronal</option>
        </select>
        <select id="rc-filtro-calculo" onchange="_filtrarReporteConceptos()"
          style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
          <option value="">Todos los cálculos</option>
          <option value="auto">⚙ Automático</option>
          <option value="novedad">📝 Novedad / manual</option>
        </select>
        <button onclick="_exportarReporteConceptosExcel()" class="btn btn-primary"
          style="font-size:12px;padding:7px 14px;background:rgb(20,184,128);border-color:rgb(20,184,128)" title="Descargar el catálogo completo en Excel">
          📥 Exportar a Excel
        </button>
        <button onclick="_imprimirReporteConceptos()" class="btn btn-ghost"
          style="font-size:12px;padding:7px 14px" title="Versión imprimible">
          🖨 Imprimir
        </button>
      </div>

      <!-- ESTADÍSTICAS -->
      <div id="rc-stats" style="padding:10px 18px;border-bottom:1px solid var(--border);background:var(--bg);font-size:11px;color:var(--t3);display:flex;gap:18px;flex-wrap:wrap"></div>

      <!-- TABLA -->
      <div style="overflow-x:auto;max-height:calc(100vh - 320px);overflow-y:auto">
        <table id="rc-tabla" style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;background:var(--bg2);z-index:5">
            <tr>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Origen</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Código</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Descripción</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Columna recibo</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Categoría</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Tipo</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Cálculo</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Fórmula</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Base legal</th>
            </tr>
          </thead>
          <tbody id="rc-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  _filtrarReporteConceptos();
}

// Filtrado en cliente — re-render del tbody según los filtros activos
function _filtrarReporteConceptos(){
  const tbody = document.getElementById('rc-tbody');
  const datos = window._reporteConceptosDatos || [];
  if(!tbody) return;

  const txt = (document.getElementById('rc-busqueda')?.value || '').toLowerCase().trim();
  const origen = document.getElementById('rc-filtro-origen')?.value || '';
  const tipo = document.getElementById('rc-filtro-tipo')?.value || '';
  const calculo = document.getElementById('rc-filtro-calculo')?.value || '';

  const filtrados = datos.filter(c => {
    if(origen === 'sistema' && c._esCustom) return false;
    if(origen === 'custom' && !c._esCustom) return false;
    if(tipo && c.tipo !== tipo) return false;
    if(calculo && c.calculo !== calculo) return false;
    if(txt){
      const hay = `${c.codigo} ${c.descripcion} ${c.categoria} ${c.tipo} ${c.baseLegal}`.toLowerCase();
      if(!hay.includes(txt)) return false;
    }
    return true;
  });

  // Estadísticas
  const stats = document.getElementById('rc-stats');
  if(stats){
    const _hd = filtrados.filter(x => !x._esCustom).length;
    const _cu = filtrados.filter(x => x._esCustom).length;
    const _rem = filtrados.filter(x => x.tipo === 'REM').length;
    const _norem = filtrados.filter(x => x.tipo === 'NO_REM').length;
    const _aporte = filtrados.filter(x => x.tipo === 'APORTE').length;
    const _desc = filtrados.filter(x => x.tipo === 'DESCUENTO' || x.tipo === 'DESCUENTO_MANUAL').length;
    const _patr = filtrados.filter(x => x.tipo === 'CONTRIBUCION_PATRONAL').length;
    stats.innerHTML = `
      <span><b style="color:var(--t1)">${filtrados.length}</b> conceptos</span>
      <span>🔒 Sistema: <b style="color:var(--t2)">${_hd}</b></span>
      <span>✎ Custom: <b style="color:var(--t2)">${_cu}</b></span>
      <span style="color:var(--green)">💵 REM: ${_rem}</span>
      <span style="color:rgb(94,194,255)">🧾 NO_REM: ${_norem}</span>
      <span style="color:rgb(234,179,8)">📋 Aportes: ${_aporte}</span>
      <span style="color:var(--red)">➖ Desc: ${_desc}</span>
      <span style="color:rgb(168,85,247)">🏢 Patronal: ${_patr}</span>
    `;
  }

  // Render
  if(!filtrados.length){
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--t3);font-size:13px">Sin resultados — ajustá los filtros</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(c => {
    const tipoColor = _colorTipo(c.tipo);
    const colColor = _colorColumna(c.columna);
    return `
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
        <td style="padding:7px 10px;color:var(--t2)">${c._esCustom ? '✎' : '🔒'}<span style="margin-left:5px;font-size:10px;font-family:var(--font-mono);color:var(--t3)">${c._esCustom ? 'Custom' : 'Sistema'}</span></td>
        <td style="padding:7px 10px;font-family:var(--font-mono);font-weight:600;color:var(--accent2)">${c.codigo}</td>
        <td style="padding:7px 10px;color:var(--t1);font-weight:500">${c.descripcion}</td>
        <td style="padding:7px 10px"><span style="font-size:10px;font-family:var(--font-mono);color:${colColor};border:1px solid ${colColor}33;background:${colColor}11;padding:2px 6px;border-radius:3px">${c.columna || '—'}</span></td>
        <td style="padding:7px 10px;color:var(--t2);font-size:11px">${c.categoria || '—'}</td>
        <td style="padding:7px 10px"><span style="font-size:10px;font-family:var(--font-mono);color:${tipoColor};font-weight:600">${c.tipo}</span></td>
        <td style="padding:7px 10px;color:var(--t2);font-size:11px">${c.calculo === 'auto' ? '⚙ Automático' : c.calculo === 'novedad' ? '📝 Novedad' : c.calculo}</td>
        <td style="padding:7px 10px;color:var(--t3);font-size:10px;font-family:var(--font-mono);max-width:280px;white-space:normal">${c.formula || '—'}</td>
        <td style="padding:7px 10px;color:var(--t3);font-size:10px;max-width:200px;white-space:normal">${c.baseLegal || '—'}</td>
      </tr>
    `;
  }).join('');
}

// Helpers de mapeo y colores

function _columnaPorTipoCustom(tipo){
  switch(tipo){
    case 'REM': case 'REM_MANUAL': return 'HABERES';
    case 'NO_REM': case 'NO_REM_MANUAL': return 'ADICIONALES';
    case 'DESCUENTO': case 'DESCUENTO_MANUAL': case 'APORTE': return 'RETENCIONES';
    case 'CONTRIBUCION_PATRONAL': return 'PATRONAL';
    default: return '—';
  }
}

function _categoriaPorTipoCustom(tipo){
  switch(tipo){
    case 'REM': return 'Haberes (custom)';
    case 'NO_REM': return 'No remunerativos (custom)';
    case 'REM_MANUAL': return 'Carga manual rem.';
    case 'NO_REM_MANUAL': return 'Carga manual no rem.';
    case 'DESCUENTO': return 'Descuentos';
    case 'DESCUENTO_MANUAL': return 'Carga manual desc.';
    case 'APORTE': return 'Aportes';
    case 'CONTRIBUCION_PATRONAL': return 'Contribuciones';
    default: return 'Custom';
  }
}

function _calculoCustom(c){
  if(typeof _ccEsTipoManual === 'function' && _ccEsTipoManual(c.tipo)) return 'novedad';
  return c.formula ? 'auto' : 'novedad';
}

function _colorTipo(t){
  switch(t){
    case 'REM': case 'REM_MANUAL': return 'var(--green)';
    case 'NO_REM': case 'NO_REM_MANUAL': return 'rgb(94,194,255)';
    case 'APORTE': return 'rgb(234,179,8)';
    case 'DESCUENTO': case 'DESCUENTO_MANUAL': return 'var(--red)';
    case 'CONTRIBUCION_PATRONAL': return 'rgb(168,85,247)';
    default: return 'var(--t3)';
  }
}

function _colorColumna(col){
  switch(col){
    case 'HABERES': return 'rgb(34,197,94)';
    case 'ADICIONALES': return 'rgb(94,194,255)';
    case 'RETENCIONES': return 'rgb(239,68,68)';
    case 'PATRONAL': return 'rgb(168,85,247)';
    default: return 'var(--t3)';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN A EXCEL (usa SheetJS / XLSX que ya está disponible)
// ═══════════════════════════════════════════════════════════════════════════
function _exportarReporteConceptosExcel(){
  if(typeof XLSX === 'undefined'){
    toast('⚠ SheetJS no está cargado. No se puede exportar.', 'var(--red)');
    return;
  }
  const datos = window._reporteConceptosDatos || [];
  if(!datos.length){ toast('⚠ Sin datos para exportar', 'var(--yellow)'); return; }

  // Aplicar filtros actuales (igual que la tabla en pantalla)
  const txt = (document.getElementById('rc-busqueda')?.value || '').toLowerCase().trim();
  const origen = document.getElementById('rc-filtro-origen')?.value || '';
  const tipo = document.getElementById('rc-filtro-tipo')?.value || '';
  const calculo = document.getElementById('rc-filtro-calculo')?.value || '';

  const filtrados = datos.filter(c => {
    if(origen === 'sistema' && c._esCustom) return false;
    if(origen === 'custom' && !c._esCustom) return false;
    if(tipo && c.tipo !== tipo) return false;
    if(calculo && c.calculo !== calculo) return false;
    if(txt){
      const hay = `${c.codigo} ${c.descripcion} ${c.categoria} ${c.tipo} ${c.baseLegal}`.toLowerCase();
      if(!hay.includes(txt)) return false;
    }
    return true;
  });

  // Armar el array para SheetJS (incluye campos extra solo si son custom)
  const rows = filtrados.map(c => ({
    'Origen':       c._esCustom ? 'CUSTOM (RR.HH.)' : 'SISTEMA',
    'Código':       c.codigo,
    'Descripción':  c.descripcion,
    'Columna recibo': c.columna,
    'Categoría':    c.categoria,
    'Tipo':         c.tipo,
    'Cálculo':      c.calculo === 'auto' ? 'Automático' : 'Novedad / manual',
    'Fórmula':      c.formula,
    'Base legal':   c.baseLegal,
    'Estado':       c._estado || (c._esSistema ? 'Permanente' : '—'),
    'Sindicato':    c._sindicato || '—',
    'Empresa':      c._empresa || '—',
    'Vigencia desde': c._vigenciaDesde || '—',
    'Vigencia hasta': c._vigenciaHasta || '—',
    'Creado por':   c._creadoPor || '—',
    'Aprobado por': c._aprobadoPor || '—'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Anchos de columna razonables
  ws['!cols'] = [
    { wch:18 },  // Origen
    { wch:10 },  // Código
    { wch:42 },  // Descripción
    { wch:14 },  // Columna recibo
    { wch:22 },  // Categoría
    { wch:22 },  // Tipo
    { wch:18 },  // Cálculo
    { wch:60 },  // Fórmula
    { wch:42 },  // Base legal
    { wch:14 },  // Estado
    { wch:14 },  // Sindicato
    { wch:18 },  // Empresa
    { wch:14 }, { wch:14 },  // Vigencia
    { wch:20 }, { wch:20 }   // Creado/Aprobado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Conceptos');

  // Segunda hoja: leyenda explicativa
  const leyenda = [
    ['CATÁLOGO DE CONCEPTOS DE NÓMINA — LEITEN S.A.'],
    [`Generado el ${new Date().toLocaleString('es-AR')}`],
    [`Total de conceptos: ${filtrados.length}`],
    [],
    ['REFERENCIA DE CAMPOS:'],
    [],
    ['ORIGEN'],
    ['  SISTEMA','Conceptos hardcodeados en la base del sistema. NO se pueden editar.'],
    ['  CUSTOM','Conceptos definidos por RR.HH. en el módulo Conceptos Custom.'],
    [],
    ['COLUMNA RECIBO'],
    ['  HABERES','Aparece en la columna de haberes remunerativos del recibo.'],
    ['  ADICIONALES','Aparece en la columna de adicionales no remunerativos.'],
    ['  RETENCIONES','Aparece en la columna de retenciones (descuentos al empleado).'],
    ['  PATRONAL','Aparece en el bloque de contribuciones patronales (informativo).'],
    [],
    ['TIPO'],
    ['  REM','Remunerativo — suma a base imponible (jub./OS/sind.).'],
    ['  NO_REM','No remunerativo — suma a haberes pero NO a base imponible.'],
    ['  APORTE','Aporte previsional/OS — descuento del empleado.'],
    ['  DESCUENTO','Descuento no previsional (anticipos, embargos, ganancias, etc.).'],
    ['  CONTRIBUCION_PATRONAL','Solo costo empresa — NO afecta al empleado.'],
    [],
    ['CÁLCULO'],
    ['  Automático','El sistema lo calcula con fórmula durante la liquidación.'],
    ['  Novedad / manual','RR.HH. debe cargar el monto mes a mes (vía novedades o importación).']
  ];
  const wsLeyenda = XLSX.utils.aoa_to_sheet(leyenda);
  wsLeyenda['!cols'] = [{ wch:28 }, { wch:80 }];
  XLSX.utils.book_append_sheet(wb, wsLeyenda, 'Leyenda');

  const fecha = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `catalogo_conceptos_nomina_${fecha}.xlsx`);
  toast(`✓ Exportadas ${filtrados.length} filas a Excel`, 'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('reportes', 'exportar_conceptos', { cantidad: filtrados.length, por: currentUser?.emp?.nom });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPRESIÓN HTML (versión imprimible / PDF)
// ═══════════════════════════════════════════════════════════════════════════
function _imprimirReporteConceptos(){
  const datos = window._reporteConceptosDatos || [];
  if(!datos.length){ toast('⚠ Sin datos para imprimir', 'var(--yellow)'); return; }

  // Aplicar filtros actuales
  const txt = (document.getElementById('rc-busqueda')?.value || '').toLowerCase().trim();
  const origen = document.getElementById('rc-filtro-origen')?.value || '';
  const tipo = document.getElementById('rc-filtro-tipo')?.value || '';
  const calculo = document.getElementById('rc-filtro-calculo')?.value || '';
  const filtrados = datos.filter(c => {
    if(origen === 'sistema' && c._esCustom) return false;
    if(origen === 'custom' && !c._esCustom) return false;
    if(tipo && c.tipo !== tipo) return false;
    if(calculo && c.calculo !== calculo) return false;
    if(txt){
      const hay = `${c.codigo} ${c.descripcion} ${c.categoria} ${c.tipo} ${c.baseLegal}`.toLowerCase();
      if(!hay.includes(txt)) return false;
    }
    return true;
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Catálogo de Conceptos de Nómina</title>
    <style>
      @page { size:A3 landscape; margin:12mm }
      body { font-family:Arial,sans-serif; color:#000; background:white; padding:20px; margin:0; font-size:11px }
      h1 { font-size:18px; margin:0 0 6px }
      .meta { font-size:11px; color:#555; margin-bottom:18px }
      table { width:100%; border-collapse:collapse }
      th, td { border:1px solid #999; padding:5px 7px; text-align:left; vertical-align:top }
      th { background:#e5e7eb; font-weight:600; font-size:10px; text-transform:uppercase }
      tr:nth-child(even) { background:#f9fafb }
      .no-print { margin-bottom:20px }
      .no-print button { padding:8px 18px; background:#1E6B3A; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:600 }
      @media print { .no-print { display:none } body { padding:0 } }
    </style></head><body>
    <div class="no-print"><button onclick="window.print()">🖨 Imprimir / Guardar PDF</button></div>
    <h1>Catálogo de Conceptos de Nómina</h1>
    <div class="meta">LEITEN S.A. — Generado el ${new Date().toLocaleString('es-AR')} — ${filtrados.length} conceptos${txt||origen||tipo||calculo ? ' (filtrados)' : ''}</div>
    <table>
      <thead><tr>
        <th>Origen</th><th>Código</th><th>Descripción</th><th>Columna</th>
        <th>Categoría</th><th>Tipo</th><th>Cálculo</th><th>Fórmula</th><th>Base legal</th>
      </tr></thead>
      <tbody>
        ${filtrados.map(c => `<tr>
          <td>${c._esCustom ? 'CUSTOM' : 'SISTEMA'}</td>
          <td style="font-family:Courier New,monospace;font-weight:600">${c.codigo}</td>
          <td>${c.descripcion}</td>
          <td>${c.columna || '—'}</td>
          <td>${c.categoria || '—'}</td>
          <td style="font-family:Courier New,monospace">${c.tipo}</td>
          <td>${c.calculo === 'auto' ? 'Automático' : 'Novedad'}</td>
          <td style="font-family:Courier New,monospace;font-size:10px">${(c.formula||'').replace(/</g,'&lt;')}</td>
          <td style="font-size:10px">${c.baseLegal || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`;

  const w = window.open('', '_blank');
  if(!w){ toast('⚠ Popup bloqueado por el navegador', 'var(--red)'); return; }
  w.document.write(html); w.document.close();
}
