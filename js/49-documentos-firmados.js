// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTOS OFICIALES — Notificaciones / Comprobantes / Certificados
// ───────────────────────────────────────────────────────────────────────────
// Genera documentos imprimibles (notificación de sanción, comprobante de
// licencia, certificado laboral) con la firma del Gte. de RR.HH. incrustada.
//
// Cada función abre una ventana nueva con CSS @media print listo para
// imprimir o guardar como PDF.
//
// IMPORTANTE: la firma incrustada es una imagen escaneada, NO constituye
// firma digital con validez legal según Ley 25.506. Sirve como representación
// visual de autoría. Para uso vinculante usar firma digital certificada.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helper común: pie de documento con firma del RR.HH. ─────────────
function _docPieFirma(empresa){
  const info = (typeof getFirmaRRHH === 'function') ? getFirmaRRHH(empresa) : null;
  if(!info || !info.imagen){
    return `<div style="margin-top:60px;display:flex;justify-content:flex-end">
      <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:240px">
        <div style="font-size:11px;color:#333">________________________________</div>
        <div style="font-size:10px;color:#666;margin-top:3px">Firma del responsable de RR.HH.</div>
      </div>
    </div>`;
  }
  return `<div style="margin-top:50px;display:flex;justify-content:flex-end">
    <div style="text-align:center;min-width:280px">
      <img src="${info.imagen}" alt="Firma ${info.nombre}" style="width:180px;height:auto;max-height:90px;object-fit:contain;display:block;margin:0 auto">
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;font-weight:600;color:#222">${info.nombre}</div>
      <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.04em">${info.cargo}</div>
    </div>
  </div>`;
}

// ─── Helper común: encabezado con logo de empresa ────────────────────
function _docEncabezadoEmpresa(empresa){
  const logoHtml = (typeof LOGOS !== 'undefined' && LOGOS[empresa]) ? LOGOS[empresa] : '';
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:2px solid #333;margin-bottom:24px">
    <div>${logoHtml.replace('max-height:48px', 'max-height:60px').replace('max-width:140px', 'max-width:200px')}</div>
    <div style="text-align:right;font-size:10px;color:#555;font-family:Arial,sans-serif">
      <div style="font-weight:600;color:#222">${empresa}</div>
      <div style="margin-top:3px">Departamento de RR.HH.</div>
    </div>
  </div>`;
}

// ─── Wrapper: abrir ventana imprimible con HTML armado ──────────────
function _docAbrirImprimible(titulo, contenido){
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${titulo}</title>
    <style>
      @page { size: A4; margin: 20mm 18mm; }
      body { margin:0; padding:20px 24px; font-family:Arial,sans-serif; color:#222; max-width:780px; margin:auto; background:white }
      .no-print { margin-bottom:20px; padding:12px 16px; background:#f0f4ff; border:1px solid #d0d8ee; border-radius:6px }
      .no-print button { padding:8px 18px; background:#1E6B3A; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:600; margin-right:8px }
      .no-print button:hover { background:#175028 }
      h1 { font-size:18px; margin:0 0 6px; color:#222 }
      h2 { font-size:14px; margin:18px 0 8px; color:#333 }
      p { line-height:1.6; font-size:12px }
      .label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.05em; font-weight:600 }
      .valor { color:#222; font-size:12px }
      table { border-collapse:collapse; width:100%; margin:8px 0 }
      th, td { border:1px solid #ccc; padding:6px 9px; font-size:11px; text-align:left }
      th { background:#f5f5f5; font-weight:600 }
      @media print { .no-print { display:none } body { padding:0 } }
    </style></head><body>
    <div class="no-print">
      <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
      <span style="font-size:11px;color:#555">Documento listo para impresión — cerrá esta ventana cuando termines</span>
    </div>
    ${contenido}
    </body></html>`;
  const w = window.open('', '_blank');
  if(!w){
    toast('⚠ El navegador bloqueó la ventana. Permitir popups e intentar de nuevo.', 'var(--red)');
    return;
  }
  w.document.write(html);
  w.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1) NOTIFICACIÓN DE SANCIÓN DISCIPLINARIA
// ═══════════════════════════════════════════════════════════════════════════
function imprimirNotifSancion(idSancion){
  const s = (typeof getSanciones === 'function') ? getSanciones().find(x => x.id === idSancion) : null;
  if(!s){ toast('⚠ Sanción no encontrada', 'var(--red)'); return; }
  if(s.estado === 'solicitada'){
    toast('⚠ Solo se imprimen notificaciones de sanciones resueltas por RR.HH.', 'var(--yellow)');
    return;
  }
  const emp = (typeof empByLeg === 'function') ? empByLeg(s.leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const motivo = _sancMotivoInfo(s.motivo);
  const tipoApl = _sancTipoInfo(s.tipo_aplicado || s.tipo_solicitado);
  const fechaNotif = s.fecha_notificacion || new Date().toISOString().slice(0, 10);
  const fmtDate = iso => { if(!iso) return '—'; const [y,m,d] = String(iso).split('-'); return `${d}/${m}/${y}`; };

  const contenido = `
    ${_docEncabezadoEmpresa(emp.emp)}

    <h1 style="text-align:center;margin-bottom:14px">NOTIFICACIÓN DE SANCIÓN DISCIPLINARIA</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:18px">
      ${emp.emp}, ${fmtDate(fechaNotif)}<br>
      <span style="font-size:10px">N° de actuación: ${s.id}</span>
    </div>

    <p>Sr./Sra. <strong>${emp.nom}</strong> (DNI ${emp.dni || '—'}, Legajo ${emp.leg}):</p>

    <p>Por la presente se le notifica que, en uso de las facultades disciplinarias previstas
    en el Art. 67 de la Ley de Contrato de Trabajo (Ley 20.744 y modificatorias) y conforme al
    Reglamento Interno de la empresa, se ha resuelto aplicarle la siguiente sanción:</p>

    <table>
      <tr><th style="width:35%">Tipo de sanción</th><td><strong>${tipoApl.label}</strong></td></tr>
      <tr><th>Motivo</th><td>${motivo.label}</td></tr>
      <tr><th>Descripción de los hechos</th><td style="white-space:pre-wrap">${(s.descripcion || '').replace(/</g,'&lt;')}</td></tr>
      ${s.fecha_cumplimiento ? `<tr><th>Cumplimiento desde</th><td>${fmtDate(s.fecha_cumplimiento)}</td></tr>` : ''}
      <tr><th>Fecha de aplicación</th><td>${fmtDate(s.fecha_aplicacion || fechaNotif)}</td></tr>
    </table>

    ${s.comentario_rrhh ? `
      <h2>Consideraciones de RR.HH.</h2>
      <p style="white-space:pre-wrap;padding:10px 14px;background:#f8f8f8;border-left:3px solid #999">${s.comentario_rrhh.replace(/</g,'&lt;')}</p>
    ` : ''}

    <p style="margin-top:18px;font-size:11px;color:#555">
      Se le hace saber que, conforme al Art. 67 LCT, dispone de un plazo de
      <strong>30 (treinta) días corridos</strong> para impugnar esta sanción ante la empresa.
      Vencido dicho plazo sin impugnación, la sanción se considerará consentida.
    </p>

    <p>Por tomarse conocimiento se firma al pie en señal de notificación.</p>

    <!-- BLOQUE DE FIRMAS LADO A LADO -->
    <div style="display:flex;gap:40px;margin-top:50px">
      <div style="flex:1;text-align:center">
        <div style="border-top:1px solid #333;padding-top:4px;font-size:10px;color:#555">Notificado · Firma del empleado</div>
        <div style="font-size:11px;color:#222;margin-top:18px">${emp.nom}</div>
        <div style="font-size:10px;color:#666">DNI ${emp.dni || '—'}</div>
      </div>
      <div style="flex:1">
        ${_docPieFirma(emp.emp).replace('margin-top:50px', 'margin-top:0').replace('justify-content:flex-end', 'justify-content:center')}
      </div>
    </div>

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.<br>
      Actuación N° ${s.id}
    </div>
  `;
  _docAbrirImprimible(`Notificación sanción ${emp.leg}`, contenido);

  if(typeof logAuditX === 'function'){
    logAuditX('sanciones', 'imprimir_notif', { id: s.id, leg: s.leg, por: currentUser?.emp?.nom });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) COMPROBANTE DE LICENCIA
// ═══════════════════════════════════════════════════════════════════════════
async function imprimirComprobanteLicencia(idLic, origen){
  // origen: 'anual' | 'especial' | 'medica'
  let lic = null;
  if(origen === 'anual' && typeof getLicAnuales === 'function'){
    lic = (await getLicAnuales() || []).find(x => x.id === idLic);
  } else if(origen === 'especial' && typeof getLicenciasEspeciales === 'function'){
    lic = (await getLicenciasEspeciales() || []).find(x => x.id === idLic);
  } else if(typeof getLicencias === 'function'){
    lic = (await getLicencias() || []).find(x => x.id === idLic);
  }
  if(!lic){ toast('⚠ Licencia no encontrada', 'var(--red)'); return; }

  const emp = (typeof empByLeg === 'function') ? empByLeg(lic.leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const fmtDate = iso => { if(!iso) return '—'; const [y,m,d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  const titulo = origen === 'anual' ? 'COMPROBANTE DE LICENCIA ANUAL ORDINARIA (Vacaciones)' :
                 origen === 'especial' ? 'COMPROBANTE DE LICENCIA ESPECIAL' :
                                         'COMPROBANTE DE LICENCIA';

  const articulo = origen === 'anual' ? 'Art. 150 LCT (Ley 20.744)' :
                   origen === 'especial' ? 'Art. 158 LCT (Licencias Especiales)' :
                   'Art. 208 LCT (Enfermedad inculpable)';

  const contenido = `
    ${_docEncabezadoEmpresa(emp.emp)}

    <h1 style="text-align:center;margin-bottom:14px">${titulo}</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:18px">
      ${emp.emp}, ${new Date().toLocaleDateString('es-AR')}<br>
      <span style="font-size:10px">Comprobante N° ${lic.id || '—'}</span>
    </div>

    <p>Se deja constancia de que el/la empleado/a <strong>${emp.nom}</strong> (DNI ${emp.dni || '—'},
    Legajo ${emp.leg}) ha solicitado licencia conforme a lo establecido en ${articulo}.</p>

    <table>
      <tr><th style="width:35%">Empleado</th><td>${emp.nom}</td></tr>
      <tr><th>Legajo / DNI</th><td>${emp.leg} / ${emp.dni || '—'}</td></tr>
      <tr><th>Empresa</th><td>${emp.emp}</td></tr>
      <tr><th>Lugar de trabajo</th><td>${emp.lugar || '—'}</td></tr>
      <tr><th>Categoría / Cargo</th><td>${emp.cat || '—'} ${emp.tramo || ''} · ${emp.tarea || ''}</td></tr>
      <tr><th>Tipo de licencia</th><td><strong>${lic.tipo || titulo}</strong></td></tr>
      <tr><th>Desde</th><td>${fmtDate(lic.desde)}</td></tr>
      <tr><th>Hasta</th><td>${fmtDate(lic.hasta)}</td></tr>
      <tr><th>Días totales</th><td><strong>${lic.dias || '—'}</strong> día${lic.dias!==1?'s':''}</td></tr>
      ${lic.obs || lic.motivo ? `<tr><th>Observaciones</th><td>${(lic.obs || lic.motivo).replace(/</g,'&lt;')}</td></tr>` : ''}
      <tr><th>Estado</th><td><strong style="color:${lic.estado === 'aprobada' ? '#1E6B3A' : '#999'}">${(lic.estado || 'aprobada').toUpperCase()}</strong></td></tr>
      <tr><th>Solicitada el</th><td>${lic.solicitadoEl || lic.presentadoEl || '—'}</td></tr>
    </table>

    <p style="margin-top:18px">El presente comprobante acredita que la licencia ha sido <strong>${
      lic.estado === 'aprobada' || lic.estado === 'aprobada_gerente' ? 'autorizada' : 'registrada'
    }</strong> en los términos solicitados, debiendo el empleado reincorporarse a sus tareas habituales a partir del día
    siguiente al de la fecha hasta indicada (${fmtDate(lic.hasta)}).</p>

    ${_docPieFirma(emp.emp)}

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.
    </div>
  `;
  _docAbrirImprimible(`Comprobante licencia ${emp.leg}`, contenido);

  if(typeof logAuditX === 'function'){
    logAuditX('licencias', 'imprimir_comprobante', { id: lic.id, leg: lic.leg, origen, por: currentUser?.emp?.nom });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) CERTIFICADO LABORAL (uso bancario / migratorio)
// ═══════════════════════════════════════════════════════════════════════════
function imprimirCertificadoLaboral(leg, opts){
  opts = opts || {};
  const emp = (typeof empByLeg === 'function') ? empByLeg(leg) :
              (typeof getNomina === 'function') ? getNomina().find(e => e.leg === leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const fmtDate = iso => {
    if(!iso) return '—';
    if(iso instanceof Date) iso = iso.toISOString().slice(0,10);
    const s = String(iso);
    if(s.includes('/')) return s; // ya formateada
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  };
  const proposito = opts.proposito || 'ante quien corresponda';
  const incluirSueldo = opts.incluirSueldo !== false;
  const sueldo = $m_safe(emp.bruto) || $m_safe(emp.basico) || 0;
  const sueldoTxt = sueldo > 0 ? '$ ' + sueldo.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '(no informado)';

  // Calcular antigüedad
  const ingDate = (() => {
    const s = emp.ing;
    if(!s) return null;
    if(s.includes('/')){ const [d,m,y] = s.split('/'); return new Date(+y, +m-1, +d); }
    if(s.includes('-')){ const [y,m,d] = s.split('-'); return new Date(+y, +m-1, +d); }
    return null;
  })();
  const hoy = new Date();
  const antigAnios = ingDate ? Math.floor((hoy - ingDate) / (365.25 * 86400000)) : null;

  const contenido = `
    ${_docEncabezadoEmpresa(emp.emp)}

    <h1 style="text-align:center;margin-bottom:14px">CERTIFICADO LABORAL</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:24px">
      ${emp.emp}, ${new Date().toLocaleDateString('es-AR')}
    </div>

    <p>Por la presente, <strong>${emp.emp}</strong>, certifica que el/la Sr./Sra.
    <strong>${emp.nom}</strong>, DNI N° <strong>${emp.dni || '—'}</strong>,
    CUIL <strong>${emp.cuil || '—'}</strong>, se desempeña en relación de dependencia
    laboral con esta empresa desde el día <strong>${fmtDate(emp.ing)}</strong>${antigAnios !== null ? ` (antigüedad ${antigAnios} año${antigAnios!==1?'s':''})` : ''}, cumpliendo
    las siguientes condiciones:</p>

    <table>
      <tr><th style="width:35%">Apellido y Nombre</th><td>${emp.nom}</td></tr>
      <tr><th>DNI / CUIL</th><td>${emp.dni || '—'} / ${emp.cuil || '—'}</td></tr>
      <tr><th>Legajo</th><td>${emp.leg}</td></tr>
      <tr><th>Cargo / Tarea</th><td>${emp.tarea || '—'}</td></tr>
      <tr><th>Categoría</th><td>${emp.cat || '—'} ${emp.tramo || ''} · ${emp.desc_categoria || ''}</td></tr>
      <tr><th>Condición</th><td>${emp.condicion || 'Mensualizado'} · ${emp.cod_convenio ? 'CCT '+emp.cod_convenio : 'Fuera de convenio'}</td></tr>
      <tr><th>Lugar de trabajo</th><td>${emp.lugar || '—'}</td></tr>
      <tr><th>Fecha de ingreso</th><td><strong>${fmtDate(emp.ing)}</strong></td></tr>
      ${antigAnios !== null ? `<tr><th>Antigüedad</th><td>${antigAnios} año${antigAnios!==1?'s':''}</td></tr>` : ''}
      ${incluirSueldo ? `<tr><th>Remuneración bruta mensual</th><td><strong>${sueldoTxt}</strong></td></tr>` : ''}
      <tr><th>Estado</th><td><strong style="color:#1E6B3A">ACTIVO</strong></td></tr>
    </table>

    <p style="margin-top:18px">El presente certificado se extiende a solicitud del/de la interesado/a
    para ser presentado <strong>${proposito}</strong>, a los fines que estime corresponder.</p>

    ${_docPieFirma(emp.emp)}

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.<br>
      Para verificación contactar al Dpto. de RR.HH. de ${emp.emp}.
    </div>
  `;
  _docAbrirImprimible(`Certificado laboral ${emp.leg}`, contenido);

  if(typeof logAuditX === 'function'){
    logAuditX('certificados', 'imprimir_laboral', { leg: emp.leg, por: currentUser?.emp?.nom, proposito });
  }
}

// Helper: $m_safe ya existe en el generador de reportes; lo redefino acá por seguridad
if(typeof $m_safe !== 'function'){
  window.$m_safe = function(v){ return Number(v) || 0; };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: solicitar certificado laboral (panel empleado)
// ═══════════════════════════════════════════════════════════════════════════
function abrirSolicitarCertificadoLaboral(){
  const emp = currentUser?.emp;
  if(!emp){ toast('⚠ No hay sesión activa', 'var(--red)'); return; }

  const prev = document.getElementById('modal-cert-laboral');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-cert-laboral';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:500px;width:100%;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Certificado laboral</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Genera tu certificado oficial firmado</div>
        </div>
        <button onclick="document.getElementById('modal-cert-laboral').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Destino / propósito (opcional)</label>
          <input type="text" id="cert-prop" placeholder="Ej: Banco Galicia, embajada, ANSES..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Si lo dejás vacío, dice "ante quien corresponda".</div>
        </div>

        <div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--t2)">
            <input type="checkbox" id="cert-sueldo" checked style="cursor:pointer">
            Incluir remuneración bruta mensual
          </label>
          <div style="font-size:10px;color:var(--t3);margin-top:4px;margin-left:24px">Algunos bancos lo requieren para préstamos o tarjetas.</div>
        </div>

        <div style="font-size:11px;color:var(--t3);padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);line-height:1.5">
          <strong style="color:var(--t2)">Datos que figurarán:</strong><br>
          Apellido y nombre · DNI · CUIL · Legajo · Cargo · Fecha de ingreso · Antigüedad · Lugar de trabajo · Estado actual
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cert-laboral').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_confirmarCertLaboral()" style="font-size:13px;padding:8px 18px">📄 Generar certificado</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _confirmarCertLaboral(){
  const emp = currentUser?.emp;
  if(!emp) return;
  const proposito = document.getElementById('cert-prop')?.value?.trim() || 'ante quien corresponda';
  const incluirSueldo = document.getElementById('cert-sueldo')?.checked !== false;
  document.getElementById('modal-cert-laboral')?.remove();
  imprimirCertificadoLaboral(emp.leg, { proposito, incluirSueldo });
}

