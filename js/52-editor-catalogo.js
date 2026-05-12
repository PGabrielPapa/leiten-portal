// ═══════════════════════════════════════════════════════════════════════
// ═══   EDITOR DE CATÁLOGO DE CONCEPTOS                               ═══
// ═══   Módulo 52 — Edición de descripción, fórmula y base legal      ═══
// ═══   Solo Admin y RR.HH. — cambios guardados en localStorage       ═══
// ═══════════════════════════════════════════════════════════════════════

'use strict';

// ── Paleta sólida — usa los valores hexadecimales directos del CSS ───────────
// bg0:#0a0c12  bg1:#111420  bg2:#181c2a  bg3:#1f2436
// border:#252b3d  border2:#2e3650
// t1:#e8ecf5  t2:#a0aabf  t3:#5c6880  accent:#3d7fff  accent2:#5b9aff

const _EC = {
  backdrop:  'rgba(5,6,10,.92)',
  modal:     '#0f1219',          // más oscuro que bg1 — contraste máximo
  header:    '#0a0c14',
  filters:   '#090b11',
  rowBg:     '#111420',
  rowHover:  '#151929',
  panelBg:   '#0d1018',          // expandido: más oscuro que la fila
  inputBg:   '#1a1e2e',          // más claro que panel — inputs "elevados"
  footer:    '#090b11',
  border:    '#252b3d',
  border2:   '#2e3650',
  t1:        '#e8ecf5',
  t2:        '#a0aabf',
  t3:        '#5c6880',
  accent:    '#3d7fff',
  accent2:   '#5b9aff',
  green:     'rgb(34,197,94)',
  yellow:    'rgb(234,179,8)',
  purple:    'rgb(168,85,247)',
  red:       '#e05555',
};

const _LS_CAT_OVERRIDES = 'lsg_catalogo_overrides';

function _getOverrides() {
  try { return JSON.parse(localStorage.getItem(_LS_CAT_OVERRIDES) || '{}'); }
  catch { return {}; }
}
function _saveOverrides(obj) {
  localStorage.setItem(_LS_CAT_OVERRIDES, JSON.stringify(obj));
}

function aplicarOverridesCatalogo(conceptos) {
  const ov = _getOverrides();
  return conceptos.map(c => {
    const key = String(c.codigo);
    if (!ov[key]) return c;
    return { ...c,
      descripcion: ov[key].descripcion ?? c.descripcion,
      formula:     ov[key].formula     ?? c.formula,
      baseLegal:   ov[key].baseLegal   ?? c.baseLegal,
      _notas:      ov[key].notas       ?? '',
      _editado:    true,
      _editadoEl:  ov[key].updatedEl,
      _editadoPor: ov[key].updatedByNom,
    };
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
async function abrirEditorCatalogo() {
  if (!['admin','rrhh'].includes(currentUser?.role)) {
    toast('🔒 Solo Admin y RR.HH. pueden editar el catálogo', 'var(--red)'); return;
  }

  let modal = document.getElementById('_editor-cat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = '_editor-cat-modal';
    modal.style.cssText = `
      display:none;position:fixed;inset:0;
      background:${_EC.backdrop};z-index:9990;
      align-items:flex-start;justify-content:center;
      overflow-y:auto;padding:28px 16px`;

    modal.innerHTML = `
      <div style="
        max-width:1020px;width:100%;
        background:${_EC.modal};
        border:1px solid ${_EC.border2};
        border-radius:10px;
        box-shadow:0 40px 100px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.05);
        display:flex;flex-direction:column;
        max-height:calc(100vh - 56px);overflow:hidden">

        <!-- Header -->
        <div style="
          padding:18px 22px;background:${_EC.header};
          border-bottom:2px solid ${_EC.border2};
          display:flex;align-items:center;gap:14px;flex-shrink:0">
          <div style="
            width:38px;height:38px;border-radius:8px;flex-shrink:0;
            background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.2);
            display:flex;align-items:center;justify-content:center;font-size:18px">
            ✏️
          </div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:${_EC.t1};letter-spacing:-.01em">Editor de catálogo de conceptos</div>
            <div style="font-size:11px;color:${_EC.t3};margin-top:2px">Descripción · fórmula · base legal — cambios guardados localmente</div>
          </div>
          <div id="_ec-badge-ov" style="
            font-size:11px;padding:4px 12px;white-space:nowrap;flex-shrink:0;
            background:rgba(91,154,255,.08);border:1px solid rgba(91,154,255,.2);
            border-radius:20px;color:${_EC.accent2}"></div>
          <button onclick="cerrarEditorCatalogo()" style="
            padding:5px 11px;font-size:15px;line-height:1;cursor:pointer;
            background:rgba(255,255,255,.05);border:1px solid ${_EC.border};
            border-radius:6px;color:${_EC.t2};transition:background .12s"
            onmouseover="this.style.background='rgba(255,255,255,.1)'"
            onmouseout="this.style.background='rgba(255,255,255,.05)'">✕</button>
        </div>

        <!-- Filtros -->
        <div style="
          padding:9px 22px;background:${_EC.filters};
          border-bottom:1px solid ${_EC.border};
          display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0">
          <div style="position:relative;flex:1;min-width:180px">
            <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:${_EC.t3};pointer-events:none;font-size:12px">🔍</span>
            <input id="_ec-busq" type="text" placeholder="Buscar concepto, código, fórmula..."
              oninput="_ecFiltrar()"
              style="
                width:100%;background:${_EC.inputBg};padding:7px 10px 7px 28px;
                border:1px solid ${_EC.border};border-radius:6px;
                color:${_EC.t1};font-size:12px;outline:none;box-sizing:border-box"
              onfocus="this.style.borderColor='${_EC.accent}'"
              onblur="this.style.borderColor='${_EC.border}'">
          </div>
          <select id="_ec-ftipo" onchange="_ecFiltrar()" style="background:${_EC.inputBg};border:1px solid ${_EC.border};border-radius:6px;padding:7px 10px;color:${_EC.t2};font-size:12px;outline:none;cursor:pointer">
            <option value="">Todos los tipos</option>
            <option value="REM">💵 Remunerativo</option>
            <option value="NO_REM">🧾 No Remunerativo</option>
            <option value="APORTE">📋 Aporte</option>
            <option value="DESCUENTO">➖ Descuento</option>
            <option value="CONTRIBUCION_PATRONAL">🏢 Patronal</option>
          </select>
          <select id="_ec-forigen" onchange="_ecFiltrar()" style="background:${_EC.inputBg};border:1px solid ${_EC.border};border-radius:6px;padding:7px 10px;color:${_EC.t2};font-size:12px;outline:none;cursor:pointer">
            <option value="">Todos</option>
            <option value="sistema">🔒 Sistema</option>
            <option value="custom">✎ Custom</option>
            <option value="editado">📝 Con cambios</option>
          </select>
          <select id="_ec-fcat" onchange="_ecFiltrar()" style="background:${_EC.inputBg};border:1px solid ${_EC.border};border-radius:6px;padding:7px 10px;color:${_EC.t2};font-size:12px;outline:none;cursor:pointer">
            <option value="">Todas las categorías</option>
            <option value="liqfinal">📋 Liquidación final</option>
            <option value="haberes">💵 Haberes</option>
            <option value="aportes">📋 Aportes / retenciones</option>
            <option value="patronal">🏢 Patronal</option>
            <option value="uocra">🏗️ UOCRA</option>
          </select>
          <button onclick="_ecRestaurarTodos()" style="
            padding:7px 12px;background:none;
            border:1px solid rgba(224,85,85,.35);border-radius:6px;
            color:${_EC.red};font-size:11px;cursor:pointer;white-space:nowrap">
            ↺ Restaurar todo
          </button>
        </div>

        <!-- Lista -->
        <div id="_ec-lista" style="overflow-y:auto;flex:1;background:${_EC.rowBg}"></div>

        <!-- Footer -->
        <div style="
          padding:10px 22px;background:${_EC.footer};
          border-top:1px solid ${_EC.border};
          display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <div id="_ec-footer-info" style="font-size:11px;color:${_EC.t3}"></div>
          <button onclick="cerrarEditorCatalogo()" style="
            padding:8px 22px;background:${_EC.accent};
            border:none;border-radius:6px;color:#fff;
            font-size:13px;font-weight:600;cursor:pointer">Cerrar</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) cerrarEditorCatalogo(); });
  }

  modal.style.display = 'flex';
  await _ecCargarDatos();
}

function cerrarEditorCatalogo() {
  const m = document.getElementById('_editor-cat-modal');
  if (m) m.style.display = 'none';
}

// ── Datos ─────────────────────────────────────────────────────────────────────
let _ecDatos = [];

async function _ecCargarDatos() {
  let custom = [];
  if (typeof getConceptosCustom === 'function') {
    try { custom = await getConceptosCustom() || []; } catch {}
  }
  const customNorm = custom.map(cc => ({
    codigo: cc.codigo || cc.cod || '—', descripcion: cc.descripcion || cc.label || '(sin descripción)',
    tipo: cc.tipo || '—', calculo: 'custom', formula: cc.formula || 'Carga manual',
    baseLegal: cc.baseLegal || '—', categoria: cc.categoria || '—',
    _esCustom: true, _estado: cc.estado || 'activo', _idCustom: cc.id || cc.codigo,
  }));
  _ecDatos = aplicarOverridesCatalogo([
    ...CATALOGO_CONCEPTOS_HARDCODED.map(cc => ({ ...cc, _esCustom: false, _esSistema: true })),
    ...customNorm,
  ]);
  _ecActualizarBadge();
  _ecFiltrar();
}

function _ecActualizarBadge() {
  const count = Object.keys(_getOverrides()).length;
  const badge = document.getElementById('_ec-badge-ov');
  const foot  = document.getElementById('_ec-footer-info');
  if (badge) badge.textContent = count ? `${count} editado${count !== 1 ? 's' : ''}` : 'Sin cambios';
  if (foot)  foot.textContent  = `${_ecDatos.length} conceptos · ${_ecDatos.filter(c=>!c._esCustom).length} sistema · ${_ecDatos.filter(c=>c._esCustom).length} custom`;
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function _ecFiltrar() {
  const txt  = (document.getElementById('_ec-busq')?.value   || '').toLowerCase().trim();
  const tipo = document.getElementById('_ec-ftipo')?.value   || '';
  const orig = document.getElementById('_ec-forigen')?.value || '';
  const cat  = document.getElementById('_ec-fcat')?.value    || '';

  const lista = _ecDatos.filter(c => {
    if (orig === 'sistema' && c._esCustom)  return false;
    if (orig === 'custom'  && !c._esCustom) return false;
    if (orig === 'editado' && !c._editado)  return false;
    if (tipo && c.tipo !== tipo)            return false;
    if (cat) {
      const cs = (c.categoria || '').toLowerCase();
      if (cat === 'liqfinal' && !cs.includes('liq. final'))  return false;
      if (cat === 'haberes'  && (cs.includes('liq. final') || cs.includes('aporte') || cs.includes('patronal') || cs.includes('uocra'))) return false;
      if (cat === 'aportes'  && !cs.includes('aporte') && !cs.includes('retenc') && !cs.includes('sindic') && !cs.includes('impuest')) return false;
      if (cat === 'patronal' && !cs.includes('patronal') && !cs.includes('contrib')) return false;
      if (cat === 'uocra'    && !cs.includes('uocra')) return false;
    }
    if (txt) {
      const hay = `${c.codigo} ${c.descripcion} ${c.categoria} ${c.baseLegal} ${c.formula}`.toLowerCase();
      if (!hay.includes(txt)) return false;
    }
    return true;
  });
  _ecRenderLista(lista);
}

// ── Render lista ──────────────────────────────────────────────────────────────
const _EC_TC = {
  REM:'rgb(34,197,94)', REM_MANUAL:'rgb(34,197,94)',
  NO_REM:'rgb(94,194,255)', NO_REM_MANUAL:'rgb(94,194,255)',
  APORTE:'rgb(234,179,8)', DESCUENTO:'#e05555', DESCUENTO_MANUAL:'#e05555',
  CONTRIBUCION_PATRONAL:'rgb(168,85,247)',
};

function _ecRenderLista(lista) {
  const cont = document.getElementById('_ec-lista');
  if (!cont) return;
  if (!lista.length) {
    cont.innerHTML = `<div style="padding:60px 24px;text-align:center">
      <div style="font-size:28px;margin-bottom:10px">🔍</div>
      <div style="color:${_EC.t3};font-size:13px">Sin resultados — ajustá los filtros</div>
    </div>`;
    return;
  }

  let lastGrupo = null;
  cont.innerHTML = lista.map(c => {
    const color  = _EC_TC[c.tipo] || _EC.t3;
    const esEdit = !!c._editado;
    const key    = String(c.codigo);
    const esLF   = (c.categoria || '').toLowerCase().includes('liq. final');
    let sep = '';
    if (esLF && lastGrupo !== 'liqfinal') {
      sep = `<div style="
        padding:8px 22px;display:flex;align-items:center;gap:10px;
        background:linear-gradient(90deg,rgba(168,85,247,.08) 0%,transparent 100%);
        border-top:1px solid rgba(168,85,247,.22);
        border-bottom:1px solid rgba(168,85,247,.12)">
        <div style="width:3px;height:18px;border-radius:2px;background:rgb(168,85,247);flex-shrink:0"></div>
        <span style="font-size:10px;font-weight:700;color:rgb(168,85,247);font-family:var(--font-mono);letter-spacing:.07em">LIQUIDACIÓN FINAL</span>
        <span style="font-size:10px;color:${_EC.t3}">Conceptos indemnizatorios — Arts. LCT · Leyes 24013 / 25323</span>
      </div>`;
      lastGrupo = 'liqfinal';
    } else if (!esLF && lastGrupo === 'liqfinal') { lastGrupo = null; }

    return sep + `
    <div id="_ec-row-${key}" style="border-bottom:1px solid ${_EC.border}">
      <div onclick="_ecToggleRow('${key}')"
        style="display:grid;grid-template-columns:52px 72px 1fr 140px 106px 40px;align-items:center;cursor:pointer;transition:background .12s"
        onmouseover="this.style.background='${_EC.rowHover}'"
        onmouseout="this.style.background='transparent'">
        <div style="padding:0 0 0 18px">
          ${c._esCustom
            ? `<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:rgba(91,154,255,.1);color:${_EC.accent2};border:1px solid rgba(91,154,255,.22);font-family:var(--font-mono)">CUSTOM</span>`
            : `<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.04);color:${_EC.t3};border:1px solid ${_EC.border};font-family:var(--font-mono)">SYS</span>`}
        </div>
        <div style="padding:13px 8px;font-size:11px;font-family:var(--font-mono);color:${_EC.t3}">${c.codigo}</div>
        <div style="padding:13px 8px;min-width:0">
          <div style="font-size:13px;font-weight:500;color:${_EC.t1};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(c.descripcion)}</div>
          <div style="font-size:10px;color:${_EC.t3};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(c.categoria || '')}</div>
        </div>
        <div style="padding:13px 8px">
          <span style="font-size:9px;padding:2px 8px;border-radius:8px;background:${color}18;color:${color};border:1px solid ${color}30;font-family:var(--font-mono);white-space:nowrap">${c.tipo}</span>
        </div>
        <div style="padding:13px 8px">
          ${esEdit
            ? `<span style="font-size:9px;padding:2px 8px;border-radius:8px;background:rgba(234,179,8,.1);color:rgb(234,179,8);border:1px solid rgba(234,179,8,.22)">📝 EDITADO</span>`
            : `<span style="font-size:10px;color:${_EC.t3}">—</span>`}
        </div>
        <div id="_ec-chevron-${key}" style="padding:13px 16px 13px 0;text-align:right;color:${_EC.t3};font-size:11px">▾</div>
      </div>
      <div id="_ec-panel-${key}" style="display:none;background:${_EC.panelBg};border-top:1px solid ${_EC.border}">
        ${c._esCustom ? _ecPanelCustom(c) : _ecPanelSistema(c)}
      </div>
    </div>`;
  }).join('');
}

// ── Panel sistema ─────────────────────────────────────────────────────────────
function _ecPanelSistema(c) {
  const key = String(c.codigo);
  const inp = `background:${_EC.inputBg};border:1px solid ${_EC.border2};border-radius:6px;color:${_EC.t1};font-size:13px;outline:none;width:100%;padding:9px 12px;box-sizing:border-box;transition:border .15s`;
  const lbl = `font-size:10px;color:${_EC.t3};font-family:var(--font-mono);letter-spacing:.06em;text-transform:uppercase;display:block;margin-bottom:6px`;
  return `
  <div style="padding:18px 22px">
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.18);border-radius:6px;margin-bottom:18px">
      <span style="flex-shrink:0;margin-top:1px">ℹ️</span>
      <div style="font-size:11px;color:${_EC.t2};line-height:1.6">
        <b style="color:rgb(234,179,8)">Concepto de sistema.</b> El cálculo real está en el motor de liquidación y no cambia desde acá.
        Estos campos son <b>documentación viva</b>: descripción, fórmula de referencia y base legal.
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div>
        <label style="${lbl}">Descripción</label>
        <input id="_ec-desc-${key}" type="text" value="${_esc(c.descripcion)}" style="${inp}"
          onfocus="this.style.borderColor='#3d7fff'" onblur="this.style.borderColor='${_EC.border2}'">
      </div>
      <div>
        <label style="${lbl}">Base legal</label>
        <input id="_ec-blegal-${key}" type="text" value="${_esc(c.baseLegal || '')}" placeholder="Art. XXX LCT..." style="${inp}"
          onfocus="this.style.borderColor='#3d7fff'" onblur="this.style.borderColor='${_EC.border2}'">
      </div>
    </div>
    <div style="margin-bottom:14px">
      <label style="${lbl}">Fórmula / cálculo <span style="color:${_EC.t3};font-weight:400;text-transform:none;letter-spacing:0">— referencia documentaria</span></label>
      <textarea id="_ec-formula-${key}" rows="2"
        style="${inp};font-family:var(--font-mono);font-size:12px;color:${_EC.t2};resize:vertical;line-height:1.5"
        onfocus="this.style.borderColor='#3d7fff'" onblur="this.style.borderColor='${_EC.border2}'">${_esc(c.formula || '')}</textarea>
    </div>
    <div style="margin-bottom:18px">
      <label style="${lbl}">Notas internas <span style="color:${_EC.t3};font-weight:400;text-transform:none;letter-spacing:0">— solo visible en este editor</span></label>
      <textarea id="_ec-notas-${key}" rows="2" placeholder="Aclaraciones, excepciones, historial..."
        style="${inp};font-size:12px;color:${_EC.t2};resize:vertical;line-height:1.5"
        onfocus="this.style.borderColor='#3d7fff'" onblur="this.style.borderColor='${_EC.border2}'">${_esc(c._notas || '')}</textarea>
    </div>
    ${c._editado ? `<div style="font-size:10px;color:${_EC.t3};margin-bottom:12px;padding:6px 10px;background:rgba(255,255,255,.03);border-radius:4px;border-left:2px solid ${_EC.border2}">
      Última edición: <b style="color:${_EC.t2}">${c._editadoPor || '?'}</b> — ${c._editadoEl ? new Date(c._editadoEl).toLocaleString('es-AR') : '?'}
    </div>` : ''}
    <div style="display:flex;gap:10px;justify-content:flex-end">
      ${c._editado ? `<button onclick="_ecRestaurarConcepto('${key}')"
        style="padding:8px 16px;background:none;border:1px solid rgba(224,85,85,.3);border-radius:6px;color:${_EC.red};font-size:12px;cursor:pointer"
        onmouseover="this.style.background='rgba(224,85,85,.08)'" onmouseout="this.style.background='none'">
        ↺ Restaurar original</button>` : ''}
      <button onclick="_ecGuardarConcepto('${key}')"
        style="padding:8px 22px;background:#3d7fff;border:none;border-radius:6px;color:#fff;font-size:13px;font-weight:600;cursor:pointer"
        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        💾 Guardar</button>
    </div>
  </div>`;
}

// ── Panel custom ──────────────────────────────────────────────────────────────
function _ecPanelCustom(c) {
  const readBox = `background:${_EC.inputBg};border:1px solid ${_EC.border};border-radius:6px;padding:9px 12px;font-size:12px;color:${_EC.t2};min-height:38px;line-height:1.5`;
  return `
  <div style="padding:18px 22px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
      <div>
        <div style="font-size:10px;color:${_EC.t3};font-family:var(--font-mono);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Fórmula actual</div>
        <div style="${readBox};font-family:var(--font-mono)">${_esc(c.formula || 'Carga manual')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:${_EC.t3};font-family:var(--font-mono);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Base legal</div>
        <div style="${readBox}">${_esc(c.baseLegal || '—')}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end">
      <button onclick="_ecAbrirEditorCustom('${_esc(String(c._idCustom || c.codigo))}')"
        style="padding:8px 20px;background:#5b9aff;border:none;border-radius:6px;color:#fff;font-size:13px;font-weight:600;cursor:pointer">
        ✏️ Abrir en editor completo</button>
    </div>
  </div>`;
}

// ── Acciones ──────────────────────────────────────────────────────────────────
function _ecToggleRow(key) {
  const panel = document.getElementById(`_ec-panel-${key}`);
  const chev  = document.getElementById(`_ec-chevron-${key}`);
  if (!panel) return;
  const open = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  if (chev) chev.textContent = open ? '▴' : '▾';
  if (open) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _ecGuardarConcepto(key) {
  const desc    = document.getElementById(`_ec-desc-${key}`)?.value.trim();
  const formula = document.getElementById(`_ec-formula-${key}`)?.value.trim();
  const blegal  = document.getElementById(`_ec-blegal-${key}`)?.value.trim();
  const notas   = document.getElementById(`_ec-notas-${key}`)?.value.trim();
  if (!desc) { showAlert('La descripción no puede estar vacía', 'warning'); return; }
  const ov = _getOverrides();
  ov[key] = { descripcion: desc, formula, baseLegal: blegal, notas,
    updatedEl: new Date().toISOString(),
    updatedBy: currentUser?.emp?.leg || null, updatedByNom: currentUser?.emp?.nom || null };
  _saveOverrides(ov);
  if (typeof logAuditX === 'function') logAuditX('editor_catalogo', 'editar_concepto', { codigo: key, desc, por: currentUser?.emp?.leg });
  toast(`✅ Concepto ${key} actualizado`, 'var(--green)');
  _ecCargarDatos();
}

async function _ecRestaurarConcepto(key) {
  const ok = await showConfirm({ titulo:'Restaurar concepto', mensaje:`¿Restaurar <b>${key}</b> a sus valores originales?`, labelOk:'Restaurar', peligroso:false });
  if (!ok) return;
  const ov = _getOverrides(); delete ov[key]; _saveOverrides(ov);
  toast(`↺ Concepto ${key} restaurado`, 'var(--t3)');
  _ecCargarDatos();
}

async function _ecRestaurarTodos() {
  const count = Object.keys(_getOverrides()).length;
  if (!count) { toast('ℹ Sin cambios que restaurar', 'var(--t3)'); return; }
  const ok = await showConfirm({ titulo:'Restaurar todo el catálogo',
    mensaje:`¿Restaurar los <b>${count} concepto${count !== 1 ? 's' : ''} editado${count !== 1 ? 's' : ''}</b>?<br><br>Esta acción no se puede deshacer.`,
    labelOk:'Restaurar todo', peligroso:true });
  if (!ok) return;
  localStorage.removeItem(_LS_CAT_OVERRIDES);
  toast(`↺ Catálogo restaurado (${count} cambios eliminados)`, 'var(--yellow)');
  _ecCargarDatos();
}

function _ecAbrirEditorCustom(idOCodigo) {
  cerrarEditorCatalogo();
  if (typeof abrirEditorConceptoCustom === 'function') abrirEditorConceptoCustom(idOCodigo);
  else { if (typeof navRRHH === 'function') navRRHH('conceptos-custom'); toast('ℹ Buscá el concepto en la lista custom', 'var(--accent2)', 4000); }
}

function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
