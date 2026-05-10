// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DEL PLAN DE CUENTAS CONTABLE
// ───────────────────────────────────────────────────────────────────────────
// Permite a Admin editar visualmente las cuentas usadas en el asiento
// contable de sueldos. Antes solo se editaba via localStorage.
//
// Persistencia: localStorage.lsg_asiento_plan_cuentas (mismo key que js/39).
// ═══════════════════════════════════════════════════════════════════════════

function abrirEditorPlanCuentas(){
  if(typeof _ccEsAdmin === 'function' && !_ccEsAdmin()){
    toast('⚠ Solo Admin (Gabriel Papa) puede editar el plan de cuentas','var(--red)');
    return;
  }

  const plan = (typeof getPlanCuentas === 'function') ? getPlanCuentas() : {};
  const planDefault = (typeof PLAN_CUENTAS_DEFAULT !== 'undefined') ? PLAN_CUENTAS_DEFAULT : {};

  // Agrupar por categoría
  const gastos    = [], pasivos = [], activos = [];
  Object.entries(plan).forEach(([key, c]) => {
    if(c.tipo === 'D') gastos.push({ key, ...c });
    else if(c.tipo === 'C'){
      // Crítico: 1.x.x es activo, 2.x.x es pasivo
      if(c.cod && c.cod.startsWith('1.')) activos.push({ key, ...c });
      else pasivos.push({ key, ...c });
    }
  });

  const renderFila = (c) => {
    const personalizado = !planDefault[c.key] || planDefault[c.key].cod !== c.cod || planDefault[c.key].nombre !== c.nombre;
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:5px 8px;font-family:var(--font-mono);font-size:9px;color:var(--t3)">${c.key}</td>
        <td style="padding:5px 8px">
          <input type="text" data-key="${c.key}" data-field="cod" value="${(c.cod||'').replace(/"/g,'&quot;')}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:3px;padding:4px 7px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
        </td>
        <td style="padding:5px 8px">
          <input type="text" data-key="${c.key}" data-field="nombre" value="${(c.nombre||'').replace(/"/g,'&quot;')}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:3px;padding:4px 7px;color:var(--t1);font-size:11px;outline:none">
        </td>
        <td style="padding:5px 8px;text-align:center">${personalizado ? '<span title="Personalizado" style="font-size:9px;color:var(--yellow)">✎</span>' : '<span title="Default" style="font-size:9px;color:var(--t3)">·</span>'}</td>
      </tr>
    `;
  };

  const overlay = document.createElement('div');
  overlay.id = 'modal-plan-cuentas';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:920px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📒 Editor del Plan de Cuentas Contable</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${Object.keys(plan).length} cuentas · usado por el módulo de Asiento Contable de Sueldos</div>
        </div>
        <button onclick="document.getElementById('modal-plan-cuentas').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px">

        <div style="background:rgba(94,194,255,.05);border:1px solid rgba(94,194,255,.2);border-radius:4px;padding:10px 14px;font-size:11px;color:var(--t2);line-height:1.5;margin-bottom:14px">
          <strong>Cómo se usa:</strong> cuando se genera un asiento contable, cada concepto del recibo se mapea a la cuenta de débito o crédito correspondiente. Editá los códigos para que coincidan con el plan que usa LEITEN en su sistema contable (Tango/Bejerman/Holístor). Los nombres son editables para que en el Excel exportado aparezca el nombre correcto.
          <br><strong>Convención AR:</strong> 1.x.x.xxx = Activo · 2.x.x.xxx = Pasivo · 6.x.x.xxx = Gasto.
        </div>

        <!-- Tabs -->
        <div style="border-bottom:1px solid var(--border);margin-bottom:14px">
          <button id="tab-pc-gastos"  onclick="_pcTab('gastos')"  style="padding:8px 18px;background:none;border:none;border-bottom:2px solid var(--accent);margin-bottom:-2px;color:var(--accent2);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-mono)">Gastos (${gastos.length})</button>
          <button id="tab-pc-pasivos" onclick="_pcTab('pasivos')" style="padding:8px 18px;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--t3);font-size:12px;cursor:pointer;font-family:var(--font-mono)">Pasivos (${pasivos.length})</button>
          <button id="tab-pc-activos" onclick="_pcTab('activos')" style="padding:8px 18px;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--t3);font-size:12px;cursor:pointer;font-family:var(--font-mono)">Activos (${activos.length})</button>
        </div>

        <div id="pc-pane-gastos" style="display:block">
          <div style="font-size:10px;color:var(--t3);margin-bottom:6px">Cuentas de gasto / resultado (van al DEBE del asiento)</div>
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;max-height:420px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
                <tr>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Clave</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em;width:140px">Código</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Nombre</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Custom</th>
                </tr>
              </thead>
              <tbody>${gastos.map(renderFila).join('')}</tbody>
            </table>
          </div>
        </div>

        <div id="pc-pane-pasivos" style="display:none">
          <div style="font-size:10px;color:var(--t3);margin-bottom:6px">Cuentas de pasivo a pagar (van al HABER del asiento)</div>
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;max-height:420px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
                <tr>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Clave</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em;width:140px">Código</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Nombre</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Custom</th>
                </tr>
              </thead>
              <tbody>${pasivos.map(renderFila).join('')}</tbody>
            </table>
          </div>
        </div>

        <div id="pc-pane-activos" style="display:none">
          <div style="font-size:10px;color:var(--t3);margin-bottom:6px">Cuentas de activo (anticipos al personal — se cancelan en el HABER)</div>
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;max-height:420px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
                <tr>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Clave</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em;width:140px">Código</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Nombre</th>
                  <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Custom</th>
                </tr>
              </thead>
              <tbody>${activos.map(renderFila).join('')}</tbody>
            </table>
          </div>
        </div>

      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="_pcResetearDefaults()" style="font-size:13px;padding:8px 14px;color:var(--red);border-color:rgba(239,68,68,.3)">↺ Restaurar defaults</button>
        <button class="btn btn-ghost" onclick="document.getElementById('modal-plan-cuentas').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_pcGuardarPlan()" style="font-size:13px;padding:8px 18px">Guardar cambios</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function _pcTab(tab){
  ['gastos','pasivos','activos'].forEach(t => {
    const btn = document.getElementById(`tab-pc-${t}`);
    const pane = document.getElementById(`pc-pane-${t}`);
    if(btn){
      btn.style.borderBottomColor = (t===tab) ? 'var(--accent)' : 'transparent';
      btn.style.color = (t===tab) ? 'var(--accent2)' : 'var(--t3)';
      btn.style.fontWeight = (t===tab) ? '600' : '400';
    }
    if(pane) pane.style.display = (t===tab) ? 'block' : 'none';
  });
}

function _pcGuardarPlan(){
  const overlay = document.getElementById('modal-plan-cuentas');
  if(!overlay) return;
  const plan = (typeof getPlanCuentas === 'function') ? getPlanCuentas() : {};
  const inputs = overlay.querySelectorAll('input[data-key][data-field]');
  inputs.forEach(inp => {
    const key = inp.dataset.key;
    const field = inp.dataset.field;
    const val = (inp.value || '').trim();
    if(plan[key]) plan[key][field] = val;
  });
  if(typeof savePlanCuentas === 'function'){
    savePlanCuentas(plan);
    toast(`✓ Plan de cuentas guardado (${Object.keys(plan).length} cuentas)`, 'var(--green)');
    if(typeof logAuditX === 'function'){
      logAuditX('asiento_contable','editar_plan_cuentas',{ por: currentUser?.emp?.nom });
    }
    overlay.remove();
  } else {
    toast('⚠ savePlanCuentas no disponible','var(--red)');
  }
}

function _pcResetearDefaults(){
  if(!confirm('¿Restaurar el plan de cuentas a los valores por defecto?\n\nSe perderán los cambios personalizados.')) return;
  try {
    localStorage.removeItem('lsg_asiento_plan_cuentas');
    toast('✓ Plan de cuentas restaurado a defaults','var(--green)');
    document.getElementById('modal-plan-cuentas')?.remove();
    abrirEditorPlanCuentas();
  } catch(e){ toast('⚠ Error: '+e.message,'var(--red)'); }
}
