// ═══════════════════════════════════════════════════════════════════════════
// UI: ABM de Conceptos Custom
// ───────────────────────────────────────────────────────────────────────────
// Pestaña dedicada para que RR.HH. y Admin gestionen los conceptos.
// ═══════════════════════════════════════════════════════════════════════════

let _ccConceptoEditando = null;  // null = nuevo, objeto = edición

async function abrirPanelConceptosCustom(){
  if(!_ccEsRRHHoAdmin()){ toast('⚠ Solo RR.HH. y Admin','var(--red)'); return; }
  const cont = document.getElementById('panel-conceptos-custom');
  if(!cont) return;
  cont.style.display = 'block';
  await renderConceptosCustom();
}

async function renderConceptosCustom(){
  const cont = document.getElementById('panel-conceptos-custom');
  if(!cont) return;

  const conceptos = await getConceptosCustom();
  // Ordenar: pendientes primero, luego por código
  conceptos.sort((a, b) => {
    const orden = { pendiente_aprobacion: 0, activo: 1, inactivo: 2, rechazado: 3 };
    const oa = orden[a.estado] ?? 99, ob = orden[b.estado] ?? 99;
    if(oa !== ob) return oa - ob;
    return (a.codigo || '').localeCompare(b.codigo || '');
  });

  const pendientes = conceptos.filter(c => c.estado === 'pendiente_aprobacion');
  const activos    = conceptos.filter(c => c.estado === 'activo');
  const rechInact  = conceptos.filter(c => c.estado === 'rechazado' || c.estado === 'inactivo');

  const renderFila = (c) => {
    const tInfo = TIPOS_CONCEPTO_CUSTOM.find(t => t.v === c.tipo);
    const eInfo = ESTADOS_CONCEPTO.find(e => e.v === c.estado);
    const esCritico = c._cambioCriticoPendiente;
    const puedeAprobar = _ccEsAdmin() && c.estado === 'pendiente_aprobacion';
    const puedeEditar = _ccEsRRHHoAdmin() && c.estado !== 'rechazado';

    return `
      <div class="card" style="background:var(--bg2);padding:12px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;${c.estado === 'inactivo' ? 'opacity:.6' : ''}">
        <div style="font-size:24px;line-height:1">${tInfo?.icon || '?'}</div>
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${(c.nombre || '').replace(/</g,'&lt;')}</span>
            <span style="font-family:var(--font-mono);font-size:10px;padding:2px 7px;border-radius:99px;background:var(--bg1);color:var(--t3)">${c.codigo}</span>
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(${tInfo?.color === 'var(--green)' ? '34,197,94' : tInfo?.color === 'var(--red)' ? '239,68,68' : '94,194,255'},.1);color:${tInfo?.color};border:1px solid rgba(${tInfo?.color === 'var(--green)' ? '34,197,94' : tInfo?.color === 'var(--red)' ? '239,68,68' : '94,194,255'},.3);text-transform:uppercase">${tInfo?.label}</span>
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;color:${eInfo?.color};border:1px solid ${eInfo?.color}">${eInfo?.icon} ${eInfo?.label}</span>
            ${esCritico ? `<span title="Hay un cambio crítico pendiente de aprobación" style="font-size:10px;padding:2px 7px;border-radius:99px;background:rgba(234,179,8,.1);color:var(--yellow);border:1px solid rgba(234,179,8,.3)">⚠ cambio crítico</span>` : ''}
          </div>
          <div style="font-size:11px;color:var(--t3);margin-top:4px;font-family:var(--font-mono);word-break:break-all">${(c.formula || '').replace(/</g,'&lt;') || '(sin fórmula)'}</div>
          ${c.descripcion ? `<div style="font-size:10px;color:var(--t3);margin-top:3px;font-style:italic">${c.descripcion.replace(/</g,'&lt;')}</div>` : ''}
          <div style="font-size:9px;color:var(--t3);margin-top:5px;font-family:var(--font-mono);display:flex;gap:10px;flex-wrap:wrap">
            ${c.imponibleJub ? '<span title="Aporta a jubilación">JUB ✓</span>' : ''}
            ${c.imponibleOS ? '<span title="Aporta a obra social">OS ✓</span>' : ''}
            ${c.imponibleGanancias ? '<span title="Computa para Ganancias 4ta">GAN ✓</span>' : ''}
            ${c.imponibleFCL ? '<span title="Aporta al FCL UOCRA">FCL ✓</span>' : ''}
            ${c.embargable ? '<span title="Computa para tope embargo">EMB ✓</span>' : ''}
            ${c.habitualSAC ? '<span title="Integra base SAC">SAC ✓</span>' : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
          ${puedeAprobar ? `<button class="btn btn-primary" style="font-size:11px;padding:5px 10px;background:var(--green);border-color:var(--green)" onclick="aprobarConceptoCustom(${c.id})" title="Aprobar">✓ Aprobar</button>
                            <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="rechazarConceptoCustom(${c.id})" title="Rechazar">✕ Rechazar</button>` : ''}
          ${puedeEditar ? `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="abrirEditorConceptoCustom(${c.id})" title="Editar">✎</button>` : ''}
          ${c.estado === 'activo' ? `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--t3)" onclick="toggleConceptoCustom(${c.id})" title="Desactivar">⊘</button>` : ''}
          ${c.estado === 'inactivo' ? `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--green)" onclick="toggleConceptoCustom(${c.id})" title="Reactivar">↻</button>` : ''}
          ${_ccEsAdmin() ? `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="eliminarConceptoCustom(${c.id})" title="Eliminar (solo Admin)">🗑</button>` : ''}
        </div>
      </div>
    `;
  };

  cont.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--t1)">⚙ Conceptos Custom de Liquidación</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">${conceptos.length} concepto${conceptos.length!==1?'s':''} · ${pendientes.length} pendiente${pendientes.length!==1?'s':''} de aprobación</div>
      </div>
      <button class="btn btn-primary" onclick="abrirEditorConceptoCustom(null)" style="font-size:13px;padding:8px 14px">+ Nuevo concepto</button>
    </div>

    ${pendientes.length ? `
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--yellow);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⏳ Pendientes de aprobación (${pendientes.length})</div>
        <div style="display:flex;flex-direction:column;gap:8px">${pendientes.map(renderFila).join('')}</div>
      </div>
    ` : ''}

    ${activos.length ? `
      <div style="margin-bottom:18px">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--green);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">✓ Activos (${activos.length})</div>
        <div style="display:flex;flex-direction:column;gap:8px">${activos.map(renderFila).join('')}</div>
      </div>
    ` : ''}

    ${rechInact.length ? `
      <details style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px">
        <summary style="cursor:pointer;color:var(--t3);font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">📜 Rechazados / Inactivos (${rechInact.length})</summary>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${rechInact.map(renderFila).join('')}</div>
      </details>
    ` : ''}

    ${conceptos.length === 0 ? `
      <div style="padding:40px;text-align:center;color:var(--t3);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r)">
        <div style="font-size:28px;margin-bottom:8px">⚙</div>
        <div style="font-size:13px;color:var(--t2)">Sin conceptos custom todavía</div>
        <div style="font-size:11px;margin-top:4px">Toca "+ Nuevo concepto" para crear el primero.</div>
      </div>
    ` : ''}
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR (modal)
// ═══════════════════════════════════════════════════════════════════════════
async function abrirEditorConceptoCustom(id){
  if(!_ccEsRRHHoAdmin()){ toast('⚠ Sin permiso','var(--red)'); return; }
  _ccConceptoEditando = id ? await getConceptoCustom(id) : null;
  const c = _ccConceptoEditando || {
    codigo: '', nombre: '', descripcion: '',
    tipo: 'REM', formula: '',
    imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
    imponibleFCL: false, embargable: true, habitualSAC: true,
    seccionRecibo: 'haberes',
    f931Casillero: 'R1',
    lsdCodigo: '110',
    cuentaContable: '',
    estado: 'pendiente_aprobacion'
  };

  const tipoOpts = TIPOS_CONCEPTO_CUSTOM.map(t =>
    `<option value="${t.v}" ${c.tipo === t.v ? 'selected' : ''}>${t.icon} ${t.label}</option>`
  ).join('');

  const variablesPorCateg = {};
  Object.entries(VARIABLES_FORMULA).forEach(([k, v]) => {
    if(!variablesPorCateg[v.categoria]) variablesPorCateg[v.categoria] = [];
    variablesPorCateg[v.categoria].push({ key: k, ...v });
  });

  const overlay = document.createElement('div');
  overlay.id = 'modal-cc-edit';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:780px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${id ? '✎ Editar' : '+ Nuevo'} Concepto Custom</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${id ? 'Modificá los campos. Los cambios críticos requieren aprobación Admin.' : 'Una vez creado, queda en estado "pendiente_aprobacion" hasta que Admin apruebe.'}</div>
        </div>
        <button onclick="document.getElementById('modal-cc-edit').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <!-- Sección IDENTIFICACIÓN -->
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">1. Identificación</div>
          <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-bottom:10px">
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Código (único, en mayúsculas)</label>
              <input type="text" id="cc-codigo" value="${c.codigo || ''}" placeholder="PLUS_NOCTURNIDAD" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
            </div>
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Nombre descriptivo</label>
              <input type="text" id="cc-nombre" value="${(c.nombre || '').replace(/"/g,'&quot;')}" placeholder="Plus por trabajo nocturno" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none">
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Descripción / observaciones (opcional)</label>
            <input type="text" id="cc-descripcion" value="${(c.descripcion || '').replace(/"/g,'&quot;')}" placeholder="Para empleados que trabajan después de las 21hs según CCT..." style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>

        <!-- Sección TIPO -->
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">2. Tipo de concepto</div>
          <select id="cc-tipo" onchange="_ccActualizarFlagsSegunTipo()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            ${tipoOpts}
          </select>
          <div id="cc-tipo-help" style="font-size:10px;color:var(--t3);margin-top:6px;font-style:italic"></div>
        </div>

        <!-- Aviso para tipos MANUAL -->
        <div id="cc-aviso-manual" style="display:none;background:rgba(168,85,247,.05);border:1px solid rgba(168,85,247,.3);border-radius:var(--r);padding:12px 14px;font-size:11px;color:var(--t2);line-height:1.5">
          <strong style="color:rgb(168,85,247)">✍️ Tipo MANUAL:</strong> el monto NO se calcula con fórmula.
          Una vez creado y aprobado, podrás cargar el monto por empleado:
          <ul style="margin:6px 0 0 18px;padding:0;font-size:11px">
            <li><strong>Carga manual</strong>: en la grilla de novedades de la liquidación, con el botón "+ Concepto"</li>
            <li><strong>Importación masiva</strong>: subiendo un archivo Excel/CSV con columnas <code style="background:var(--bg1);padding:1px 5px;border-radius:3px;font-family:var(--font-mono)">legajo, codigo, monto</code></li>
          </ul>
        </div>

        <!-- Sección FÓRMULA (oculta para tipos MANUAL) -->
        <div id="cc-seccion-formula">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">3. Fórmula de cálculo</div>
          <textarea id="cc-formula" rows="3" placeholder="Ej: sueldoBasico * 0.05 + mPres * 0.10" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:var(--font-mono)">${c.formula || ''}</textarea>
          <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
            <button class="btn btn-ghost" onclick="_ccValidarFormulaUI()" style="font-size:11px;padding:6px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✓ Validar fórmula</button>
            <button class="btn btn-ghost" onclick="_ccProbarFormula()" style="font-size:11px;padding:6px 10px;color:rgb(168,85,247);border-color:rgba(168,85,247,.3)">▶ Probar con empleado de ejemplo</button>
          </div>
          <div id="cc-formula-result" style="font-size:11px;margin-top:8px;padding:8px 10px;border-radius:4px;display:none;font-family:var(--font-mono)"></div>

          <details style="margin-top:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 12px">
            <summary style="cursor:pointer;font-size:11px;color:var(--t2)">📖 Variables y funciones disponibles</summary>
            <div style="margin-top:10px;font-size:11px;line-height:1.6">
              ${Object.entries(variablesPorCateg).map(([cat, vars]) => `
                <div style="margin-bottom:8px">
                  <div style="color:var(--accent2);font-size:10px;text-transform:uppercase;font-family:var(--font-mono);margin-bottom:4px">${cat.replace('_',' ')}</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px">
                    ${vars.map(v => `<button onclick="_ccInsertarVar('${v.key}')" type="button" title="${v.label}" style="font-family:var(--font-mono);font-size:10px;padding:2px 7px;border-radius:99px;background:var(--bg1);color:var(--t2);border:1px solid var(--border);cursor:pointer">${v.key}</button>`).join('')}
                  </div>
                </div>
              `).join('')}
              <div style="margin-top:6px">
                <div style="color:rgb(168,85,247);font-size:10px;text-transform:uppercase;font-family:var(--font-mono);margin-bottom:4px">Funciones</div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--t3);line-height:1.7">
                  <code>min(a,b)</code>, <code>max(a,b)</code>, <code>round(n)</code>, <code>floor(n)</code>, <code>ceil(n)</code>, <code>abs(n)</code>, <code>if(cond, a, b)</code>
                </div>
              </div>
              <div style="margin-top:8px;padding:6px 10px;background:var(--bg1);border-radius:4px;font-size:10px;color:var(--t3);line-height:1.5">
                <strong>Operadores:</strong> + - * / ( ) &nbsp;&nbsp; <strong>Comparaciones:</strong> &lt; &gt; &lt;= &gt;= == != &nbsp;&nbsp; <strong>Lógicos:</strong> &amp;&amp; ||<br>
                <strong>Ejemplos:</strong><br>
                • <code>sueldoBasico * 0.05</code> — 5% del sueldo básico<br>
                • <code>if(anios &gt;= 5, mAntig * 0.5, 0)</code> — si tiene 5 años o más, suma 50% más de antigüedad<br>
                • <code>min(totalHaberesRem * 0.10, 50000)</code> — 10% del rem con tope $50.000
              </div>
            </div>
          </details>
        </div>

        <!-- Sección FLAGS IMPONIBILIDAD -->
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">4. Flags de imponibilidad <span style="color:var(--yellow)">⚠ críticos</span></div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-imponibleJub" ${c.imponibleJub ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Aporta a jubilación SIPA (11%)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-imponibleOS" ${c.imponibleOS ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Aporta a obra social (3%)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-imponibleGanancias" ${c.imponibleGanancias ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Computa para Ganancias 4ta</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-imponibleFCL" ${c.imponibleFCL ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Aporta al FCL UOCRA (12% / 8%)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-embargable" ${c.embargable ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Computa para tope embargo</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2);font-size:11px;color:var(--t1)">
              <input type="checkbox" id="cc-habitualSAC" ${c.habitualSAC ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              <span>Integra base SAC (habitual)</span>
            </label>
          </div>
        </div>

        <!-- Sección OUTPUTS -->
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">5. Mapeo a outputs (recibo, F.931, LSD, contabilidad)</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Sección en recibo</label>
              <select id="cc-seccionRecibo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none">
                <option value="haberes" ${c.seccionRecibo === 'haberes' ? 'selected' : ''}>Haberes (lado izquierdo)</option>
                <option value="descuentos" ${c.seccionRecibo === 'descuentos' ? 'selected' : ''}>Descuentos (lado derecho)</option>
                <option value="exentos" ${c.seccionRecibo === 'exentos' ? 'selected' : ''}>Exentos (no remunerativos)</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">F.931 — Casillero AFIP</label>
              <select id="cc-f931Casillero" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
                <option value="" ${!c.f931Casillero ? 'selected' : ''}>(no enviar a F.931)</option>
                <option value="R1" ${c.f931Casillero === 'R1' ? 'selected' : ''}>R1 — Bruto Remunerativo</option>
                <option value="R6" ${c.f931Casillero === 'R6' ? 'selected' : ''}>R6 — No Remunerativo</option>
                <option value="R7" ${c.f931Casillero === 'R7' ? 'selected' : ''}>R7 — Adicionales (HE/Bono)</option>
                <option value="R8" ${c.f931Casillero === 'R8' ? 'selected' : ''}>R8 — Maternidad</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">LSD — Código AFIP de concepto</label>
              <input type="text" id="cc-lsdCodigo" value="${c.lsdCodigo || ''}" placeholder="110" maxlength="3" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:4px">Cuenta contable (asiento)</label>
              <input type="text" id="cc-cuentaContable" value="${c.cuentaContable || ''}" placeholder="6.1.1.099" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
            </div>
          </div>
        </div>

        ${id && _ccConceptoEditando ? `
          <div style="background:rgba(234,179,8,.05);border:1px solid rgba(234,179,8,.2);border-radius:4px;padding:10px 14px;font-size:10px;color:var(--t2);line-height:1.5">
            <strong>Cambios críticos:</strong> modificar fórmula, tipo, código o flags imponibles requiere aprobación de Admin (Gabriel Papa). Otras ediciones (nombre, descripción, mapeos a outputs) se aplican directo.
          </div>
        ` : ''}
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cc-edit').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarConceptoCustom()" style="font-size:13px;padding:8px 18px">${id ? 'Guardar cambios' : '+ Crear concepto'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _ccActualizarFlagsSegunTipo();
}

function _ccActualizarFlagsSegunTipo(){
  const tipo = document.getElementById('cc-tipo')?.value;
  const help = document.getElementById('cc-tipo-help');
  const tInfo = TIPOS_CONCEPTO_CUSTOM.find(t => t.v === tipo);
  if(help && tInfo) help.textContent = tInfo.desc;

  // Si el tipo es MANUAL, ocultamos la sección de fórmula y mostramos un aviso
  const esManual = _ccEsTipoManual(tipo);
  const seccionFormula = document.getElementById('cc-seccion-formula');
  const avisoManual    = document.getElementById('cc-aviso-manual');
  if(seccionFormula) seccionFormula.style.display = esManual ? 'none' : 'block';
  if(avisoManual)    avisoManual.style.display    = esManual ? 'block' : 'none';
}

function _ccInsertarVar(key){
  const ta = document.getElementById('cc-formula');
  if(!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + key + ta.value.slice(end);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + key.length;
}

function _ccValidarFormulaUI(){
  const formula = document.getElementById('cc-formula')?.value || '';
  const result = validarFormula(formula);
  const div = document.getElementById('cc-formula-result');
  if(!div) return;
  div.style.display = 'block';
  if(result.ok){
    div.style.background = 'rgba(34,197,94,.05)';
    div.style.border = '1px solid rgba(34,197,94,.3)';
    div.style.color = 'var(--green)';
    div.textContent = `✓ Fórmula válida — resultado con todas las variables = 1: ${result.resultadoConContextoDummy}`;
  } else {
    div.style.background = 'rgba(239,68,68,.05)';
    div.style.border = '1px solid rgba(239,68,68,.3)';
    div.style.color = 'var(--red)';
    div.textContent = `✕ ${result.error}`;
  }
}

function _ccProbarFormula(){
  const formula = document.getElementById('cc-formula')?.value || '';
  // Contexto de empleado típico: sueldo $1M, antig 5 años, etc.
  const ctxEjemplo = {
    sueldoBasico: 1000000, mAntig: 100000, mPres: 50000,
    mHsE50: 30000, mHsE100: 15000, mSac: 0, mVac: 0, mAjuste: 0, mCumpObj: 0,
    totalHaberesRem: 1195000, totalExentos: 50000, totalHaberes: 1245000,
    diasTrab: 22, ausentismo: 0, anios: 5,
    jubilacion: 131450, obraSocial: 35850, pamiEmp: 35850, anssal: 11950, sindicato: 29875,
    ganancias: 60000, embargo: 0, anticiposDesc: 0
  };
  const div = document.getElementById('cc-formula-result');
  if(!div) return;
  div.style.display = 'block';
  try {
    const valid = validarFormula(formula);
    if(!valid.ok){
      div.style.background = 'rgba(239,68,68,.05)';
      div.style.border = '1px solid rgba(239,68,68,.3)';
      div.style.color = 'var(--red)';
      div.textContent = `✕ ${valid.error}`;
      return;
    }
    const resultado = evaluarFormula(formula, ctxEjemplo);
    div.style.background = 'rgba(168,85,247,.05)';
    div.style.border = '1px solid rgba(168,85,247,.3)';
    div.style.color = 'rgb(168,85,247)';
    const fmtPesos = n => '$ ' + Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2});
    div.innerHTML = `
      ▶ <strong>Resultado: ${fmtPesos(resultado)}</strong>
      <div style="font-size:10px;color:var(--t3);margin-top:6px;line-height:1.5">
        Empleado de ejemplo: sueldo $1.000.000 · antig 5 años · pres 50k · HE 50% $30k · HE 100% $15k · 22 días trab.
      </div>
    `;
  } catch(err){
    div.style.background = 'rgba(239,68,68,.05)';
    div.style.border = '1px solid rgba(239,68,68,.3)';
    div.style.color = 'var(--red)';
    div.textContent = `✕ Error: ${err.message}`;
  }
}

async function guardarConceptoCustom(){
  const codigo = (document.getElementById('cc-codigo')?.value || '').trim().toUpperCase();
  const nombre = (document.getElementById('cc-nombre')?.value || '').trim();
  const descripcion = (document.getElementById('cc-descripcion')?.value || '').trim();
  const tipo = document.getElementById('cc-tipo')?.value;
  const formula = (document.getElementById('cc-formula')?.value || '').trim();

  if(!codigo){ toast('⚠ Falta el código','var(--yellow)'); return; }
  if(!/^[A-Z][A-Z0-9_]*$/.test(codigo)){ toast('⚠ Código inválido. Solo letras, números y _, empezando por letra','var(--yellow)'); return; }
  if(!nombre){ toast('⚠ Falta el nombre','var(--yellow)'); return; }

  // Los tipos MANUAL no requieren fórmula (el monto se carga por empleado).
  const esManual = _ccEsTipoManual(tipo);
  if(!esManual){
    if(!formula){ toast('⚠ Falta la fórmula','var(--yellow)'); return; }
    const validacion = validarFormula(formula);
    if(!validacion.ok){
      toast('⚠ Fórmula inválida: ' + validacion.error, 'var(--red)');
      return;
    }
  }

  // Verificar que el código sea único
  const todos = await getConceptosCustom();
  const otroConMismoCodigo = todos.find(c => c.codigo === codigo && c.id !== _ccConceptoEditando?.id);
  if(otroConMismoCodigo){
    toast(`⚠ Ya existe un concepto con código ${codigo}`,'var(--red)');
    return;
  }

  const flags = {
    imponibleJub:        !!document.getElementById('cc-imponibleJub')?.checked,
    imponibleOS:         !!document.getElementById('cc-imponibleOS')?.checked,
    imponibleGanancias:  !!document.getElementById('cc-imponibleGanancias')?.checked,
    imponibleFCL:        !!document.getElementById('cc-imponibleFCL')?.checked,
    embargable:          !!document.getElementById('cc-embargable')?.checked,
    habitualSAC:         !!document.getElementById('cc-habitualSAC')?.checked
  };

  const seccionRecibo = document.getElementById('cc-seccionRecibo')?.value;
  const f931Casillero = document.getElementById('cc-f931Casillero')?.value;
  const lsdCodigo     = (document.getElementById('cc-lsdCodigo')?.value || '').trim();
  const cuentaContable = (document.getElementById('cc-cuentaContable')?.value || '').trim();

  const ahora = new Date().toISOString();
  const usuario = currentUser?.emp?.nom || 'desconocido';

  const nuevoRec = {
    ...(_ccConceptoEditando || {}),
    codigo, nombre, descripcion, tipo, formula,
    ...flags,
    seccionRecibo, f931Casillero, lsdCodigo, cuentaContable,
    actualizadoEl: ahora,
    actualizadoPor: usuario
  };

  let recalcularBorradores = false;
  if(_ccConceptoEditando){
    // Edición — chequear si es cambio crítico
    const esCritico = _ccEsCambioCritico(_ccConceptoEditando, nuevoRec);
    if(esCritico){
      if(!_ccEsAdmin()){
        // RR.HH. hizo un cambio crítico → vuelve a estado pendiente
        nuevoRec.estado = 'pendiente_aprobacion';
        nuevoRec._cambioCriticoPendiente = true;
        nuevoRec._cambioPedidoEl = ahora;
        nuevoRec._cambioPedidoPor = usuario;
      } else {
        // Admin puede hacer el cambio directo (queda activo)
        nuevoRec.estado = 'activo';
        nuevoRec._cambioCriticoPendiente = false;
        recalcularBorradores = true;
      }
    } else {
      // Cambio menor — mantiene estado actual
    }
  } else {
    // Alta nueva — siempre pendiente excepto si lo crea Admin
    nuevoRec.creadoEl = ahora;
    nuevoRec.creadoPor = usuario;
    if(_ccEsAdmin()){
      nuevoRec.estado = 'activo';
      recalcularBorradores = true;
    } else {
      nuevoRec.estado = 'pendiente_aprobacion';
    }
  }

  await saveConceptoCustom(nuevoRec);

  if(typeof logAuditX === 'function'){
    logAuditX('conceptos_custom', _ccConceptoEditando ? 'editar' : 'crear', {
      codigo, tipo, formula, estado: nuevoRec.estado, por: usuario
    });
  }

  if(recalcularBorradores){
    const cant = await invalidarBorradoresPorCambioConcepto(`Cambio en concepto ${codigo}`);
    if(cant > 0) toast(`✓ Concepto guardado · ${cant} liquidación${cant!==1?'es':''} en borrador marcadas para recálculo`,'var(--green)');
    else toast('✓ Concepto guardado','var(--green)');
  } else {
    toast(nuevoRec.estado === 'pendiente_aprobacion'
      ? '✓ Guardado · queda pendiente de aprobación de Admin'
      : '✓ Concepto guardado', 'var(--green)');
  }

  document.getElementById('modal-cc-edit')?.remove();
  await renderConceptosCustom();
}

async function aprobarConceptoCustom(id){
  if(!_ccEsAdmin()){ toast('⚠ Solo Admin','var(--red)'); return; }
  const c = await getConceptoCustom(id);
  if(!c) return;
  if(!confirm(`¿Aprobar el concepto "${c.nombre}" (${c.codigo})?\n\nUna vez aprobado, entrará en vigencia para las próximas liquidaciones y se invalidarán los borradores actuales para recálculo.`)) return;
  c.estado = 'activo';
  c._cambioCriticoPendiente = false;
  c.aprobadoEl = new Date().toISOString();
  c.aprobadoPor = currentUser?.emp?.nom;
  await saveConceptoCustom(c);
  const cant = await invalidarBorradoresPorCambioConcepto(`Aprobación de concepto ${c.codigo}`);
  if(typeof logAuditX === 'function') logAuditX('conceptos_custom','aprobar',{codigo:c.codigo, por:currentUser?.emp?.nom});
  toast(`✓ Aprobado · ${cant} liq${cant!==1?'s':''} marcada${cant!==1?'s':''} para recálculo`, 'var(--green)');
  await renderConceptosCustom();
}

async function rechazarConceptoCustom(id){
  if(!_ccEsAdmin()){ toast('⚠ Solo Admin','var(--red)'); return; }
  const c = await getConceptoCustom(id);
  if(!c) return;
  const motivo = prompt(`Rechazar el concepto "${c.nombre}".\n\nMotivo del rechazo (opcional):`);
  if(motivo === null) return;  // canceló
  c.estado = 'rechazado';
  c.rechazadoEl = new Date().toISOString();
  c.rechazadoPor = currentUser?.emp?.nom;
  c.motivoRechazo = motivo || '(sin motivo)';
  await saveConceptoCustom(c);
  if(typeof logAuditX === 'function') logAuditX('conceptos_custom','rechazar',{codigo:c.codigo, motivo, por:currentUser?.emp?.nom});
  toast(`✓ Concepto rechazado`, 'var(--yellow)');
  await renderConceptosCustom();
}

async function toggleConceptoCustom(id){
  const c = await getConceptoCustom(id);
  if(!c) return;
  if(c.estado === 'activo'){
    if(!confirm(`¿Desactivar el concepto "${c.nombre}"?\n\nDeja de aplicarse en futuras liquidaciones (no se borra ni recalcula las pasadas).`)) return;
    c.estado = 'inactivo';
  } else if(c.estado === 'inactivo'){
    if(!confirm(`¿Reactivar el concepto "${c.nombre}"?`)) return;
    c.estado = 'activo';
  } else {
    return;
  }
  c.actualizadoEl = new Date().toISOString();
  c.actualizadoPor = currentUser?.emp?.nom;
  await saveConceptoCustom(c);
  await invalidarBorradoresPorCambioConcepto(`Toggle ${c.codigo}`);
  if(typeof logAuditX === 'function') logAuditX('conceptos_custom','toggle',{codigo:c.codigo, nuevoEstado:c.estado});
  await renderConceptosCustom();
}

async function eliminarConceptoCustom(id){
  if(!_ccEsAdmin()){ toast('⚠ Solo Admin','var(--red)'); return; }
  const c = await getConceptoCustom(id);
  if(!c) return;
  if(!confirm(`¿Eliminar DEFINITIVAMENTE el concepto "${c.nombre}" (${c.codigo})?\n\nNo afecta liquidaciones ya cerradas pero sí las que estén en borrador.`)) return;
  await deleteConceptoCustom(id);
  await invalidarBorradoresPorCambioConcepto(`Eliminación de ${c.codigo}`);
  if(typeof logAuditX === 'function') logAuditX('conceptos_custom','eliminar',{codigo:c.codigo, por:currentUser?.emp?.nom});
  toast(`✓ Concepto ${c.codigo} eliminado`,'var(--red)');
  await renderConceptosCustom();
}
