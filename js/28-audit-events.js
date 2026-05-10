// ═══════════════════════════════════════════════════════════════════════════
// EVENTOS DE AUDITORÍA — helpers de logging por categoría
// ───────────────────────────────────────────────────────────────────────────
// Este módulo provee funciones convenientes para registrar eventos en el log
// central definido en js/26-user-levels.js. Cada función mapea a una
// categoría AUDIT_CAT_* y un conjunto de acciones estandarizadas.
//
// Uso típico:
//   auditAuth('login_ok', emp);
//   auditAnticipo('aprobacion_rrhh', sol.emp, { detail: `Monto $${monto}` });
//   auditABM('empresa_alta', { dni: rec.cuit, nom: rec.razonSocial });
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helpers por categoría ────────────────────────────────────────────────

// Autenticación: actor opcional para login fallido (todavía no hay currentUser).
function auditAuth(action, actorEmp, opts){
  opts = opts || {};
  logAuditX(AUDIT_CAT_AUTH, action, {
    actor: actorEmp ? { dni: actorEmp.dni, nom: actorEmp.nom } : null,
    target: actorEmp ? { dni: actorEmp.dni, nom: actorEmp.nom, extra: actorEmp.leg || '' } : null,
    detail: opts.detail || null
  });
}

// Anticipos: solicitudes, avales, aprobaciones, rechazos. El target es el empleado dueño de la solicitud.
function auditAnticipo(action, empSol, opts){
  opts = opts || {};
  logAuditX(AUDIT_CAT_ANTICIPOS, action, {
    target: empSol ? { dni: empSol.dni, nom: empSol.nom, extra: opts.id || empSol.leg || '' } : null,
    before: opts.before ?? null,
    after:  opts.after  ?? null,
    detail: opts.detail || null
  });
}

// Eventos de RR.HH. (sanciones, evaluaciones, licencias, blanqueos resueltos).
function auditRRHH(action, empTarget, opts){
  opts = opts || {};
  logAuditX(AUDIT_CAT_RRHH, action, {
    target: empTarget ? { dni: empTarget.dni, nom: empTarget.nom, extra: empTarget.leg || '' } : null,
    detail: opts.detail || null
  });
}

// ABM de empresas / centros operativos.
function auditABM(action, target, opts){
  opts = opts || {};
  logAuditX(AUDIT_CAT_ABM, action, {
    target: target || null,
    before: opts.before ?? null,
    after:  opts.after  ?? null,
    detail: opts.detail || null
  });
}

// Eventos de sistema (limpieza de log, etc.).
function auditSistema(action, detail){
  logAuditX(AUDIT_CAT_SISTEMA, action, { detail });
}

// ─── Etiquetas legibles para la UI ────────────────────────────────────────

function auditCategoryLabel(cat){
  switch(cat){
    case AUDIT_CAT_AUTH:      return 'Autenticación';
    case AUDIT_CAT_ADMIN:     return 'Administración';
    case AUDIT_CAT_ANTICIPOS: return 'Anticipos';
    case AUDIT_CAT_RRHH:      return 'RR.HH.';
    case AUDIT_CAT_ABM:       return 'ABM Empresas';
    case AUDIT_CAT_SISTEMA:   return 'Sistema';
    default:                  return cat || '?';
  }
}

function auditCategoryStyle(cat){
  // Devuelve CSS inline para el badge (mismo lenguaje visual que niveles).
  switch(cat){
    case AUDIT_CAT_AUTH:      return 'background:rgba(127,119,221,.10);color:#7F77DD;border:1px solid rgba(127,119,221,.32)';
    case AUDIT_CAT_ADMIN:     return 'background:rgba(216,90,48,.10);color:#D85A30;border:1px solid rgba(216,90,48,.32)';
    case AUDIT_CAT_ANTICIPOS: return 'background:rgba(29,158,117,.10);color:#1D9E75;border:1px solid rgba(29,158,117,.32)';
    case AUDIT_CAT_RRHH:      return 'background:rgba(34,197,94,.10);color:#16A34A;border:1px solid rgba(34,197,94,.32)';
    case AUDIT_CAT_ABM:       return 'background:rgba(234,179,8,.10);color:#CA8A04;border:1px solid rgba(234,179,8,.32)';
    case AUDIT_CAT_SISTEMA:   return 'background:rgba(136,135,128,.10);color:#888780;border:1px solid rgba(136,135,128,.32)';
    default:                  return '';
  }
}

// Mapeo acción → frase humana. La pestaña Auditoría muestra:
//   "Pablo Papa → <acción> <target>"
function auditActionPhrase(l){
  const a = l.action;
  // Admin (legacy)
  if(a === 'cambio_nivel')        return `cambió nivel: ${levelLabel(l.before)} → ${levelLabel(l.after)} de`;
  if(a === 'blanqueo_password')   return 'blanqueó la contraseña de';
  if(a === 'desactivar_usuario')  return 'desactivó a';
  if(a === 'activar_usuario')     return 'reactivó a';
  // Auth
  if(a === 'login_ok')            return 'inició sesión';
  if(a === 'login_fail')          return 'falló al iniciar sesión';
  if(a === 'logout')              return 'cerró sesión';
  if(a === 'cambio_pwd')          return 'cambió su contraseña';
  if(a === 'cambio_pwd_forzado')  return 'cambió la contraseña tras blanqueo';
  if(a === 'pwd_set_inicial')     return 'definió su contraseña inicial';
  if(a === 'solicitud_blanqueo')  return 'solicitó blanqueo de contraseña';
  // Anticipos
  if(a === 'solicitud_creada')    return 'creó solicitud de anticipo para';
  if(a === 'aval_gerente')        return 'avaló (Gerente) el anticipo de';
  if(a === 'rechazo_gerente')     return 'rechazó (Gerente) el anticipo de';
  if(a === 'aprobacion_rrhh')     return 'aprobó (RR.HH.) el anticipo de';
  if(a === 'rechazo_rrhh')        return 'rechazó (RR.HH.) el anticipo de';
  // RRHH
  if(a === 'sancion_alta')        return 'registró una sanción a';
  if(a === 'evaluacion_final')    return 'finalizó evaluación de';
  if(a === 'evaluacion_borrador') return 'guardó borrador de evaluación de';
  if(a === 'licencia_anual')      return 'registró licencia anual de';
  if(a === 'blanqueo_resuelto')   return 'resolvió el blanqueo de';
  // ABM
  if(a === 'empresa_alta')        return 'dio de alta empresa';
  if(a === 'empresa_edicion')     return 'editó empresa';
  if(a === 'empresa_baja')        return 'dio de baja empresa';
  if(a === 'centro_op_alta')      return 'agregó centro operativo';
  if(a === 'centro_op_edicion')   return 'editó centro operativo';
  if(a === 'centro_op_baja')      return 'eliminó centro operativo';
  // Sistema
  if(a === 'log_limpiado')        return 'limpió el log de auditoría';
  return a;
}

// ─── Export CSV ───────────────────────────────────────────────────────────

function auditExportCSV(filteredLog){
  const data = filteredLog || getAuditLog();
  if(!data.length){
    if(typeof _admToast === 'function') _admToast('No hay eventos para exportar', 'yellow');
    return;
  }

  const headers = [
    'Timestamp ISO','Fecha','Hora','Categoría','Acción',
    'Actor DNI','Actor Nombre','Target DNI','Target Nombre','Target Extra',
    'Antes','Después','Detalle'
  ];

  const escape = v => {
    if(v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };

  const rows = data.map(l => [
    l.ts || '',
    l.fecha || '',
    l.hora || '',
    auditCategoryLabel(l.category || 'admin'),
    auditActionPhrase(l).replace(/\bde$/,'').trim(),
    l.by_dni || '',
    l.by_nom || '',
    l.target_dni || '',
    l.target_nom || '',
    l.target_extra || '',
    l.before === null ? '' : (typeof l.before === 'string' ? l.before : JSON.stringify(l.before)),
    l.after  === null ? '' : (typeof l.after  === 'string' ? l.after  : JSON.stringify(l.after)),
    l.detail || ''
  ].map(escape).join(','));

  // BOM para que Excel abra UTF-8 con acentos correctamente.
  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_leiten_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

// ─── Limpiar log (solo Gerente RR.HH.) ────────────────────────────────────

function auditClearAll(){
  if(!esGerenteRRHH(currentUser?.emp)){
    if(typeof _admToast === 'function') _admToast('Solo el Gerente de RR.HH. puede limpiar el log', 'red');
    return;
  }
  const total = getAuditLog().length;
  if(!total){
    if(typeof _admToast === 'function') _admToast('El log ya está vacío', 'yellow');
    return;
  }
  if(!confirm(`¿Borrar los ${total} eventos del log de auditoría?\n\nEsta acción no se puede deshacer. Quedará un único registro indicando que vos limpiaste el log.`)){
    return;
  }
  // Vaciamos y dejamos un evento que lo registra.
  localStorage.setItem(_LS_AUDIT, '[]');
  auditSistema('log_limpiado', `Se eliminaron ${total} eventos previos`);
  if(typeof _admRenderTabContent === 'function') _admRenderTabContent();
  if(typeof _admToast === 'function') _admToast('Log limpiado', 'green');
}

// ─── Util: filtrado del log para la UI ────────────────────────────────────

function auditFilter(log, filtros){
  filtros = filtros || {};
  const { categoria, texto, desde, hasta } = filtros;
  const tx = (texto || '').toLowerCase().trim();
  return log.filter(l => {
    if(categoria && categoria !== 'todos' && (l.category || 'admin') !== categoria) return false;
    if(desde && l.ts && l.ts < desde) return false;
    if(hasta && l.ts && l.ts > hasta) return false;
    if(tx){
      const blob = `${l.by_nom||''} ${l.target_nom||''} ${l.action||''} ${l.detail||''} ${l.target_extra||''}`.toLowerCase();
      if(!blob.includes(tx)) return false;
    }
    return true;
  });
}
