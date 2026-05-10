// ═══════════════════════════════════════════════════════════════════════════
// REPORTE DE USO DE CONCEPTOS CUSTOM
// ───────────────────────────────────────────────────────────────────────────
// Permite a RR.HH./Admin ver cómo se usaron los conceptos custom en un rango
// de períodos: cantidad de empleados afectados, total liquidado, evolución.
//
// Recorre todas las liquidaciones del período seleccionado (en cualquier
// estado: borrador / aprobada / pagada) y agrega los items[].conceptosCustom.
// ═══════════════════════════════════════════════════════════════════════════

async function abrirReporteUsoConceptos(){
  if(!_ccEsRRHHoAdmin()){ toast('⚠ Sin permiso','var(--red)'); return; }

  // Por defecto el rango cubre los últimos 12 meses
  const hoy = new Date();
  const hastaAnio = hoy.getFullYear();
  const hastaMes = hoy.getMonth() + 1;
  const desdeFecha = new Date(hastaAnio, hastaMes - 13, 1);
  const desdeAnio = desdeFecha.getFullYear();
  const desdeMes = desdeFecha.getMonth() + 1;

  const overlay = document.createElement('div');
  overlay.id = 'modal-cc-reporte';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:920px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📊 Reporte de uso — Conceptos Custom</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Análisis de aplicación por período y por concepto</div>
        </div>
        <button onclick="document.getElementById('modal-cc-reporte').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <!-- Filtros -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Desde (YYYY-MM)</label>
            <input type="text" id="cc-rep-desde" value="${desdeAnio}-${String(desdeMes).padStart(2,'0')}" pattern="[0-9]{4}-[0-9]{2}" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Hasta (YYYY-MM)</label>
            <input type="text" id="cc-rep-hasta" value="${hastaAnio}-${String(hastaMes).padStart(2,'0')}" pattern="[0-9]{4}-[0-9]{2}" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Estado liq.</label>
            <select id="cc-rep-estado" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none">
              <option value="todas">Todas</option>
              <option value="aprobada,pagada" selected>Aprobadas + Pagadas</option>
              <option value="pagada">Solo Pagadas</option>
              <option value="borrador">Solo Borrador</option>
            </select>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn btn-primary" onclick="_ccCalcularReporteUso()" style="font-size:12px;padding:7px 16px;width:100%">▶ Calcular</button>
          </div>
        </div>

        <div id="cc-rep-resultado">
          <div style="padding:30px;text-align:center;color:var(--t3);font-style:italic">Tocá "Calcular" para generar el reporte</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function _ccCalcularReporteUso(){
  const desde  = (document.getElementById('cc-rep-desde')?.value || '').trim();
  const hasta  = (document.getElementById('cc-rep-hasta')?.value || '').trim();
  const estados = (document.getElementById('cc-rep-estado')?.value || 'todas').split(',');

  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(desde) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(hasta)){
    toast('⚠ Fechas inválidas','var(--yellow)');
    return;
  }
  if(desde > hasta){
    toast('⚠ Desde > Hasta','var(--yellow)');
    return;
  }

  const cont = document.getElementById('cc-rep-resultado');
  cont.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">⏳ Procesando liquidaciones...</div>';

  // Obtener todas las liquidaciones
  const liqs = (typeof getLiquidaciones === 'function') ? await getLiquidaciones() : [];
  const filtradas = liqs.filter(l => {
    if(!estados.includes('todas') && !estados.includes(l.estado)) return false;
    const periodoLiq = l.periodo;  // YYYY-MM
    if(periodoLiq < desde || periodoLiq > hasta) return false;
    return l.items?.length > 0;
  });

  // Agregar por concepto custom
  const porConcepto = {};   // codigo → { nombre, tipo, totalMonto, empleados, periodos[] }
  const porPeriodo = {};    // YYYY-MM → { totalRem, totalNoRem, totalDesc, totalAporte, totalContrib }

  filtradas.forEach(liq => {
    const periodo = liq.periodo;
    if(!porPeriodo[periodo]) porPeriodo[periodo] = { totalRem:0, totalNoRem:0, totalDesc:0, totalAporte:0, totalContrib:0, conceptos: new Set() };

    liq.items.forEach(item => {
      (item.conceptosCustom || []).forEach(cc => {
        const cod = cc.codigo;
        if(!porConcepto[cod]){
          porConcepto[cod] = {
            codigo: cod, nombre: cc.nombre, tipo: cc.tipo,
            totalMonto: 0, totalAplicaciones: 0,
            empleados: new Set(), periodos: new Set(),
            porPeriodo: {}, esManual: !!cc.esManual
          };
        }
        const reg = porConcepto[cod];
        reg.totalMonto += $m(cc.monto);
        reg.totalAplicaciones++;
        reg.empleados.add(item.leg);
        reg.periodos.add(periodo);
        if(!reg.porPeriodo[periodo]) reg.porPeriodo[periodo] = 0;
        reg.porPeriodo[periodo] += $m(cc.monto);

        // Acumular en porPeriodo agregado
        const tipoEf = cc.tipo === 'REM_MANUAL' ? 'REM' :
                       cc.tipo === 'NO_REM_MANUAL' ? 'NO_REM' :
                       cc.tipo === 'DESCUENTO_MANUAL' ? 'DESCUENTO' : cc.tipo;
        if(tipoEf === 'REM') porPeriodo[periodo].totalRem += $m(cc.monto);
        else if(tipoEf === 'NO_REM') porPeriodo[periodo].totalNoRem += $m(cc.monto);
        else if(tipoEf === 'DESCUENTO') porPeriodo[periodo].totalDesc += $m(cc.monto);
        else if(tipoEf === 'APORTE') porPeriodo[periodo].totalAporte += $m(cc.monto);
        else if(tipoEf === 'CONTRIBUCION_PATRONAL') porPeriodo[periodo].totalContrib += $m(cc.monto);
        porPeriodo[periodo].conceptos.add(cod);
      });
    });
  });

  const fmt = n => Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2});
  const conceptos = Object.values(porConcepto).sort((a,b)=>b.totalMonto - a.totalMonto);
  const totalGeneral = conceptos.reduce((s,c)=>s+c.totalMonto, 0);

  if(!conceptos.length){
    cont.innerHTML = `
      <div style="padding:30px;text-align:center;color:var(--t3);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r)">
        <div style="font-size:24px;margin-bottom:6px">📭</div>
        <div style="font-size:13px;color:var(--t2)">Sin aplicaciones de conceptos custom en el rango ${desde} → ${hasta}</div>
        <div style="font-size:11px;margin-top:4px">Filtrado: ${estados.join(', ')}</div>
      </div>
    `;
    return;
  }

  // Tabla por concepto
  const filasConceptos = conceptos.map((c,i) => {
    const tInfo = TIPOS_CONCEPTO_CUSTOM.find(t => t.v === c.tipo);
    const pctTotal = totalGeneral > 0 ? (c.totalMonto / totalGeneral * 100).toFixed(1) : 0;
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:10px;color:var(--t3)">${i+1}</td>
        <td style="padding:6px 8px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:14px">${tInfo?.icon || '?'}</span>
            <div>
              <div style="font-size:11px;color:var(--t1);font-weight:500">${(c.nombre||'').replace(/</g,'&lt;')}</div>
              <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono)">${c.codigo}${c.esManual?' · ✍️':''}</div>
            </div>
          </div>
        </td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;color:var(--t2);font-family:var(--font-mono)">${c.empleados.size}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;color:var(--t2);font-family:var(--font-mono)">${c.periodos.size}</td>
        <td style="padding:6px 8px;text-align:center;font-size:11px;color:var(--t2);font-family:var(--font-mono)">${c.totalAplicaciones}</td>
        <td style="padding:6px 8px;text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--t1);font-weight:600">$ ${fmt(c.totalMonto)}</td>
        <td style="padding:6px 8px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono)">${pctTotal}%</td>
      </tr>
    `;
  }).join('');

  // Tabla por período
  const periodosOrden = Object.keys(porPeriodo).sort();
  const filasPeriodos = periodosOrden.map(p => {
    const r = porPeriodo[p];
    const total = r.totalRem + r.totalNoRem + r.totalDesc + r.totalAporte + r.totalContrib;
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:5px 8px;font-family:var(--font-mono);font-size:11px;color:var(--t1)">${p}</td>
        <td style="padding:5px 8px;text-align:center;font-size:10px;color:var(--t3)">${r.conceptos.size}</td>
        <td style="padding:5px 8px;text-align:right;font-family:var(--font-mono);font-size:10px;color:var(--green)">${r.totalRem>0?'$ '+fmt(r.totalRem):'—'}</td>
        <td style="padding:5px 8px;text-align:right;font-family:var(--font-mono);font-size:10px;color:rgb(94,194,255)">${r.totalNoRem>0?'$ '+fmt(r.totalNoRem):'—'}</td>
        <td style="padding:5px 8px;text-align:right;font-family:var(--font-mono);font-size:10px;color:var(--red)">${r.totalDesc>0?'$ '+fmt(r.totalDesc):'—'}</td>
        <td style="padding:5px 8px;text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--t1);font-weight:600">$ ${fmt(total)}</td>
      </tr>
    `;
  }).join('');

  cont.innerHTML = `
    <!-- Resumen -->
    <div style="background:linear-gradient(135deg,rgba(168,85,247,.05),rgba(94,194,255,.03));border:1px solid rgba(168,85,247,.2);border-radius:var(--r);padding:14px 16px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;font-family:var(--font-mono)">
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Conceptos distintos</div><div style="color:var(--t1);font-size:18px;font-weight:700">${conceptos.length}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Empleados afectados</div><div style="color:var(--t1);font-size:18px;font-weight:700">${new Set(conceptos.flatMap(c=>[...c.empleados])).size}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Liquidaciones</div><div style="color:var(--t1);font-size:18px;font-weight:700">${filtradas.length}</div></div>
        <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">Total movido</div><div style="color:rgb(168,85,247);font-size:18px;font-weight:700">$ ${fmt(totalGeneral)}</div></div>
      </div>
    </div>

    <!-- Tabla por concepto -->
    <details open style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:12px">
      <summary style="cursor:pointer;padding:10px 14px;font-size:12px;font-weight:600;color:var(--t1)">📊 Ranking por concepto (${conceptos.length})</summary>
      <div style="max-height:420px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
            <tr>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">#</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Concepto</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em" title="Empleados únicos">Emp.</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em" title="Períodos">Per.</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Aplic.</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">Total</th>
              <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">%</th>
            </tr>
          </thead>
          <tbody>${filasConceptos}</tbody>
        </table>
      </div>
    </details>

    <!-- Tabla por período -->
    <details style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:12px">
      <summary style="cursor:pointer;padding:10px 14px;font-size:12px;font-weight:600;color:var(--t1)">📅 Evolución por período (${periodosOrden.length})</summary>
      <div style="max-height:340px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
            <tr>
              <th style="padding:5px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Período</th>
              <th style="padding:5px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Conc.</th>
              <th style="padding:5px 8px;font-size:10px;color:var(--green);text-align:right;text-transform:uppercase;letter-spacing:.05em">REM</th>
              <th style="padding:5px 8px;font-size:10px;color:rgb(94,194,255);text-align:right;text-transform:uppercase;letter-spacing:.05em">NO REM</th>
              <th style="padding:5px 8px;font-size:10px;color:var(--red);text-align:right;text-transform:uppercase;letter-spacing:.05em">DESC.</th>
              <th style="padding:5px 8px;font-size:10px;color:var(--t1);text-align:right;text-transform:uppercase;letter-spacing:.05em">Total</th>
            </tr>
          </thead>
          <tbody>${filasPeriodos}</tbody>
        </table>
      </div>
    </details>

    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="_ccExportarReporteUso()" style="font-size:12px;padding:7px 14px;color:var(--green);border-color:rgba(34,197,94,.3)">📊 Exportar Excel</button>
    </div>
  `;

  // Guardar en global para export
  _ccReporteData = { conceptos, porPeriodo, totalGeneral, desde, hasta, filtradas: filtradas.length };
}

let _ccReporteData = null;

async function _ccExportarReporteUso(){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  if(!_ccReporteData){ toast('⚠ Calculá primero','var(--yellow)'); return; }
  const { conceptos, porPeriodo, totalGeneral, desde, hasta, filtradas } = _ccReporteData;

  const wb = XLSX.utils.book_new();

  // Hoja Resumen
  const resumen = [
    ['REPORTE DE USO DE CONCEPTOS CUSTOM'],
    [],
    ['Rango', `${desde} → ${hasta}`],
    ['Liquidaciones procesadas', filtradas],
    ['Conceptos distintos aplicados', conceptos.length],
    ['Total movido', totalGeneral],
    [],
    ['RANKING POR CONCEPTO'],
    ['#','Código','Nombre','Tipo','Manual','Empleados','Períodos','Aplicaciones','Total Monto','% del total']
  ];
  conceptos.forEach((c,i) => {
    resumen.push([
      i+1, c.codigo, c.nombre, c.tipo, c.esManual?'sí':'no',
      c.empleados.size, c.periodos.size, c.totalAplicaciones,
      +c.totalMonto.toFixed(2),
      totalGeneral > 0 ? +(c.totalMonto / totalGeneral * 100).toFixed(2) : 0
    ]);
  });
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR['!cols'] = [{wch:5},{wch:22},{wch:32},{wch:22},{wch:8},{wch:11},{wch:9},{wch:11},{wch:14},{wch:9}];
  XLSX.utils.book_append_sheet(wb, wsR, 'Ranking');

  // Hoja por período
  const periodosOrden = Object.keys(porPeriodo).sort();
  const evolucion = [
    ['EVOLUCIÓN POR PERÍODO'],
    [],
    ['Período','Conceptos','Total REM','Total NO REM','Total Descuentos','Total Aportes','Total Contrib. Pat.','TOTAL']
  ];
  periodosOrden.forEach(p => {
    const r = porPeriodo[p];
    const total = r.totalRem + r.totalNoRem + r.totalDesc + r.totalAporte + r.totalContrib;
    evolucion.push([
      p, r.conceptos.size,
      +r.totalRem.toFixed(2), +r.totalNoRem.toFixed(2),
      +r.totalDesc.toFixed(2), +r.totalAporte.toFixed(2), +r.totalContrib.toFixed(2),
      +total.toFixed(2)
    ]);
  });
  const wsE = XLSX.utils.aoa_to_sheet(evolucion);
  wsE['!cols'] = [{wch:9},{wch:10},{wch:14},{wch:14},{wch:14},{wch:14},{wch:18},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsE, 'Evolución');

  // Hoja matriz concepto×período
  const matriz = [
    ['MATRIZ CONCEPTO × PERÍODO ($)'],
    [],
    ['Concepto', ...periodosOrden, 'TOTAL']
  ];
  conceptos.forEach(c => {
    const fila = [c.codigo + ' — ' + c.nombre];
    let totalC = 0;
    periodosOrden.forEach(p => {
      const m = c.porPeriodo[p] || 0;
      fila.push(m > 0 ? +m.toFixed(2) : '');
      totalC += m;
    });
    fila.push(+totalC.toFixed(2));
    matriz.push(fila);
  });
  const wsM = XLSX.utils.aoa_to_sheet(matriz);
  XLSX.utils.book_append_sheet(wb, wsM, 'Matriz');

  const fname = `reporte_conceptos_custom_${desde}_${hasta}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ Reporte descargado (${conceptos.length} conceptos × ${periodosOrden.length} períodos)`, 'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('conceptos_custom','export_reporte_uso',{ desde, hasta, conceptos: conceptos.length });
  }
}
