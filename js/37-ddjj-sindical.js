// ═══════════════════════════════════════════════════════════════════════════
// DDJJ SINDICAL POR CONVENIO
// ───────────────────────────────────────────────────────────────────────────
// Cada sindicato pide mensualmente una declaración con los aportes y
// contribuciones del personal afiliado a su CCT. Esta función agrupa los
// items de la liquidación por código de sindicato y genera UN libro de
// Excel con:
//   - Hoja Resumen: totales por sindicato
//   - Una hoja por sindicato con detalle por empleado
//
// Usa los % vigentes en el catálogo SINDICATOS (js/12). Los aliases del
// catálogo (SEC→COMERCIO, PLASTICO→UOYEP) se respetan.
//
// Empleados sin código de sindicato cargado se agrupan en hoja "SIN SIND.".
//
// Reusa los datos calculados por el motor (item.sindicato, item.sindPatronal,
// item.totalHaberesRem) en lugar de recalcular — así si el operador modificó
// los % para un caso especial, la DDJJ refleja exactamente lo liquidado.
// ═══════════════════════════════════════════════════════════════════════════

function _sindCodigoEfectivo(codSindicato){
  // Aplica los aliases del catálogo (mismo helper que getSindicatoByCodigo).
  const c = String(codSindicato||'').trim().toUpperCase();
  if(!c) return '';
  const ALIAS = { 'SEC':'COMERCIO', 'EMPLEADOS DE COMERCIO':'COMERCIO', 'PLASTICO':'UOYEP' };
  return ALIAS[c] || c;
}

function buildSindDataset(liq){
  if(!liq?.items?.length) return null;
  const grupos = {};   // { codigo: { sindicatoInfo, items[], totales } }

  liq.items.forEach(item => {
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === item.leg);
    const codCRudo = emp?.cod_sindicato || '';
    const cod = _sindCodigoEfectivo(codCRudo);
    const claveGrupo = cod || '__SIN_SINDICATO__';

    if(!grupos[claveGrupo]){
      const sindInfo = (typeof getSindicatoByCodigo === 'function')
        ? getSindicatoByCodigo(cod) : null;
      grupos[claveGrupo] = {
        codigo: cod || '(sin sindicato)',
        codigoOrig: codCRudo || '',
        nombre: sindInfo?.nombre || (cod || 'Sin sindicato cargado'),
        pctEmpleado: sindInfo?.pctEmpleado || 0,
        pctPatronal: sindInfo?.pctPatronal || 0,
        pctAntig:    sindInfo?.pctAntigPorAnio || 0,
        items: [],
        totales: { baseRem:0, cuotaEmp:0, cuotaPat:0, total:0 }
      };
    }

    grupos[claveGrupo].items.push({
      leg:     item.leg,
      cuil:    item.cuil || '',
      nom:     item.nom || '',
      empresa: item.empresa || '',
      baseRem: $m(item.totalHaberesRem),
      cuotaEmp: $m(item.sindicato),
      cuotaPat: $m(item.sindPatronal)
    });
    grupos[claveGrupo].totales.baseRem += $m(item.totalHaberesRem);
    grupos[claveGrupo].totales.cuotaEmp += $m(item.sindicato);
    grupos[claveGrupo].totales.cuotaPat += $m(item.sindPatronal);
    grupos[claveGrupo].totales.total    += $m(item.sindicato) + $m(item.sindPatronal);
  });

  // Globales
  let g_baseRem=0, g_emp=0, g_pat=0, g_cuils=0;
  Object.values(grupos).forEach(g => {
    g_baseRem += g.totales.baseRem;
    g_emp += g.totales.cuotaEmp;
    g_pat += g.totales.cuotaPat;
    g_cuils += g.items.length;
  });

  return {
    periodo: liq.periodo, anio: liq.anio, mes: liq.mes,
    grupos,
    globales: {
      cantSindicatos: Object.keys(grupos).length,
      cantCuils: g_cuils,
      totalBaseRem: g_baseRem,
      totalCuotaEmp: g_emp,
      totalCuotaPat: g_pat,
      total: g_emp + g_pat
    }
  };
}

async function exportarDDJJSindicalExcel(){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación','var(--yellow)'); return; }
  const ds = buildSindDataset(liq);
  if(!ds){ toast('⚠ Sin items en la liquidación','var(--yellow)'); return; }

  const wb = XLSX.utils.book_new();

  // ── Hoja Resumen ──
  const resHeaders = [
    ['DDJJ SINDICAL — RESUMEN'],
    [],
    ['Período', ds.periodo],
    ['CUILs declarados', ds.globales.cantCuils],
    ['Sindicatos involucrados', ds.globales.cantSindicatos],
    [],
    ['Total Base Remunerativa', ds.globales.totalBaseRem],
    ['Total Cuota Empleado', ds.globales.totalCuotaEmp],
    ['Total Cuota Patronal', ds.globales.totalCuotaPat],
    ['TOTAL A INGRESAR', ds.globales.total],
    [],
    ['DESGLOSE POR SINDICATO'],
    ['Código','Nombre','% Emp.','% Pat.','CUILs','Base Rem.','Cuota Emp.','Cuota Pat.','Total']
  ];
  Object.values(ds.grupos).forEach(g => {
    resHeaders.push([
      g.codigo, g.nombre, g.pctEmpleado, g.pctPatronal,
      g.items.length,
      +g.totales.baseRem.toFixed(2),
      +g.totales.cuotaEmp.toFixed(2),
      +g.totales.cuotaPat.toFixed(2),
      +g.totales.total.toFixed(2)
    ]);
  });
  const wsR = XLSX.utils.aoa_to_sheet(resHeaders);
  wsR['!cols'] = [{wch:14},{wch:36},{wch:8},{wch:8},{wch:8},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  // ── Una hoja por sindicato ──
  Object.values(ds.grupos).forEach(g => {
    const sheetName = (g.codigo || 'sin').slice(0, 28).replace(/[\\\/\?\*\[\]]/g,'_'); // Excel sheet name limits
    const headers = [
      [`DDJJ ${g.nombre}`],
      [`Código: ${g.codigo} · Período: ${ds.periodo}`],
      [`% Empleado: ${g.pctEmpleado}% · % Patronal: ${g.pctPatronal}%`],
      [],
      ['Legajo','CUIL','Apellido y Nombre','Empresa','Base Remunerativa','Cuota Empleado','Cuota Patronal','Total']
    ];
    g.items.forEach(it => {
      headers.push([
        it.leg, it.cuil, it.nom, it.empresa,
        +it.baseRem.toFixed(2),
        +it.cuotaEmp.toFixed(2),
        +it.cuotaPat.toFixed(2),
        +(it.cuotaEmp + it.cuotaPat).toFixed(2)
      ]);
    });
    // Totales
    headers.push([]);
    headers.push([
      '', '', '', 'TOTAL',
      +g.totales.baseRem.toFixed(2),
      +g.totales.cuotaEmp.toFixed(2),
      +g.totales.cuotaPat.toFixed(2),
      +g.totales.total.toFixed(2)
    ]);
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [{wch:9},{wch:13},{wch:32},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fname = `DDJJ_Sindical_${ds.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ DDJJ Sindical descargada (${ds.globales.cantSindicatos} sindicatos · ${ds.globales.cantCuils} CUILs)`, 'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'ddjj_sindical_generada', {
      liqId: liq.id, periodo: liq.periodo,
      sindicatos: Object.keys(ds.grupos),
      cuils: ds.globales.cantCuils,
      por: currentUser?.emp?.nom
    });
  }
}

// Reemplazo del exportarSindicatos viejo (CSV plano)
async function exportarSindicatos(){
  await exportarDDJJSindicalExcel();
}
