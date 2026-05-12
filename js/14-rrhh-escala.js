// ═══════════════════════════════════════════════════════════════
// Soporta histórico de versiones + incrementos porcentuales
// ═══════════════════════════════════════════════════════════════

const ESCALA_TRAMOS = [
  { key:'INI',  label:'Inicial',      color:'var(--t3)' },
  { key:'JUN',  label:'Junior',       color:'rgb(59,130,246)' },
  { key:'SEMI', label:'Semi Senior',  color:'rgb(34,197,94)' },
  { key:'SEN',  label:'Senior',       color:'rgb(251,191,36)' }
];

const ESCALA_SEED_V1 = {
  id: 'esc_seed_2026_04',
  vigencia: '2026-04-01',
  mesLabel: 'Abril 2026',
  origen: 'inicial',
  porcentaje: null,
  alcance: 'todas',
  comentario: 'Escala unificada inicial — 04/2026',
  creado: '2026-04-01T00:00:00.000Z',
  creadoPor: null,
  categorias: [
    { cat:'OP',  label:'Operario',                          nota:'Aux. Plast. -15,61%',       difMesAnt:0.02,  tramos:{ INI:1296956.96, JUN:1361804.81, SEMI:1497985.29, SEN:1647783.82 } },
    { cat:'OF',  label:'Oficial',                           nota:'Operador Plast. -22,10%',   difMesAnt:0.02,  tramos:{ INI:1316511.93, JUN:1382337.53, SEMI:1520571.28, SEN:1672628.41 } },
    { cat:'ASI', label:'Asistente',                         nota:'Adm. 3 Plast. -11,70%',     difMesAnt:0.02,  tramos:{ INI:1335551.67, JUN:1402329.25, SEMI:1542562.18, SEN:1696818.40 } },
    { cat:'ANA', label:'Analista / Supervisor de Fábrica',  nota:'',                          difMesAnt:0.02,  tramos:{ INI:1696818.40, JUN:1781659.31, SEMI:1959825.25, SEN:2155807.77 } },
    { cat:'COO', label:'Coordinador',                       nota:'',                          difMesAnt:0.02,  tramos:{ INI:2155807.77, JUN:2328703.55, SEMI:2561573.91, SEN:2817731.30 } },
    { cat:'JEF', label:'Jefe de Departamento',              nota:'',                          difMesAnt:0.02,  tramos:{ INI:2817731.30, JUN:2958617.87, SEMI:3254479.65, SEN:3579927.62 } },
    { cat:'GER', label:'Gerente',                           nota:'',                          difMesAnt:0.02,  tramos:{ INI:3579927.62, JUN:3579927.62, SEMI:3937920.38, SEN:4331712.42 } }
  ],
  regionales: [
    { key:'REG',      label:'Gerente Regional',          desc:'Neuquén / Córdoba / Mendoza / Rosario / Santa Fe / Corrientes', monto:2765771.32, difMesAnt:0.02 },
    { key:'BSAS-3F',  label:'Gerente Buenos Aires · 3F', desc:'Sucursal 3 de Febrero',                                         monto:2475489.38, difMesAnt:0.02 },
    { key:'BSAS-JM',  label:'Gerente Buenos Aires · JM', desc:'Sucursal José Marmol',                                          monto:3318925.58, difMesAnt:0.02 }
  ]
};

// Alias de compatibilidad con el código previo
const ESCALA_UNIFICADA = Object.assign({ tramos: ESCALA_TRAMOS }, ESCALA_SEED_V1);

// ── Storage de versiones ──
const ESCALA_STORAGE_KEY = 'lsg_escala_versiones';

function _getEscalaVersionesRaw(){
  try {
    const raw = localStorage.getItem(ESCALA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function _setEscalaVersionesRaw(arr){
  try { localStorage.setItem(ESCALA_STORAGE_KEY, JSON.stringify(arr)); } catch(e){ console.error(e); }
}

function getEscalaVersiones(){
  // Siempre incluye la seed; las versiones del usuario se agregan y se ordenan por vigencia asc
  const user = _getEscalaVersionesRaw();
  const all = [ESCALA_SEED_V1, ...user];
  return all.sort((a,b)=>{
    if(a.vigencia !== b.vigencia) return a.vigencia.localeCompare(b.vigencia);
    return (a.creado||'').localeCompare(b.creado||'');
  });
}

function saveEscalaVersion(v){
  const user = _getEscalaVersionesRaw();
  user.push(v);
  _setEscalaVersionesRaw(user);
}

function eliminarEscalaVersion(id){
  if(id === ESCALA_SEED_V1.id) return false; // no se puede borrar la seed
  const user = _getEscalaVersionesRaw();
  const filtered = user.filter(v => v.id !== id);
  _setEscalaVersionesRaw(filtered);
  return true;
}

function getEscalaActiva(fechaRef){
  const todas = getEscalaVersiones();
  const hoy = fechaRef || new Date().toISOString().slice(0,10);
  const aplicables = todas.filter(v => v.vigencia <= hoy);
  return aplicables.length ? aplicables[aplicables.length-1] : todas[0];
}

// ── Resolver monto según la escala vigente ──
function getMontoEscala(cat, tramo, fechaRef){
  if(!cat || !tramo) return null;
  const escala = getEscalaActiva(fechaRef);
  const catRow = escala.categorias.find(c=>c.cat===cat);
  if(catRow && catRow.tramos[tramo]!==undefined) return catRow.tramos[tramo];
  if(cat==='GER'){
    if(tramo==='BS.AS' || tramo==='BS.AS.3F') return escala.regionales.find(r=>r.key==='BSAS-3F')?.monto || null;
    if(tramo==='BS.AS.JM' || tramo==='JM')    return escala.regionales.find(r=>r.key==='BSAS-JM')?.monto || null;
    if(tramo==='REG')                          return escala.regionales.find(r=>r.key==='REG')?.monto || null;
  }
  return null;
}

// ── Aplicar incremento porcentual → crea nueva versión ──
function aplicarIncrementoEscala(pct, vigencia, alcance, comentario){
  const activa = getEscalaActiva();
  const factor = 1 + (pct/100);
  const vigenciaSlice = String(vigencia).slice(0,10);
  const mesLabel = _formatMesLabel(vigenciaSlice);
  const round2 = v => Math.round(v * 100) / 100;

  const nueva = {
    id: 'esc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    vigencia: vigenciaSlice,
    mesLabel,
    origen: 'incremento',
    porcentaje: pct,
    alcance: alcance || 'todas',
    comentario: comentario || '',
    creado: new Date().toISOString(),
    creadoPor: (typeof currentUser!=='undefined' && currentUser?.emp?.leg) || null,
    baseVersionId: activa.id,
    categorias: activa.categorias.map(c => ({
      cat: c.cat,
      label: c.label,
      nota: c.nota,
      difMesAnt: (alcance === 'regionales') ? c.difMesAnt : (pct/100),
      tramos: (alcance === 'regionales') ? {...c.tramos} : {
        INI:  round2(c.tramos.INI  * factor),
        JUN:  round2(c.tramos.JUN  * factor),
        SEMI: round2(c.tramos.SEMI * factor),
        SEN:  round2(c.tramos.SEN  * factor),
      }
    })),
    regionales: activa.regionales.map(r => ({
      key: r.key,
      label: r.label,
      desc: r.desc,
      difMesAnt: (alcance === 'categorias') ? r.difMesAnt : (pct/100),
      monto: (alcance === 'categorias') ? r.monto : round2(r.monto * factor)
    }))
  };
  saveEscalaVersion(nueva);
  return nueva;
}

function _formatMesLabel(isoDate){
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const p = isoDate.split('-');
  if(p.length < 2) return isoDate;
  const m = parseInt(p[1],10);
  return `${meses[m-1]||p[1]} ${p[0]}`;
}

function _fechaBonita(isoDate){
  const p = isoDate.split('-');
  if(p.length < 3) return isoDate;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function renderEscalaSalarial(){
  const cont = document.getElementById('escala-content');
  if(!cont) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';

  const escala = getEscalaActiva();
  const versiones = getEscalaVersiones();
  const t = ESCALA_TRAMOS;

  // Nómina actual (DB + overrides ABM + altas - bajas), excluyendo bajas
  const nominaActiva = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);

  const conteo = {};
  nominaActiva.forEach(e=>{
    if(!e.cat || !e.tramo) return;
    const k = `${e.cat}__${e.tramo}`;
    conteo[k] = (conteo[k]||0)+1;
  });

  // ── Header ──
  let html = `
    <div class="card" style="padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;color:var(--t1);font-weight:600;margin-bottom:3px">Escala unificada del grupo de empresas</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          Vigencia activa: <b style="color:var(--t2)">${escala.mesLabel}</b> (${_fechaBonita(escala.vigencia)})
          · ${escala.categorias.length} categorías × ${t.length} tramos
          · ${escala.regionales.length} gerentes regionales
          · ${versiones.length} versión${versiones.length===1?'':'es'} en histórico
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="abrirFormIncrementoEscala()" style="font-size:12px;padding:6px 14px">⇡ Cargar incremento</button>
        <button class="btn btn-ghost" onclick="exportarEscalaCSV()" style="font-size:12px;padding:6px 14px">⬇ CSV</button>
        <button class="btn btn-ghost" onclick="exportarEscalaXLSX()" style="font-size:12px;padding:6px 14px">⬇ Excel</button>
      </div>
    </div>`;

  // ── Tabs ──
  html += `
    <div style="display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid var(--border);flex-wrap:wrap">
      <button id="escala-tab-act" onclick="escalaTab('act')"
        style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;color:var(--t1);border-bottom:2px solid var(--accent2);margin-bottom:-2px">
        📊 Escala vigente
      </button>
      <button id="escala-tab-hist" onclick="escalaTab('hist')"
        style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">
        📜 Histórico (${versiones.length})
      </button>
    </div>
    <div id="escala-pane-act"></div>
    <div id="escala-pane-hist" style="display:none"></div>`;

  cont.innerHTML = html;
  _renderEscalaPaneActiva(escala, conteo, nominaActiva);
  _renderEscalaPaneHistorico(versiones);
}

function escalaTab(which){
  const ta = document.getElementById('escala-tab-act');
  const th = document.getElementById('escala-tab-hist');
  const pa = document.getElementById('escala-pane-act');
  const ph = document.getElementById('escala-pane-hist');
  if(!ta||!th||!pa||!ph) return;
  const active = { color:'var(--t1)', weight:'600', border:'2px solid var(--accent2)' };
  const inactive = { color:'var(--t3)', weight:'400', border:'2px solid transparent' };
  const on = which==='hist' ? th : ta;
  const off = which==='hist' ? ta : th;
  on.style.color=active.color; on.style.fontWeight=active.weight; on.style.borderBottom=active.border;
  off.style.color=inactive.color; off.style.fontWeight=inactive.weight; off.style.borderBottom=inactive.border;
  pa.style.display = which==='hist' ? 'none' : 'block';
  ph.style.display = which==='hist' ? 'block' : 'none';
}

function _renderEscalaPaneActiva(escala, conteo, nominaActiva){
  const pane = document.getElementById('escala-pane-act');
  if(!pane) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';
  const t = ESCALA_TRAMOS;
  const nomina = nominaActiva || (typeof getNomina==='function' ? getNomina().filter(e=>!e._deBaja && !e.egreso) : []);

  let html = `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">📊 Categorías generales</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Básico según categoría × tramo</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;min-width:820px;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;min-width:260px">Categoría</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:60px">Dif.</th>
              ${t.map(tr=>`<th style="padding:12px 10px;text-align:right;font-size:11px;font-family:var(--font-mono);color:${tr.color};text-transform:uppercase;letter-spacing:.05em;font-weight:600;min-width:140px">${tr.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${escala.categorias.map((c,i)=>{
              const rowBg = i%2===0 ? 'transparent' : 'rgba(255,255,255,.01)';
              return `
              <tr style="border-bottom:1px solid var(--border);background:${rowBg}">
                <td style="padding:14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t2);border:1px solid var(--border);min-width:40px;text-align:center">${c.cat}</span>
                    <div>
                      <div style="color:var(--t1);font-weight:500">${c.label}</div>
                      ${c.nota?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${c.nota}</div>`:''}
                    </div>
                  </div>
                </td>
                <td style="padding:10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3)">+${pct(c.difMesAnt)}</td>
                ${t.map((tr,ti)=>{
                  const monto = c.tramos[tr.key];
                  const n = conteo[`${c.cat}__${tr.key}`]||0;
                  const difIncr = ti>0 ? (monto/c.tramos[t[ti-1].key]-1) : 0;
                  const difLabel = ti>0 ? `<span style="font-size:9px;color:var(--t3);margin-left:6px;font-family:var(--font-mono)">+${pct(difIncr)}</span>` : '';
                  return `
                    <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t1);font-weight:500">
                      ${fN(monto)}${difLabel}
                      ${n>0?`<div style="font-size:9px;color:${tr.color};margin-top:3px;opacity:.8">${n} emp.</div>`:''}
                    </td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  html += `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">🌎 Gerentes regionales</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Escalas especiales según sede</span>
      </div>
      <div style="padding:4px 0">
        ${escala.regionales.map(r=>`
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:240px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:3px">
                <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3)">${r.key}</span>
                <span style="font-size:13px;font-weight:500;color:var(--t1)">${r.label}</span>
              </div>
              <div style="font-size:11px;color:var(--t3);margin-left:2px">${r.desc}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-mono);font-size:15px;color:var(--t1);font-weight:600">${fN(r.monto)}</div>
              <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">+${pct(r.difMesAnt)} vs mes ant.</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const empleadosSinEscala = nomina.filter(e=>{
    if(!e.cat || !e.tramo) return true;
    return getMontoEscala(e.cat, e.tramo) === null;
  });
  const totalEmp = nomina.length;
  const conEscala = totalEmp - empleadosSinEscala.length;

  // Opciones para los selectores de ajuste inline
  const opcionesCat = ESCALA_UNIFICADA.categorias
    .map(c => `<option value="${c.cat}">${c.cat} — ${c.label}</option>`).join('');
  const opcionesTramo = ESCALA_TRAMOS
    .map(tr => `<option value="${tr.key}">${tr.key} — ${tr.label}</option>`).join('') +
    `<option value="BS.AS.3F">BS.AS.3F — Buenos Aires (3F, solo GER)</option>` +
    `<option value="BS.AS.JM">BS.AS.JM — Buenos Aires (JM, solo GER)</option>` +
    `<option value="REG">REG — Regional interior (solo GER)</option>`;

  html += `
    <div class="card" style="padding:16px 20px">
      <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Cobertura actual</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${conEscala}</div>
          <div style="font-size:11px;color:var(--t3)">Con escala asignada</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:600;color:${empleadosSinEscala.length>0?'rgb(239,68,68)':'var(--t3)'};font-family:var(--font-mono)">${empleadosSinEscala.length}</div>
          <div style="font-size:11px;color:var(--t3)">Sin mapeo en la escala</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${totalEmp}</div>
          <div style="font-size:11px;color:var(--t3)">Total empleados activos</div>
        </div>
      </div>
      ${empleadosSinEscala.length>0?`
        <details style="margin-top:14px;font-size:12px" ${empleadosSinEscala.length<=6?'open':''}>
          <summary style="cursor:pointer;color:var(--t2);user-select:none;font-weight:500">
            Ver y ajustar empleados sin mapeo (${empleadosSinEscala.length})
          </summary>
          <div style="margin-top:10px;font-size:11px;color:var(--t3);font-family:var(--font-mono);padding:0 2px 8px">
            💡 Podés asignar directamente la categoría y el tramo correctos desde acá. El cambio se guarda en el ABM y queda registrado en el historial del empleado.
          </div>
          <div style="max-height:440px;overflow-y:auto;background:var(--bg2);border-radius:var(--r);padding:6px">
            ${empleadosSinEscala.slice(0,200).map(e=>{
              const catActual = e.cat || '';
              const tramoActual = e.tramo || '';
              return `
              <div id="sinmap-row-${e.leg}" style="padding:10px 12px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 120px 160px 90px;gap:10px;align-items:center;font-size:12px">
                <div style="min-width:0;overflow:hidden">
                  <div style="color:var(--t1);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.nom||'(sin nombre)'}</div>
                  <div style="color:var(--t3);font-family:var(--font-mono);font-size:10px;margin-top:2px">${e.leg} · ${(e.emp||'').split(' ')[0]}${e.lugar?' · '+e.lugar:''}${e.tarea?' · '+e.tarea:''}</div>
                </div>
                <select id="sinmap-cat-${e.leg}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
                  <option value="">—</option>
                  ${opcionesCat.replace(`value="${catActual}"`, `value="${catActual}" selected`)}
                </select>
                <select id="sinmap-tramo-${e.leg}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
                  <option value="">—</option>
                  ${opcionesTramo.replace(`value="${tramoActual}"`, `value="${tramoActual}" selected`)}
                </select>
                <button class="btn btn-primary" onclick="guardarAjusteCatTramo('${e.leg}')" style="font-size:11px;padding:5px 10px">✓ Ajustar</button>
              </div>`;
            }).join('')}
            ${empleadosSinEscala.length>200?`<div style="padding:8px;color:var(--t3);font-size:11px;text-align:center">...y ${empleadosSinEscala.length-200} más. Ajustá los de acá primero.</div>`:''}
          </div>
        </details>
      `:'<div style="margin-top:12px;font-size:12px;color:var(--green)">✓ Todos los empleados activos están mapeados a la escala.</div>'}
    </div>`;

  pane.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// Ajuste inline de categoría/tramo desde la escala salarial
// ═══════════════════════════════════════════════════════════════
async function guardarAjusteCatTramo(leg){
  const selCat = document.getElementById(`sinmap-cat-${leg}`);
  const selTramo = document.getElementById(`sinmap-tramo-${leg}`);
  if(!selCat || !selTramo) return;
  const nuevoCat = (selCat.value || '').toUpperCase().trim();
  const nuevoTramo = (selTramo.value || '').toUpperCase().trim();

  if(!nuevoCat || !nuevoTramo){
    toast('⚠ Seleccioná categoría y tramo','var(--yellow)');
    return;
  }

  // Validar que la combinación exista en la escala
  const montoValida = getMontoEscala(nuevoCat, nuevoTramo);
  if(montoValida === null){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`La combinación ${nuevoCat} / ${nuevoTramo} no existe en la escala vigente.<br><br>¿Guardar igual?<br>(Podés crear la combinación en la escala después.)`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  // Obtener empleado actual de la nómina (con overrides previos aplicados)
  const empAntes = empByLeg(leg);
  if(!empAntes){ toast('⚠ Empleado no encontrado','var(--yellow)'); return; }

  // Si el cambio es nulo, no hacer nada
  if((empAntes.cat||'') === nuevoCat && (empAntes.tramo||'') === nuevoTramo){
    toast('Sin cambios — categoría y tramo ya están así','var(--t3)');
    return;
  }

  // Guardar override
  const ov = getAbmOverrides();
  const prevOv = ov[leg] || {};
  ov[leg] = { ...prevOv, cat: nuevoCat, tramo: nuevoTramo };
  saveAbmOverrides(ov);

  // Si es una alta, también actualizar el registro de alta
  const al = getAbmAltas();
  const ai = al.findIndex(e => e.leg === leg);
  if(ai >= 0){ al[ai] = { ...al[ai], cat: nuevoCat, tramo: nuevoTramo }; saveAbmAltas(al); }

  // Registrar en historial de cambios del empleado (misma lógica que el ABM completo)
  const empDespues = { ...empAntes, cat: nuevoCat, tramo: nuevoTramo };
  try {
    if(typeof registrarCambiosEmpleado === 'function'){
      await registrarCambiosEmpleado(empAntes, empDespues, {
        desde: new Date().toISOString().slice(0,10),
        motivo: 'Ajuste desde Escala Salarial',
        usuario: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'RR.HH.'
      });
    }
  } catch(e){ console.warn('No se pudo registrar en historial:', e); }

  // Feedback y refrescar UI
  const montoTxt = montoValida !== null ? ' · Básico escala: $ '+Math.round(montoValida).toLocaleString('es-AR') : '';
  toast(`✓ ${(empAntes.nom||leg).split(',')[0]} → ${nuevoCat} / ${nuevoTramo}${montoTxt}`, 'var(--green)', 3500);

  // Animación de fila que se va antes de rerenderear
  const row = document.getElementById(`sinmap-row-${leg}`);
  if(row){
    row.style.transition = 'opacity .25s, transform .25s';
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
  }
  setTimeout(()=>renderEscalaSalarial(), 280);
}

function _renderEscalaPaneHistorico(versiones){
  const pane = document.getElementById('escala-pane-hist');
  if(!pane) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';
  const t = ESCALA_TRAMOS;

  // Orden descendente por vigencia
  const ordenadas = [...versiones].reverse();
  const hoy = new Date().toISOString().slice(0,10);
  const activaId = getEscalaActiva().id;

  const alcanceLabel = a => a==='categorias' ? 'Solo categorías' : (a==='regionales' ? 'Solo regionales' : 'Todas');
  const origenBadge = v => {
    if(v.origen==='inicial') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">SEED</span>`;
    if(v.origen==='incremento') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)">+${pct(v.porcentaje/100)}</span>`;
    return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t3);border:1px solid var(--border)">${v.origen||'—'}</span>`;
  };

  let html = `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Línea de tiempo — ${versiones.length} versión${versiones.length===1?'':'es'}</div>
      <div style="flex:1"></div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Hoy: ${_fechaBonita(hoy)}</div>
    </div>`;

  if(versiones.length === 0){
    html += `<div class="card" style="padding:20px;text-align:center;color:var(--t3)">Sin versiones cargadas.</div>`;
    pane.innerHTML = html;
    return;
  }

  html += ordenadas.map(v=>{
    const esActiva = v.id === activaId;
    const borde = esActiva ? 'border:2px solid var(--accent2)' : 'border:1px solid var(--border)';
    const creadoFmt = v.creado ? new Date(v.creado).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    return `
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;${borde}">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${origenBadge(v)}
            <div>
              <div style="font-size:13px;color:var(--t1);font-weight:600">${v.mesLabel}${esActiva?' <span style="font-size:10px;color:var(--accent2);margin-left:6px;font-family:var(--font-mono)">● ACTIVA</span>':''}</div>
              <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Vigencia desde ${_fechaBonita(v.vigencia)} · Alcance: ${alcanceLabel(v.alcance)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost" onclick="toggleVersionDetalle('${v.id}')" style="font-size:11px;padding:5px 12px" id="btn-det-${v.id}">Ver detalle</button>
            ${v.origen!=='inicial' ? `<button class="btn-blanquear" onclick="confirmarEliminarVersion('${v.id}')" style="font-size:11px;padding:5px 12px">✕ Eliminar</button>` : ''}
          </div>
        </div>
        ${v.comentario ? `<div style="padding:10px 18px;border-bottom:1px solid var(--border);font-size:12px;color:var(--t2);background:var(--bg2)"><i>"${v.comentario}"</i></div>` : ''}
        <div style="padding:8px 18px;font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;gap:18px;flex-wrap:wrap">
          <span>Creado: ${creadoFmt}</span>
          ${v.creadoPor?`<span>Por: legajo ${v.creadoPor}</span>`:''}
          ${v.baseVersionId?`<span>Base: ${(versiones.find(x=>x.id===v.baseVersionId)?.mesLabel)||v.baseVersionId}</span>`:''}
        </div>
        <div id="det-${v.id}" style="display:none">
          <div style="overflow-x:auto;border-top:1px solid var(--border)">
            <table style="width:100%;min-width:820px;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                  <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Categoría</th>
                  ${t.map(tr=>`<th style="padding:10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:${tr.color};text-transform:uppercase;letter-spacing:.05em;font-weight:600">${tr.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${v.categorias.map((c,i)=>{
                  const rowBg = i%2===0 ? 'transparent' : 'rgba(255,255,255,.01)';
                  return `
                  <tr style="border-bottom:1px solid var(--border);background:${rowBg}">
                    <td style="padding:10px 14px">
                      <span style="font-size:10px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:var(--bg2);color:var(--t2);border:1px solid var(--border);margin-right:6px">${c.cat}</span>
                      <span style="color:var(--t1)">${c.label}</span>
                    </td>
                    ${t.map(tr=>`<td style="padding:10px;text-align:right;font-family:var(--font-mono);color:var(--t1)">${fN(c.tramos[tr.key])}</td>`).join('')}
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding:10px 18px;border-top:1px solid var(--border);background:var(--bg2);font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Gerentes regionales</div>
          <div>
            ${v.regionales.map(r=>`
              <div style="padding:10px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px">
                <div>
                  <span style="font-size:10px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3);margin-right:6px">${r.key}</span>
                  <span style="color:var(--t1)">${r.label}</span>
                  <span style="font-size:10px;color:var(--t3);margin-left:6px">${r.desc}</span>
                </div>
                <div style="font-family:var(--font-mono);color:var(--t1);font-weight:500">${fN(r.monto)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  }).join('');

  pane.innerHTML = html;
}

async function toggleVersionDetalle(id){
  const det = document.getElementById('det-'+id);
  const btn = document.getElementById('btn-det-'+id);
  if(!det) return;
  const showing = det.style.display !== 'none';
  det.style.display = showing ? 'none' : 'block';
  if(btn) btn.textContent = showing ? 'Ver detalle' : 'Ocultar detalle';
}

async function confirmarEliminarVersion(id){
  const v = getEscalaVersiones().find(x=>x.id===id);
  if(!v) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar la versión "${v.mesLabel}" (${_fechaBonita(v.vigencia)})?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const ok = eliminarEscalaVersion(id);
  if(ok){ renderEscalaSalarial(); escalaTab('hist'); }
}

// ═══════════════════════════════════════════════════════════════
// FORMULARIO DE INCREMENTO
// ═══════════════════════════════════════════════════════════════
function abrirFormIncrementoEscala(){
  // Remover modal previo si existía
  const prev = document.getElementById('modal-incremento-escala');
  if(prev) prev.remove();

  const hoy = new Date();
  const primDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);

  const modal = document.createElement('div');
  modal.id = 'modal-incremento-escala';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⇡ Cargar incremento general</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Crea una nueva versión de la escala aplicando el porcentaje a la vigente</div>
        </div>
        <button onclick="cerrarFormIncremento()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Porcentaje de incremento *</label>
          <div style="position:relative">
            <input type="number" id="inc-pct" step="0.01" placeholder="Ej: 7.5" oninput="previsualizarIncremento()"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 36px 10px 14px;color:var(--t1);font-size:14px;outline:none;font-family:var(--font-mono)">
            <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--t3);font-family:var(--font-mono);font-size:13px">%</span>
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Podés usar valores negativos para correcciones (ej: -2)</div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Vigencia desde *</label>
          <input type="date" id="inc-vigencia" value="${primDia}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:14px;outline:none;font-family:var(--font-mono)">
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Alcance</label>
          <select id="inc-alcance" onchange="previsualizarIncremento()"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:14px;outline:none">
            <option value="todas">Todas las categorías + Gerentes regionales</option>
            <option value="categorias">Solo categorías generales</option>
            <option value="regionales">Solo Gerentes regionales</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Comentario / observaciones</label>
          <textarea id="inc-comentario" rows="2" placeholder="Ej: Paritaria SEC abril 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit"></textarea>
        </div>

        <div id="inc-preview" style="display:none"></div>
      </div>

      <div style="padding:16px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarFormIncremento()" style="font-size:13px;padding:8px 16px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarIncremento()" style="font-size:13px;padding:8px 18px">Aplicar incremento</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target === modal) cerrarFormIncremento(); });
  setTimeout(()=>{ const el=document.getElementById('inc-pct'); if(el) el.focus(); }, 50);
}

function cerrarFormIncremento(){
  const m = document.getElementById('modal-incremento-escala');
  if(m) m.remove();
}

function previsualizarIncremento(){
  const pctEl = document.getElementById('inc-pct');
  const alcEl = document.getElementById('inc-alcance');
  const prev = document.getElementById('inc-preview');
  if(!pctEl || !alcEl || !prev) return;
  const pct = parseFloat(pctEl.value);
  if(isNaN(pct) || pct === 0){ prev.style.display='none'; prev.innerHTML=''; return; }

  const alcance = alcEl.value;
  const activa = getEscalaActiva();
  const factor = 1 + pct/100;
  const fN = n => '$ '+Math.round(n).toLocaleString('es-AR');

  // Muestra OP-INI, COO-SEMI, GER-SEN + un regional como sample
  const samples = [
    { label:'Operario · Inicial', monto: activa.categorias.find(c=>c.cat==='OP')?.tramos.INI, aplica: alcance!=='regionales' },
    { label:'Coordinador · Semi Senior', monto: activa.categorias.find(c=>c.cat==='COO')?.tramos.SEMI, aplica: alcance!=='regionales' },
    { label:'Gerente · Senior', monto: activa.categorias.find(c=>c.cat==='GER')?.tramos.SEN, aplica: alcance!=='regionales' },
    { label:'Gerente Reg. BsAs JM', monto: activa.regionales.find(r=>r.key==='BSAS-JM')?.monto, aplica: alcance!=='categorias' }
  ];

  prev.style.display = 'block';
  prev.innerHTML = `
    <div style="padding:12px 14px;border-radius:var(--r);background:var(--bg2);border:1px solid var(--border)">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Previsualización (4 muestras)</div>
      ${samples.map(s=>{
        if(!s.monto) return '';
        const nuevo = s.aplica ? s.monto * factor : s.monto;
        const color = s.aplica ? (pct>=0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)') : 'var(--t3)';
        const arrow = s.aplica ? (pct>=0?'↑':'↓') : '=';
        return `
          <div style="padding:5px 0;display:flex;justify-content:space-between;gap:10px;font-size:12px;font-family:var(--font-mono)">
            <span style="color:var(--t2)">${s.label}</span>
            <span><span style="color:var(--t3)">${fN(s.monto)}</span> <span style="color:${color}">${arrow}</span> <span style="color:var(--t1);font-weight:500">${fN(nuevo)}</span></span>
          </div>`;
      }).join('')}
    </div>`;
}

async function confirmarIncremento(){
  const pctEl = document.getElementById('inc-pct');
  const vigEl = document.getElementById('inc-vigencia');
  const alcEl = document.getElementById('inc-alcance');
  const comEl = document.getElementById('inc-comentario');
  if(!pctEl || !vigEl || !alcEl) return;

  const pct = parseFloat(pctEl.value);
  const vig = vigEl.value;
  const alc = alcEl.value || 'todas';
  const com = (comEl?.value || '').trim();

  if(isNaN(pct) || pct === 0){ alert('Ingresá un porcentaje distinto de cero.'); pctEl.focus(); return; }
  if(!vig){ alert('Ingresá la fecha de vigencia.'); vigEl.focus(); return; }

  const existentes = getEscalaVersiones();
  const duplicada = existentes.find(v => v.vigencia === vig && v.origen !== 'inicial');
  if(duplicada){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`Ya existe una versión con vigencia ${_fechaBonita(vig)} ("${duplicada.mesLabel}").<br><br>¿Querés crear otra versión igual?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  const activa = getEscalaActiva();
  if(vig < activa.vigencia){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`La fecha ${_fechaBonita(vig)} es anterior a la versión actualmente activa (${_fechaBonita(activa.vigencia)}).<br><br>Se creará igual pero la "activa" seguirá siendo la más reciente.<br><br>¿Continuar?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  aplicarIncrementoEscala(pct, vig, alc, com);
  cerrarFormIncremento();
  renderEscalaSalarial();
  escalaTab('hist');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN
// ═══════════════════════════════════════════════════════════════
function exportarEscalaCSV(){
  const BOM = '\ufeff';
  const esc = getEscalaActiva();
  let csv = `Escala salarial unificada — ${esc.mesLabel}\n`;
  csv += `Vigencia desde;${_fechaBonita(esc.vigencia)}\n\n`;
  csv += 'Categoria;Codigo;Nota;Dif. mes ant.;Inicial;Junior;Semi Senior;Senior\n';
  esc.categorias.forEach(c=>{
    csv += `"${c.label}";${c.cat};"${c.nota||''}";${(c.difMesAnt*100).toFixed(1).replace('.',',')}%;${c.tramos.INI};${c.tramos.JUN};${c.tramos.SEMI};${c.tramos.SEN}\n`;
  });
  csv += '\nGerentes Regionales\n';
  csv += 'Codigo;Descripcion;Dif. mes ant.;Monto\n';
  esc.regionales.forEach(r=>{
    csv += `${r.key};"${r.label} - ${r.desc}";${(r.difMesAnt*100).toFixed(1).replace('.',',')}%;${r.monto}\n`;
  });
  const blob = new Blob([BOM+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Escala_unificada_${esc.vigencia}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

function exportarEscalaXLSX(){
  const doExport = () => {
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const esc = getEscalaActiva();

    // Hoja 1: Escala vigente
    const rows = [
      [`Escala salarial unificada — ${esc.mesLabel}`,''],
      ['Vigencia desde:', _fechaBonita(esc.vigencia)],
      [],
      ['Categoría','Código','Nota','Dif. mes ant.','Inicial','Junior','Semi Senior','Senior']
    ];
    esc.categorias.forEach(c=>{
      rows.push([c.label, c.cat, c.nota||'', c.difMesAnt, c.tramos.INI, c.tramos.JUN, c.tramos.SEMI, c.tramos.SEN]);
    });
    rows.push([]);
    rows.push(['Gerentes regionales','','','','','','','']);
    rows.push(['Código','Título','Descripción','Dif. mes ant.','Monto','','','']);
    esc.regionales.forEach(r=>{
      rows.push([r.key, r.label, r.desc, r.difMesAnt, r.monto, '','','']);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:34},{wch:12},{wch:30},{wch:14},{wch:16},{wch:16},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws, 'Vigente');

    // Hoja 2: Histórico
    const versiones = getEscalaVersiones();
    const histRows = [
      ['Histórico de versiones de la escala unificada'],
      [],
      ['Vigencia','Mes','Origen','%','Alcance','Comentario','Creado','Por']
    ];
    versiones.forEach(v=>{
      histRows.push([
        _fechaBonita(v.vigencia),
        v.mesLabel,
        v.origen,
        v.porcentaje ?? '',
        v.alcance,
        v.comentario||'',
        v.creado ? new Date(v.creado).toLocaleString('es-AR') : '',
        v.creadoPor||''
      ]);
    });
    const wsH = XLSX.utils.aoa_to_sheet(histRows);
    wsH['!cols'] = [{wch:14},{wch:16},{wch:14},{wch:8},{wch:18},{wch:40},{wch:20},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsH, 'Histórico');

    // Hoja 3: Todas las versiones con valores
    versiones.forEach(v=>{
      const r = [
        [`${v.mesLabel} — ${_fechaBonita(v.vigencia)}`,''],
        ['Origen:', v.origen, 'Porcentaje:', v.porcentaje??'-', 'Alcance:', v.alcance],
        ['Comentario:', v.comentario||''],
        [],
        ['Categoría','Código','Inicial','Junior','Semi Senior','Senior']
      ];
      v.categorias.forEach(c=>{ r.push([c.label, c.cat, c.tramos.INI, c.tramos.JUN, c.tramos.SEMI, c.tramos.SEN]); });
      r.push([]);
      r.push(['Regionales','Descripción','Monto']);
      v.regionales.forEach(reg=>{ r.push([reg.label, reg.desc, reg.monto]); });
      const wsV = XLSX.utils.aoa_to_sheet(r);
      wsV['!cols']=[{wch:34},{wch:30},{wch:16},{wch:16},{wch:16},{wch:16}];
      // nombre de hoja: truncado y sin caracteres inválidos
      const name = (v.mesLabel || v.vigencia).replace(/[\/\\?*[\]:]/g,'').slice(0,28);
      XLSX.utils.book_append_sheet(wb, wsV, name);
    });

    XLSX.writeFile(wb, `Escala_unificada_${esc.vigencia}.xlsx`);
  };
  if(window.XLSX){ doExport(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = doExport;
  s.onerror = () => alert('No se pudo cargar la librería de Excel. Probá con CSV.');
  document.head.appendChild(s);
}

async function renderEvaluacionesRRHH(){
  rrhhEvalTab('pend');
  await renderEvalPendientesRRHH();
  await actualizarBadgesEvalRRHH();
}

async function _tipoLabel(tipo, anio){
  if(tipo === 'anual') return `📅 Anual ${anio||''}`.trim();
  if(tipo.startsWith('prueba_')) return `🔔 Prueba ${tipo.split('_')[1]} días`;
  return tipo;
}

async function renderEvalPendientesRRHH(){
  const div = document.getElementById('rrhh-eval-pend-list');
  if(!div) return;
  const q = (document.getElementById('rrhh-eval-pend-search')?.value||'').toLowerCase();
  const filtroTipo = document.getElementById('rrhh-eval-pend-tipo')?.value || '';

  const nomina = getNomina();
  const evals = await getEvaluaciones();
  let pendientes = evals.filter(e => e.estado === 'realizada');

  if(filtroTipo){
    if(filtroTipo === 'anual') pendientes = pendientes.filter(e=>e.tipo==='anual');
    else pendientes = pendientes.filter(e=>e.tipo===filtroTipo);
  }

  let filas = pendientes.map(ev=>{
    const emp = nomina.find(e=>e.leg===ev.leg);
    return { ev, emp };
  }).filter(r=>r.emp);

  if(q) filas = filas.filter(({emp})=>emp.nom.toLowerCase().includes(q) || emp.leg.includes(q) || (emp.emp||'').toLowerCase().includes(q));

  if(!filas.length){
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">📭 No hay evaluaciones pendientes de registrar</div>';
    return;
  }

  filas.sort((a,b)=>(a.ev.fechaRealizada||'').localeCompare(b.ev.fechaRealizada||'') || a.emp.nom.localeCompare(b.emp.nom));

  div.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 160px 140px 140px 140px 200px;padding:8px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
    <span>Legajo</span><span>Empleado</span><span>Empresa</span><span>Tipo</span><span>Finalizada</span><span>Evaluador</span><span style="text-align:right">Acciones</span>
  </div>`+filas.map(({ev, emp})=>`
    <div style="display:grid;grid-template-columns:80px 1fr 160px 140px 140px 140px 200px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:6px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">${emp.leg}</div>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${emp.nom}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${emp.tarea||''}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${emp.emp||'—'}</div>
      <div style="font-size:11px;color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${fechaDDMMYYYY(ev.fechaRealizada)}</div>
      <div style="font-size:11px;color:var(--t1)">${(ev.evaluadorNom||'—').split(',')[0]}</div>
      <div style="text-align:right;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>
        <button class="btn btn-primary" style="font-size:11px;padding:3px 10px" onclick="registrarEvalRRHH(${ev.id})">✓ Registrar</button>
      </div>
    </div>`).join('');
}

async function registrarEvalRRHH(evId){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede registrar evaluaciones','var(--red)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Registrar esta evaluación en el legajo digital del empleado?<br><br>Una vez registrada, queda archivada en forma definitiva y el empleado podrá consultarla desde "Mis Datos".'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const evals = await getEvaluaciones();
  const ev = evals.find(e=>e.id===evId);
  if(!ev){ toast('⚠ Evaluación no encontrada','var(--red)'); return; }
  if(ev.estado !== 'realizada'){ toast('⚠ Solo se pueden registrar evaluaciones finalizadas por el gerente','var(--yellow)'); return; }
  ev.estado = 'registrada';
  ev.fechaRegistro = new Date().toISOString().slice(0,10);
  ev.registradoPor = currentUser?.emp?.leg || null;
  ev.registradoPorNom = currentUser?.emp?.nom || null;
  await updateEvaluacion(ev);
  toast('✓ Evaluación registrada en el legajo digital','var(--green)', 4000);
  renderEvalPendientesRRHH();
  actualizarBadgesEvalRRHH();
}

async function renderEvalHistoricoRRHH(){
  const div = document.getElementById('rrhh-eval-hist-list');
  if(!div) return;
  const q = (document.getElementById('rrhh-eval-hist-search')?.value||'').toLowerCase();
  const filtroTipo = document.getElementById('rrhh-eval-hist-tipo')?.value || '';
  const filtroEstado = document.getElementById('rrhh-eval-hist-estado')?.value || '';
  const filtroEmp = document.getElementById('rrhh-eval-hist-emp')?.value || '';

  const nomina = getNomina();
  const evals = await getEvaluaciones();

  // NO descartar filas si el empleado no está en la nómina actual.
  // Reconstruimos un empleado mínimo con el snapshot guardado en la evaluación
  // o el legajo, para que siempre se vean todas las evaluaciones históricas.
  let filas = evals.map(ev=>{
    let emp = nomina.find(e=>e.leg===ev.leg);
    if(!emp){
      emp = {
        leg: ev.leg,
        nom: ev.empNom || ev.nom || '(empleado no encontrado)',
        emp: ev.empEmpresa || ev.empresa || '—',
        lugar: ev.empLugar || '—',
        tarea: ev.empTarea || '',
        _baja: true
      };
    }
    return { ev, emp };
  });

  if(q) filas = filas.filter(({emp})=>
    (emp.nom||'').toLowerCase().includes(q) ||
    (emp.leg||'').includes(q) ||
    (emp.emp||'').toLowerCase().includes(q) ||
    (emp.lugar||emp.localidad||emp.loc||'').toLowerCase().includes(q)
  );
  if(filtroTipo){
    if(filtroTipo === 'prueba') filas = filas.filter(({ev})=>ev.tipo.startsWith('prueba_'));
    else filas = filas.filter(({ev})=>ev.tipo===filtroTipo);
  }
  if(filtroEstado) filas = filas.filter(({ev})=>ev.estado===filtroEstado);
  if(filtroEmp) filas = filas.filter(({emp})=>emp.emp===filtroEmp);

  if(!filas.length){
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Sin resultados</div>';
    return;
  }

  // Ordenar: más recientes primero (por fechaRealizada o fechaProgramada)
  filas.sort((a,b)=>{
    const fa = a.ev.fechaRealizada || a.ev.fechaProgramada || '';
    const fb = b.ev.fechaRealizada || b.ev.fechaProgramada || '';
    return fb.localeCompare(fa);
  });

  const estadoLabel = (ev)=>{
    if(ev.estado==='registrada') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">✓ Registrada</span>`;
    if(ev.estado==='realizada')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.3);color:var(--accent2);font-family:var(--font-mono)">📤 En RR.HH.</span>`;
    if(ev.estado==='pendiente')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);font-family:var(--font-mono)">⏳ Pendiente gerente</span>`;
    if(ev.estado==='no_aplica')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(115,115,115,.1);border:1px solid rgba(115,115,115,.3);color:var(--t3);font-family:var(--font-mono)">— No aplica</span>`;
    return '';
  };

  const thSt = 'padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--bg2);position:sticky;top:0;z-index:1;white-space:nowrap';
  const tdSt = 'padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:middle;font-size:11px;color:var(--t2)';

  div.innerHTML = `<div style="width:100%;overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;table-layout:auto;min-width:1200px">
    <thead><tr>
      <th style="${thSt};width:70px">Legajo</th>
      <th style="${thSt};min-width:260px">Apellido y Nombre</th>
      <th style="${thSt};min-width:130px">Empresa</th>
      <th style="${thSt};min-width:130px">Locación</th>
      <th style="${thSt};min-width:130px">Tipo</th>
      <th style="${thSt};min-width:160px">Evaluador</th>
      <th style="${thSt};width:100px">Fecha</th>
      <th style="${thSt};width:130px">Estado</th>
      <th style="${thSt};width:80px;text-align:right">Ver</th>
    </tr></thead>
    <tbody>
    ${filas.map(({ev, emp})=>{
      const fecha = ev.estado==='registrada' ? ev.fechaRegistro : ev.fechaRealizada || ev.fechaProgramada;
      const locacion = emp.lugar || emp.localidad || emp.loc || '—';
      // Evaluador: real > esperado (del validador del empleado) > —
      let evaluadorDisplay = '—';
      let evaluadorTitle = '';
      if(ev.evaluadorNom){
        evaluadorDisplay = ev.evaluadorNom;
        evaluadorTitle = ev.evaluadorNom;
      } else if(emp.validador){
        const mgr = nomina.find(x => x.leg === emp.validador);
        if(mgr){
          evaluadorDisplay = `${mgr.nom} <span style="color:var(--t3);font-style:italic;font-size:9px">(esperado)</span>`;
          evaluadorTitle = `Evaluador esperado: ${mgr.nom}`;
        }
      }
      const bajaFlag = emp._baja
        ? ' <span style="font-size:9px;padding:1px 5px;border-radius:6px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--red);font-family:var(--font-mono);margin-left:6px">EX</span>'
        : '';
      const esc = s => (s||'').replace(/"/g,'&quot;');
      return `<tr style="${emp._baja?'opacity:.75':''}">
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3)">${emp.leg||'—'}</td>
        <td style="${tdSt}">
          <div style="font-size:12px;font-weight:500;color:var(--t1)" title="${esc(emp.nom)}">${emp.nom||'(sin nombre)'}${bajaFlag}</div>
          ${emp.tarea ? `<div style="font-size:10px;color:var(--t3);margin-top:2px" title="${esc(emp.tarea)}">${emp.tarea}</div>` : ''}
        </td>
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3);font-size:10px">${emp.emp||'—'}</td>
        <td style="${tdSt};color:var(--t3);font-size:10px">${locacion}</td>
        <td style="${tdSt};color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</td>
        <td style="${tdSt};color:var(--t2);font-size:11px" title="${esc(evaluadorTitle)}">${evaluadorDisplay}</td>
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3);font-size:10px;white-space:nowrap">${fechaDDMMYYYY(fecha)}</td>
        <td style="${tdSt}">${estadoLabel(ev)}</td>
        <td style="${tdSt};text-align:right">
          ${ev.datos ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>` : `<span style="font-size:10px;color:var(--t3);font-style:italic">sin datos</span>`}
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
  </div>`;
}

async function actualizarBadgesEvalRRHH(){
  if(currentUser?.role !== 'rrhh') return;
  const evals = await getEvaluaciones();
  const pendRRHH = evals.filter(e=>e.estado==='realizada').length;

  const cardBadge = document.getElementById('rrhh-badge-eval');
  if(cardBadge){
    if(pendRRHH > 0){
      cardBadge.style.display = 'inline-block';
      cardBadge.textContent = `${pendRRHH} a registrar`;
    } else cardBadge.style.display = 'none';
  }
  const pendBadge = document.getElementById('rrhh-eval-pend-badge');
  if(pendBadge){
    if(pendRRHH > 0){
      pendBadge.style.display = 'inline-block';
      pendBadge.textContent = pendRRHH;
    } else pendBadge.style.display = 'none';
  }
}

