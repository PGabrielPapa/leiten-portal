// ═══════════════════════════════════════════════════════════════════════════
// F.931 / SICOSS — DDJJ Mensual de Aportes y Contribuciones
// ───────────────────────────────────────────────────────────────────────────
// El F.931 es la declaración jurada que LEITEN debe presentar mensualmente
// ante AFIP por cada CUIL en relación de dependencia. Lo que se sube es un
// archivo de texto posicional con el formato del aplicativo SICOSS, pero
// también se acepta como interfase para sistemas externos.
//
// Este módulo genera:
//   1. Cálculo formal por empleado con bases imponibles AFIP (R1-R9)
//   2. Excel resumen para revisión manual antes de presentar
//   3. TXT formato SICOSS posicional (importable a la herramienta Online)
//
// REFERENCIAS:
//   • RG (AFIP) 3834/2016 — formato del archivo SICOSS
//   • Tabla de códigos: https://www.afip.gob.ar/genericos/guiavirtual/
//   • Manual SICOSS Versión 43+
//
// LIMITACIONES de esta implementación:
//   • No genera todos los códigos de novedad (solo los más comunes)
//   • La situación de revista se asume "1-Activo" salvo bajas en período
//   • La modalidad de contratación se asume "8-Tiempo indeterminado"
//   • La condición se asume "1-Servicios"
//   • La actividad se toma de un mapeo simple por empresa
//   • RR.HH. debe revisar el resumen y ajustar manualmente casos especiales
// ═══════════════════════════════════════════════════════════════════════════

// ─── Códigos AFIP (subconjunto usado) ──────────────────────────────────
const F931_CODIGOS = {
  // Situación de revista (Art. F.931)
  situacion: {
    activo:        '1',  // Activo (relación normal)
    licencia_mat:  '5',  // Licencia maternidad
    excedencia:    '6',  // Excedencia
    licencia_enf:  '11', // Licencia por enfermedad
    suspendido:    '13', // Suspendido sin goce
    baja:          '12', // Baja en el período
  },
  // Condición laboral
  condicion: {
    servicios_comunes:  '1',  // Servicios comunes
    servicios_diferenciados: '2', // Servicios diferenciados
    insalubre_completo: '3',  // Insalubre — jornada completa
  },
  // Modalidad de contratación
  modalidad: {
    tiempo_indeterminado: '8',
    plazo_fijo:           '1',
    eventual:             '4',
    aprendizaje:          '5',
    pasantia:             '6',
    medio_tiempo:         '17',
  },
  // Tipo de actividad — depende del CCT/empresa
  actividad: {
    comercio:     '101',  // SEC
    metalurgico:  '102',  // UOM
    construccion: '103',  // UOCRA — régimen Ley 22.250
    sanidad:      '104',
    administrativo:'108',
  }
};

// Mapeo simple de cod_sindicato a código de actividad AFIP
function _f931ActividadPorSindicato(codSindicato){
  const c = String(codSindicato||'').trim().toUpperCase();
  if(c === 'UOCRA' || c === 'CONSTRUCCION') return F931_CODIGOS.actividad.construccion;
  if(c === 'UOM' || c === 'ASIMRA')         return F931_CODIGOS.actividad.metalurgico;
  if(c === 'SEC' || c === 'COMERCIO')       return F931_CODIGOS.actividad.comercio;
  // Default: empleado de comercio
  return F931_CODIGOS.actividad.comercio;
}

// Detectar situación de revista de un item de liquidación
function _f931SituacionItem(item){
  // Baja en el período tiene precedencia
  if(item.liqFinalDatos?.motivoBaja) return F931_CODIGOS.situacion.baja;
  if(item._bajaEnPeriodo)            return F931_CODIGOS.situacion.baja;
  // Si hay días por suspensión de sanción
  if($m(item.diasSuspension) > 0)    return F931_CODIGOS.situacion.suspendido;
  // Si hay licencia por enfermedad significativa
  const licsAplic = item.licenciasAplicadas || [];
  const tieneLicEnferm = licsAplic.some(l => /enfermedad|salud|medica/i.test(l.motivo||l.tipo||''));
  if(tieneLicEnferm) return F931_CODIGOS.situacion.licencia_enf;
  // Por defecto: activo
  return F931_CODIGOS.situacion.activo;
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE BASES IMPONIBLES AFIP
// ───────────────────────────────────────────────────────────────────────────
// El F.931 declara hasta 9 remuneraciones por empleado (R1 a R9), cada una
// con una semántica distinta:
//   R1 — Total bruto remunerativo (suma de todo lo rem. del período)
//   R2 — Base imponible 1 (jubilación SIPA)
//   R3 — Base imponible 2 (INSSJP/PAMI Ley 19.032)
//   R4 — Base imponible 3 (obra social)
//   R5 — Base imponible 4 (régimen diferencial — actividades insalubres)
//   R6 — No remunerativo
//   R7 — Bono productivo / horas extras / SAC adicional sin tope
//   R8 — Maternidad (cuando aplica)
//   R9 — Adicional ART (igual a R1 + algunas adicionales)
// Topes: R2 y R4 tienen tope superior (publicado mensual por AFIP).
// El SAC se declara en R1+R2 pero con desdoblamiento (medio aguinaldo y
// medio aguinaldo bis).
// ═══════════════════════════════════════════════════════════════════════════

function _f931Bases(item, params){
  // Total remunerativo del período (incluye el SAC si lo hubiera)
  let R1 = $m(item.totalHaberesRem);
  let R6 = $m(item.totalExentos);
  let R7 = $m(item.mHsExtrasExentas) + $m(item.mBonoExento);
  let R8 = 0;

  // Re-mapeo de conceptos custom a casilleros AFIP específicos.
  // Por defecto: REM va a R1, NO_REM va a R6. Si el concepto define
  // f931Casillero distinto, se sustrae del default y se suma al casillero
  // específico (ej: una hora extra exenta nueva → se quita de R6 y va a R7).
  (item.conceptosCustom || []).forEach(cc => {
    const cas = cc.concepto?.f931Casillero;
    if(!cas) return;
    if(cc.tipo === 'REM' && cas !== 'R1'){
      R1 -= cc.monto;
      if(cas === 'R6') R6 += cc.monto;
      else if(cas === 'R7') R7 += cc.monto;
      else if(cas === 'R8') R8 += cc.monto;
    } else if(cc.tipo === 'NO_REM' && cas !== 'R6'){
      R6 -= cc.monto;
      if(cas === 'R7') R7 += cc.monto;
      else if(cas === 'R8') R8 += cc.monto;
      else if(cas === 'R1') R1 += cc.monto;
    }
  });

  // Topes AFIP
  const topeJubilacion = $m(params?.f931TopeJub) || 0;
  const topeObraSocial = $m(params?.f931TopeOS)  || 0;

  // Base imponible 1 (jubilación SIPA) con tope
  const R2 = topeJubilacion > 0 ? Math.min(R1, topeJubilacion) : R1;
  // Base imponible 2 (PAMI/INSSJP) — usa el mismo tope que jubilación
  const R3 = topeJubilacion > 0 ? Math.min(R1, topeJubilacion) : R1;
  // Base imponible 3 (obra social) con tope propio
  const R4 = topeObraSocial > 0 ? Math.min(R1, topeObraSocial) : R1;
  // Base imponible 4 (régimen diferencial) — solo aplica si la condición es insalubre
  const R5 = 0;
  // Base ART — total rem. (sin tope)
  const R9 = R1;

  return { R1, R2, R3, R4, R5, R6, R7, R8, R9, topeJubilacion, topeObraSocial };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL DATASET F.931
// ───────────────────────────────────────────────────────────────────────────
// Devuelve la estructura completa del F.931 lista para exportar:
//   {
//     periodo, anio, mes,
//     empleadores: { CUIT_str: { nombre, cuit, items: [...], totales: {...} } },
//     globales: { cuils, totalR1, totalR2, ..., totalAportes, totalContrib }
//   }
// ═══════════════════════════════════════════════════════════════════════════
function buildF931Dataset(liq, params){
  if(!liq?.items?.length) return null;
  const empleadores = {};
  let g_R1 = 0, g_R2 = 0, g_R3 = 0, g_R4 = 0, g_R6 = 0, g_R7 = 0, g_aportes = 0, g_contrib = 0;
  let g_cuils = new Set();

  for(const item of liq.items){
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === item.leg);
    const cuit = (item.cuitEmpresa || _f931CuitEmpresa(item.empresa) || '').trim();
    const empNombre = item.empresa || '';
    if(!empleadores[cuit]) empleadores[cuit] = {
      cuit, nombre: empNombre, items: [],
      totales: { R1:0, R2:0, R3:0, R4:0, R6:0, R7:0, aportes:0, contrib:0, cuils:new Set() }
    };

    const bases = _f931Bases(item, params);
    const aportesTotal = $m(item.jubilacion) + $m(item.obraSocial) + $m(item.anssal) + $m(item.pamiEmp);
    const contribTotal = $m(item.jubPatronal) + $m(item.osPatronal) + $m(item.pamiPatronal) + $m(item.desempleo) + $m(item.art);
    const situacion    = _f931SituacionItem(item);
    const actividad    = _f931ActividadPorSindicato(emp?.cod_sindicato);
    const codCondicion = F931_CODIGOS.condicion.servicios_comunes;
    const codModalidad = F931_CODIGOS.modalidad.tiempo_indeterminado;

    // Días trabajados — tope 30 (formato AFIP)
    const diasTrab = Math.min(30, Math.max(0, $m(item.diasTrab)));
    // Horas trabajadas — heurística: días × 8 (jornada normal). En implementación
    // robusta debería tomarse de la nómina/CCT, pero AFIP solo lo usa para
    // controles cruzados.
    const horasTrab = diasTrab * 8;

    const detEmp = {
      // Identificación
      cuil: item.cuil || '',
      apellidoNombre: (item.nom||'').replace(/[;,]/g,' ').trim(),
      legajo: item.leg,
      empresa: empNombre, cuit,
      // Códigos AFIP
      situacion, actividad, condicion: codCondicion, modalidad: codModalidad,
      // Periodo
      diasTrab, horasTrab,
      // Remuneraciones (R1-R9)
      ...bases,
      // Aportes y contribuciones (informativos en SICOSS — los calcula AFIP)
      jubEmp:    $m(item.jubilacion),
      osEmp:     $m(item.obraSocial),
      pamiEmp:   $m(item.pamiEmp),
      anssal:    $m(item.anssal),
      sindicato: $m(item.sindicato),
      aportesTotal,
      jubPat:    $m(item.jubPatronal),
      osPat:     $m(item.osPatronal),
      pamiPat:   $m(item.pamiPatronal),
      desempleo: $m(item.desempleo),
      art:       $m(item.art),
      contribTotal,
      // Datos del empleado
      obraSocialCodigo: emp?.cod_os || '',
      sindicatoCodigo:  emp?.cod_sindicato || '',
      // Adicionales
      siradigImportado: !!(item.nov?._importadoSiradig)
    };

    empleadores[cuit].items.push(detEmp);
    empleadores[cuit].totales.R1 += bases.R1; empleadores[cuit].totales.R2 += bases.R2;
    empleadores[cuit].totales.R3 += bases.R3; empleadores[cuit].totales.R4 += bases.R4;
    empleadores[cuit].totales.R6 += bases.R6; empleadores[cuit].totales.R7 += bases.R7;
    empleadores[cuit].totales.aportes += aportesTotal;
    empleadores[cuit].totales.contrib += contribTotal;
    empleadores[cuit].totales.cuils.add(item.cuil);
    g_R1 += bases.R1; g_R2 += bases.R2; g_R3 += bases.R3; g_R4 += bases.R4;
    g_R6 += bases.R6; g_R7 += bases.R7;
    g_aportes += aportesTotal; g_contrib += contribTotal;
    g_cuils.add(item.cuil);
  }

  return {
    periodo: liq.periodo, anio: liq.anio, mes: liq.mes,
    empleadores,
    globales: {
      cuilsCount: g_cuils.size,
      totalR1: g_R1, totalR2: g_R2, totalR3: g_R3, totalR4: g_R4,
      totalR6: g_R6, totalR7: g_R7,
      totalAportes: g_aportes, totalContrib: g_contrib,
      totalGeneral: g_aportes + g_contrib
    }
  };
}

// CUIT por empresa — toma de ABM si está cargado, sino devuelve vacío
function _f931CuitEmpresa(nombreEmpresa){
  if(typeof getEmpresaByNom === 'function'){
    const e = getEmpresaByNom(nombreEmpresa);
    return (e?.cuit || '').replace(/[^\d]/g,'');
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIONES AFIP previas a la exportación
// ═══════════════════════════════════════════════════════════════════════════
function validarF931Dataset(ds){
  const errores = [], warnings = [];
  if(!ds) return { errores:['Dataset vacío'], warnings:[] };

  Object.values(ds.empleadores).forEach(e => {
    if(!e.cuit || e.cuit.length !== 11){
      errores.push(`${e.nombre}: CUIT faltante o inválido (debe ser 11 dígitos sin guiones)`);
    }
    e.items.forEach(d => {
      const cuilLimpio = String(d.cuil||'').replace(/[^\d]/g,'');
      if(cuilLimpio.length !== 11){
        errores.push(`${d.legajo} ${d.apellidoNombre}: CUIL faltante o inválido`);
      }
      if(!d.obraSocialCodigo){
        warnings.push(`${d.legajo} ${d.apellidoNombre}: sin código de obra social`);
      }
      if(d.diasTrab === 0 && d.situacion === F931_CODIGOS.situacion.activo){
        warnings.push(`${d.legajo} ${d.apellidoNombre}: 0 días trabajados con situación 'Activo'`);
      }
      if(d.R1 < 0){
        errores.push(`${d.legajo} ${d.apellidoNombre}: remuneración negativa`);
      }
      // Sanity check: si hay tope y R1 es muy alto, asegurar que R2 está topado
      if(d.topeJubilacion > 0 && d.R1 > d.topeJubilacion && d.R2 !== d.topeJubilacion){
        warnings.push(`${d.legajo} ${d.apellidoNombre}: R2 (jub) debería estar topado en $${d.topeJubilacion.toLocaleString('es-AR')}`);
      }
    });
  });

  return { errores, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL — resumen para revisión manual antes de presentar
// ═══════════════════════════════════════════════════════════════════════════
async function exportarF931Excel(liq, params){
  if(typeof XLSX === 'undefined'){
    toast('⚠ SheetJS no disponible','var(--red)'); return;
  }
  const ds = buildF931Dataset(liq, params);
  if(!ds){ toast('⚠ Liquidación sin items para F.931','var(--yellow)'); return; }

  const wb = XLSX.utils.book_new();

  // ── Hoja "Resumen" ──
  const resumenRows = [
    ['F.931 — RESUMEN GENERAL'],
    [],
    ['Período', ds.periodo],
    ['CUILs declarados', ds.globales.cuilsCount],
    [],
    ['Total Remunerativo (R1)', ds.globales.totalR1],
    ['Total Base Jubilación (R2)', ds.globales.totalR2],
    ['Total Base PAMI (R3)', ds.globales.totalR3],
    ['Total Base OS (R4)', ds.globales.totalR4],
    ['Total No Remunerativo (R6)', ds.globales.totalR6],
    ['Total Adicionales (R7)', ds.globales.totalR7],
    [],
    ['Total Aportes Empleado', ds.globales.totalAportes],
    ['Total Contribuciones Patronales', ds.globales.totalContrib],
    ['TOTAL A INGRESAR (DDJJ)', ds.globales.totalGeneral],
    [],
    ['DESGLOSE POR EMPLEADOR'],
    ['CUIT', 'Empresa', 'CUILs', 'R1 Total', 'R2 (Jub.)', 'Aportes', 'Contribs.', 'Total']
  ];
  Object.values(ds.empleadores).forEach(e => {
    resumenRows.push([
      e.cuit || '(falta)', e.nombre, e.totales.cuils.size,
      e.totales.R1, e.totales.R2, e.totales.aportes, e.totales.contrib,
      e.totales.aportes + e.totales.contrib
    ]);
  });
  const wsR = XLSX.utils.aoa_to_sheet(resumenRows);
  wsR['!cols'] = [{wch:30},{wch:30},{wch:10},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  // ── Hoja "Detalle" ──
  const detalleHeader = [
    'CUIT empleador','CUIL','Legajo','Apellido y Nombre','Empresa',
    'Sit. Revista','Cód. Actividad','Cód. Condición','Cód. Modalidad',
    'Cód. Obra Social','Cód. Sindicato',
    'Días Trab.','Horas Trab.',
    'R1 Bruto Rem.','R2 Base Jub.','R3 Base PAMI','R4 Base OS',
    'R5 Reg. Dif.','R6 No Rem.','R7 Adic.','R9 ART',
    'Jub. Emp.','OS Emp.','PAMI Emp.','ANSSAL','Sindicato','Tot. Aportes',
    'Jub. Pat.','OS Pat.','PAMI Pat.','Desempleo','ART','Tot. Contrib.',
    'SIRADIG'
  ];
  const detalleRows = [detalleHeader];
  Object.values(ds.empleadores).forEach(e => {
    e.items.forEach(d => {
      detalleRows.push([
        d.cuit, d.cuil, d.legajo, d.apellidoNombre, d.empresa,
        d.situacion, d.actividad, d.condicion, d.modalidad,
        d.obraSocialCodigo, d.sindicatoCodigo,
        d.diasTrab, d.horasTrab,
        +d.R1.toFixed(2), +d.R2.toFixed(2), +d.R3.toFixed(2), +d.R4.toFixed(2),
        +d.R5.toFixed(2), +d.R6.toFixed(2), +d.R7.toFixed(2), +d.R9.toFixed(2),
        +d.jubEmp.toFixed(2), +d.osEmp.toFixed(2), +d.pamiEmp.toFixed(2),
        +d.anssal.toFixed(2), +d.sindicato.toFixed(2), +d.aportesTotal.toFixed(2),
        +d.jubPat.toFixed(2), +d.osPat.toFixed(2), +d.pamiPat.toFixed(2),
        +d.desempleo.toFixed(2), +d.art.toFixed(2), +d.contribTotal.toFixed(2),
        d.siradigImportado ? 'Sí' : 'No'
      ]);
    });
  });
  const wsD = XLSX.utils.aoa_to_sheet(detalleRows);
  // Anchos sugeridos
  wsD['!cols'] = [
    {wch:13},{wch:13},{wch:9},{wch:32},{wch:18},  // ident
    {wch:6},{wch:7},{wch:7},{wch:7},               // cods AFIP
    {wch:14},{wch:10},{wch:6},{wch:7},             // os, sind, dias, horas
    ...Array(8).fill({wch:13}),                    // R1-R9
    ...Array(6).fill({wch:11}),                    // aportes
    ...Array(6).fill({wch:11}),                    // contrib
    {wch:7}                                         // siradig
  ];
  XLSX.utils.book_append_sheet(wb, wsD, 'Detalle por CUIL');

  // ── Hoja "Validaciones" ──
  const v = validarF931Dataset(ds);
  const valRows = [
    ['VALIDACIONES F.931'],
    [],
    [`${v.errores.length} error${v.errores.length!==1?'es':''}`, `${v.warnings.length} advertencia${v.warnings.length!==1?'s':''}`],
    [],
    ['Errores (impiden presentar):'],
    ...(v.errores.length ? v.errores.map(e => ['  ✕ ' + e]) : [['  (sin errores)']]),
    [],
    ['Advertencias (revisar):'],
    ...(v.warnings.length ? v.warnings.map(w => ['  ⚠ ' + w]) : [['  (sin advertencias)']])
  ];
  const wsV = XLSX.utils.aoa_to_sheet(valRows);
  wsV['!cols'] = [{wch:90}];
  XLSX.utils.book_append_sheet(wb, wsV, 'Validaciones');

  const fname = `F931_${ds.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ F.931 Excel descargado (${ds.globales.cuilsCount} CUILs)`, 'var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT TXT SICOSS posicional
// ───────────────────────────────────────────────────────────────────────────
// Formato simplificado compatible con SICOSS Online / Mi Simplificación.
// Estructura: una línea por CUIL con campos alineados a posiciones fijas.
// AFIP especifica ~280 columnas; acá emitimos las críticas y dejamos en
// blanco/cero las que no aplican. RR.HH. valida con su contador.
// ═══════════════════════════════════════════════════════════════════════════
function _f931Pad(val, len, alignRight){
  let s = String(val ?? '');
  if(s.length > len) s = s.slice(0, len);
  if(alignRight) return s.padStart(len, ' ');
  return s.padEnd(len, ' ');
}
function _f931PadNum(val, intLen, decLen){
  // Formato AFIP: número con `decLen` decimales sin punto, alineado a derecha,
  // rellenando con ceros. Ej: 1234.56 con int=8 dec=2 → "00012345600"... pero
  // SICOSS modernos usan punto. Aquí emitimos con punto decimal.
  const n = Number(val) || 0;
  const total = intLen + 1 + decLen;
  return _f931Pad(n.toFixed(decLen), total, true);
}

function exportarF931Txt(liq, params){
  const ds = buildF931Dataset(liq, params);
  if(!ds){ toast('⚠ Liquidación sin items','var(--yellow)'); return; }

  // Formato aproximado SICOSS — cada línea ~390 chars
  const lineas = [];
  Object.values(ds.empleadores).forEach(e => {
    e.items.forEach(d => {
      const cuil = String(d.cuil||'').replace(/[^\d]/g,'').padEnd(11, ' ');
      const apellNom = _f931Pad(d.apellidoNombre, 30, false);
      const cod_situ = _f931Pad(d.situacion, 2, true);
      const cod_cond = _f931Pad(d.condicion, 2, true);
      const cod_act  = _f931Pad(d.actividad, 3, true);
      const cod_modal= _f931Pad(d.modalidad, 3, true);
      const cod_zona = _f931Pad('00', 2, true);   // sin zona desfavorable por defecto
      const dias     = _f931Pad(String(d.diasTrab), 2, true);
      const horas    = _f931Pad(String(d.horasTrab), 3, true);
      const cod_os   = _f931Pad(d.obraSocialCodigo, 6, false);
      const linea =
        cuil +
        apellNom +
        cod_situ + cod_cond + cod_act + cod_modal + cod_zona +
        dias + horas + cod_os +
        _f931PadNum(d.R1,  10, 2) + // bruto rem
        _f931PadNum(d.R2,  10, 2) + // base jub
        _f931PadNum(d.R3,  10, 2) + // base PAMI
        _f931PadNum(d.R4,  10, 2) + // base OS
        _f931PadNum(d.R5,  10, 2) + // base reg. dif
        _f931PadNum(d.R6,  10, 2) + // no rem
        _f931PadNum(d.R7,  10, 2) + // adicional
        _f931PadNum(d.R8,  10, 2) + // maternidad
        _f931PadNum(d.R9,  10, 2) + // ART
        _f931PadNum(d.aportesTotal,  10, 2) +
        _f931PadNum(d.contribTotal, 10, 2);
      lineas.push(linea);
    });
  });

  const txt = lineas.join('\r\n') + '\r\n';
  const blob = new Blob([txt], { type:'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SICOSS_${ds.periodo.replace(/-/g,'')}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`✓ TXT SICOSS descargado (${lineas.length} líneas)`,'var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
// UI: Modal de F.931
// ═══════════════════════════════════════════════════════════════════════════
function abrirModalF931(){
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación calculada','var(--yellow)'); return; }
  if(!liq.items?.length){ toast('⚠ La liquidación no tiene items calculados','var(--yellow)'); return; }
  const params = (typeof getLiqParams === 'function') ? getLiqParams() : {};

  // Asegurar que el cache de empresas ABM esté cargado para resolver CUITs.
  // El cache normalmente se carga en login, pero por las dudas refrescamos
  // antes de generar el dataset (no bloquea la UI; el modal se renderiza igual).
  if(typeof _refreshEmpresasABMCache === 'function'){
    _refreshEmpresasABMCache().then(() => {
      _f931ContinuarApertura(liq, params);
    }).catch(() => _f931ContinuarApertura(liq, params));
  } else {
    _f931ContinuarApertura(liq, params);
  }
}

function _f931ContinuarApertura(liq, params){
  const ds = buildF931Dataset(liq, params);
  const v  = validarF931Dataset(ds);

  const fmtN = n => Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const overlay = document.createElement('div');
  overlay.id = 'modal-f931';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  const empleadoresHtml = Object.values(ds.empleadores).map(e => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px">
      <div style="font-size:12px;font-weight:600;color:var(--t1);margin-bottom:6px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>${e.nombre}</span>
        <span style="font-family:var(--font-mono);color:${e.cuit?'var(--t2)':'var(--red)'};font-size:11px">${e.cuit ? 'CUIT '+e.cuit : '⚠ sin CUIT'}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;font-family:var(--font-mono)">
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">CUILs</div><div style="color:var(--t1)">${e.totales.cuils.size}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">R1 Bruto</div><div style="color:var(--t1)">$ ${fmtN(e.totales.R1)}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Aportes</div><div style="color:var(--red)">$ ${fmtN(e.totales.aportes)}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Contrib.</div><div style="color:rgb(168,85,247)">$ ${fmtN(e.totales.contrib)}</div></div>
      </div>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:820px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📋 F.931 — DDJJ Mensual de Aportes y Contribuciones</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${ds.periodo} · ${ds.globales.cuilsCount} CUILs · ${Object.keys(ds.empleadores).length} empleador${Object.keys(ds.empleadores).length!==1?'es':''}</div>
        </div>
        <button onclick="document.getElementById('modal-f931').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <!-- Totales globales -->
        <div style="background:linear-gradient(135deg,rgba(94,194,255,.05),rgba(168,85,247,.05));border:1px solid rgba(94,194,255,.2);border-radius:var(--r);padding:14px 16px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Resumen Global</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:11px;font-family:var(--font-mono)">
            <div><div style="color:var(--t3);font-size:9px">R1 Bruto Rem.</div><div style="color:var(--t1);font-size:14px;font-weight:600">$ ${fmtN(ds.globales.totalR1)}</div></div>
            <div><div style="color:var(--t3);font-size:9px">R6 No Rem.</div><div style="color:var(--t1);font-size:14px;font-weight:600">$ ${fmtN(ds.globales.totalR6)}</div></div>
            <div><div style="color:var(--t3);font-size:9px">R7 Adicionales</div><div style="color:var(--t1);font-size:14px;font-weight:600">$ ${fmtN(ds.globales.totalR7)}</div></div>
            <div><div style="color:var(--t3);font-size:9px">Aportes Emp.</div><div style="color:var(--red);font-size:14px;font-weight:600">$ ${fmtN(ds.globales.totalAportes)}</div></div>
            <div><div style="color:var(--t3);font-size:9px">Contrib. Pat.</div><div style="color:rgb(168,85,247);font-size:14px;font-weight:600">$ ${fmtN(ds.globales.totalContrib)}</div></div>
            <div style="border-left:1px solid var(--border);padding-left:10px"><div style="color:var(--t3);font-size:9px">TOTAL DDJJ</div><div style="color:var(--green);font-size:16px;font-weight:700">$ ${fmtN(ds.globales.totalGeneral)}</div></div>
          </div>
        </div>

        <!-- Por empleador -->
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Por Empleador (CUIT)</div>
          <div style="display:flex;flex-direction:column;gap:8px">${empleadoresHtml}</div>
        </div>

        <!-- Validaciones -->
        ${(v.errores.length || v.warnings.length) ? `
        <div style="border-radius:var(--r);padding:12px 14px;background:${v.errores.length?'rgba(239,68,68,.05)':'rgba(234,179,8,.05)'};border:1px solid ${v.errores.length?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)'}">
          <div style="font-size:11px;font-weight:600;color:${v.errores.length?'var(--red)':'var(--yellow)'};margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
            ${v.errores.length ? `✕ ${v.errores.length} error${v.errores.length!==1?'es':''}` : ''}
            ${v.errores.length && v.warnings.length ? ' · ' : ''}
            ${v.warnings.length ? `⚠ ${v.warnings.length} advertencia${v.warnings.length!==1?'s':''}` : ''}
          </div>
          <div style="font-size:11px;color:var(--t2);line-height:1.6;max-height:160px;overflow-y:auto;font-family:var(--font-mono)">
            ${v.errores.slice(0,30).map(e => `<div style="color:var(--red);padding:2px 0">✕ ${e}</div>`).join('')}
            ${v.warnings.slice(0,30).map(w => `<div style="color:var(--yellow);padding:2px 0">⚠ ${w}</div>`).join('')}
            ${(v.errores.length>30 || v.warnings.length>30) ? '<div style="color:var(--t3);font-style:italic;padding:4px 0">… más en el Excel</div>' : ''}
          </div>
        </div>` : `
        <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.3);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--green)">
          ✓ Sin errores ni advertencias — listo para presentar
        </div>`}

        <!-- Aclaraciones -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Importante:</strong> RR.HH. debe revisar el archivo antes de subir a SICOSS.
          Los códigos de Modalidad, Condición y Actividad usan defaults razonables —
          modificar manualmente para casos especiales (insalubre, plazo fijo, pasantía, etc.).
          Topes AFIP de jubilación y obra social: configurarlos en <strong>Parámetros</strong> (campos f931TopeJub, f931TopeOS).
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-f931').remove()" style="font-size:13px;padding:8px 14px">Cerrar</button>
        <button class="btn btn-ghost" onclick="exportarF931Txt(_liqActiva,getLiqParams())" style="font-size:13px;padding:8px 16px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📄 TXT SICOSS</button>
        <button class="btn btn-primary" onclick="exportarF931Excel(_liqActiva,getLiqParams())" style="font-size:13px;padding:8px 18px">📊 Descargar Excel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Reemplazo del exportarF931 viejo
async function exportarF931(){
  abrirModalF931();
}
