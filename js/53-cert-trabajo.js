// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 53 — CERTIFICADO DE TRABAJO
// ───────────────────────────────────────────────────────────────────────────
// Flujo completo empleado → RRHH:
//   1) Empleado abre el modal, elige campos y destinatario → guarda pedido
//   2) RRHH ve la cola en su panel, abre el pedido → genera el PDF firmado
//
// Storage: localStorage key LS_CERT_PEDIDOS ('leiten_cert_pedidos')
// ═══════════════════════════════════════════════════════════════════════════

const LS_CERT_PEDIDOS = 'leiten_cert_pedidos';

// ─── Helpers de persistencia ─────────────────────────────────────────────
function _certLeer(){ try { return JSON.parse(localStorage.getItem(LS_CERT_PEDIDOS)||'[]'); } catch(e){ return []; } }
function _certGuardar(arr){ try { localStorage.setItem(LS_CERT_PEDIDOS, JSON.stringify(arr)); } catch(e){ console.error('cert save',e); } }

// ─── Helpers de texto ────────────────────────────────────────────────────
const _MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function _certMesLetras(m){ return _MESES_LARGO[m-1] || ''; }

function _certAnioLetras(y){
  const n = parseInt(y);
  if(n <= 0) return String(y);
  const unidades = ['','un','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
                    'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete',
                    'dieciocho','diecinueve','veinte','veintiún','veintidós','veintitrés',
                    'veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho',
                    'veintinueve','treinta'];
  const resto = n - 2000;
  if(n >= 2001 && n <= 2030) return `dos mil ${unidades[resto] || ''}`.trim();
  if(n === 2000) return 'dos mil';
  return String(y);
}

function _certFmtFecha(iso){
  if(!iso) return '—';
  const s = String(iso);
  if(s.includes('/')) return s;
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function _certFechaHoy(){
  const h = new Date();
  return { iso: h.toISOString().slice(0,10), dia: h.getDate(), mes: h.getMonth()+1, anio: h.getFullYear() };
}

// ─── Badge para el panel RRHH ────────────────────────────────────────────
function _certActualizarBadge(){
  const pedidos = _certLeer();
  const pend = pedidos.filter(p => p.estado === 'pendiente').length;
  const badge = document.getElementById('rrhh-badge-cert');
  if(!badge) return;
  if(pend > 0){ badge.style.display = 'inline'; badge.textContent = `${pend} pendiente${pend>1?'s':''}`; }
  else { badge.style.display = 'none'; }
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL EMPLEADO — modal de solicitud
// ═══════════════════════════════════════════════════════════════════════════

function abrirSolicitarCertificadoTrabajo(){
  const emp = currentUser?.emp;
  if(!emp){ toast('⚠ No hay sesión activa', 'var(--red)'); return; }

  const prev = document.getElementById('modal-cert-trabajo');
  if(prev) prev.remove();

  // Verificar si ya tiene un pedido pendiente
  const pedidos = _certLeer();
  const yaTiene = pedidos.find(p => p.leg === emp.leg && p.estado === 'pendiente');

  const modal = document.createElement('div');
  modal.id = 'modal-cert-trabajo';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;backdrop-filter:blur(4px);overflow-y:auto';

  if(yaTiene){
    const f = _certFechaHoy();
    modal.innerHTML = `
      <div class="card" style="padding:0;max-width:500px;width:100%;border:1px solid var(--border);margin-top:20px">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Certificado de trabajo</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Estado de tu solicitud</div>
          </div>
          <button onclick="document.getElementById('modal-cert-trabajo').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>
        <div style="padding:22px">
          <div style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:14px 16px;display:flex;gap:12px;align-items:flex-start">
            <span style="font-size:20px">⏳</span>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--yellow)">Solicitud pendiente</div>
              <div style="font-size:12px;color:var(--t2);margin-top:4px">
                Tu pedido del <strong>${_certFmtFecha(yaTiene.fecha_pedido)}</strong> está siendo procesado por RR.HH.<br>
                Destinatario: <em>${yaTiene.destinatario || 'quien corresponda'}</em>
              </div>
            </div>
          </div>
          <div style="margin-top:16px;font-size:11px;color:var(--t3);font-family:var(--font-mono)">
            Si necesitás modificar el pedido, cancelá éste desde la sección "Mis certificados" en Mis Datos y volvé a solicitarlo.
          </div>
        </div>
        <div style="padding:12px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="document.getElementById('modal-cert-trabajo').remove()">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return;
  }

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:540px;width:100%;border:1px solid var(--border);margin-top:20px">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Solicitar certificado de trabajo</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">El pedido será procesado por RR.HH.</div>
        </div>
        <button onclick="document.getElementById('modal-cert-trabajo').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:16px">

        <!-- Destinatario -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">¿Para quién es? (destinatario)</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:13px;color:var(--t1)" id="cert-dest-opt-0">
              <input type="radio" name="cert-destinatario" value="quien_corresponda" checked onchange="_certToggleDest()"
                style="cursor:pointer;accent-color:var(--accent)">
              <span>Ante <strong>quien corresponda</strong></span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:13px;color:var(--t1)" id="cert-dest-opt-1">
              <input type="radio" name="cert-destinatario" value="custom" onchange="_certToggleDest()"
                style="cursor:pointer;accent-color:var(--accent)">
              <span>Especificar destinatario</span>
            </label>
            <input type="text" id="cert-dest-custom" placeholder="Ej: Banco Galicia, ANSES, Embajada de Italia..."
              style="display:none;width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;margin-top:2px;box-sizing:border-box">
          </div>
        </div>

        <!-- Campos a incluir -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Información a incluir en el certificado</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${_certCampoCheck('cert-campo-ingreso',   'Fecha de ingreso',         true)}
            ${_certCampoCheck('cert-campo-antiguedad', 'Antigüedad',              true)}
            ${_certCampoCheck('cert-campo-cargo',      'Cargo / tarea',           true)}
            ${_certCampoCheck('cert-campo-categoria',  'Categoría laboral',       true)}
            ${_certCampoCheck('cert-campo-condicion',  'Condición (mensualizado / jornalizado)', true)}
            ${_certCampoCheck('cert-campo-lugar',      'Lugar de trabajo',        true)}
            ${_certCampoCheck('cert-campo-sueldo',     'Remuneración bruta mensual', false, '⚠ Requerido por bancos / entidades financieras')}
          </div>
        </div>

        <!-- Observaciones -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Observaciones para RR.HH. (opcional)</label>
          <textarea id="cert-obs" rows="2" placeholder="Ej: urgente, necesito para antes del martes..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:var(--font-sans);box-sizing:border-box"></textarea>
        </div>

        <div style="font-size:11px;color:var(--t3);padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);line-height:1.5">
          El certificado siempre incluye: <strong>nombre completo, DNI, CUIL, legajo y empresa.</strong><br>
          RR.HH. lo genera con firma oficial y sello de la empresa.
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cert-trabajo').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_certEnviarPedido()" style="font-size:13px;padding:8px 20px">📤 Enviar pedido a RR.HH.</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function _certCampoCheck(id, label, checked, sub=''){
  return `<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;color:var(--t2);padding:6px 10px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2)">
    <input type="checkbox" id="${id}" ${checked?'checked':''} style="cursor:pointer;accent-color:var(--accent);margin-top:2px;flex-shrink:0">
    <div>
      <div>${label}</div>
      ${sub ? `<div style="font-size:10px;color:var(--t3);margin-top:2px">${sub}</div>` : ''}
    </div>
  </label>`;
}

function _certToggleDest(){
  const custom = document.querySelector('input[name="cert-destinatario"]:checked')?.value === 'custom';
  const inp = document.getElementById('cert-dest-custom');
  if(inp){ inp.style.display = custom ? 'block' : 'none'; if(custom) inp.focus(); }
}

function _certEnviarPedido(){
  const emp = currentUser?.emp;
  if(!emp) return;

  const destRadio = document.querySelector('input[name="cert-destinatario"]:checked')?.value;
  let destinatario = 'quien corresponda';
  if(destRadio === 'custom'){
    const txt = document.getElementById('cert-dest-custom')?.value?.trim();
    if(!txt){ toast('⚠ Ingresá el destinatario o elegí "quien corresponda"', 'var(--yellow)'); return; }
    destinatario = txt;
  }

  const campos = {
    fecha_ingreso: document.getElementById('cert-campo-ingreso')?.checked ?? true,
    antiguedad:    document.getElementById('cert-campo-antiguedad')?.checked ?? true,
    cargo:         document.getElementById('cert-campo-cargo')?.checked ?? true,
    categoria:     document.getElementById('cert-campo-categoria')?.checked ?? true,
    condicion:     document.getElementById('cert-campo-condicion')?.checked ?? true,
    lugar_trabajo: document.getElementById('cert-campo-lugar')?.checked ?? true,
    remuneracion:  document.getElementById('cert-campo-sueldo')?.checked ?? false,
  };

  const obs = document.getElementById('cert-obs')?.value?.trim() || '';
  const hoy = _certFechaHoy();

  const pedido = {
    id:           'cert_' + Date.now(),
    leg:          emp.leg,
    nom:          emp.nom,
    dni:          emp.dni || '',
    cuil:         emp.cuil || '',
    empresa:      emp.emp,
    fecha_pedido: hoy.iso,
    estado:       'pendiente',
    destinatario,
    campos,
    obs_empleado: obs,
    fecha_resolucion: null,
    resuelto_por:     null,
    obs_rrhh:         '',
  };

  const arr = _certLeer();
  arr.unshift(pedido);
  _certGuardar(arr);
  _certActualizarBadge();

  if(typeof logAuditX === 'function'){
    logAuditX('certificados', 'pedido_cert_trabajo', { leg: emp.leg, destinatario, campos });
  }

  document.getElementById('modal-cert-trabajo')?.remove();
  toast('✅ Pedido enviado — RR.HH. lo procesará a la brevedad', 'var(--green)', 4000);

  // Refrescar el historial si está visible
  if(typeof renderCertHistorialEmpleado === 'function') renderCertHistorialEmpleado();
}

// ─── Historial empleado (para panel Mis Datos) ───────────────────────────
function renderCertHistorialEmpleado(){
  const cont = document.getElementById('cert-historial-emp');
  if(!cont) return;
  const emp = currentUser?.emp;
  if(!emp) return;

  const pedidos = _certLeer().filter(p => p.leg === emp.leg);
  if(!pedidos.length){
    cont.innerHTML = `<div style="font-size:12px;color:var(--t3);padding:8px 0">Aún no solicitaste ningún certificado.</div>`;
    return;
  }

  cont.innerHTML = pedidos.map(p => {
    const badgeColor = p.estado==='generado' ? 'var(--green)' : p.estado==='rechazado' ? 'var(--red)' : 'var(--yellow)';
    const badgeLabel = p.estado==='generado' ? '✅ Generado' : p.estado==='rechazado' ? '✕ Rechazado' : '⏳ Pendiente';
    const camposStr = Object.entries(p.campos||{}).filter(([,v])=>v).map(([k])=>({
      fecha_ingreso:'Ingreso', antiguedad:'Antigüedad', cargo:'Cargo', categoria:'Categoría',
      condicion:'Condición', lugar_trabajo:'Lugar', remuneracion:'Remuneración'
    }[k]||k)).join(' · ');

    return `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3)">${_certFmtFecha(p.fecha_pedido)}</div>
        <div style="font-size:11px;font-weight:600;color:${badgeColor}">${badgeLabel}</div>
      </div>
      <div style="font-size:12px;color:var(--t2)">Para: <em>${p.destinatario}</em></div>
      <div style="font-size:11px;color:var(--t3);margin-top:3px">${camposStr}</div>
      ${p.obs_rrhh ? `<div style="font-size:11px;color:var(--t3);margin-top:4px;font-style:italic">RR.HH.: "${p.obs_rrhh}"</div>` : ''}
      ${p.estado === 'pendiente' ? `<button onclick="_certCancelarPedidoEmp('${p.id}')" class="btn btn-ghost" style="font-size:10px;padding:3px 10px;margin-top:6px;color:var(--red);border-color:rgba(239,68,68,.3)">Cancelar pedido</button>` : ''}
    </div>`;
  }).join('');
}

function _certCancelarPedidoEmp(id){
  showConfirm({ titulo:'Cancelar pedido', mensaje:'¿Cancelar este pedido de certificado?', labelOk:'Sí, cancelar', labelCancel:'No' })
    .then(ok => {
      if(!ok) return;
      const arr = _certLeer().filter(p => p.id !== id);
      _certGuardar(arr);
      _certActualizarBadge();
      renderCertHistorialEmpleado();
      toast('Pedido cancelado', 'var(--t2)');
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL RRHH — gestión de pedidos
// ═══════════════════════════════════════════════════════════════════════════

function renderCertTrabajoPedidos(){
  const cont = document.getElementById('cert-rrhh-contenido');
  if(!cont) return;

  const pedidos = _certLeer();
  const pend  = pedidos.filter(p => p.estado === 'pendiente');
  const hist  = pedidos.filter(p => p.estado !== 'pendiente');
  const tabAct = cont.dataset.tab || 'pend';

  cont.innerHTML = `
    <!-- Tabs -->
    <div style="display:flex;gap:4px;background:var(--bg2);border-radius:var(--r);padding:4px;margin-bottom:16px;width:fit-content">
      <button onclick="_certRRHHTab('pend')" id="cert-tab-pend"
        style="padding:6px 16px;font-size:12px;border-radius:6px;border:none;cursor:pointer;transition:all .15s;
          background:${tabAct==='pend'?'var(--bg1)':'transparent'};
          color:${tabAct==='pend'?'var(--t1)':'var(--t3)'};
          border:${tabAct==='pend'?'.5px solid var(--border)':'none'};
          font-weight:${tabAct==='pend'?600:400}">
        Pendientes <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent2)">${pend.length || ''}</span>
      </button>
      <button onclick="_certRRHHTab('hist')" id="cert-tab-hist"
        style="padding:6px 16px;font-size:12px;border-radius:6px;border:none;cursor:pointer;transition:all .15s;
          background:${tabAct==='hist'?'var(--bg1)':'transparent'};
          color:${tabAct==='hist'?'var(--t1)':'var(--t3)'};
          border:${tabAct==='hist'?'.5px solid var(--border)':'none'};
          font-weight:${tabAct==='hist'?600:400}">
        Historial ${hist.length ? `(${hist.length})` : ''}
      </button>
    </div>

    <!-- Contenido tab -->
    <div id="cert-tab-body">${tabAct==='pend' ? _certRenderPend(pend) : _certRenderHist(hist)}</div>
  `;
  cont.dataset.tab = tabAct;
}

function _certRRHHTab(tab){
  const cont = document.getElementById('cert-rrhh-contenido');
  if(!cont) return;
  cont.dataset.tab = tab;
  renderCertTrabajoPedidos();
}

function _certRenderPend(pend){
  if(!pend.length) return `<div style="text-align:center;padding:40px 20px;color:var(--t3);font-size:13px">✅ No hay pedidos pendientes</div>`;
  return pend.map(p => _certCardPedido(p, true)).join('');
}

function _certRenderHist(hist){
  if(!hist.length) return `<div style="text-align:center;padding:40px 20px;color:var(--t3);font-size:13px">Sin historial aún</div>`;
  return hist.map(p => _certCardPedido(p, false)).join('');
}

function _certCardPedido(p, conAcciones){
  const camposStr = Object.entries(p.campos||{}).filter(([,v])=>v).map(([k])=>({
    fecha_ingreso:'📅 Fecha ingreso', antiguedad:'⏱ Antigüedad', cargo:'💼 Cargo',
    categoria:'📋 Categoría', condicion:'📑 Condición', lugar_trabajo:'📍 Lugar', remuneracion:'💰 Remuneración'
  }[k]||k)).join(' &nbsp;·&nbsp; ');

  const badgeColor = p.estado==='generado' ? 'rgba(34,197,94,.15)' : p.estado==='rechazado' ? 'rgba(239,68,68,.15)' : 'rgba(234,179,8,.15)';
  const badgeBorder = p.estado==='generado' ? 'rgba(34,197,94,.4)' : p.estado==='rechazado' ? 'rgba(239,68,68,.4)' : 'rgba(234,179,8,.4)';
  const badgeText   = p.estado==='generado' ? 'var(--green)' : p.estado==='rechazado' ? 'var(--red)' : 'var(--yellow)';
  const badgeLabel  = p.estado==='generado' ? '✅ Generado' : p.estado==='rechazado' ? '✕ Rechazado' : '⏳ Pendiente';

  return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg1);padding:14px 18px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${p.nom}</div>
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);margin-top:2px">Leg ${p.leg} &nbsp;·&nbsp; ${p.empresa}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <span style="font-size:11px;font-weight:600;color:${badgeText};background:${badgeColor};border:1px solid ${badgeBorder};padding:3px 10px;border-radius:10px">${badgeLabel}</span>
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Pedido: ${_certFmtFecha(p.fecha_pedido)}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--t2);padding:10px 12px;background:var(--bg2);border-radius:var(--r);margin-bottom:10px">
      <div>📤 <strong>Destinatario:</strong> ${p.destinatario}</div>
      <div style="font-size:11px;color:var(--t3)">${camposStr}</div>
      ${p.obs_empleado ? `<div style="font-size:11px;color:var(--t3);font-style:italic;margin-top:3px">Nota del empleado: "${p.obs_empleado}"</div>` : ''}
      ${p.obs_rrhh ? `<div style="font-size:11px;color:var(--t3);font-style:italic;margin-top:3px">Nota RR.HH.: "${p.obs_rrhh}"</div>` : ''}
      ${p.fecha_resolucion ? `<div style="font-size:11px;color:var(--t3);margin-top:3px">Resuelto: ${_certFmtFecha(p.fecha_resolucion)} por ${p.resuelto_por||'—'}</div>` : ''}
    </div>

    ${conAcciones ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="_certAbrirGenerarModal('${p.id}')"
        style="font-size:12px;padding:7px 16px">📄 Generar certificado</button>
      <button class="btn btn-ghost" onclick="_certRechazarPedido('${p.id}')"
        style="font-size:12px;padding:7px 14px;color:var(--red);border-color:rgba(239,68,68,.3)">✕ Rechazar</button>
    </div>` : (p.estado==='generado' ? `
    <button class="btn btn-ghost" onclick="_certReimprimirPedido('${p.id}')"
      style="font-size:12px;padding:6px 14px">🖨 Reimprimir</button>` : '')}
  </div>`;
}

function _certRechazarPedido(id){
  showPrompt({ titulo:'Rechazar pedido', mensaje:'Indicá el motivo del rechazo (se le mostrará al empleado):', placeholder:'Motivo...', labelOk:'Rechazar', labelCancel:'Cancelar' })
    .then(motivo => {
      if(motivo === null) return;
      const arr = _certLeer();
      const p = arr.find(x => x.id === id);
      if(!p) return;
      p.estado = 'rechazado';
      p.obs_rrhh = motivo || '';
      p.fecha_resolucion = _certFechaHoy().iso;
      p.resuelto_por = currentUser?.emp?.nom || 'RR.HH.';
      _certGuardar(arr);
      _certActualizarBadge();
      renderCertTrabajoPedidos();
      if(typeof logAuditX === 'function') logAuditX('certificados', 'rechazar_cert_trabajo', { id, leg: p.leg, motivo });
      toast('Pedido rechazado', 'var(--t2)');
    });
}

function _certReimprimirPedido(id){
  const p = _certLeer().find(x => x.id === id);
  if(!p){ toast('⚠ Pedido no encontrado', 'var(--red)'); return; }
  _certGenerarImprimir(p);
}

// ─── Modal de generación (RRHH) ──────────────────────────────────────────
function _certAbrirGenerarModal(id){
  const pedido = _certLeer().find(p => p.id === id);
  if(!pedido){ toast('⚠ Pedido no encontrado', 'var(--red)'); return; }

  // Buscar datos completos del empleado
  const todosEmp = (typeof EMPLOYEES !== 'undefined') ? EMPLOYEES : (typeof getEmployees === 'function' ? getEmployees() : []);
  const emp = todosEmp.find(e => e.leg === pedido.leg) || { leg:pedido.leg, nom:pedido.nom, dni:pedido.dni, cuil:pedido.cuil, emp:pedido.empresa };

  const prev = document.getElementById('modal-cert-generar');
  if(prev) prev.remove();

  const hoy = _certFechaHoy();
  const camposStr = Object.entries(pedido.campos||{}).filter(([,v])=>v).map(([k])=>({
    fecha_ingreso:'Fecha de ingreso', antiguedad:'Antigüedad', cargo:'Cargo/Tarea',
    categoria:'Categoría', condicion:'Condición laboral', lugar_trabajo:'Lugar de trabajo', remuneracion:'Remuneración'
  }[k]||k)).join(', ');

  const modal = document.createElement('div');
  modal.id = 'modal-cert-generar';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:20px;backdrop-filter:blur(4px);overflow-y:auto';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:600px;width:100%;border:1px solid var(--border);margin-top:20px">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Generar certificado de trabajo</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${pedido.nom} · Leg ${pedido.leg}</div>
        </div>
        <button onclick="document.getElementById('modal-cert-generar').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <!-- Resumen del pedido -->
        <div style="padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);font-size:12px;color:var(--t2)">
          <div style="font-weight:600;color:var(--t1);margin-bottom:6px">Pedido del empleado</div>
          <div>Destinatario solicitado: <em>${pedido.destinatario}</em></div>
          <div style="margin-top:3px;color:var(--t3)">Campos: ${camposStr}</div>
          ${pedido.obs_empleado ? `<div style="margin-top:4px;font-style:italic;color:var(--t3)">Nota: "${pedido.obs_empleado}"</div>` : ''}
        </div>

        <!-- Destinatario final (RRHH puede cambiar) -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Destinatario en el documento</label>
          <input type="text" id="cert-gen-dest" value="${pedido.destinatario === 'quien corresponda' ? '' : pedido.destinatario}"
            placeholder="quien corresponda"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
          <div style="font-size:10px;color:var(--t3);margin-top:3px">Si lo dejás vacío: "quien corresponda"</div>
        </div>

        <!-- Fecha de expedición -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Fecha de expedición</label>
          <input type="date" id="cert-gen-fecha" value="${hoy.iso}"
            style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>

        <!-- Campos a incluir (RRHH puede ajustar) -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Campos a incluir (podés ajustar)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            ${_certCampoCheckRRHH('certg-ingreso',    'Fecha de ingreso',    pedido.campos?.fecha_ingreso)}
            ${_certCampoCheckRRHH('certg-antiguedad', 'Antigüedad',          pedido.campos?.antiguedad)}
            ${_certCampoCheckRRHH('certg-cargo',      'Cargo / tarea',       pedido.campos?.cargo)}
            ${_certCampoCheckRRHH('certg-categoria',  'Categoría',           pedido.campos?.categoria)}
            ${_certCampoCheckRRHH('certg-condicion',  'Condición laboral',   pedido.campos?.condicion)}
            ${_certCampoCheckRRHH('certg-lugar',      'Lugar de trabajo',    pedido.campos?.lugar_trabajo)}
            ${_certCampoCheckRRHH('certg-sueldo',     'Remuneración',        pedido.campos?.remuneracion)}
          </div>
        </div>

        <!-- Nota interna -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Nota interna RR.HH. (opcional, no sale en el certificado)</label>
          <input type="text" id="cert-gen-obs" placeholder="Ej: entregado en mano, enviado por mail..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cert-generar').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_certConfirmarGenerar('${id}')" style="font-size:13px;padding:8px 20px">🖨 Generar e imprimir</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function _certCampoCheckRRHH(id, label, checked){
  return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--t2);padding:6px 10px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2)">
    <input type="checkbox" id="${id}" ${checked?'checked':''} style="cursor:pointer;accent-color:var(--accent)">
    ${label}
  </label>`;
}

function _certConfirmarGenerar(id){
  const arr = _certLeer();
  const p = arr.find(x => x.id === id);
  if(!p) return;

  const dest = document.getElementById('cert-gen-dest')?.value?.trim() || 'quien corresponda';
  const fechaIso = document.getElementById('cert-gen-fecha')?.value || _certFechaHoy().iso;
  const obs  = document.getElementById('cert-gen-obs')?.value?.trim() || '';

  const campos = {
    fecha_ingreso: document.getElementById('certg-ingreso')?.checked ?? true,
    antiguedad:    document.getElementById('certg-antiguedad')?.checked ?? true,
    cargo:         document.getElementById('certg-cargo')?.checked ?? true,
    categoria:     document.getElementById('certg-categoria')?.checked ?? true,
    condicion:     document.getElementById('certg-condicion')?.checked ?? true,
    lugar_trabajo: document.getElementById('certg-lugar')?.checked ?? true,
    remuneracion:  document.getElementById('certg-sueldo')?.checked ?? false,
  };

  // Actualizar pedido
  p.estado = 'generado';
  p.destinatario = dest;
  p.campos = campos;
  p.obs_rrhh = obs;
  p.fecha_resolucion = _certFechaHoy().iso;
  p.resuelto_por = currentUser?.emp?.nom || 'RR.HH.';
  _certGuardar(arr);
  _certActualizarBadge();

  document.getElementById('modal-cert-generar')?.remove();

  // Generar PDF
  _certGenerarImprimir(p, fechaIso);
  renderCertTrabajoPedidos();

  if(typeof logAuditX === 'function'){
    logAuditX('certificados', 'generar_cert_trabajo', { id, leg: p.leg, destinatario: dest, por: p.resuelto_por });
  }
}

function _certGenerarImprimir(p, fechaIsoOverride){
  const todosEmp = (typeof EMPLOYEES !== 'undefined') ? EMPLOYEES : (typeof getEmployees === 'function' ? getEmployees() : []);
  const emp = todosEmp.find(e => e.leg === p.leg) || { leg:p.leg, nom:p.nom, dni:p.dni||'', cuil:p.cuil||'', emp:p.empresa };

  const campos = p.campos || {};
  const fechaIso = fechaIsoOverride || p.fecha_resolucion || _certFechaHoy().iso;
  const [fy, fm, fd] = String(fechaIso).split('-');
  const dia   = parseInt(fd);
  const mes   = parseInt(fm);
  const anio  = parseInt(fy);

  // Datos de empresa
  const edatos = (typeof getEmpresaDatos === 'function') ? getEmpresaDatos(p.empresa) : null;
  const cuitEmp = edatos?.cuit || '—';
  const dirEmp  = edatos ? `${edatos.dir} ${edatos.nro}${edatos.piso?' P'+edatos.piso:''}, ${edatos.loc||edatos.cp}` : '—';

  // Calcular antigüedad
  const ingDate = (() => {
    const s = emp.ing;
    if(!s) return null;
    if(s.includes('/')) { const [d,m,y] = s.split('/'); return new Date(+y,+m-1,+d); }
    if(s.includes('-')) { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d); }
    return null;
  })();
  const hoyDate = new Date(fy, fm-1, fd);
  const antiguAnios = ingDate ? Math.floor((hoyDate - ingDate)/(365.25*86400000)) : null;

  // Remuneración
  const bruto  = Number(emp.bruto || emp.basico || 0);
  const sueldoTxt = bruto > 0 ? `$ ${bruto.toLocaleString('es-AR',{minimumFractionDigits:2})}` : '(no informado)';

  // Construir filas de tabla
  const filas = [];
  filas.push({ label:'Apellido y Nombre', valor:`<strong>${emp.nom}</strong>` });
  filas.push({ label:'DNI', valor: emp.dni || '—' });
  filas.push({ label:'CUIL', valor:`<strong>${emp.cuil || '—'}</strong>` });
  filas.push({ label:'Legajo', valor: emp.leg });
  if(campos.cargo)         filas.push({ label:'Cargo / Tarea',       valor: emp.tarea || '—' });
  if(campos.categoria)     filas.push({ label:'Categoría',           valor: [emp.cat, emp.tramo, emp.desc_categoria].filter(Boolean).join(' · ') || '—' });
  if(campos.condicion)     filas.push({ label:'Condición laboral',   valor: [emp.condicion || 'Mensualizado', emp.cod_convenio ? 'CCT '+emp.cod_convenio : 'Fuera de convenio'].join(' · ') });
  if(campos.lugar_trabajo) filas.push({ label:'Lugar de trabajo',    valor: emp.lugar || '—' });
  if(campos.fecha_ingreso) filas.push({ label:'Fecha de ingreso',    valor:`<strong>${_certFmtFecha(emp.ing) || '—'}</strong>` });
  if(campos.antiguedad && antiguAnios !== null) filas.push({ label:'Antigüedad', valor:`${antiguAnios} año${antiguAnios!==1?'s':''}` });
  if(campos.remuneracion)  filas.push({ label:'Remuneración bruta',  valor:`<strong>${sueldoTxt}</strong>` });
  filas.push({ label:'Estado', valor:`<span style="color:#1E6B3A;font-weight:700;font-size:13px">ACTIVO</span>` });

  // Encabezado logo empresa
  const logoHtml = (typeof LOGOS !== 'undefined' && LOGOS[p.empresa])
    ? LOGOS[p.empresa].replace('max-height:48px','max-height:70px').replace('max-width:140px','max-width:220px')
    : `<div style="font-size:18px;font-weight:700;color:#111;letter-spacing:.03em">${p.empresa}</div>`;

  // Pie firma RRHH
  const firmaHtml = (typeof _docPieFirma === 'function') ? _docPieFirma(p.empresa) : `
    <div style="margin-top:60px;display:flex;justify-content:flex-end">
      <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:260px">
        <div style="font-size:11px;color:#333">________________________________</div>
        <div style="font-size:10px;color:#666;margin-top:3px">Recursos Humanos — ${p.empresa}</div>
      </div>
    </div>`;

  // Cierre notarial
  const cierreNotarial = `Se expide el presente en la localidad de Caseros, Partido de Tres de Febrero, para ser presentado ante <strong>${p.destinatario}</strong>, a los <strong>${dia}</strong> días del mes de <strong>${_certMesLetras(mes)}</strong> de dos mil <strong>${_certAnioLetras(anio).replace('dos mil ','')}</strong>.`;

  const contenido = `
    <!-- Encabezado -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:3px solid #1E6B3A;margin-bottom:24px">
      <div>${logoHtml}</div>
      <div style="text-align:right;font-size:10px;color:#555;font-family:Arial,sans-serif;line-height:1.6">
        <div style="font-weight:700;font-size:11px;color:#222">${p.empresa}</div>
        <div>CUIT: <strong>${cuitEmp}</strong></div>
        <div>${dirEmp}</div>
        <div>Departamento de RR.HH.</div>
      </div>
    </div>

    <!-- Título -->
    <div style="text-align:center;margin:0 0 24px">
      <h1 style="font-size:20px;font-weight:700;color:#111;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px">CERTIFICADO DE TRABAJO</h1>
      <div style="width:80px;height:3px;background:#1E6B3A;margin:0 auto"></div>
    </div>

    <!-- Fecha y lugar -->
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:20px">
      Caseros, ${dia} de ${_certMesLetras(mes)} de ${anio}
    </div>

    <!-- Párrafo certifica -->
    <p style="font-size:12.5px;line-height:1.7;margin-bottom:20px">
      <strong>${p.empresa}</strong>, CUIT <strong>${cuitEmp}</strong>, con domicilio en ${dirEmp}, a través de su Departamento de Recursos Humanos, <strong>CERTIFICA</strong> que:
    </p>

    <!-- Tabla datos -->
    <table style="border-collapse:collapse;width:100%;margin-bottom:24px;font-size:12px">
      ${filas.map(f=>`
        <tr>
          <th style="border:1px solid #ddd;padding:7px 10px;background:#f7f9f7;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.04em;width:38%;text-align:left;font-weight:600">${f.label}</th>
          <td style="border:1px solid #ddd;padding:7px 10px;color:#222">${f.valor}</td>
        </tr>`).join('')}
    </table>

    <!-- Cierre notarial -->
    <div style="margin-top:28px;padding:16px 18px;border:1px solid #c8d8c8;border-radius:6px;background:#f4faf4;font-size:12px;line-height:1.8;color:#333">
      ${cierreNotarial}
    </div>

    ${firmaHtml}

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#aaa;text-align:center">
      Documento generado el ${dia} de ${_certMesLetras(mes)} de ${anio} desde el Portal RR.HH. LEITEN S.A. &nbsp;·&nbsp;
      Para verificación, contactar al Dpto. de RR.HH. de ${p.empresa}.
    </div>
  `;

  if(typeof _docAbrirImprimible === 'function'){
    _docAbrirImprimible(`Certificado de trabajo — ${emp.nom}`, contenido);
  } else {
    // Fallback: abrir ventana directamente
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Certificado de trabajo — ${emp.nom}</title>
      <style>
        @page { size: A4; margin: 20mm 18mm; }
        body { margin:0; padding:20px 24px; font-family:Arial,sans-serif; color:#222; max-width:780px; margin:auto; background:white }
        .no-print { margin-bottom:20px;padding:12px 16px;background:#f0f4ff;border:1px solid #d0d8ee;border-radius:6px }
        .no-print button { padding:8px 18px;background:#1E6B3A;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600;margin-right:8px }
        @media print { .no-print { display:none } }
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
        <span style="font-size:11px;color:#555">Cerrá esta ventana cuando termines</span>
      </div>
      ${contenido}
      </body></html>`;
    const w = window.open('','_blank');
    if(w){ w.document.write(html); w.document.close(); }
    else  toast('⚠ El navegador bloqueó la ventana. Habilitá popups.', 'var(--red)');
  }
}

// ─── Init: badge al cargar ────────────────────────────────────────────────
(function(){ setTimeout(_certActualizarBadge, 800); })();
