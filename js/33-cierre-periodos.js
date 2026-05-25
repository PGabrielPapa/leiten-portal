// ═══════════════════════════════════════════════════════════════════════
// ═══   CIERRE DE PERÍODOS CONTABLES                                   ═══
// ═══   Módulo 33 — Solo Admin puede abrir y cerrar períodos           ═══
// ═══                                                                   ═══
// ═══   Reglas de negocio:                                             ═══
// ═══     • Solo el rol 'admin' puede cerrar o reabrir un período      ═══
// ═══     • Un período cerrado bloquea TODA operación sobre ese        ═══
// ═══       mes/empresa: novedades, aprobaciones, blanqueos, CBUs      ═══
// ═══     • La reapertura requiere doble confirmación + audit trail    ═══
// ═══     • Solo Gabriel Papa (leg especial) puede forzar reapertura   ═══
// ═══       de períodos con más de 90 días de antigüedad               ═══
// ═══════════════════════════════════════════════════════════════════════

'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const _LS_CIERRES = 'lsg_cierres_contables'; // { "LEITEN-2026-05": { ... } }

// ── Helpers internos ─────────────────────────────────────────────────────────
function _getCierres() {
  try { return JSON.parse(localStorage.getItem(_LS_CIERRES) || '{}'); }
  catch { return {}; }
}

function _saveCierres(obj) {
  localStorage.setItem(_LS_CIERRES, JSON.stringify(obj));
}

/** Clave compuesta empresa+periodo: "LEITEN-2026-05" */
function _cierreKey(empresa, periodo) {
  // periodo viene como "MM-YYYY" → normalizar a "YYYY-MM"
  const [mm, yyyy] = (periodo || '').includes('-') ? periodo.split('-') : [periodo?.slice(0,2), periodo?.slice(2)];
  return `${empresa}-${yyyy}-${mm}`;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * isPeriodoCerrado(empresa, periodo) → boolean
 * Verifica si un período está cerrado para una empresa.
 * Llamado por js/17 antes de permitir modificaciones.
 */
function isPeriodoCerrado(empresa, periodo) {
  if (!empresa || !periodo) return false;
  const cierres = _getCierres();
  const key = _cierreKey(empresa, periodo);
  return !!(cierres[key]?.cerrado);
}

/**
 * assertPeriodoAbierto(empresa, periodo) → void | throws
 * Lanza un toast de error si el período está cerrado.
 * Usada como guard al inicio de operaciones de escritura.
 */
function assertPeriodoAbierto(empresa, periodo) {
  if (isPeriodoCerrado(empresa, periodo)) {
    const [mm, yyyy] = (periodo || '').split('-');
    const label = new Date(`${yyyy}-${mm}-01`).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
    toast(`🔒 Período ${label} cerrado para ${empresa} — contactá a Administración`, 'var(--red)', 4000);
    throw new Error(`PERIODO_CERRADO:${empresa}:${periodo}`);
  }
}

// ── Render del panel ──────────────────────────────────────────────────────────
async function renderCierrePeriodosPanel() {
  const div = document.getElementById('cierre-periodos-body');
  if (!div) return;

  // Solo admin puede ver y operar
  if (currentUser?.role !== 'admin') {
    div.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:13px">
      🔒 Solo administradores pueden gestionar el cierre de períodos.</div>`;
    return;
  }

  const cierres = _getCierres();
  const empresas = ['LEITEN S.A.', 'LEITEN NORTE S.R.L.', 'LEITEN CENTRO S.R.L.', 
                    'LEITEN SUR S.R.L.', 'LEITEN CUYO S.R.L.'];

  // Generar lista de últimos 12 períodos
  const periodos = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    periodos.push({
      value: `${mm}-${yyyy}`,
      label: d.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
    });
  }

  div.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Selector empresa/periodo -->
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:flex-end">
        <div>
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:4px">EMPRESA</label>
          <select id="cp-empresa" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px">
            ${empresas.map(e => `<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:4px">PERÍODO</label>
          <select id="cp-periodo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px">
            ${periodos.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
        </div>
        <button onclick="toggleCierrePeriodo()" style="padding:8px 16px;background:var(--accent);border:none;border-radius:var(--r);color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
          Ver estado
        </button>
      </div>

      <!-- Estado actual del período seleccionado -->
      <div id="cp-estado-actual" style="padding:16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)">
        <div style="font-size:12px;color:var(--t3)">Seleccioná una empresa y período para ver su estado.</div>
      </div>

      <!-- Tabla de todos los cierres vigentes -->
      <div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:8px">PERÍODOS CERRADOS ACTIVOS</div>
        ${_renderTablaCierres(cierres)}
      </div>
    </div>`;

  // Auto-mostrar estado al cambiar empresa/período
  ['cp-empresa','cp-periodo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', _actualizarEstadoCierre);
  });
  _actualizarEstadoCierre();
}

function _renderTablaCierres(cierres) {
  const cerrados = Object.entries(cierres).filter(([,v]) => v.cerrado);
  if (!cerrados.length) {
    return `<div style="padding:16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t3);font-size:12px;text-align:center">
      ✅ No hay períodos cerrados actualmente.</div>`;
  }

  const rows = cerrados.map(([key, v]) => {
    const [empresa, yyyy, mm] = key.split('-').reduce((acc, part, i, arr) => {
      // key = "EMPRESA NAME-YYYY-MM" — el nombre puede tener guiones
      if (i === arr.length - 2) return [...acc, part];
      if (i === arr.length - 1) return [...acc, part];
      return acc.length < 1 ? [part] : [[...acc.slice(0,-1), acc[acc.length-1] + '-' + part][0], ...acc.slice(1)];
    }, []);
    const fechaCierre = v.cerradoEl ? new Date(v.cerradoEl).toLocaleString('es-AR') : '?';
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 10px;font-size:12px;color:var(--t1)">${v.empresa || key}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--t1)">${v.periodoLabel || key}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--t3)">${v.cerradoPorNom || v.cerradoPor || '?'}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--t3)">${fechaCierre}</td>
      <td style="padding:8px 10px">
        <button onclick="reabrirPeriodoAdmin('${v.empresa}','${v.periodo}')"
          style="font-size:11px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--yellow);cursor:pointer">
          🔓 Reabrir
        </button>
      </td>
    </tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden">
    <thead>
      <tr style="background:var(--bg3)">
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3)">EMPRESA</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3)">PERÍODO</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3)">CERRADO POR</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3)">FECHA CIERRE</th>
        <th style="padding:8px 10px"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function _actualizarEstadoCierre() {
  const empresa = document.getElementById('cp-empresa')?.value;
  const periodo = document.getElementById('cp-periodo')?.value;
  const div     = document.getElementById('cp-estado-actual');
  if (!div || !empresa || !periodo) return;

  const cerrado = isPeriodoCerrado(empresa, periodo);
  const cierres = _getCierres();
  const key = _cierreKey(empresa, periodo);
  const info = cierres[key];
  const [mm, yyyy] = periodo.split('-');
  const label = new Date(`${yyyy}-${mm}-01`).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  if (cerrado && info) {
    const fechaCierre = new Date(info.cerradoEl).toLocaleString('es-AR');
    div.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--red)">🔒 Período CERRADO</div>
          <div style="font-size:12px;color:var(--t2);margin-top:4px">${empresa} — ${label}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:6px">
            Cerrado el ${fechaCierre} por ${info.cerradoPorNom || info.cerradoPor || '?'}
          </div>
        </div>
        <button onclick="reabrirPeriodoAdmin('${empresa}','${periodo}')"
          style="flex-shrink:0;padding:8px 14px;background:none;border:1px solid var(--yellow);border-radius:var(--r);color:var(--yellow);font-size:12px;cursor:pointer">
          🔓 Reabrir período
        </button>
      </div>`;
  } else {
    div.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--green)">✅ Período ABIERTO</div>
          <div style="font-size:12px;color:var(--t2);margin-top:4px">${empresa} — ${label}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:6px">
            Las operaciones de este período están habilitadas.
          </div>
        </div>
        <button onclick="cerrarPeriodoContable('${empresa}','${periodo}')"
          style="flex-shrink:0;padding:8px 14px;background:var(--red);border:none;border-radius:var(--r);color:#fff;font-size:12px;font-weight:600;cursor:pointer">
          🔒 Cerrar período
        </button>
      </div>`;
  }
}

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cerrarPeriodoContable(empresa, periodo) {
  if (currentUser?.role !== 'admin') {
    toast('🔒 Solo administradores pueden cerrar períodos', 'var(--red)'); return;
  }
  if (isPeriodoCerrado(empresa, periodo)) {
    toast('ℹ Ya está cerrado', 'var(--yellow)'); return;
  }

  const [mm, yyyy] = (periodo || '').split('-');
  const label = new Date(`${yyyy}-${mm}-01`).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const ok = await showConfirm({
    titulo: `🔒 Cerrar período contable`,
    mensaje: `¿Cerrar el período <b>${label}</b> para <b>${empresa}</b>?<br><br>
      <ul style="margin:8px 0 0 16px;line-height:1.9;color:var(--t2)">
        <li>No se podrán cargar ni modificar novedades</li>
        <li>No se podrán aprobar ni reabrir liquidaciones</li>
        <li>Solo un administrador puede reabrir el período</li>
      </ul>`,
    labelOk:  'Cerrar período',
    peligroso: true,
  });
  if (!ok) return;

  const cierres = _getCierres();
  const key = _cierreKey(empresa, periodo);
  cierres[key] = {
    cerrado:      true,
    empresa,
    periodo,
    periodoLabel: label,
    cerradoEl:    new Date().toISOString(),
    cerradoPor:   currentUser?.emp?.leg  || null,
    cerradoPorNom: currentUser?.emp?.nom || null,
  };
  _saveCierres(cierres);

  if (typeof logAuditX === 'function') {
    logAuditX('cierre_periodos', 'cierre', {
      empresa, periodo, label,
      por: currentUser?.emp?.leg,
      porNom: currentUser?.emp?.nom,
    });
  }

  toast(`🔒 Período ${label} cerrado para ${empresa}`, 'var(--green)', 4000);
  renderCierrePeriodosPanel();
}

async function reabrirPeriodoAdmin(empresa, periodo) {
  if (currentUser?.role !== 'admin') {
    toast('🔒 Solo administradores pueden reabrir períodos', 'var(--red)'); return;
  }
  if (!isPeriodoCerrado(empresa, periodo)) {
    toast('ℹ Ya está abierto', 'var(--yellow)'); return;
  }

  const cierres = _getCierres();
  const key = _cierreKey(empresa, periodo);
  const info = cierres[key];
  const [mm, yyyy] = (periodo || '').split('-');
  const label = new Date(`${yyyy}-${mm}-01`).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  // Verificar antigüedad: > 90 días requiere ser Gabriel Papa
  const diasDesdeCierre = info?.cerradoEl
    ? Math.floor((Date.now() - new Date(info.cerradoEl).getTime()) / 86400000)
    : 0;
  const esGabriel = _isGabrielPapa();

  if (diasDesdeCierre > 90 && !esGabriel) {
    toast(`🔒 Este período lleva ${diasDesdeCierre} días cerrado. Solo Gabriel Papa puede reabrirlo.`, 'var(--red)', 5000);
    return;
  }

  const ok = await showConfirm({
    titulo: `🔓 Reabrir período contable`,
    mensaje: `¿Reabrir el período <b>${label}</b> para <b>${empresa}</b>?<br><br>
      <span style="color:var(--yellow)">⚠ Esta acción quedará registrada en auditoría.</span>
      ${diasDesdeCierre > 30 ? `<br><br><span style="color:var(--red);font-size:12px">Atención: este período lleva ${diasDesdeCierre} días cerrado.</span>` : ''}`,
    labelOk:  'Reabrir período',
    peligroso: false,
  });
  if (!ok) return;

  delete cierres[key];
  _saveCierres(cierres);

  if (typeof logAuditX === 'function') {
    logAuditX('cierre_periodos', 'reapertura', {
      empresa, periodo, label, diasDesdeCierre,
      por:    currentUser?.emp?.leg,
      porNom: currentUser?.emp?.nom,
    });
  }

  toast(`🔓 Período ${label} reabierto para ${empresa}`, 'var(--yellow)', 4000);
  renderCierrePeriodosPanel();
}

/** Alias para el botón del selector */
function toggleCierrePeriodo() {
  _actualizarEstadoCierre();
}

// ── Modal entry point ─────────────────────────────────────────────────────────
function abrirCierrePeriodosModal() {
  const modal = document.getElementById('liq-cierre-periodos-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderCierrePeriodosPanel();
  }
}

function cerrarCierrePeriodosModal() {
  const modal = document.getElementById('liq-cierre-periodos-modal');
  if (modal) modal.style.display = 'none';
}
