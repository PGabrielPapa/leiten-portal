// ═══════════════════════════════════════════════════════════════════════════
// ART (ASEGURADORA DE RIESGOS DEL TRABAJO) — por empresa
// ───────────────────────────────────────────────────────────────────────────
// Gestiona el contrato de ART de cada empresa, el histórico de alícuotas
// y expone resolveAlicuotaArtParaEmpresa(empNombre, fecha) para que el
// motor de liquidación use la alícuota vigente a la fecha de pago.
//
// Estructura del objeto ART por empresa (guardado dentro de empresa.art):
//   empresa.art = [
//     {
//       id:            'art_1746000000000',  // timestamp
//       artCodigo:     'EXPERTA',           // código del catálogo de ARTs
//       artNombre:     'Experta ART S.A.',  // del catálogo
//       nroContrato:   '12345-6',
//       fechaInicio:   '2024-01-01',
//       fechaFin:      '2025-12-31',        // null = vigente sin vencimiento
//       activo:        true,                // false = contrato cerrado
//       alicuotas: [
//         { desde: '2024-01-01', pct: 2.10, nota: 'Inicio contrato' },
//         { desde: '2025-01-01', pct: 2.35, nota: 'Actualización feb-2025' }
//       ]
//     }
//   ]
// ═══════════════════════════════════════════════════════════════════════════

// ─── Catálogo de ARTs habilitadas por la SRT ────────────────────────────────
const ARTS_CATALOGO = [
  { codigo:'EXPERTA',    nombre:'Experta ART S.A.',                     cuit:'30-64517756-9' },
  { codigo:'GALENO',     nombre:'Galeno ART S.A.',                      cuit:'30-70740467-5' },
  { codigo:'PREVENCIÓN', nombre:'Prevención ART S.A.',                  cuit:'30-64317274-0' },
  { codigo:'SWISS',      nombre:'Swiss Medical ART S.A.',               cuit:'30-70707410-3' },
  { codigo:'PROVINCIA',  nombre:'Provincia ART S.A.',                   cuit:'30-69834259-8' },
  { codigo:'SANCOR',     nombre:'Sancor ART S.A.',                      cuit:'30-66765900-5' },
  { codigo:'FEDERACIÓN', nombre:'Federación ART S.A.',                   cuit:'30-63671018-8' },
  { codigo:'MAPFRE',     nombre:'Mapfre Argentina ART S.A.',             cuit:'30-69816362-0' },
  { codigo:'LIBERTY',    nombre:'Liberty ART S.A.',                     cuit:'30-70745316-3' },
  { codigo:'HORIZONTE',  nombre:'Horizonte ART S.A.',                   cuit:'30-71100279-2' },
  { codigo:'ALTA',       nombre:'Alta ART S.A. (en liquidación)',       cuit:'30-69042598-2', inactiva:true },
  { codigo:'OTRA',       nombre:'Otra ART (no listada)',                 cuit:'' },
];

// Retorna solo las ARTs activas del catálogo
function getArtsActivas(){
  return ARTS_CATALOGO.filter(a => !a.inactiva);
}


// ─── ART preconfigurada por empresa ─────────────────────────────────────────
// Datos cargados por RR.HH. para el grupo LEITEN.
// Se aplican automáticamente cuando la empresa no tiene ART en la IDB todavía.
const ART_SEED = {
  'LEITEN S.A.': [{
    id: 'art_leiten_prev_2024',
    artCodigo: 'PREVENCIÓN',
    artNombre: 'Prevención ART S.A.',
    nroContrato: '',
    fechaInicio: '2024-01-01',
    fechaFin: null,
    activo: true,
    alicuotas: [{ desde: '2024-01-01', pct: 4.07, nota: 'Alícuota vigente' }]
  }],
  'SINIS S.A.': [{
    id: 'art_sinis_prev_2024',
    artCodigo: 'PREVENCIÓN',
    artNombre: 'Prevención ART S.A.',
    nroContrato: '',
    fechaInicio: '2024-01-01',
    fechaFin: null,
    activo: true,
    alicuotas: [{ desde: '2024-01-01', pct: 4.07, nota: 'Alícuota vigente' }]
  }],
  'LEITEN SALTA S. A.': [{
    id: 'art_leiten_salta_prev_2024',
    artCodigo: 'PREVENCIÓN',
    artNombre: 'Prevención ART S.A.',
    nroContrato: '',
    fechaInicio: '2024-01-01',
    fechaFin: null,
    activo: true,
    alicuotas: [{ desde: '2024-01-01', pct: 4.07, nota: 'Alícuota vigente' }]
  }],
  'BARTON REBAR SA': [{
    id: 'art_barton_prov_2024',
    artCodigo: 'PROVINCIA',
    artNombre: 'Provincia ART S.A.',
    nroContrato: '',
    fechaInicio: '2024-01-01',
    fechaFin: null,
    activo: true,
    alicuotas: [{ desde: '2024-01-01', pct: 4.27, nota: 'Alícuota vigente' }]
  }],
};

// Aplica la seed de ART a las empresas que todavía no la tienen en la IDB.
// Idempotente: si la empresa ya tiene ART, no sobreescribe.
async function aplicarArtSeedSiNecesario(){
  if(typeof getEmpresasABM !== 'function') return;
  try {
    const empresas = await getEmpresasABM();
    for(const [nombreEmp, artData] of Object.entries(ART_SEED)){
      // Buscar la empresa en IDB (coincidencia exacta o normalizada)
      const emp = empresas.find(e =>
        (e.nombre||'').trim().toUpperCase() === nombreEmp.trim().toUpperCase()
      );
      if(emp && (!emp.art || emp.art.length === 0)){
        emp.art = artData;
        if(typeof saveEmpresaABM === 'function') await saveEmpresaABM(emp);
      }
    }
    if(typeof _refreshEmpresasABMCache === 'function') await _refreshEmpresasABMCache();
  } catch(e){ /* fallo silencioso si IDB no está disponible */ }
}

// ─── Helpers para leer/escribir ART dentro del objeto empresa ───────────────

// Lee el array de ARTs de una empresa (desde el ABM de empresas)
async function getArtDeEmpresa(empNombre){
  try {
    const empresas = await getEmpresasABM();
    const emp = empresas.find(e =>
      (e.nombre||'').trim().toUpperCase() === (empNombre||'').trim().toUpperCase()
    );
    return Array.isArray(emp?.art) ? emp.art : [];
  } catch(_){ return []; }
}

// Devuelve el contrato ART activo a una fecha dada (YYYY-MM-DD)
// (el más reciente con fechaInicio <= fecha y (sin fechaFin o fechaFin >= fecha))
function resolveContratoArtActivo(artList, fechaISO){
  if(!artList?.length) return null;
  const fecha = fechaISO || new Date().toISOString().slice(0,10);
  const candidatos = artList.filter(a =>
    a.activo !== false &&
    a.fechaInicio <= fecha &&
    (!a.fechaFin || a.fechaFin >= fecha)
  );
  if(!candidatos.length) return null;
  return candidatos.sort((a,b) => b.fechaInicio.localeCompare(a.fechaInicio))[0];
}

// Devuelve la alícuota vigente del contrato activo a una fecha dada
// Fallback: pctArt de los parámetros generales de liquidación
function resolveAlicuotaArtParaEmpresa(artList, fechaISO){
  const contrato = resolveContratoArtActivo(artList, fechaISO);
  if(!contrato?.alicuotas?.length) return null; // null = usar fallback params
  const fecha = fechaISO || new Date().toISOString().slice(0,10);
  const vigentes = contrato.alicuotas
    .filter(a => a.desde <= fecha)
    .sort((a,b) => b.desde.localeCompare(a.desde));
  return vigentes.length ? (vigentes[0].pct || null) : null;
}

// ─── Render de la sección ART en el formulario de empresa ───────────────────

function renderArtEmpresaEnForm(artList){
  const vigenteEl   = document.getElementById('abm-emp-art-vigente');
  const historicoEl = document.getElementById('abm-emp-art-historico');
  if(!vigenteEl || !historicoEl) return;

  const hoy = new Date().toISOString().slice(0,10);
  const contrato = resolveContratoArtActivo(artList||[], hoy);
  const alicuotaHoy = contrato
    ? resolveAlicuotaArtParaEmpresa(artList, hoy)
    : null;

  // — Contrato vigente —
  if(contrato){
    const catEntry = ARTS_CATALOGO.find(a=>a.codigo===contrato.artCodigo);
    vigenteEl.innerHTML = `
      <div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:6px">
        <div style="flex:1;min-width:200px">
          <div style="font-size:12px;font-weight:600;color:var(--t1)">${contrato.artNombre}</div>
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);margin-top:2px">
            Nro: ${contrato.nroContrato||'—'} · Desde: ${_fmtFechaArt(contrato.fechaInicio)}
            ${contrato.fechaFin ? ` · Hasta: ${_fmtFechaArt(contrato.fechaFin)}` : ' · Sin vencimiento'}
            ${catEntry?.cuit ? ` · CUIT ${catEntry.cuit}` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:var(--green);font-family:var(--font-mono)">${alicuotaHoy != null ? alicuotaHoy.toFixed(2)+'%' : '—'}</div>
          <div style="font-size:10px;color:var(--t3)">alícuota vigente</div>
        </div>
        <span style="font-size:10px;padding:3px 10px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green)">● Vigente</span>
      </div>`;
  } else {
    vigenteEl.innerHTML = `<div style="padding:10px 12px;background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.2);border-radius:var(--r);font-size:12px;color:var(--yellow);margin-bottom:6px">⚠ Sin contrato ART activo. Se usará la alícuota de Parámetros de liquidación (${(typeof getLiqParams==='function'?getLiqParams().pctArt:1.5)||1.5}%).</div>`;
  }

  // — Histórico de contratos —
  if(!artList?.length){
    historicoEl.innerHTML = `<div style="font-size:11px;color:var(--t3);padding:8px 0">Sin contratos registrados.</div>`;
    return;
  }

  const sorted = [...artList].sort((a,b)=>b.fechaInicio.localeCompare(a.fechaInicio));
  historicoEl.innerHTML = `
    <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:4px">Histórico de contratos y alícuotas</div>
    ${sorted.map((c,idx)=>{
      const esVig = resolveContratoArtActivo([c], hoy) !== null;
      const aliOrd = [...(c.alicuotas||[])].sort((a,b)=>b.desde.localeCompare(a.desde));
      return `
      <div style="border:1px solid var(--border);border-radius:var(--r);margin-bottom:8px;overflow:hidden">
        <div style="padding:10px 14px;background:var(--bg2);display:flex;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="flex:1;min-width:180px">
            <div style="font-size:12px;font-weight:600;color:var(--t1)">${c.artNombre}</div>
            <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">
              Nro: ${c.nroContrato||'—'} · ${_fmtFechaArt(c.fechaInicio)} → ${c.fechaFin?_fmtFechaArt(c.fechaFin):'sin fecha fin'}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${esVig?'<span style="font-size:10px;padding:2px 8px;border-radius:8px;border:1px solid rgba(34,197,94,.3);color:var(--green)">● Vigente</span>':'<span style="font-size:10px;padding:2px 8px;border-radius:8px;border:1px solid var(--border);color:var(--t3)">Cerrado</span>'}
            <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="abrirModalArtEmpresa(${idx})">✎</button>
            <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px;color:var(--accent2)" onclick="abrirModalAlicuotaArt(${idx})">+ Alícuota</button>
            <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="_eliminarContratoArt(${idx})">✕</button>
          </div>
        </div>
        ${aliOrd.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:var(--bg3)">
            <th style="padding:5px 14px;text-align:left;font-family:var(--font-mono);font-size:10px;color:var(--t3)">Desde</th>
            <th style="padding:5px 12px;text-align:right;font-family:var(--font-mono);font-size:10px;color:var(--t3)">Alícuota</th>
            <th style="padding:5px 12px;text-align:left;font-family:var(--font-mono);font-size:10px;color:var(--t3)">Nota</th>
            <th style="padding:5px 10px;width:30px"></th>
          </tr></thead>
          <tbody>${aliOrd.map((a,ai)=>`
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:6px 14px;font-family:var(--font-mono);color:var(--t1)">${_fmtFechaArt(a.desde)}</td>
              <td style="padding:6px 12px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--t1)">${a.pct.toFixed(2)}%</td>
              <td style="padding:6px 12px;color:var(--t3);font-size:11px">${a.nota||'—'}</td>
              <td style="padding:6px 10px;text-align:center">
                <button class="btn btn-ghost" style="font-size:9px;padding:1px 6px;color:var(--red)" onclick="_eliminarAlicuotaArt(${idx},${ai})">✕</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : `<div style="padding:8px 14px;font-size:11px;color:var(--t3)">Sin alícuotas cargadas.</div>`}
      </div>`;
    }).join('')}`;
}

function _fmtFechaArt(iso){
  if(!iso) return '—';
  const p = iso.split('-');
  return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

// Lee el array ART del campo hidden del formulario
function _getArtDataForm(){
  try { return JSON.parse(document.getElementById('abm-emp-art-data')?.value||'[]'); } catch(_){ return []; }
}
// Guarda el array ART en el campo hidden y re-renderiza
function _setArtDataForm(arr){
  const el = document.getElementById('abm-emp-art-data');
  if(el) el.value = JSON.stringify(arr);
  renderArtEmpresaEnForm(arr);
}

// ─── Modal: nuevo/editar contrato ART ───────────────────────────────────────

function abrirModalArtEmpresa(idxEditar){
  const artList = _getArtDataForm();
  const editar  = typeof idxEditar === 'number' ? artList[idxEditar] : null;

  const prev = document.getElementById('modal-art-empresa');
  if(prev) prev.remove();

  const artsOpts = getArtsActivas().map(a=>
    `<option value="${a.codigo}" ${editar?.artCodigo===a.codigo?'selected':''}>${a.nombre}${a.cuit?' — '+a.cuit:''}</option>`
  ).join('');

  const iS = 'width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none';

  const modal = document.createElement('div');
  modal.id = 'modal-art-empresa';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:540px;width:100%;border:1px solid var(--border)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">🛡 ${editar?'Editar':'Registrar'} contrato ART</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Aseguradora de Riesgos del Trabajo — Ley 24.557</div>
        </div>
        <button onclick="document.getElementById('modal-art-empresa').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">ART *</label>
          <select id="art-modal-codigo" onchange="_artModalSincNombre()" style="${iS}">
            <option value="">— Seleccioná la ART —</option>
            ${artsOpts}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Nombre (editable si es "Otra")</label>
          <input type="text" id="art-modal-nombre" value="${editar?.artNombre||''}" placeholder="Ej: Experta ART S.A." style="${iS}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Nro. contrato *</label>
            <input type="text" id="art-modal-contrato" value="${editar?.nroContrato||''}" placeholder="Ej: 123456-7" style="${iS};font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Fecha inicio *</label>
            <input type="date" id="art-modal-inicio" value="${editar?.fechaInicio||''}" style="${iS}">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Fecha fin</label>
            <input type="date" id="art-modal-fin" value="${editar?.fechaFin||''}" style="${iS}">
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Vacío = sin vencimiento</div>
          </div>
        </div>

        <!-- Alícuota inicial (solo para contratos nuevos) -->
        ${!editar ? `
        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:12px;font-weight:600;color:var(--t2);margin-bottom:10px">Alícuota inicial</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Alícuota (%) *</label>
              <input type="number" id="art-modal-pct" step="0.01" min="0" max="20" placeholder="Ej: 2.10" style="${iS};font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Vigente desde *</label>
              <input type="date" id="art-modal-ali-desde" style="${iS}">
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Nota</label>
              <input type="text" id="art-modal-ali-nota" placeholder="Ej: Inicio contrato" style="${iS}">
            </div>
          </div>
        </div>` : ''}

        <div style="padding:10px 12px;background:rgba(61,127,255,.05);border:1px solid rgba(61,127,255,.15);border-radius:var(--r);font-size:11px;color:var(--t3);line-height:1.6">
          💡 La alícuota impacta automáticamente en el cálculo de la contribución patronal ART en cada liquidación, reemplazando el porcentaje de Parámetros.
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-art-empresa').remove()" style="font-size:13px">Cancelar</button>
        <button class="btn btn-primary" onclick="_guardarContratoArt(${typeof idxEditar==='number'?idxEditar:'null'})" style="font-size:13px;padding:8px 20px">✓ Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  // Preseleccionar ART en el select
  if(editar?.artCodigo){
    const sel = document.getElementById('art-modal-codigo');
    if(sel) sel.value = editar.artCodigo;
  }
  document.getElementById('art-modal-contrato')?.focus();
}

// Sincroniza el nombre cuando se selecciona una ART del catálogo
function _artModalSincNombre(){
  const codigo = document.getElementById('art-modal-codigo')?.value;
  const nombreEl = document.getElementById('art-modal-nombre');
  if(!codigo || !nombreEl) return;
  const cat = ARTS_CATALOGO.find(a=>a.codigo===codigo);
  if(cat && cat.codigo !== 'OTRA') nombreEl.value = cat.nombre;
}

function _guardarContratoArt(idxEditar){
  const codigo   = document.getElementById('art-modal-codigo')?.value;
  const nombre   = (document.getElementById('art-modal-nombre')?.value||'').trim();
  const contrato = (document.getElementById('art-modal-contrato')?.value||'').trim();
  const inicio   = document.getElementById('art-modal-inicio')?.value;
  const fin      = document.getElementById('art-modal-fin')?.value||null;
  const pct      = parseFloat(document.getElementById('art-modal-pct')?.value||'0')||0;
  const aliDesde = document.getElementById('art-modal-ali-desde')?.value;
  const aliNota  = (document.getElementById('art-modal-ali-nota')?.value||'').trim();

  if(!codigo){ toast('⚠ Seleccioná la ART','var(--yellow)'); return; }
  if(!nombre){ toast('⚠ Ingresá el nombre de la ART','var(--yellow)'); return; }
  if(!contrato){ toast('⚠ Ingresá el número de contrato','var(--yellow)'); return; }
  if(!inicio){ toast('⚠ Ingresá la fecha de inicio del contrato','var(--yellow)'); return; }
  if(idxEditar === null && (!pct||pct<=0)){ toast('⚠ Ingresá la alícuota inicial','var(--yellow)'); return; }
  if(idxEditar === null && !aliDesde){ toast('⚠ Ingresá la vigencia de la alícuota','var(--yellow)'); return; }

  const artList = _getArtDataForm();

  if(typeof idxEditar === 'number' && artList[idxEditar]){
    // Editar contrato existente
    artList[idxEditar] = {
      ...artList[idxEditar],
      artCodigo: codigo, artNombre: nombre,
      nroContrato: contrato, fechaInicio: inicio, fechaFin: fin,
      activo: !fin || fin >= new Date().toISOString().slice(0,10)
    };
  } else {
    // Nuevo contrato
    artList.push({
      id:          'art_'+Date.now(),
      artCodigo:   codigo,
      artNombre:   nombre,
      nroContrato: contrato,
      fechaInicio: inicio,
      fechaFin:    fin,
      activo:      !fin || fin >= new Date().toISOString().slice(0,10),
      alicuotas:   [{ desde: aliDesde, pct, nota: aliNota }]
    });
  }

  _setArtDataForm(artList);
  document.getElementById('modal-art-empresa')?.remove();
  toast(`✓ Contrato ART ${nombre} registrado`, 'var(--green)', 3000);
}

// ─── Modal: agregar alícuota a un contrato ──────────────────────────────────

function abrirModalAlicuotaArt(idxContrato){
  const artList = _getArtDataForm();
  const contrato = artList[idxContrato];
  if(!contrato) return;

  const prev = document.getElementById('modal-alicuota-art');
  if(prev) prev.remove();

  const iS = 'width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none';

  const modal = document.createElement('div');
  modal.id = 'modal-alicuota-art';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  const hoy = new Date().toISOString().slice(0,10);
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:420px;width:100%;border:1px solid var(--border)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">+ Nueva alícuota ART</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${contrato.artNombre}</div>
        </div>
        <button onclick="document.getElementById('modal-alicuota-art').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Alícuota (%) *</label>
            <input type="number" id="ali-modal-pct" step="0.01" min="0" max="20" placeholder="Ej: 2.35" style="${iS};font-family:var(--font-mono)" autofocus>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Vigente desde *</label>
            <input type="date" id="ali-modal-desde" value="${hoy}" style="${iS}">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Nota</label>
          <input type="text" id="ali-modal-nota" placeholder="Ej: Actualización paritaria — mar 2026" style="${iS}">
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-alicuota-art').remove()" style="font-size:13px">Cancelar</button>
        <button class="btn btn-primary" onclick="_guardarAlicuotaArt(${idxContrato})" style="font-size:13px;padding:8px 20px">✓ Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('ali-modal-pct')?.focus();
}

function _guardarAlicuotaArt(idxContrato){
  const pct   = parseFloat(document.getElementById('ali-modal-pct')?.value||'0');
  const desde = document.getElementById('ali-modal-desde')?.value;
  const nota  = (document.getElementById('ali-modal-nota')?.value||'').trim();

  if(!pct||pct<=0){ toast('⚠ Ingresá la alícuota','var(--yellow)'); return; }
  if(!desde){ toast('⚠ Ingresá la fecha de vigencia','var(--yellow)'); return; }

  const artList = _getArtDataForm();
  if(!artList[idxContrato]) return;
  if(!Array.isArray(artList[idxContrato].alicuotas)) artList[idxContrato].alicuotas = [];
  artList[idxContrato].alicuotas.push({ desde, pct, nota });

  _setArtDataForm(artList);
  document.getElementById('modal-alicuota-art')?.remove();
  toast(`✓ Alícuota ${pct.toFixed(2)}% registrada desde ${_fmtFechaArt(desde)}`, 'var(--green)', 3000);
}

function _eliminarContratoArt(idx){
  const artList = _getArtDataForm();
  if(!artList[idx]) return;
  artList.splice(idx, 1);
  _setArtDataForm(artList);
}

function _eliminarAlicuotaArt(idxContrato, idxAli){
  const artList = _getArtDataForm();
  if(!artList[idxContrato]?.alicuotas?.[idxAli]) return;
  artList[idxContrato].alicuotas.splice(idxAli, 1);
  _setArtDataForm(artList);
}
