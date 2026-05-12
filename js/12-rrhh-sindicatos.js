// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE SINDICATOS · % de aporte y adicional antigüedad
// ═══════════════════════════════════════════════════════════════
// Valores de referencia. Editables desde RR.HH. → Sindicatos.
// Código en blanco ('') o 'SIN SINDICATO' → sin antigüedad y sin descuento.
const SINDICATOS_DEFAULT = [
  { codigo: 'COMERCIO', nombre: 'Empleados de Comercio (SEC/FAECYS)',          pctEmpleado: 2.5, pctPatronal: 0.5, pctAntigPorAnio: 1, nota: 'Cuota sindical 2% + FAECYS 0,5%' },
  { codigo: 'UOM',      nombre: 'Unión Obrera Metalúrgica',                    pctEmpleado: 2.5, pctPatronal: 1.5, pctAntigPorAnio: 1, nota: 'Cuota sindical + FONDO' },
  { codigo: 'ASIMRA',   nombre: 'Sup. Industria Metalmecánica',                pctEmpleado: 3,   pctPatronal: 1.5, pctAntigPorAnio: 1, nota: 'Cuota sindical + fondo cultura' },
  { codigo: 'UOYEP',    nombre: 'Unión Obreros y Emp. Plásticos',              pctEmpleado: 2,   pctPatronal: 1.5, pctAntigPorAnio: 1, nota: 'Aporte UOYEP' },
  { codigo: 'UOCRA',    nombre: 'Unión Obrera de la Construcción (UOCRA)',     pctEmpleado: 2,   pctPatronal: 2,   pctAntigPorAnio: 1, nota: 'Cuota sindical construcción' },
  { codigo: 'UECARA',   nombre: 'Empl. de Conducción (UECARA)',                pctEmpleado: 2.5, pctPatronal: 1.5, pctAntigPorAnio: 1, nota: 'Personal jerárquico construcción' }
];

const SINDICATOS_STORAGE_KEY = 'lsg_sindicatos';

function getSindicatos(){
  try {
    const raw = localStorage.getItem(SINDICATOS_STORAGE_KEY);
    if(raw){ return JSON.parse(raw); }
  } catch(e){}
  return JSON.parse(JSON.stringify(SINDICATOS_DEFAULT));
}

function saveSindicatos(arr){
  localStorage.setItem(SINDICATOS_STORAGE_KEY, JSON.stringify(arr));
}

function getSindicatoByCodigo(codigo){
  if(!codigo || !String(codigo).trim()) return null;
  const norm = String(codigo).trim().toUpperCase();
  // Aliases: códigos históricos del DB → códigos actuales del catálogo
  const ALIAS = { 'SEC':'COMERCIO', 'EMPLEADOS DE COMERCIO':'COMERCIO', 'PLASTICO':'UOYEP' };
  const key = ALIAS[norm] || norm;
  return getSindicatos().find(s => s.codigo.toUpperCase() === key) || null;
}

// Helpers: ¿el empleado tiene sindicato asignado?
// Trata como "sin sindicato" los códigos vacíos y "FC" (Fuera de Convenio).
// Los empleados FC NO calculan antigüedad, NO calculan presentismo
// y NO aportan al sindicato.
function empleadoSinSindicato(emp){
  if(!emp) return true;
  const c = (emp.cod_sindicato || '').trim().toUpperCase();
  return !c || c === 'NINGUNO' || c === 'SIN SINDICATO' || c === 'FC';
}

// ¿El empleado es Fuera de Convenio (FC)?
// Para FC: sin antigüedad, sin presentismo, sin aporte sindical.
function empleadoFueraConvenio(emp){
  if(!emp) return false;
  const c = (emp.cod_sindicato || '').trim().toUpperCase();
  return c === 'FC';
}

function getPctSindicatoEmpleado(emp){
  if(empleadoSinSindicato(emp)) return 0;
  const s = getSindicatoByCodigo(emp.cod_sindicato);
  return s ? s.pctEmpleado : 0;
}

function getPctSindicatoPatronal(emp){
  if(empleadoSinSindicato(emp)) return 0;
  const s = getSindicatoByCodigo(emp.cod_sindicato);
  return s ? s.pctPatronal : 0;
}

function getPctAntiguedadPorAnio(emp, paramsFallback){
  if(empleadoSinSindicato(emp)) return 0;
  const s = getSindicatoByCodigo(emp.cod_sindicato);
  if(s && s.pctAntigPorAnio !== undefined && s.pctAntigPorAnio !== null) return s.pctAntigPorAnio;
  return paramsFallback?.pctAntiguedadPorAnio || 0;
}

function getNombreSindicato(emp){
  if(empleadoFueraConvenio(emp)) return 'Fuera de Convenio';
  if(empleadoSinSindicato(emp)) return '';
  const s = getSindicatoByCodigo(emp.cod_sindicato);
  return s ? s.nombre : (emp.cod_sindicato || '');
}

// ═══════════════════════════════════════════════════════════════
// PANEL RR.HH. — SINDICATOS (ABM editable)
// ═══════════════════════════════════════════════════════════════
function renderSindicatosPanel(){
  const cont = document.getElementById('sindicatos-content');
  if(!cont) return;
  const sindicatos = getSindicatos();
  // Contar empleados por sindicato (con aliases aplicados)
  const nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
  const conteoSind = {};
  let sinSind = 0;     // realmente sin sindicato (vacío o "Sin sindicato")
  let fueraConv = 0;   // marcados explícitamente como FC
  for(const e of nomina){
    if(empleadoFueraConvenio(e)){ fueraConv++; continue; }
    if(empleadoSinSindicato(e)){ sinSind++; continue; }
    const s = getSindicatoByCodigo(e.cod_sindicato);
    const k = s ? s.codigo : (e.cod_sindicato || '').toUpperCase();
    conteoSind[k] = (conteoSind[k]||0) + 1;
  }

  let html = `
    <div class="card" style="padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;color:var(--t1);font-weight:600;margin-bottom:3px">Catálogo de Sindicatos</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          ${sindicatos.length} sindicatos activos
          · Fuera de Convenio (FC): <b style="color:${fueraConv>0?'rgb(94,194,255)':'var(--t3)'}">${fueraConv}</b>
          ${sinSind>0?`· Sin asignar: <b style="color:rgb(251,191,36)">${sinSind}</b>`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="restablecerSindicatosDefault()" style="font-size:12px;padding:6px 14px;color:var(--yellow);border-color:rgba(234,179,8,.3)" title="Restablecer catálogo a los 6 sindicatos por defecto">↺ Restaurar</button>
        <button class="btn btn-primary" onclick="abrirFormSindicato()" style="font-size:12px;padding:6px 14px">+ Nuevo sindicato</button>
      </div>
    </div>

    <div style="padding:10px 14px;background:rgba(61,127,255,.04);border:1px solid rgba(61,127,255,.2);border-radius:var(--r);margin-bottom:14px;font-size:11px;color:var(--t2);line-height:1.55">
      <strong style="color:var(--accent2)">ℹ Cómo funciona:</strong> cada empleado del ABM tiene asignado un <b>código de sindicato</b>. En la liquidación,
      el <b>adicional por antigüedad</b> y los <b>descuentos sindicales</b> se calculan usando el % definido para ese código.
      <br>Los empleados <b>FC (Fuera de Convenio)</b> no reciben adicional por antigüedad, no calculan presentismo y no tienen descuentos sindicales.
      Los empleados con código vacío en la base se marcan automáticamente como <b>FC</b>.
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;min-width:780px;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:110px">Código</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Nombre</th>
              <th style="padding:12px 10px;text-align:right;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:110px">% Empleado</th>
              <th style="padding:12px 10px;text-align:right;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:110px">% Patronal</th>
              <th style="padding:12px 10px;text-align:right;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:130px">% Antig./año</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px">Empleados</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:140px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${sindicatos.map((s,i)=>{
              const rowBg = i%2===0 ? 'transparent' : 'rgba(255,255,255,.01)';
              const n = conteoSind[s.codigo] || 0;
              return `
              <tr style="border-bottom:1px solid var(--border);background:${rowBg}">
                <td style="padding:14px">
                  <span style="font-size:11px;font-family:var(--font-mono);padding:3px 10px;border-radius:10px;background:rgba(236,72,153,.1);color:rgb(236,72,153);border:1px solid rgba(236,72,153,.3);font-weight:600">${s.codigo}</span>
                </td>
                <td style="padding:14px;color:var(--t1)">
                  <div>${s.nombre}</div>
                  ${s.nota?`<div style="font-size:10px;color:var(--t3);margin-top:3px">${s.nota}</div>`:''}
                </td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:rgb(239,68,68);font-weight:500">${(+s.pctEmpleado).toFixed(2)}%</td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t2)">${(+s.pctPatronal).toFixed(2)}%</td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94)">${(+s.pctAntigPorAnio).toFixed(2)}%</td>
                <td style="padding:12px 10px;text-align:center;font-family:var(--font-mono);color:var(--t1);font-size:13px">${n}</td>
                <td style="padding:12px 10px;text-align:center">
                  <button class="btn btn-ghost" onclick="abrirFormSindicato('${s.codigo}')" style="font-size:11px;padding:4px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✎</button>
                  <button class="btn btn-ghost" onclick="eliminarSindicato('${s.codigo}')" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:rgba(239,68,68,.3);margin-left:4px">✕</button>
                </td>
              </tr>`;
            }).join('')}
            ${sinSind>0?`
              <tr style="border-top:2px solid var(--border);background:var(--bg2)">
                <td style="padding:14px">
                  <span style="font-size:11px;font-family:var(--font-mono);padding:3px 10px;border-radius:10px;background:var(--bg3);color:var(--t3);border:1px solid var(--border)">—</span>
                </td>
                <td style="padding:14px;color:var(--t2);font-style:italic">Sin sindicato asignado</td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t3)">0,00%</td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t3)">0,00%</td>
                <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t3)">0,00%</td>
                <td style="padding:12px 10px;text-align:center;font-family:var(--font-mono);color:rgb(251,191,36);font-size:13px;font-weight:500">${sinSind}</td>
                <td></td>
              </tr>
            `:''}
          </tbody>
        </table>
      </div>
    </div>`;

  cont.innerHTML = html;
}

// ── ABM de sindicato ──
function abrirFormSindicato(codigoEdit){
  const prev = document.getElementById('modal-sindicato');
  if(prev) prev.remove();

  const s = codigoEdit ? getSindicatos().find(x => x.codigo === codigoEdit) : null;
  const esEdicion = !!s;

  const modal = document.createElement('div');
  modal.id = 'modal-sindicato';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${esEdicion?'✎ Editar sindicato':'+ Nuevo sindicato'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${esEdicion?'Modifica los porcentajes del sindicato ' + s.codigo:'Dá de alta un nuevo sindicato en el catálogo'}</div>
        </div>
        <button onclick="cerrarFormSindicato()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:20px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:160px 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Código *</label>
            <input type="text" id="sind-codigo" maxlength="20" value="${esEdicion?s.codigo:''}" ${esEdicion?'readonly':''} placeholder="Ej: UATRE"
              style="width:100%;background:${esEdicion?'var(--bg3)':'var(--bg2)'};border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:${esEdicion?'var(--t3)':'var(--t1)'};font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Nombre *</label>
            <input type="text" id="sind-nombre" value="${esEdicion?(s.nombre||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: Unión Argentina Trabajadores Rurales"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">% Empleado *</label>
            <input type="number" step="0.01" min="0" id="sind-pct-emp" value="${esEdicion?s.pctEmpleado:'2.5'}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:4px">Descuento en recibo</div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">% Patronal *</label>
            <input type="number" step="0.01" min="0" id="sind-pct-pat" value="${esEdicion?s.pctPatronal:'1.5'}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:4px">Contribución empresa</div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">% Antig./año *</label>
            <input type="number" step="0.01" min="0" id="sind-pct-ant" value="${esEdicion?s.pctAntigPorAnio:'1'}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:4px">Adicional por antigüedad</div>
          </div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Nota / observaciones</label>
          <input type="text" id="sind-nota" value="${esEdicion?(s.nota||'').replace(/"/g,'&quot;'):''}" placeholder="Opcional — ej: Cuota sindical + fondo cultural"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
      </div>

      <div style="padding:16px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarFormSindicato()" style="font-size:13px;padding:8px 16px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarSindicato(${esEdicion?`'${s.codigo}'`:'null'})" style="font-size:13px;padding:8px 18px">${esEdicion?'Guardar cambios':'Dar de alta'}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) cerrarFormSindicato(); });
  setTimeout(()=>{ const el=document.getElementById(esEdicion?'sind-nombre':'sind-codigo'); if(el) el.focus(); }, 50);
}

async function cerrarFormSindicato(){
  const m = document.getElementById('modal-sindicato');
  if(m) m.remove();
}

async function guardarSindicato(codigoOriginal){
  const codigo = (document.getElementById('sind-codigo').value || '').trim().toUpperCase();
  const nombre = (document.getElementById('sind-nombre').value || '').trim();
  const pctEmp = parseFloat(document.getElementById('sind-pct-emp').value);
  const pctPat = parseFloat(document.getElementById('sind-pct-pat').value);
  const pctAnt = parseFloat(document.getElementById('sind-pct-ant').value);
  const nota = (document.getElementById('sind-nota').value || '').trim();

  if(!codigo){ showAlert('El código es obligatorio.', 'warning'); return; }
  if(!nombre){ showAlert('El nombre es obligatorio.', 'warning'); return; }
  if(isNaN(pctEmp) || pctEmp < 0){ showAlert('El % empleado debe ser un número ≥ 0.', 'warning'); return; }
  if(isNaN(pctPat) || pctPat < 0){ showAlert('El % patronal debe ser un número ≥ 0.', 'warning'); return; }
  if(isNaN(pctAnt) || pctAnt < 0){ showAlert('El % antigüedad/año debe ser un número ≥ 0.', 'warning'); return; }

  const lista = getSindicatos();
  if(!codigoOriginal){
    // Alta: verificar que no exista
    if(lista.some(s => s.codigo.toUpperCase() === codigo)){
      showAlert(`Ya existe un sindicato con código ${codigo}. Edítalo en lugar de crear uno nuevo.`, 'warning');
      return;
    }
    lista.push({ codigo, nombre, pctEmpleado:pctEmp, pctPatronal:pctPat, pctAntigPorAnio:pctAnt, nota });
  } else {
    // Edición: buscar y actualizar
    const idx = lista.findIndex(s => s.codigo === codigoOriginal);
    if(idx >= 0){
      lista[idx] = { ...lista[idx], nombre, pctEmpleado:pctEmp, pctPatronal:pctPat, pctAntigPorAnio:pctAnt, nota };
    }
  }
  saveSindicatos(lista);
  cerrarFormSindicato();
  renderSindicatosPanel();
  toast(`✓ Sindicato ${codigo} ${codigoOriginal?'actualizado':'agregado'}`, 'var(--green)');
}

async function eliminarSindicato(codigo){
  const lista = getSindicatos();
  const s = lista.find(x => x.codigo === codigo);
  if(!s) return;

  // Contar cuántos empleados lo usan
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const enUso = nomina.filter(e => {
    if(empleadoSinSindicato(e)) return false;
    const sEmp = getSindicatoByCodigo(e.cod_sindicato);
    return sEmp && sEmp.codigo === codigo;
  }).length;

  const msg = enUso > 0
    ? `¿Eliminar el sindicato "${s.codigo} — ${s.nombre}"?\n\n⚠ ATENCIÓN: ${enUso} empleado${enUso!==1?'s':''} tienen este sindicato asignado.\nAl eliminarlo, esos empleados quedarán SIN sindicato (sin antigüedad ni descuentos sindicales).\n\n¿Continuar?`
    : `¿Eliminar el sindicato "${s.codigo} — ${s.nombre}"?\n\nNo hay empleados asignados a este sindicato.`;

  const _cfm12 = await showConfirm({titulo:"Confirmar acción",mensaje:msg,labelOk:"Confirmar",peligroso:true});
  if(!_cfm12) return;

  saveSindicatos(lista.filter(x => x.codigo !== codigo));
  renderSindicatosPanel();
  toast(`✓ Sindicato ${codigo} eliminado`, 'var(--red)');
}

async function restablecerSindicatosDefault(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Restablecer el catálogo a los 6 sindicatos por defecto (COMERCIO, UOM, ASIMRA, UOYEP, UOCRA, UECARA)?<br><br>Se perderán los sindicatos personalizados que hayas agregado.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  localStorage.removeItem(SINDICATOS_STORAGE_KEY);
  renderSindicatosPanel();
  toast('✓ Catálogo restaurado', 'var(--green)');
}

