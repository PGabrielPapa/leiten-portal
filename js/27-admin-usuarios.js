// ═══════════════════════════════════════════════════════════════════════════
// PANTALLA: Administración de usuarios (solo nivel Admin)
// ───────────────────────────────────────────────────────────────────────────
// - Stats por nivel
// - Buscador + chips de filtro
// - Lista de empleados con badge de nivel y botón de editar
// - Modal de edición: cambiar nivel / blanquear contraseña / activar-desactivar
// - Pestaña de auditoría
// ═══════════════════════════════════════════════════════════════════════════

let _adm_filtro_nivel = 'todos';     // todos | admin | rrhh | gerente | generico | inactivos
let _adm_filtro_texto = '';
let _adm_tab          = 'usuarios';  // usuarios | auditoria

function renderAdminUsuarios(){
  const cont = document.getElementById('sec-admin-usuarios');
  if(!cont) return;

  if(currentUser?.level !== LEVEL_ADMIN){
    cont.innerHTML = `<div class="page-header">
      <div class="page-title">Acceso restringido</div>
      <div class="page-sub">Esta sección solo está disponible para administradores.</div>
    </div>`;
    return;
  }

  const stats = getUserLevelStats();
  const esGtRRHH = esGerenteRRHH(currentUser.emp);

  cont.innerHTML = `
    <div class="page-header">
      <div class="page-title">Administración de usuarios</div>
      <div class="page-sub">Gestión de niveles, contraseñas y accesos del portal.</div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;border-bottom:1px solid var(--border)">
      <div class="adm-tab ${_adm_tab==='usuarios'?'active':''}" onclick="_admSwitchTab('usuarios')">
        Usuarios
      </div>
      <div class="adm-tab ${_adm_tab==='auditoria'?'active':''}" onclick="_admSwitchTab('auditoria')">
        Auditoría
      </div>
    </div>

    <div id="adm-tab-content"></div>

    <style>
      .adm-tab{padding:8px 14px;font-size:13px;color:var(--t2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
      .adm-tab.active{color:var(--t1);border-bottom-color:var(--accent)}
      .adm-tab:hover{color:var(--t1)}
      .adm-stat-card{background:var(--bg2);border-radius:var(--r);padding:12px 14px;border:1px solid var(--border)}
      .adm-stat-label{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
      .adm-stat-value{font-size:22px;font-weight:600;color:var(--t1)}
      .adm-chip{padding:5px 12px;border-radius:999px;font-size:12px;border:1px solid var(--border);background:transparent;color:var(--t2);cursor:pointer;white-space:nowrap}
      .adm-chip.active{background:var(--accent-glow);color:var(--accent2);border-color:var(--accent)}
      .adm-chip:hover{color:var(--t1)}
      .adm-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);transition:background .12s}
      .adm-row:hover{background:var(--bg2)}
      .adm-row:last-child{border-bottom:none}
      .adm-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:var(--bg2);color:var(--t2);flex-shrink:0;border:1px solid var(--border)}
      .adm-info{flex:1;min-width:0}
      .adm-name{font-size:13px;font-weight:600;color:var(--t1);margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .adm-meta{font-size:11px;color:var(--t3);margin:2px 0 0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .adm-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:4px;white-space:nowrap;letter-spacing:.02em;text-transform:uppercase}
      .adm-edit-btn{background:transparent;border:1px solid var(--border);color:var(--t2);font-size:11px;padding:5px 10px;border-radius:var(--r);cursor:pointer;flex-shrink:0}
      .adm-edit-btn:hover{color:var(--t1);border-color:var(--accent)}
      .adm-modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
      .adm-modal{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);max-width:480px;width:100%;padding:22px;max-height:90vh;overflow-y:auto}
      .adm-action-btn{width:100%;text-align:left;padding:11px 14px;border:1px solid var(--border);border-radius:var(--r);background:transparent;color:var(--t1);font-size:13px;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;gap:10px}
      .adm-action-btn:hover{background:var(--bg2);border-color:var(--accent)}
      .adm-action-btn.danger{color:var(--red);border-color:rgba(239,68,68,.4)}
      .adm-action-btn.danger:hover{background:rgba(239,68,68,.08)}
      .adm-info-banner{background:rgba(127,119,221,.08);border:1px solid rgba(127,119,221,.3);border-radius:var(--r);padding:10px 14px;font-size:12px;color:#7F77DD;margin-bottom:14px;display:flex;gap:8px;align-items:flex-start;line-height:1.5}
      .adm-empty{text-align:center;padding:40px 20px;color:var(--t3);font-size:13px}
    </style>
  `;

  _admRenderTabContent();
}

function _admSwitchTab(tab){
  _adm_tab = tab;
  // Re-render solo el área de tab content (no toda la pantalla, evita reset del scroll)
  const wrap = document.getElementById('adm-tab-content');
  if(!wrap) return;
  // Actualizar estilos de tabs
  document.querySelectorAll('.adm-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'usuarios') || (i === 1 && tab === 'auditoria'));
  });
  _admRenderTabContent();
}

function _admRenderTabContent(){
  const wrap = document.getElementById('adm-tab-content');
  if(!wrap) return;
  if(_adm_tab === 'usuarios') wrap.innerHTML = _admHtmlUsuarios();
  else                         wrap.innerHTML = _admHtmlAuditoria();
}

// ─── TAB USUARIOS ──────────────────────────────────────────────────────────
function _admHtmlUsuarios(){
  const stats = getUserLevelStats();
  const esGtRRHH = esGerenteRRHH(currentUser.emp);

  // Stats
  const statsHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px">
      <div class="adm-stat-card">
        <div class="adm-stat-label">Admin</div>
        <div class="adm-stat-value" style="color:#D85A30">${stats.admin}</div>
      </div>
      <div class="adm-stat-card">
        <div class="adm-stat-label">RR.HH.</div>
        <div class="adm-stat-value" style="color:#7F77DD">${stats.rrhh}</div>
      </div>
      <div class="adm-stat-card">
        <div class="adm-stat-label">Gerente</div>
        <div class="adm-stat-value" style="color:#1D9E75">${stats.gerente}</div>
      </div>
      <div class="adm-stat-card">
        <div class="adm-stat-label">Genérico</div>
        <div class="adm-stat-value" style="color:#888780">${stats.generico}</div>
      </div>
      <div class="adm-stat-card">
        <div class="adm-stat-label">Inactivos</div>
        <div class="adm-stat-value" style="color:var(--t3)">${stats.inactivos}</div>
      </div>
    </div>
  `;

  const banner = esGtRRHH ? `
    <div class="adm-info-banner">
      <div style="font-weight:600">★</div>
      <div>Como Gerente de RR.HH. también podés asignar o quitar el nivel <strong>Admin</strong> a otros usuarios. Los demás administradores no pueden hacerlo.</div>
    </div>
  ` : `
    <div class="adm-info-banner" style="background:rgba(136,135,128,.08);border-color:rgba(136,135,128,.3);color:var(--t2)">
      <div>ⓘ</div>
      <div>El nivel <strong>Admin</strong> solo puede ser asignado o quitado por el Gerente de RR.HH.</div>
    </div>
  `;

  // Buscador
  const search = `
    <div style="margin-bottom:12px">
      <input type="text" id="adm-search-input"
        placeholder="Buscar por nombre, legajo, DNI o área…"
        value="${_adm_filtro_texto.replace(/"/g,'&quot;')}"
        oninput="_adm_filtro_texto = this.value; _admRenderLista()"
        style="width:100%;max-width:520px;padding:9px 12px;font-size:13px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1)">
    </div>
  `;

  // Chips
  const chips = `
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px">
      ${[
        ['todos','Todos'],
        [LEVEL_ADMIN,'Admin'],
        [LEVEL_RRHH,'RR.HH.'],
        [LEVEL_GERENTE,'Gerente'],
        [LEVEL_GENERICO,'Genérico'],
        ['inactivos','Inactivos']
      ].map(([v,l]) => `
        <span class="adm-chip ${_adm_filtro_nivel===v?'active':''}"
              onclick="_adm_filtro_nivel='${v}'; _admRenderLista()">${l}</span>
      `).join('')}
    </div>
  `;

  return `
    ${statsHtml}
    ${banner}
    ${search}
    ${chips}
    <div id="adm-lista-wrap" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);max-width:720px">
      ${_admHtmlLista()}
    </div>
  `;
}

function _admRenderLista(){
  // Re-render chips también (estado activo)
  const wrap = document.getElementById('adm-tab-content');
  if(wrap) wrap.innerHTML = _admHtmlUsuarios();
}

function _admHtmlLista(){
  if(typeof getNomina !== 'function') return '<div class="adm-empty">Nómina no disponible</div>';
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const disabled = getDisabledUsers();
  const txt = (_adm_filtro_texto || '').trim().toLowerCase();

  // Filtro
  const filtrados = nomina.filter(e => {
    const inactivo = !!disabled[e.dni];
    const lvl = getUserLevel(e);
    if(_adm_filtro_nivel === 'inactivos'){ if(!inactivo) return false; }
    else if(_adm_filtro_nivel !== 'todos'){
      if(inactivo) return false;
      if(lvl !== _adm_filtro_nivel) return false;
    } else {
      if(inactivo) return false; // por defecto no muestro inactivos
    }
    if(!txt) return true;
    const blob = `${e.nom||''} ${e.leg||''} ${e.dni||''} ${e.area||''} ${e.puesto||''} ${e.lugar||''}`.toLowerCase();
    return blob.includes(txt);
  });

  // Orden: admins primero, luego rrhh, gerentes, genéricos; dentro de cada uno, alfabético
  const orden = { admin:0, rrhh:1, gerente:2, generico:3 };
  filtrados.sort((a,b) => {
    const la = getUserLevel(a), lb = getUserLevel(b);
    if(orden[la] !== orden[lb]) return orden[la] - orden[lb];
    return (a.nom||'').localeCompare(b.nom||'');
  });

  if(!filtrados.length){
    return '<div class="adm-empty">No se encontraron empleados con ese filtro.</div>';
  }

  return filtrados.slice(0, 200).map(e => {
    const lvl = getUserLevel(e);
    const inactivo = !!disabled[e.dni];
    const initials = (e.nom||'?').split(',')[0].trim().substring(0,2).toUpperCase();
    return `
      <div class="adm-row">
        <div class="adm-avatar" style="${lvl===LEVEL_ADMIN?'background:rgba(216,90,48,.15);color:#D85A30':''}">${initials}</div>
        <div class="adm-info">
          <p class="adm-name">${_admEsc(e.nom)}${inactivo?' <span style="color:var(--red);font-weight:400;font-size:10px">(inactivo)</span>':''}</p>
          <p class="adm-meta">Leg. ${e.leg||'?'} · ${_admEsc(e.area||'')}${e.lugar?' · '+_admEsc(e.lugar):''}</p>
        </div>
        <span class="adm-badge" style="${levelBadgeStyle(lvl)}">${levelLabel(lvl)}</span>
        <button class="adm-edit-btn" onclick='_admAbrirModal(${JSON.stringify(e.dni)})'>Editar</button>
      </div>
    `;
  }).join('') + (filtrados.length > 200 ? `<div class="adm-empty">… y ${filtrados.length - 200} resultados más. Refiná el filtro.</div>` : '');
}

function _admEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── MODAL EDITAR USUARIO ──────────────────────────────────────────────────
function _admAbrirModal(dni){
  const emp = (typeof getNomina === 'function' ? getNomina() : []).find(e => e.dni === dni);
  if(!emp) return;
  const lvl = getUserLevel(emp);
  const inactivo = isUserDisabled(emp.dni);
  const esGtRRHH = esGerenteRRHH(currentUser.emp);
  const esYoMismo = currentUser.emp.dni === emp.dni;

  // Opciones de nivel disponibles para asignar
  const puedeAsignarAdmin = esGtRRHH;
  const opciones = LEVELS_ALL.filter(l => l !== LEVEL_ADMIN || puedeAsignarAdmin);

  const html = `
    <div class="adm-modal-bg" onclick="if(event.target===this) _admCerrarModal()">
      <div class="adm-modal" onclick="event.stopPropagation()">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div class="adm-avatar" style="width:44px;height:44px">
            ${(emp.nom||'?').split(',')[0].trim().substring(0,2).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--t1)">${_admEsc(emp.nom)}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Leg. ${emp.leg||'?'} · DNI ${emp.dni}</div>
          </div>
          <button onclick="_admCerrarModal()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">×</button>
        </div>

        <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">Nivel actual</div>
        <span class="adm-badge" style="${levelBadgeStyle(lvl)}">${levelLabel(lvl)}</span>
        ${inactivo?'<span class="adm-badge" style="margin-left:6px;background:rgba(239,68,68,.12);color:var(--red);border:1px solid rgba(239,68,68,.4)">INACTIVO</span>':''}

        <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px">Cambiar nivel</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px">
          ${opciones.map(l => `
            <button class="adm-action-btn" style="text-align:center;padding:9px;font-size:12px;${l===lvl?'border-color:var(--accent);background:var(--accent-glow);color:var(--accent2)':''}"
              ${l===lvl ? 'disabled' : `onclick="_admCambiarNivel('${emp.dni}','${l}')"`}>
              ${levelLabel(l)}
              ${l===lvl?' <span style="font-size:10px;opacity:.6">(actual)</span>':''}
            </button>
          `).join('')}
        </div>
        ${!puedeAsignarAdmin && lvl!==LEVEL_ADMIN?'<div style="font-size:11px;color:var(--t3);margin-top:8px">El nivel Admin solo puede ser asignado por el Gerente de RR.HH.</div>':''}
        ${!puedeAsignarAdmin && lvl===LEVEL_ADMIN?'<div style="font-size:11px;color:var(--t3);margin-top:8px">Solo el Gerente de RR.HH. puede quitar el nivel Admin.</div>':''}

        <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin:20px 0 8px">Otras acciones</div>

        <button class="adm-action-btn" onclick='_admBlanquear(${JSON.stringify(emp.dni)})'>
          <span style="font-size:14px">🔑</span>
          <div style="flex:1">
            <div>Blanquear contraseña</div>
            <div style="font-size:11px;color:var(--t3);margin-top:1px">La contraseña vuelve al DNI. Se le pedirá cambiarla en el próximo login.</div>
          </div>
        </button>

        ${esYoMismo ? '' : `
          <button class="adm-action-btn ${inactivo?'':'danger'}" onclick='_admToggleActivo(${JSON.stringify(emp.dni)}, ${!inactivo})'>
            <span style="font-size:14px">${inactivo?'✓':'⛔'}</span>
            <div style="flex:1">
              <div>${inactivo?'Reactivar usuario':'Desactivar usuario'}</div>
              <div style="font-size:11px;color:var(--t3);margin-top:1px">${inactivo?'Permite que vuelva a iniciar sesión.':'No podrá ingresar al portal hasta ser reactivado.'}</div>
            </div>
          </button>
        `}

        <button class="adm-action-btn" onclick="_admVerHistorial('${emp.dni}')">
          <span style="font-size:14px">📋</span>
          <div style="flex:1">
            <div>Ver historial de cambios</div>
            <div style="font-size:11px;color:var(--t3);margin-top:1px">Quién modificó qué de este usuario.</div>
          </div>
        </button>

        <button onclick="_admCerrarModal()" style="margin-top:16px;width:100%;padding:9px;background:transparent;border:1px solid var(--border);border-radius:var(--r);color:var(--t2);cursor:pointer;font-size:13px">Cerrar</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.id = 'adm-modal-container';
  container.innerHTML = html;
  document.body.appendChild(container);
}

async function _admCerrarModal(){
  const c = document.getElementById('adm-modal-container');
  if(c) c.remove();
}

async function _admCambiarNivel(dni, nivel){
  const emp = getNomina().find(e => e.dni === dni);
  if(!emp) return;
  const r = setUserLevel(emp, nivel);
  if(!r.ok){ _admToast(r.error, 'red'); return; }
  _admToast(`Nivel actualizado a ${levelLabel(nivel)}`, 'green');
  _admCerrarModal();
  // Si me cambié a mí mismo, refresco el badge en la nav
  if(currentUser.emp.dni === dni){
    currentUser.level = nivel;
    currentUser.role = levelToLegacyRole(nivel);
    _refreshNavBadge();
    if(typeof buildNav === 'function') buildNav();
  }
  _admRenderLista();
}

async function _admBlanquear(dni){
  const emp = getNomina().find(e => e.dni === dni);
  if(!emp) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Blanquear contraseña de ${emp.nom}?<br><br>La nueva contraseña será su DNI (${dni}). Se le pedirá cambiarla al ingresar.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const r = blanquearPassword(emp);
  if(!r.ok){ _admToast(r.error, 'red'); return; }
  _admToast('Contraseña blanqueada al DNI', 'green');
  _admCerrarModal();
  _admRenderLista();
}

async function _admToggleActivo(dni, disable){
  const emp = getNomina().find(e => e.dni === dni);
  if(!emp) return;
  const accion = disable ? 'desactivar' : 'reactivar';
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿${accion.charAt(0).toUpperCase()+accion.slice(1)} a ${emp.nom}?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const r = setUserDisabled(emp, disable);
  if(!r.ok){ _admToast(r.error, 'red'); return; }
  _admToast(`Usuario ${disable?'desactivado':'reactivado'}`, disable?'red':'green');
  _admCerrarModal();
  _admRenderLista();
}

function _admVerHistorial(dni){
  const log = getAuditLog().filter(l => l.target_dni === dni).reverse();
  const cont = document.getElementById('adm-modal-container');
  if(!cont) return;
  const modal = cont.querySelector('.adm-modal');
  if(!modal) return;
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <button onclick="_admAbrirModal('${dni}')" style="background:none;border:none;color:var(--t2);font-size:18px;cursor:pointer">←</button>
      <div style="flex:1;font-size:14px;font-weight:600">Historial de cambios</div>
      <button onclick="_admCerrarModal()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">×</button>
    </div>
    ${log.length === 0 ? '<div class="adm-empty">Sin cambios registrados para este usuario.</div>' :
      log.map(l => `
        <div style="border-left:2px solid var(--accent);padding:8px 12px;margin-bottom:8px;background:var(--bg2);border-radius:0 var(--r) var(--r) 0">
          <div style="font-size:12px;color:var(--t1);font-weight:500">${_admActionLabel(l)}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:3px">${l.fecha} ${l.hora} · por ${_admEsc(l.by_nom)}</div>
          ${l.detail?`<div style="font-size:11px;color:var(--t2);margin-top:3px">${_admEsc(l.detail)}</div>`:''}
        </div>
      `).join('')
    }
  `;
}

function _admActionLabel(l){
  // Mantenemos por compat con código viejo, pero la pestaña Auditoría usa
  // auditActionPhrase() (definido en js/28-audit-events.js).
  if(typeof auditActionPhrase === 'function') return auditActionPhrase(l);
  if(l.action === 'cambio_nivel') return `Nivel: ${levelLabel(l.before)} → ${levelLabel(l.after)}`;
  if(l.action === 'blanqueo_password') return 'Contraseña blanqueada al DNI';
  if(l.action === 'desactivar_usuario') return 'Usuario desactivado';
  if(l.action === 'activar_usuario') return 'Usuario reactivado';
  return l.action;
}

// ─── TAB AUDITORÍA ─────────────────────────────────────────────────────────
// Estado local de los filtros del panel de auditoría.
let _audit_filtros = {
  categoria: 'todos',  // todos | auth | admin | anticipos | rrhh | abm | sistema
  texto: '',
  desde: '',           // ISO date YYYY-MM-DD
  hasta: '',           // ISO date YYYY-MM-DD
  limit: 100           // mostrar últimos N
};

function _admHtmlAuditoria(){
  const todos = getAuditLog();
  if(!todos.length){
    return `
      <div class="adm-empty">
        <div style="font-size:24px;margin-bottom:8px">📋</div>
        <div>Sin actividad registrada todavía.</div>
        <div style="font-size:11px;color:var(--t3);margin-top:6px">Los eventos del portal (login, anticipos, blanqueos, sanciones, etc.) se irán registrando acá.</div>
      </div>`;
  }

  // Filtrar usando los filtros actuales — convertimos las fechas a ISO con hora
  // de inicio/fin del día para que el rango sea inclusivo en ambos extremos.
  const desdeIso = _audit_filtros.desde ? `${_audit_filtros.desde}T00:00:00.000Z` : '';
  const hastaIso = _audit_filtros.hasta ? `${_audit_filtros.hasta}T23:59:59.999Z` : '';
  const filtrados = (typeof auditFilter === 'function') ? auditFilter(todos, {
    categoria: _audit_filtros.categoria,
    texto:    _audit_filtros.texto,
    desde:    desdeIso,
    hasta:    hastaIso
  }) : todos;

  // Stats por categoría sobre el TOTAL (no sobre filtrados — es para orientar).
  const statsCat = { auth:0, admin:0, anticipos:0, rrhh:0, abm:0, sistema:0 };
  todos.forEach(l => {
    const c = l.category || 'admin';
    if(statsCat[c] !== undefined) statsCat[c]++;
  });

  const cats = [
    ['todos', `Todos · ${todos.length}`],
    [AUDIT_CAT_AUTH,      `Autenticación · ${statsCat.auth}`],
    [AUDIT_CAT_ADMIN,     `Administración · ${statsCat.admin}`],
    [AUDIT_CAT_ANTICIPOS, `Anticipos · ${statsCat.anticipos}`],
    [AUDIT_CAT_RRHH,      `RR.HH. · ${statsCat.rrhh}`],
    [AUDIT_CAT_ABM,       `ABM · ${statsCat.abm}`],
    [AUDIT_CAT_SISTEMA,   `Sistema · ${statsCat.sistema}`]
  ];
  const chipsHtml = cats.map(([v, label]) => `
    <div class="adm-chip ${_audit_filtros.categoria===v?'active':''}" onclick="_audSetCat('${v}')">${label}</div>
  `).join('');

  const visibles = filtrados.slice().reverse().slice(0, _audit_filtros.limit);
  const hayMas = filtrados.length > visibles.length;

  const filasHtml = visibles.map(l => {
    const cat = l.category || 'admin';
    const accion = (typeof auditActionPhrase === 'function') ? auditActionPhrase(l) : (l.action || '');
    const detail = l.detail ? `<div style="font-size:11px;color:var(--t3);margin-top:3px;line-height:1.4">${_admEsc(l.detail)}</div>` : '';
    const beforeAfter = (l.before || l.after) && cat !== 'admin' ? `
      <div style="font-size:10px;color:var(--t3);margin-top:3px;font-family:var(--font-mono)">
        ${l.before ? `<span style="color:var(--red)">−</span> ${_admEsc(l.before)}` : ''}
        ${l.before && l.after ? ' &nbsp;·&nbsp; ' : ''}
        ${l.after ? `<span style="color:var(--green)">+</span> ${_admEsc(l.after)}` : ''}
      </div>` : '';
    const targetExtra = l.target_extra ? ` <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">[${_admEsc(l.target_extra)}]</span>` : '';
    const targetTxt = l.target_nom ? ` <strong>${_admEsc(l.target_nom)}</strong>${targetExtra}` : '';

    return `
      <div class="adm-row" style="display:block;padding:11px 14px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);min-width:96px;line-height:1.5;padding-top:2px">
            ${_admEsc(l.fecha)}<br>${_admEsc(l.hora)}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:3px;flex-wrap:wrap">
              <span class="adm-badge" style="${typeof auditCategoryStyle==='function'?auditCategoryStyle(cat):''};font-size:9px">${(typeof auditCategoryLabel==='function'?auditCategoryLabel(cat):cat).toUpperCase()}</span>
            </div>
            <div style="font-size:13px;color:var(--t1);line-height:1.5">
              <strong>${_admEsc(l.by_nom)}</strong> ${accion}${targetTxt}
            </div>
            ${detail}
            ${beforeAfter}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const esGtRRHH = (typeof esGerenteRRHH === 'function') && esGerenteRRHH(currentUser?.emp);
  const limpiarBtnHtml = esGtRRHH ? `
    <button class="adm-edit-btn" onclick="auditClearAll()" style="color:var(--red);border-color:rgba(239,68,68,.4)">
      🗑 Limpiar log
    </button>` : '';

  return `
    <!-- Toolbar: chips + acciones -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center">
      ${chipsHtml}
    </div>

    <!-- Filtros: texto + rango fechas + acciones -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center;background:var(--bg2);padding:10px 12px;border-radius:var(--r);border:1px solid var(--border)">
      <input type="text" placeholder="Buscar usuario, acción, detalle..."
        value="${_admEsc(_audit_filtros.texto)}"
        oninput="_audSetTexto(this.value)"
        style="flex:1;min-width:200px;padding:7px 10px;font-size:12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);color:var(--t1)">

      <div style="display:flex;gap:6px;align-items:center;font-size:11px;color:var(--t3)">
        <label>Desde</label>
        <input type="date" value="${_audit_filtros.desde}" onchange="_audSetDesde(this.value)"
          style="padding:5px 8px;font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono)">
        <label>Hasta</label>
        <input type="date" value="${_audit_filtros.hasta}" onchange="_audSetHasta(this.value)"
          style="padding:5px 8px;font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono)">
      </div>

      ${(_audit_filtros.texto || _audit_filtros.desde || _audit_filtros.hasta || _audit_filtros.categoria !== 'todos') ?
        `<button class="adm-edit-btn" onclick="_audReset()">Limpiar filtros</button>` : ''}

      <button class="adm-edit-btn" onclick="auditExportCSV(_audGetFiltrados())">⤓ CSV</button>
      ${limpiarBtnHtml}
    </div>

    <!-- Resumen -->
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">
      Mostrando ${visibles.length} de ${filtrados.length} eventos${filtrados.length !== todos.length ? ` (filtrado de ${todos.length} totales)` : ''}.
      ${hayMas ? ` <a onclick="_audMostrarMas()" style="color:var(--accent);cursor:pointer;text-decoration:underline">Ver más</a>` : ''}
    </div>

    <!-- Lista -->
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);max-width:920px">
      ${filasHtml || '<div class="adm-empty">No hay eventos que coincidan con los filtros.</div>'}
    </div>
  `;
}

// ── Handlers de filtros (re-renderizan solo el contenido del tab) ──
function _audSetCat(c){     _audit_filtros.categoria = c; _admRenderTabContent(); }
function _audSetTexto(t){
  _audit_filtros.texto = t;
  // Debounce simple — re-render diferido para no perder foco del input.
  clearTimeout(_audSetTexto._t);
  _audSetTexto._t = setTimeout(()=>_admRenderTabContent(), 220);
}
function _audSetDesde(v){   _audit_filtros.desde = v; _admRenderTabContent(); }
function _audSetHasta(v){   _audit_filtros.hasta = v; _admRenderTabContent(); }
function _audReset(){
  _audit_filtros = { categoria:'todos', texto:'', desde:'', hasta:'', limit: _audit_filtros.limit };
  _admRenderTabContent();
}
function _audMostrarMas(){
  _audit_filtros.limit = (_audit_filtros.limit || 100) + 100;
  _admRenderTabContent();
}
function _audGetFiltrados(){
  const todos = getAuditLog();
  const desdeIso = _audit_filtros.desde ? `${_audit_filtros.desde}T00:00:00.000Z` : '';
  const hastaIso = _audit_filtros.hasta ? `${_audit_filtros.hasta}T23:59:59.999Z` : '';
  return (typeof auditFilter === 'function') ? auditFilter(todos, {
    categoria: _audit_filtros.categoria, texto: _audit_filtros.texto,
    desde: desdeIso, hasta: hastaIso
  }) : todos;
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function _admToast(msg, color){
  const t = document.getElementById('toast');
  if(!t){ showAlert(msg, "warning"); return; }
  t.textContent = msg;
  const cmap = { red:'var(--red)', green:'var(--green)', yellow:'var(--yellow)' };
  t.style.borderColor = cmap[color] || 'var(--accent)';
  t.style.color = cmap[color] || 'var(--accent2)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── REFRESH BADGE NAV ─────────────────────────────────────────────────────
function _refreshNavBadge(){
  const badge = document.getElementById('nav-role-badge');
  if(!badge || !currentUser) return;
  const lvl = currentUser.level;
  badge.textContent = levelLabel(lvl).toUpperCase();
  // Aplicar estilo según nivel
  const styles = {
    [LEVEL_ADMIN]:    { bg:'rgba(216,90,48,.12)',  bd:'#D85A30', fg:'#D85A30' },
    [LEVEL_RRHH]:     { bg:'rgba(127,119,221,.12)', bd:'#7F77DD', fg:'#7F77DD' },
    [LEVEL_GERENTE]:  { bg:'rgba(29,158,117,.12)',  bd:'#1D9E75', fg:'#1D9E75' },
    [LEVEL_GENERICO]: { bg:'rgba(136,135,128,.12)', bd:'#888780', fg:'#888780' }
  };
  const s = styles[lvl] || styles[LEVEL_GENERICO];
  badge.style.background = s.bg;
  badge.style.borderColor = s.bd;
  badge.style.color = s.fg;
}
