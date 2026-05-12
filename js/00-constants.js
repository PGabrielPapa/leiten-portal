// ═══════════════════════════════════════════════════════════════════════
// ═══   CONSTANTES GLOBALES — claves localStorage, config del sistema  ═══
// ═══   Módulo 00 — se carga primero, antes que cualquier otro módulo  ═══
// ═══════════════════════════════════════════════════════════════════════

'use strict';

// ── Claves localStorage (todas con prefijo lsg_ para namespace) ──────────────
const LS = Object.freeze({
  // Auth / usuarios
  PASSWORDS:       'lsg_passwords',
  USER_LEVELS:     'lsg_user_levels',
  USER_DISABLED:   'lsg_user_disabled',
  BLANQUEO:        'lsg_blanqueo',

  // Anticipos
  SOLICITUDES:     'lsg_solicitudes',

  // ABM empleados
  ABM_ALTAS:       'lsg_abm_altas',
  ABM_BAJAS:       'lsg_abm_bajas',
  ABM_OVERRIDES:   'lsg_abm_overrides',

  // Domicilios
  DOM_OVERRIDES:   'lsg_dom_overrides',

  // Liquidaciones
  LIQ_REAPERTURAS: 'lsg_liq_reaperturas',
  LIQ_RECHAZOS:    'lsg_liq_rechazos',

  // Contabilidad
  ASIENTO_PLAN:    'lsg_asiento_plan_cuentas',

  // CBU
  CBU_EMPLEADOS:   'lsg_cbu_empleados',
  CBU_PORCENTAJES: 'lsg_cbu_porcentajes',

  // Auditoría
  AUDIT_LOG:       'lsg_audit_log',
});

// ── Configuración de negocio ─────────────────────────────────────────────────
const CFG = Object.freeze({
  // Anticipos: meses en que NO se otorgan adelantos (1=Ene, 6=Jun, 7=Jul, 12=Dic)
  ANTICIPO_MESES_BLOQUEADOS: [1, 6, 7, 12],

  // Anticipo: límite porcentaje del sueldo neto
  ANTICIPO_TOPE_PCT: 0.50,

  // Anticipos: un anticipo por trimestre
  ANTICIPO_BLOQUEO_TRIMESTRAL: true,

  // Valor hora: divisor unificado LCT + UOCRA (decisión empresarial LEITEN)
  HORA_DIVISOR: 173,

  // Nómina de admins iniciales (por nombre exacto en data/empleados.js)
  ADMINS_INICIALES: [
    'PARERA, MARTIN',
    'PAPA, PABLO GABRIEL',
    'PAPA, LUCIANO',
    'OLIVERA, WALTER',
  ],
});

// ── Modal de confirmación reutilizable (reemplaza confirm() nativo) ──────────
/**
 * showConfirm(opts) → Promise<boolean>
 *
 * opts = {
 *   titulo:    string   (ej: 'Eliminar recibos')
 *   mensaje:   string   (HTML permitido, ej: '<b>12 recibo(s)</b> serán borrados')
 *   labelOk:   string   (ej: 'Eliminar')    — default: 'Confirmar'
 *   labelCancel: string                     — default: 'Cancelar'
 *   peligroso: boolean  (true → botón rojo) — default: false
 * }
 */
function showConfirm({ titulo = 'Confirmar', mensaje = '', labelOk = 'Confirmar',
                        labelCancel = 'Cancelar', peligroso = false } = {}) {
  return new Promise(resolve => {
    let modal = document.getElementById('_confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_confirm-modal';
      modal.innerHTML = `
        <div id="_confirm-backdrop" style="
          position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;
          display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="
            background:var(--bg,#1a1a1a);border:1px solid var(--border,#333);
            border-radius:10px;padding:28px 28px 22px;max-width:440px;width:100%;
            box-shadow:0 24px 60px rgba(0,0,0,.6)">
            <div id="_confirm-title" style="font-size:15px;font-weight:600;color:var(--t1,#fff);margin-bottom:10px"></div>
            <div id="_confirm-msg"   style="font-size:13px;color:var(--t2,#ccc);line-height:1.55;margin-bottom:22px"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end">
              <button id="_confirm-cancel" style="
                background:none;border:1px solid var(--border,#444);border-radius:6px;
                padding:8px 18px;font-size:13px;color:var(--t2,#ccc);cursor:pointer">
              </button>
              <button id="_confirm-ok" style="
                border:none;border-radius:6px;padding:8px 18px;
                font-size:13px;font-weight:600;cursor:pointer;color:#fff">
              </button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('_confirm-title').textContent = titulo;
    document.getElementById('_confirm-msg').innerHTML   = mensaje;
    document.getElementById('_confirm-cancel').textContent = labelCancel;
    document.getElementById('_confirm-ok').textContent  = labelOk;
    const okBtn = document.getElementById('_confirm-ok');
    okBtn.style.background = peligroso ? 'var(--red,#c0392b)' : 'var(--accent,#3b82f6)';

    modal.style.display = 'block';

    const cleanup = (val) => {
      modal.style.display = 'none';
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };

    const ok       = document.getElementById('_confirm-ok');
    const cancel   = document.getElementById('_confirm-cancel');
    const backdrop = document.getElementById('_confirm-backdrop');

    const onOk       = () => cleanup(true);
    const onCancel   = () => cleanup(false);
    const onBackdrop = (e) => { if (e.target === backdrop) cleanup(false); };
    const onKey      = (e) => { if (e.key === 'Escape') cleanup(false); };

    ok.addEventListener('click',       onOk);
    cancel.addEventListener('click',   onCancel);
    backdrop.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}
