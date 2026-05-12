// ═══════════════════════════════════════════════════════════════════════
// ═══   EDITOR DE CATÁLOGO DE CONCEPTOS                               ═══
// ═══   Módulo 52 — Edición de descripción, fórmula y base legal      ═══
// ═══                                                                  ═══
// ═══   Conceptos de SISTEMA (hardcoded en js/17):                    ═══
// ═══     → Se puede editar: descripción, fórmula (texto), base legal, ═══
// ═══       notas internas. Los cambios se guardan en localStorage     ═══
// ═══       (lsg_catalogo_overrides) y se muestran en el catálogo.    ═══
// ═══     → El cálculo real en js/17 NO cambia (son conceptos de ley).═══
// ═══   Conceptos CUSTOM (creados por RR.HH.):                        ═══
// ═══     → Abre directamente el editor completo de js/42.            ═══
// ═══   Solo Admin y RRHH pueden editar.                              ═══
// ═══════════════════════════════════════════════════════════════════════

'use strict';

const _LS_CAT_OVERRIDES = 'lsg_catalogo_overrides'; // { [codigo]: override }

// ── Storage ───────────────────────────────────────────────────────────────────
function _getOverrides() {
  try { return JSON.parse(localStorage.getItem(_LS_CAT_OVERRIDES) || '{}'); }
  catch { return {}; }
}
function _saveOverrides(obj) {
  localStorage.setItem(_LS_CAT_OVERRIDES, JSON.stringify(obj));
}

// Aplica los overrides guardados al array del catálogo unificado
function aplicarOverridesCatalogo(conceptos) {
  const ov = _getOverrides();
  return conceptos.map(c => {
    const key = String(c.codigo);
    if (!ov[key]) return c;
    return {
      ...c,
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

// ── Modal principal del editor ────────────────────────────────────────────────
async function abrirEditorCatalogo() {
  if (!['admin','rrhh'].includes(currentUser?.role)) {
    toast('🔒 Solo Admin y RR.HH. pueden editar el catálogo', 'var(--red)'); return;
  }

  // Crear o reusar modal
  let modal = document.getElementById('_editor-cat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = '_editor-cat-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9990;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px';
    modal.innerHTML = `
      <div style="max-width:980px;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);box-shadow:0 24px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;max-height:calc(100vh - 48px)">
        <!-- Header -->
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;flex-shrink:0">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:600;color:var(--t1)">✏️ Editor de catálogo de conceptos</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Editá descripción, fórmula de cálculo y base legal de cada concepto. Los cambios quedan guardados en este portal.</div>
          </div>
          <div id="_ec-badge-ov" style="font-size:11px;padding:4px 10px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:20px;color:var(--accent2)"></div>
          <button onclick="cerrarEditorCatalogo()" style="background:none;border:none;color:var(--t3);font-size:18px;cursor:pointer;padding:0 4px;line-height:1">✕</button>
        </div>

        <!-- Barra de filtros del editor -->
        <div style="padding:12px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex-shrink:0">
          <input id="_ec-busq" type="text" placeholder="🔍 Buscar concepto..." oninput="_ecFiltrar()"
            style="flex:1;min-width:200px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 12px;color:var(--t1);font-size:13px;outline:none">
          <select id="_ec-ftipo" onchange="_ecFiltrar()"
            style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
            <option value="">Todos los tipos</option>
            <option value="REM">💵 Remunerativo</option>
            <option value="NO_REM">🧾 No Remunerativo</option>
            <option value="APORTE">📋 Aporte</option>
            <option value="DESCUENTO">➖ Descuento</option>
            <option value="CONTRIBUCION_PATRONAL">🏢 Patronal</option>
          </select>
          <select id="_ec-forigen" onchange="_ecFiltrar()"
            style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
            <option value="">Todos</option>
            <option value="sistema">🔒 Sistema</option>
            <option value="custom">✎ Custom</option>
            <option value="editado">📝 Con cambios</option>
          </select>
          <button onclick="_ecRestaurarTodos()"
            style="padding:7px 13px;background:none;border:1px solid rgba(239,68,68,.4);border-radius:var(--r);color:var(--red);font-size:12px;cursor:pointer">
            ↺ Restaurar todo
          </button>
        </div>

        <!-- Lista de conceptos -->
        <div id="_ec-lista" style="overflow-y:auto;flex:1;padding:0"></div>

        <!-- Footer -->
        <div style="padding:12px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <div id="_ec-footer-info" style="font-size:11px;color:var(--t3)"></div>
          <button onclick="cerrarEditorCatalogo()"
            style="padding:8px 20px;background:var(--accent);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
            Cerrar
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Cerrar al click en backdrop
    modal.addEventListener('click', e => { if (e.target === modal) cerrarEditorCatalogo(); });
  }

  modal.style.display = 'flex';
  await _ecCargarDatos();
}

function cerrarEditorCatalogo() {
  const m = document.getElementById('_editor-cat-modal');
  if (m) m.style.display = 'none';
}

// ── Carga y render de la lista ────────────────────────────────────────────────
let _ecDatos = []; // cache de conceptos + overrides aplicados

async function _ecCargarDatos() {
  // Reusar los datos del catálogo si ya están cargados
  let base = window._reporteConceptosDatos;
  if (!base || !base.length) {
    // Cargar igual que js/50
    let custom = [];
    if (typeof getConceptosCustom === 'function') {
      try { custom = await getConceptosCustom() || []; } catch {}
    }
    const customNorm = custom.map(c => ({
      codigo:      c.codigo || c.cod || '—',
      descripcion: c.descripcion || c.label || '(sin descripción)',
      tipo:        c.tipo || '—',
      calculo:     typeof _calculoCustom === 'function' ? _calculoCustom(c) : 'custom',
      formula:     c.formula || 'Carga manual',
      baseLegal:   c.baseLegal || '—',
      categoria:   c.categoria || '—',
      _esCustom:   true,
      _estado:     c.estado || 'activo',
      _idCustom:   c.id || c.codigo,
    }));
    base = [
      ...CATALOGO_CONCEPTOS_HARDCODED.map(c => ({ ...c, _esCustom: false, _esSistema: true })),
      ...customNorm,
    ];
  }

  _ecDatos = aplicarOverridesCatalogo(base);
  _ecActualizarBadge();
  _ecFiltrar();
}

function _ecActualizarBadge() {
  const ov     = _getOverrides();
  const count  = Object.keys(ov).length;
  const badge  = document.getElementById('_ec-badge-ov');
  const footer = document.getElementById('_ec-footer-info');
  if (badge)  badge.textContent  = count ? `${count} concepto${count !== 1 ? 's' : ''} con cambios` : 'Sin cambios';
  if (footer) footer.textContent = `${_ecDatos.length} conceptos totales · ${_ecDatos.filter(c=>!c._esCustom).length} de sistema · ${_ecDatos.filter(c=>c._esCustom).length} custom`;
}

function _ecFiltrar() {
  const txt    = (document.getElementById('_ec-busq')?.value   || '').toLowerCase().trim();
  const tipo   = document.getElementById('_ec-ftipo')?.value   || '';
  const origen = document.getElementById('_ec-forigen')?.value || '';

  const filtrados = _ecDatos.filter(c => {
    if (origen === 'sistema' && c._esCustom)  return false;
    if (origen === 'custom'  && !c._esCustom) return false;
    if (origen === 'editado' && !c._editado)  return false;
    if (tipo && c.tipo !== tipo)              return false;
    if (txt) {
      const hay = `${c.codigo} ${c.descripcion} ${c.categoria} ${c.baseLegal} ${c.formula}`.toLowerCase();
      if (!hay.includes(txt)) return false;
    }
    return true;
  });

  _ecRenderLista(filtrados);
}

function _ecRenderLista(lista) {
  const cont = document.getElementById('_ec-lista');
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">Sin resultados — ajustá los filtros</div>`;
    return;
  }

  // Colores por tipo
  const tipoColor = {
    REM:                    'var(--green)',
    NO_REM:                 'rgb(94,194,255)',
    REM_MANUAL:             'var(--green)',
    NO_REM_MANUAL:          'rgb(94,194,255)',
    APORTE:                 'rgb(234,179,8)',
    DESCUENTO:              'var(--red)',
    DESCUENTO_MANUAL:       'var(--red)',
    CONTRIBUCION_PATRONAL:  'rgb(168,85,247)',
  };

  cont.innerHTML = lista.map((c, idx) => {
    const color  = tipoColor[c.tipo] || 'var(--t3)';
    const esEdit = !!c._editado;
    const key    = String(c.codigo);

    return `
    <div id="_ec-row-${key}" style="border-bottom:1px solid var(--border);transition:background .15s">

      <!-- Fila resumen (siempre visible) -->
      <div style="display:grid;grid-template-columns:52px 80px 1fr 110px 90px 90px;gap:0;align-items:center;padding:0;cursor:pointer"
           onclick="_ecToggleRow('${key}')">

        <!-- Origen badge -->
        <div style="padding:14px 0 14px 18px">
          ${c._esCustom
            ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(99,102,241,.15);color:var(--accent2);border:1px solid rgba(99,102,241,.3)">✎</span>`
            : `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--bg3);color:var(--t3);border:1px solid var(--border)">🔒</span>`}
        </div>

        <!-- Código -->
        <div style="padding:14px 10px;font-size:11px;font-family:var(--font-mono);color:var(--t3)">${c.codigo}</div>

        <!-- Descripción -->
        <div style="padding:14px 10px">
          <div style="font-size:13px;font-weight:500;color:var(--t1)">${c.descripcion}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${c.categoria || ''}</div>
        </div>

        <!-- Tipo -->
        <div style="padding:14px 10px">
          <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${color}22;color:${color};border:1px solid ${color}44">${c.tipo}</span>
        </div>

        <!-- Editado -->
        <div style="padding:14px 10px">
          ${esEdit
            ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(234,179,8,.15);color:rgb(234,179,8);border:1px solid rgba(234,179,8,.3)">📝 Editado</span>`
            : `<span style="font-size:10px;color:var(--t3)">—</span>`}
        </div>

        <!-- Expandir -->
        <div style="padding:14px 18px 14px 10px;text-align:right;color:var(--t3);font-size:12px" id="_ec-chevron-${key}">▾</div>
      </div>

      <!-- Panel expandible de edición -->
      <div id="_ec-panel-${key}" style="display:none;padding:0 18px 20px;background:var(--bg2);border-top:1px solid var(--border)">
        ${c._esCustom ? _ecRenderPanelCustom(c) : _ecRenderPanelSistema(c)}
      </div>
    </div>`;
  }).join('');
}

// ── Panel para conceptos de SISTEMA (hardcoded) ───────────────────────────────
function _ecRenderPanelSistema(c) {
  const key = String(c.codigo);
  return `
    <div style="padding-top:16px">
      <div style="font-size:11px;color:rgb(234,179,8);background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.25);border-radius:var(--r);padding:8px 12px;margin-bottom:16px">
        ℹ️ Concepto de sistema — el cálculo real está en el motor de liquidación (js/17). Acá podés actualizar la documentación: descripción, fórmula de referencia y base legal.
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

        <!-- Descripción -->
        <div>
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:5px">DESCRIPCIÓN</label>
          <input id="_ec-desc-${key}" type="text" value="${_esc(c.descripcion)}"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
        </div>

        <!-- Base legal -->
        <div>
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:5px">BASE LEGAL</label>
          <input id="_ec-blegal-${key}" type="text" value="${_esc(c.baseLegal || '')}"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
        </div>

        <!-- Fórmula -->
        <div style="grid-column:1/-1">
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:5px">FÓRMULA / CÁLCULO <span style="color:var(--t3);font-weight:400">(referencia documentaria)</span></label>
          <textarea id="_ec-formula-${key}" rows="2"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:12px;font-family:var(--font-mono);outline:none;resize:vertical;box-sizing:border-box">${_esc(c.formula || '')}</textarea>
        </div>

        <!-- Notas internas -->
        <div style="grid-column:1/-1">
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:5px">NOTAS INTERNAS <span style="color:var(--t3);font-weight:400">(solo visible en este panel)</span></label>
          <textarea id="_ec-notas-${key}" rows="2"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;box-sizing:border-box">${_esc(c._notas || '')}</textarea>
        </div>
      </div>

      ${c._editado ? `
      <div style="margin-top:10px;font-size:11px;color:var(--t3)">
        Última edición: ${c._editadoPor || '?'} — ${c._editadoEl ? new Date(c._editadoEl).toLocaleString('es-AR') : '?'}
      </div>` : ''}

      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
        ${c._editado ? `
        <button onclick="_ecRestaurarConcepto('${key}')"
          style="padding:7px 14px;background:none;border:1px solid rgba(239,68,68,.4);border-radius:var(--r);color:var(--red);font-size:12px;cursor:pointer">
          ↺ Restaurar original
        </button>` : ''}
        <button onclick="_ecGuardarConcepto('${key}', false)"
          style="padding:7px 20px;background:var(--accent);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
          💾 Guardar cambios
        </button>
      </div>
    </div>`;
}

// ── Panel para conceptos CUSTOM ───────────────────────────────────────────────
function _ecRenderPanelCustom(c) {
  return `
    <div style="padding-top:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:4px">FÓRMULA ACTUAL</div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;font-size:12px;font-family:var(--font-mono);color:var(--t2);min-height:36px">${_esc(c.formula || 'Carga manual')}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:4px">BASE LEGAL</div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--t2);min-height:36px">${_esc(c.baseLegal || '—')}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button onclick="_ecAbrirEditorCustom('${_esc(String(c._idCustom || c.codigo))}')"
          style="padding:8px 20px;background:var(--accent2);border:none;border-radius:var(--r);color:#fff;font-size:13px;font-weight:600;cursor:pointer">
          ✏️ Abrir en editor completo
        </button>
      </div>
    </div>`;
}

// ── Acciones ──────────────────────────────────────────────────────────────────
function _ecToggleRow(key) {
  const panel   = document.getElementById(`_ec-panel-${key}`);
  const chevron = document.getElementById(`_ec-chevron-${key}`);
  if (!panel) return;
  const open = panel.style.display === 'none';
  panel.style.display   = open ? 'block' : 'none';
  if (chevron) chevron.textContent = open ? '▴' : '▾';
}

function _ecGuardarConcepto(key, esCustom) {
  const desc    = document.getElementById(`_ec-desc-${key}`)?.value.trim();
  const formula = document.getElementById(`_ec-formula-${key}`)?.value.trim();
  const blegal  = document.getElementById(`_ec-blegal-${key}`)?.value.trim();
  const notas   = document.getElementById(`_ec-notas-${key}`)?.value.trim();

  // Validación básica
  if (!desc) { toast('⚠ La descripción no puede estar vacía', 'var(--yellow)'); return; }

  const overrides = _getOverrides();
  overrides[key] = {
    descripcion: desc,
    formula:     formula,
    baseLegal:   blegal,
    notas:       notas,
    updatedEl:   new Date().toISOString(),
    updatedBy:   currentUser?.emp?.leg    || null,
    updatedByNom: currentUser?.emp?.nom   || null,
  };
  _saveOverrides(overrides);

  if (typeof logAuditX === 'function') {
    logAuditX('editor_catalogo', 'editar_concepto', {
      codigo: key, desc, por: currentUser?.emp?.leg, porNom: currentUser?.emp?.nom,
    });
  }

  toast(`✅ Concepto ${key} actualizado`, 'var(--green)');
  _ecCargarDatos(); // recarga con overrides aplicados
}

async function _ecRestaurarConcepto(key) {
  const ok = await showConfirm({
    titulo: 'Restaurar concepto',
    mensaje: `¿Restaurar el concepto <b>${key}</b> a sus valores originales del sistema?`,
    labelOk: 'Restaurar',
    peligroso: false,
  });
  if (!ok) return;

  const overrides = _getOverrides();
  delete overrides[key];
  _saveOverrides(overrides);
  toast(`↺ Concepto ${key} restaurado al original`, 'var(--t3)');
  _ecCargarDatos();
}

async function _ecRestaurarTodos() {
  const count = Object.keys(_getOverrides()).length;
  if (!count) { toast('ℹ Sin cambios que restaurar', 'var(--t3)'); return; }

  const ok = await showConfirm({
    titulo: 'Restaurar todo el catálogo',
    mensaje: `¿Restaurar los <b>${count} conceptos editados</b> a sus valores originales del sistema?<br><br>Esta acción no se puede deshacer.`,
    labelOk: 'Restaurar todo',
    peligroso: true,
  });
  if (!ok) return;

  localStorage.removeItem(_LS_CAT_OVERRIDES);
  toast(`↺ Catálogo restaurado (${count} cambios eliminados)`, 'var(--yellow)');
  _ecCargarDatos();
}

function _ecAbrirEditorCustom(idOCodigo) {
  cerrarEditorCatalogo();
  // Intentar abrir el editor custom existente (js/42)
  if (typeof abrirEditorConceptoCustom === 'function') {
    abrirEditorConceptoCustom(idOCodigo);
  } else {
    // Fallback: ir a la sección de custom
    if (typeof navRRHH === 'function') navRRHH('conceptos-custom');
    toast('ℹ Buscá el concepto en la lista de conceptos custom', 'var(--accent2)', 4000);
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────
function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
