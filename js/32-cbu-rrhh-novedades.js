// ═══════════════════════════════════════════════════════════════════════════
// RR.HH. — Panel de Novedades de CBU
// ───────────────────────────────────────────────────────────────────────────
// Cuando un empleado modifica sus cuentas de acreditación (alta/edición/quita),
// se registra una novedad. Este panel le permite a RR.HH. verlas con badge
// dinámico, filtros y marcar como leídas.
// ═══════════════════════════════════════════════════════════════════════════

let _cbuNovFiltro = 'no_leidas'; // 'no_leidas' | 'todas'

// Refresca el badge en la card del Panel RR.HH.
function _refrescarBadgeCBUNovedades(){
  const badge = document.getElementById('rrhh-badge-cbu');
  if(!badge) return;
  if(typeof cantidadCBUNovedadesNoLeidas !== 'function'){ badge.style.display = 'none'; return; }
  const n = cantidadCBUNovedadesNoLeidas();
  if(n > 0){
    badge.textContent = `${n} nueva${n>1?'s':''}`;
    badge.style.display = 'inline-block';
    badge.style.background = 'rgba(34,197,94,.12)';
    badge.style.color = 'var(--green)';
    badge.style.borderColor = 'rgba(34,197,94,.4)';
  } else {
    badge.style.display = 'none';
  }
}

function abrirPanelCBUNovedades(){
  if(currentUser?.role !== 'rrhh'){
    toast('⚠ Solo RR.HH. puede ver este panel','var(--red)'); return;
  }
  const html = `
    <div id="cbu-nov-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarPanelCBUNovedades()">
      <div class="card" style="padding:0;max-width:820px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">🏦 Novedades de cuentas bancarias</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Cambios de CBU informados por los empleados desde Mis Datos</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <div class="adm-chip ${_cbuNovFiltro==='no_leidas'?'active':''}" onclick="_cbuNovSetFiltro('no_leidas')">No leídas</div>
            <div class="adm-chip ${_cbuNovFiltro==='todas'?'active':''}" onclick="_cbuNovSetFiltro('todas')">Todas</div>
            <button onclick="cerrarPanelCBUNovedades()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
          </div>
        </div>
        <div id="cbu-nov-content" style="padding:0"></div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
  _renderPanelCBUNovedades();
}

function cerrarPanelCBUNovedades(){
  const m = document.getElementById('cbu-nov-modal-bg');
  if(m) m.remove();
}

function _cbuNovSetFiltro(f){
  _cbuNovFiltro = f;
  // Actualizar chips
  document.querySelectorAll('#cbu-nov-modal-bg .adm-chip').forEach((c, i) => {
    c.classList.toggle('active', (i === 0 && f === 'no_leidas') || (i === 1 && f === 'todas'));
  });
  _renderPanelCBUNovedades();
}

function _renderPanelCBUNovedades(){
  const cont = document.getElementById('cbu-nov-content');
  if(!cont) return;
  const novs = getCBUNovedades({ soloNoLeidas: _cbuNovFiltro === 'no_leidas' });

  if(!novs.length){
    cont.innerHTML = `
      <div style="padding:48px 20px;text-align:center;color:var(--t3)">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-size:13px">${_cbuNovFiltro === 'no_leidas' ? 'No hay novedades sin leer.' : 'Sin novedades registradas todavía.'}</div>
      </div>`;
    return;
  }

  const accionEmoji = a => ({ agregar:'➕', modificar:'✎', quitar:'✕' })[a] || '•';
  const accionColor = a => ({
    agregar:'var(--green)', modificar:'var(--accent2)', quitar:'var(--red)'
  })[a] || 'var(--t1)';

  const filas = novs.map(n => `
    <div style="display:grid;grid-template-columns:60px 1fr auto;gap:14px;padding:14px 22px;border-bottom:1px solid var(--border);align-items:start;${n.leida?'opacity:.55':''}">
      <div style="font-size:24px;text-align:center;color:${accionColor(n.accion)}">${accionEmoji(n.accion)}</div>
      <div style="min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">${_cbuNovEsc(n.nom||'?')} <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono);font-weight:400;margin-left:6px">leg ${_cbuNovEsc(n.leg||'?')}</span></div>
        <div style="font-size:12px;color:var(--t2);line-height:1.5">${_cbuNovEsc(n.detalle||'')}</div>
        <div style="display:flex;gap:10px;margin-top:6px;font-size:10px;color:var(--t3);font-family:var(--font-mono);align-items:center;flex-wrap:wrap">
          <span>${_cbuNovFmtFechaHora(n.fecha)}</span>
          ${n.leida ? `<span>· Leída por ${_cbuNovEsc(n.leidaPor||'?')} el ${_cbuNovFmtFechaHora(n.leidaEl)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="abrirLegajoDesdeNovedad('${_cbuNovEsc(n.leg)}')">→ Ver legajo</button>
        ${!n.leida ? `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="_cbuNovMarcarLeida('${n.id}')">✓ Marcar leída</button>` : ''}
      </div>
    </div>
  `).join('');

  const noLeidasCount = getCBUNovedades({ soloNoLeidas: true }).length;
  const headerActions = noLeidasCount > 0 ? `
    <div style="padding:10px 22px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:11px;color:var(--t3)">${novs.length} novedad${novs.length!==1?'es':''} mostrada${novs.length!==1?'s':''} · ${noLeidasCount} sin leer</div>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="_cbuNovMarcarTodasLeidas()">✓ Marcar todas como leídas</button>
    </div>` : `
    <div style="padding:10px 22px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:11px;color:var(--t3)">${novs.length} novedad${novs.length!==1?'es':''} · todas leídas</div>`;

  cont.innerHTML = headerActions + filas;
}

function _cbuNovMarcarLeida(id){
  marcarCBUNovedadLeida(id);
  _renderPanelCBUNovedades();
  _refrescarBadgeCBUNovedades();
}

async function _cbuNovMarcarTodasLeidas(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Marcar todas las novedades como leídas?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  marcarTodasCBUNovedadesLeidas();
  _renderPanelCBUNovedades();
  _refrescarBadgeCBUNovedades();
  toast('✓ Todas marcadas como leídas','var(--green)');
}

function abrirLegajoDesdeNovedad(leg){
  cerrarPanelCBUNovedades();
  // Navegar al ABM y abrir el empleado
  if(typeof nav === 'function') nav('rrhhpanel');
  if(typeof navRRHH === 'function') navRRHH('abm');
  setTimeout(() => {
    if(typeof abmTab === 'function') abmTab('lista');
    setTimeout(() => {
      if(typeof abmEditarEmpleado === 'function') abmEditarEmpleado(leg);
    }, 150);
  }, 200);
}

function _cbuNovFmtFechaHora(iso){
  if(!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch(e){ return iso; }
}
function _cbuNovEsc(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// Hook al cargar el panel RR.HH. para mostrar badge si hay novedades.
// (la función actualizarRRHHBadges ya existe en el sistema, pero no la conocemos todavía;
// llamamos al refresco manualmente desde nav() si entramos al panel RR.HH.)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => _refrescarBadgeCBUNovedades(), 500);
});
