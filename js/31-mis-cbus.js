// ═══════════════════════════════════════════════════════════════════════════
// CBU GESTIÓN — UI compartida entre Mis Datos (empleado) y ABM Empleado (RR.HH.)
// ───────────────────────────────────────────────────────────────────────────
// Las funciones aceptan `leg` (legajo objetivo) y `actor` ('EMPLEADO' | 'RRHH').
// Cuando actor === 'EMPLEADO', los cambios generan novedades para RR.HH.
// Cuando actor === 'RRHH', los cambios quedan en auditoría pero NO generan
// novedad (RR.HH. ya está modificando directamente).
// ═══════════════════════════════════════════════════════════════════════════

// ─── Wrappers para Mis Datos (empleado actual) ────────────────────────────
function toggleMisCBUs(){
  const w = document.getElementById('mis-cbus-wrap');
  if(!w) return;
  if(w.style.display === 'none' || !w.style.display){
    w.style.display = 'block';
    renderMisCBUs();
  } else {
    w.style.display = 'none';
  }
}
function renderMisCBUs(){
  if(!currentUser) return;
  const leg = currentUser.emp.leg;
  const nom = currentUser.emp.nom;
  renderCBUsDeLegajo(leg, nom, 'mis-cbus-content', 'EMPLEADO');
}

// ─── Función genérica de render (reutilizada por empleado y RRHH) ─────────
function renderCBUsDeLegajo(leg, nom, contId, actor){
  const cont = document.getElementById(contId);
  if(!cont) return;
  const activos = (typeof getCBUsActivos === 'function') ? getCBUsActivos(leg) : [];
  const histTodos = (typeof getCBUsHistorial === 'function') ? getCBUsHistorial(leg) : [];
  const cerrados = histTodos.filter(c => c.vigenciaHasta);

  const sumaActivos = activos.reduce((s,c) => s + Number(c.porcentaje || 0), 0);
  const sumaOk = Math.abs(sumaActivos - 100) < 0.01;

  const estadoSuma = activos.length === 0
    ? `<div style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:10px 14px;font-size:12px;color:var(--yellow);line-height:1.5">⚠ ${actor==='EMPLEADO' ? 'No tenés ninguna cuenta cargada. Agregá al menos una para que se acredite tu sueldo.' : 'El empleado no tiene cuentas activas cargadas.'}</div>`
    : (sumaOk
      ? `<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:var(--r);padding:8px 14px;font-size:12px;color:var(--green)">✓ Distribución completa: 100%</div>`
      : `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:8px 14px;font-size:12px;color:var(--red)">⚠ Los porcentajes suman ${sumaActivos.toFixed(2)}% — ${actor==='EMPLEADO' ? 'debés' : 'hace falta'} ajustar para que sumen 100%</div>`);

  const nomEnc = encodeURIComponent(nom || '');
  const filasActivos = activos.map(c => `
    <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);align-items:center">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          🏦 ${_cbuEsc(c.banco || '?')}
          <span style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid var(--border);color:var(--t3);font-family:var(--font-mono)">${c.tipoCuenta === 'CC' ? 'Cta. Cte.' : 'Caja de Ahorro'}</span>
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:3px">${formatCBUDisplay(c.cbu)}</div>
        ${c.alias ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">Alias: <span style="font-family:var(--font-mono)">${_cbuEsc(c.alias)}</span></div>` : ''}
        ${c.titularAlt ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">Titular: ${_cbuEsc(c.titularAlt)}</div>` : ''}
        <div style="font-size:10px;color:var(--t3);margin-top:4px;font-family:var(--font-mono)">Vigente desde ${_cbuFmtFecha(c.vigenciaDesde)}${c.modificadoPor ? ' · cargado por ' + c.modificadoPor.toLowerCase() : ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:600;color:var(--accent2);font-family:var(--font-mono)">${Number(c.porcentaje).toFixed(c.porcentaje % 1 === 0 ? 0 : 2)}%</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">del neto</div>
      </div>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="abrirModalEditarCBU('${leg}','${nomEnc}','${c.id}','${actor}','${contId}')">✎ Editar</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="quitarCBUDeLegajo('${leg}','${nomEnc}','${c.id}','${actor}','${contId}')">✕ Quitar</button>
    </div>
  `).join('');

  const filasHist = cerrados.length ? cerrados.slice().reverse().slice(0, 30).map(c => `
    <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);font-size:11px;align-items:center">
      <div>
        <span style="color:var(--t1);font-weight:500">${_cbuEsc(c.banco || '?')}</span>
        <span style="color:var(--t3);font-family:var(--font-mono);margin-left:6px">${formatCBUDisplay(c.cbu).slice(0,29)}…</span>
      </div>
      <div style="color:var(--t3);font-family:var(--font-mono)">${Number(c.porcentaje).toFixed(0)}%</div>
      <div style="color:var(--t3);font-family:var(--font-mono);font-size:10px">${_cbuFmtFecha(c.vigenciaDesde)} → ${_cbuFmtFecha(c.vigenciaHasta)}</div>
      <div style="color:var(--t3);font-family:var(--font-mono);font-size:10px">${(c.modificadoPor || '').toLowerCase()}</div>
    </div>
  `).join('') : '<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px">Sin cambios previos.</div>';

  const banner = actor === 'EMPLEADO'
    ? `<div style="background:rgba(61,127,255,.06);border:1px solid rgba(61,127,255,.25);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--accent2);margin-bottom:14px;line-height:1.6">💡 Podés <strong>repartir tu sueldo entre varias cuentas</strong> indicando el porcentaje del neto que va a cada una. Los cambios se aplican al instante y RR.HH. recibe el aviso automáticamente.</div>`
    : '';

  cont.innerHTML = `
    ${banner}
    <div style="margin-bottom:14px">${estadoSuma}</div>

    <div class="card" style="padding:0;margin-bottom:16px">
      <div style="padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Cuentas activas (${activos.length})</div>
        <button class="btn" onclick="abrirModalAgregarCBU('${leg}','${nomEnc}','${actor}','${contId}')" style="font-size:12px;padding:5px 12px;background:var(--accent2);color:white;border-color:var(--accent2)">+ Agregar cuenta</button>
      </div>
      ${filasActivos || '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">No hay cuentas cargadas.</div>'}
    </div>

    <details style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px">
      <summary style="cursor:pointer;color:var(--t1);font-size:12px;font-weight:500">📜 Historial de cambios (${cerrados.length})</summary>
      <div style="margin-top:10px;max-height:280px;overflow-y:auto">${filasHist}</div>
    </details>
  `;
}

function _cbuFmtFecha(iso){
  if(!iso) return '—';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function _cbuEsc(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// ─── Modal AGREGAR ────────────────────────────────────────────────────────
function abrirModalAgregarCBU(leg, nomEnc, actor, contId){
  const nom = decodeURIComponent(nomEnc || '');
  const activos = getCBUsActivos(leg);
  const sumaActual = activos.reduce((s,c) => s + Number(c.porcentaje || 0), 0);
  const disponible = Math.max(0, 100 - sumaActual);
  const tituloEmpleado = actor === 'EMPLEADO' ? '' : ` · ${_cbuEsc(nom)}`;

  const html = `
    <div id="cbu-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarModalCBU()">
      <div class="card" style="padding:0;max-width:520px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">+ Agregar cuenta bancaria${tituloEmpleado}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Acreditación de haberes</div>
          </div>
          <button onclick="cerrarModalCBU()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">CBU (22 dígitos)</label>
            <input id="cbu-modal-input" maxlength="22" inputmode="numeric"
              oninput="this.value=this.value.replace(/\\D/g,'');_cbuInputLive({input:'cbu-modal-input',banco:'cbu-modal-banco',status:'cbu-modal-status'})"
              placeholder="0000000000000000000000"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);letter-spacing:1px">
            <div style="display:flex;gap:14px;margin-top:5px;font-size:11px;font-family:var(--font-mono)">
              <div>Banco: <strong id="cbu-modal-banco" style="color:var(--t1)">—</strong></div>
              <div id="cbu-modal-status" style="margin-left:auto"></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Tipo de cuenta</label>
              <select id="cbu-modal-tipo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
                <option value="CA">Caja de Ahorro</option>
                <option value="CC">Cuenta Corriente</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Porcentaje del neto</label>
              <div style="position:relative">
                <input id="cbu-modal-pct" type="number" step="0.01" min="0.01" max="100" value="${disponible.toFixed(2)}"
                  style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 30px 8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:13px">%</span>
              </div>
              <div style="font-size:10px;color:var(--t3);margin-top:3px;font-family:var(--font-mono)">Disponible: ${disponible.toFixed(2)}% · Ya asignado: ${sumaActual.toFixed(2)}%</div>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Alias bancario (opcional)</label>
            <input id="cbu-modal-alias" maxlength="20" placeholder="ej: SUELDO.GALICIA"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Titular alternativo (si la cuenta no es ${actor==='EMPLEADO'?'tuya':'del empleado'})</label>
            <input id="cbu-modal-titular" placeholder="Dejar vacío si la cuenta es ${actor==='EMPLEADO'?'tuya':'del empleado'}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="cerrarModalCBU()" style="font-size:12px">Cancelar</button>
          <button class="btn" onclick="guardarCBU('${leg}','${nomEnc}','','${actor}','${contId}')" style="font-size:12px;background:var(--accent2);color:white;border-color:var(--accent2)">Guardar cuenta</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
  setTimeout(() => document.getElementById('cbu-modal-input')?.focus(), 100);
}

// ─── Modal EDITAR ─────────────────────────────────────────────────────────
function abrirModalEditarCBU(leg, nomEnc, cbuId, actor, contId){
  const nom = decodeURIComponent(nomEnc || '');
  const activos = getCBUsActivos(leg);
  const c = activos.find(x => x.id === cbuId);
  if(!c){ toast('⚠ Cuenta no encontrada','var(--red)'); return; }

  const otrosPct = activos.filter(x => x.id !== cbuId).reduce((s,x) => s + Number(x.porcentaje || 0), 0);
  const maxPosible = 100 - otrosPct;

  const html = `
    <div id="cbu-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarModalCBU()">
      <div class="card" style="padding:0;max-width:480px;width:100%;border:1px solid var(--border)">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">✎ Editar cuenta</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${_cbuEsc(c.banco || '?')} · ${formatCBUDisplay(c.cbu)}</div>
          </div>
          <button onclick="cerrarModalCBU()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
          <div style="background:rgba(61,127,255,.06);border:1px solid rgba(61,127,255,.25);border-radius:var(--r);padding:8px 12px;font-size:11px;color:var(--accent2);line-height:1.5">
            ℹ️ El CBU no se puede modificar. Para cambiarlo, ${actor==='EMPLEADO'?'quitá':'quitar'} esta cuenta y ${actor==='EMPLEADO'?'agregá':'agregar'} una nueva.
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Tipo de cuenta</label>
              <select id="cbu-modal-tipo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
                <option value="CA" ${c.tipoCuenta==='CA'?'selected':''}>Caja de Ahorro</option>
                <option value="CC" ${c.tipoCuenta==='CC'?'selected':''}>Cuenta Corriente</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Porcentaje del neto</label>
              <div style="position:relative">
                <input id="cbu-modal-pct" type="number" step="0.01" min="0.01" max="${maxPosible.toFixed(2)}" value="${Number(c.porcentaje).toFixed(2)}"
                  style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 30px 8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:13px">%</span>
              </div>
              <div style="font-size:10px;color:var(--t3);margin-top:3px;font-family:var(--font-mono)">Máx. ${maxPosible.toFixed(2)}% (otras cuentas tienen ${otrosPct.toFixed(2)}%)</div>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Alias bancario (opcional)</label>
            <input id="cbu-modal-alias" maxlength="20" value="${_cbuEsc(c.alias || '')}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px">Titular alternativo</label>
            <input id="cbu-modal-titular" value="${_cbuEsc(c.titularAlt || '')}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="cerrarModalCBU()" style="font-size:12px">Cancelar</button>
          <button class="btn" onclick="guardarCBU('${leg}','${nomEnc}','${cbuId}','${actor}','${contId}')" style="font-size:12px;background:var(--accent2);color:white;border-color:var(--accent2)">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function cerrarModalCBU(){
  const m = document.getElementById('cbu-modal-bg');
  if(m) m.remove();
}

// ─── Guardar (alta o edición) ─────────────────────────────────────────────
function guardarCBU(leg, nomEnc, cbuIdEditando, actor, contId){
  const nom = decodeURIComponent(nomEnc || '');
  if(!leg){ toast('⚠ No se identificó el empleado','var(--red)'); return; }

  const tipo = document.getElementById('cbu-modal-tipo')?.value || 'CA';
  const pct  = parseFloat(document.getElementById('cbu-modal-pct')?.value || '0');
  const alias = (document.getElementById('cbu-modal-alias')?.value || '').trim();
  const titularAlt = (document.getElementById('cbu-modal-titular')?.value || '').trim();

  if(!isFinite(pct) || pct <= 0 || pct > 100){
    toast('⚠ Porcentaje inválido (debe estar entre 0.01 y 100)','var(--yellow)'); return;
  }

  const activos = getCBUsActivos(leg);
  let nuevos, accion, detalle;

  if(cbuIdEditando){
    const idx = activos.findIndex(c => c.id === cbuIdEditando);
    if(idx < 0){ toast('⚠ Cuenta no encontrada','var(--red)'); return; }
    nuevos = activos.map(c => c.id === cbuIdEditando
      ? { ...c, tipoCuenta: tipo, alias, titularAlt, porcentaje: pct }
      : c);
    accion = 'modificar';
    const orig = activos[idx];
    detalle = `Modificó cuenta ${orig.banco} ${formatCBUDisplay(orig.cbu).slice(0,9)}… → ${pct}% (${tipo === 'CC' ? 'Cta. Cte.' : 'C.A.'})`;
  } else {
    const cbuInput = (document.getElementById('cbu-modal-input')?.value || '').replace(/\D/g, '');
    if(!cbuInput){ toast('⚠ Ingresá el CBU','var(--yellow)'); return; }
    const v = validarCBU(cbuInput);
    if(!v.ok){ toast('⚠ CBU inválido: ' + v.error,'var(--red)'); return; }
    if(activos.some(c => c.cbu === cbuInput)){
      toast('⚠ Este CBU ya está cargado en las cuentas activas','var(--yellow)'); return;
    }
    nuevos = activos.concat([{
      cbu: cbuInput, banco: bancoDesdeCBU(cbuInput),
      tipoCuenta: tipo, alias, titularAlt, porcentaje: pct
    }]);
    accion = 'agregar';
    detalle = `Agregó cuenta ${bancoDesdeCBU(cbuInput)} ${formatCBUDisplay(cbuInput).slice(0,9)}… (${pct}%, ${tipo === 'CC' ? 'Cta. Cte.' : 'C.A.'})`;
  }

  const suma = nuevos.reduce((s,c) => s + Number(c.porcentaje), 0);
  if(Math.abs(suma - 100) > 0.01){
    toast(`⚠ Los porcentajes deben sumar 100% (suman ${suma.toFixed(2)}%). Ajustá el % de las otras cuentas primero.`,'var(--yellow)', 5500);
    return;
  }

  const r = reemplazarSnapshotCBUs(leg, nuevos, actor);
  if(!r.ok){ toast('⚠ ' + r.error,'var(--red)'); return; }

  if(actor === 'EMPLEADO'){
    addCBUNovedad({ leg, nom, accion, detalle, actor: 'EMPLEADO' });
    toast('✓ Cuenta guardada · RR.HH. fue notificado','var(--green)');
  } else {
    if(typeof auditABM === 'function'){
      const emp = (typeof empByLeg === 'function') ? empByLeg(leg) : null;
      auditABM('cbu_actualizado',
        { dni: emp?.dni || '', nom: emp?.nom || `legajo ${leg}`, extra: leg },
        { detail: `${accion} · ${detalle}` });
    }
    toast('✓ Cuenta guardada','var(--green)');
  }

  cerrarModalCBU();
  if(currentUser?.emp?.leg === leg && contId === 'mis-cbus-content') renderMisCBUs();
  else renderCBUsDeLegajo(leg, nom, contId, actor);
}

// ─── Quitar ───────────────────────────────────────────────────────────────
function quitarCBUDeLegajo(leg, nomEnc, cbuId, actor, contId){
  const nom = decodeURIComponent(nomEnc || '');
  const activos = getCBUsActivos(leg);
  const c = activos.find(x => x.id === cbuId);
  if(!c){ toast('⚠ Cuenta no encontrada','var(--red)'); return; }

  const restantes = activos.filter(x => x.id !== cbuId);
  if(restantes.length === 0){
    const msg = actor==='EMPLEADO'
      ? '¿Quitar tu única cuenta de acreditación?\n\nQuedarás sin cuenta para el cobro de haberes hasta que cargues una nueva.'
      : `¿Quitar la única cuenta de ${nom}?\n\nEl empleado quedará sin cuenta para el cobro hasta que se cargue una nueva.`;
    if(!confirm(msg)) return;
  } else {
    const sumaRest = restantes.reduce((s,x) => s + Number(x.porcentaje || 0), 0);
    if(Math.abs(sumaRest - 100) > 0.01){
      toast(`⚠ Si se quita esta cuenta, las restantes suman ${sumaRest.toFixed(2)}%. Ajustá los porcentajes primero.`,'var(--yellow)', 5500);
      return;
    }
    if(!confirm(`¿Quitar la cuenta ${c.banco} (${Number(c.porcentaje).toFixed(2)}%)?`)) return;
  }

  const r = reemplazarSnapshotCBUs(leg, restantes, actor);
  if(!r.ok){ toast('⚠ ' + r.error,'var(--red)'); return; }

  if(actor === 'EMPLEADO'){
    addCBUNovedad({
      leg, nom, accion: 'quitar',
      detalle: `Quitó cuenta ${c.banco} ${formatCBUDisplay(c.cbu).slice(0,9)}… (era ${Number(c.porcentaje).toFixed(2)}%)`,
      actor: 'EMPLEADO'
    });
    toast('✓ Cuenta quitada · RR.HH. fue notificado','var(--green)');
  } else {
    if(typeof auditABM === 'function'){
      const emp = (typeof empByLeg === 'function') ? empByLeg(leg) : null;
      auditABM('cbu_actualizado',
        { dni: emp?.dni || '', nom: emp?.nom || `legajo ${leg}`, extra: leg },
        { detail: `quitó cuenta ${c.banco} ${formatCBUDisplay(c.cbu).slice(0,9)}… (era ${Number(c.porcentaje).toFixed(2)}%)` });
    }
    toast('✓ Cuenta quitada','var(--green)');
  }

  if(currentUser?.emp?.leg === leg && contId === 'mis-cbus-content') renderMisCBUs();
  else renderCBUsDeLegajo(leg, nom, contId, actor);
}
