// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE 4 NIVELES DE USUARIO
// ───────────────────────────────────────────────────────────────────────────
// admin    → acceso total + administración de usuarios + auditoría
// rrhh     → módulo RR.HH. completo + Mis Datos
// gerente  → Mi Equipo (validar, ver subordinados) + Mis Datos
// generico → solo Mis Datos
// ═══════════════════════════════════════════════════════════════════════════

const LEVEL_ADMIN    = 'admin';
const LEVEL_RRHH     = 'rrhh';
const LEVEL_GERENTE  = 'gerente';
const LEVEL_GENERICO = 'generico';

const LEVELS_ALL = [LEVEL_ADMIN, LEVEL_RRHH, LEVEL_GERENTE, LEVEL_GENERICO];

// ── Admins iniciales por defecto (siempre admin salvo override explícito) ──
// Coincidencia por substring sobre `emp.nom` (ya está en MAYÚSCULAS).
const ADMINS_INICIALES = [
  'PARERA, MARTIN',
  'PAPA, PABLO GABRIEL',
  'PAPA, LUCIANO',
  'OLIVERA, WALTER'
];

// ── Staff que históricamente tiene acceso al módulo RR.HH. ──
// (Luciano y Walter están también en ADMINS_INICIALES; gana admin.)
const RRHH_STAFF_NAMES = [
  'BOZZUTO',
  'AGUIAR, LUNA',
  'DONATO',
  'PAPA, LUCIANO',
  'OLIVERA, WALTER'
];

// ── El que puede asignar el nivel Admin a otros (gerente de RR.HH.) ──
function esGerenteRRHH(emp){
  if(!emp) return false;
  return (emp.nom || '').trim().toUpperCase().includes('PAPA, PABLO GABRIEL');
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE: overrides manuales asignados desde la pantalla de Administración
// ═══════════════════════════════════════════════════════════════════════════
const _LS_LEVELS  = 'lsg_user_levels';      // { dni: 'admin'|'rrhh'|'gerente'|'generico' }
const _LS_DISABLED = 'lsg_user_disabled';   // { dni: true } usuarios desactivados por admin
const _LS_FORCEPWD = 'lsg_force_pwd_change'; // { dni: true } forzar cambio en próximo login
const _LS_AUDIT   = 'lsg_admin_audit';      // [{ts, by_dni, by_nom, action, target_dni, target_nom, before, after, detail}]

function getUserLevels(){
  try { return JSON.parse(localStorage.getItem(_LS_LEVELS) || '{}'); }
  catch(e){ return {}; }
}
function _saveUserLevels(obj){
  localStorage.setItem(_LS_LEVELS, JSON.stringify(obj));
}

function getDisabledUsers(){
  try { return JSON.parse(localStorage.getItem(_LS_DISABLED) || '{}'); }
  catch(e){ return {}; }
}
function _saveDisabledUsers(obj){
  localStorage.setItem(_LS_DISABLED, JSON.stringify(obj));
}

function getForcedPwdChanges(){
  try { return JSON.parse(localStorage.getItem(_LS_FORCEPWD) || '{}'); }
  catch(e){ return {}; }
}
function _saveForcedPwdChanges(obj){
  localStorage.setItem(_LS_FORCEPWD, JSON.stringify(obj));
}

function isUserDisabled(dni){
  return !!getDisabledUsers()[dni];
}

function isPwdChangeForced(dni){
  return !!getForcedPwdChanges()[dni];
}
function clearForcedPwdChange(dni){
  const f = getForcedPwdChanges();
  delete f[dni];
  _saveForcedPwdChanges(f);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORÍA: registro central de eventos del portal
// ───────────────────────────────────────────────────────────────────────────
// - Cada evento tiene: timestamp, categoría, actor, acción, target y detalle.
// - El log se mantiene en localStorage por usuario (tope 1000 eventos).
// - Las llamadas legacy logAudit(action, target, before, after, detail) siguen
//   funcionando — si no se especifica categoría, se asume 'admin' (cambios de
//   niveles, blanqueos, activar/desactivar) que era el único caso original.
// ═══════════════════════════════════════════════════════════════════════════

// Categorías estándar — usadas por la UI de auditoría para filtrar.
const AUDIT_CAT_AUTH      = 'auth';       // login OK/fallido, logout, cambio pwd
const AUDIT_CAT_ADMIN     = 'admin';      // niveles, blanqueos, activar/desactivar
const AUDIT_CAT_ANTICIPOS = 'anticipos';  // solicitudes, avales, aprobaciones, rechazos
const AUDIT_CAT_RRHH      = 'rrhh';       // sanciones, evaluaciones, licencias, blanqueos resueltos
const AUDIT_CAT_ABM       = 'abm';        // alta/edición/baja de empresas, centros operativos
const AUDIT_CAT_SISTEMA   = 'sistema';    // limpieza de log, eventos del sistema

const AUDIT_CATEGORIES_ALL = [
  AUDIT_CAT_AUTH, AUDIT_CAT_ADMIN, AUDIT_CAT_ANTICIPOS,
  AUDIT_CAT_RRHH, AUDIT_CAT_ABM, AUDIT_CAT_SISTEMA
];

function getAuditLog(){
  try { return JSON.parse(localStorage.getItem(_LS_AUDIT) || '[]'); }
  catch(e){ return []; }
}
function _saveAuditLog(arr){
  // Mantener máximo 1000 registros (los más recientes)
  if(arr.length > 1000) arr = arr.slice(-1000);
  localStorage.setItem(_LS_AUDIT, JSON.stringify(arr));
}

// Variante extendida: logAuditX(category, action, opts)
//   opts = { actor:{dni,nom}, target:{dni,nom}, before, after, detail }
// Si no se pasa actor, se usa currentUser.
function logAuditX(category, action, opts){
  opts = opts || {};
  const log = getAuditLog();
  const now = new Date();
  const actor = opts.actor || currentUser?.emp || null;
  log.push({
    ts: now.toISOString(),
    fecha: now.toLocaleDateString('es-AR'),
    hora: now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
    category: category || AUDIT_CAT_SISTEMA,
    by_dni: actor?.dni || '?',
    by_nom: actor?.nom || (actor === null ? 'Sistema' : '?'),
    action: action,
    target_dni: opts.target?.dni || '',
    target_nom: opts.target?.nom || '',
    target_extra: opts.target?.extra || '',  // ej: legajo, monto, etc.
    before: opts.before ?? null,
    after:  opts.after  ?? null,
    detail: opts.detail || null
  });
  _saveAuditLog(log);
}

// Mantenida por compatibilidad — todas las llamadas existentes en este archivo
// caen aquí y se categorizan como 'admin'.
function logAudit(action, target, before, after, detail){
  logAuditX(AUDIT_CAT_ADMIN, action, { target, before, after, detail });
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUCIÓN DE NIVEL — orden de precedencia:
//   1. Override manual guardado en localStorage (por el admin)
//   2. Lista hard-coded de admins iniciales
//   3. Staff de RR.HH.
//   4. Validador de algún equipo (gerente)
//   5. Default → genérico
// ═══════════════════════════════════════════════════════════════════════════
function getUserLevel(emp){
  if(!emp) return LEVEL_GENERICO;

  // 1. Override manual
  const overrides = getUserLevels();
  if(overrides[emp.dni] && LEVELS_ALL.includes(overrides[emp.dni])){
    return overrides[emp.dni];
  }

  const nom = (emp.nom || '').trim().toUpperCase();

  // 2. Admins iniciales
  if(ADMINS_INICIALES.some(a => nom.includes(a))){
    return LEVEL_ADMIN;
  }

  // 3. Staff RR.HH.
  if(RRHH_STAFF_NAMES.some(s => nom.includes(s))){
    return LEVEL_RRHH;
  }

  // 4. Validador (gerente que valida solicitudes de algún empleado)
  try {
    if(_esValidadorDeAlguien(emp)) return LEVEL_GERENTE;
  } catch(e){ /* getValidador puede no existir aún */ }

  // 5. Default
  return LEVEL_GENERICO;
}

// Helper: ¿este empleado figura como validador de algún otro empleado activo?
// Reutiliza la función getValidador() que ya existe en js/04-anticipos.js.
const _EXCLUIDOS_PANEL_GERENTE = ['MORINI, JUAN PABLO','MALGIOGLIO, MARIANO','SOPRANZI, JUAN','FERNANDEZ, SILVIA'];

function _esValidadorDeAlguien(emp){
  const nom = (emp.nom || '').trim().toUpperCase();
  if(_EXCLUIDOS_PANEL_GERENTE.some(e => nom.includes(e.toUpperCase()))) return false;
  if(typeof getNomina !== 'function' || typeof getValidador !== 'function') return false;
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  for(const e of nomina){
    const v = getValidador(e);
    if(v && v.validador && v.validador.toUpperCase() === nom) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO DE NIVEL → ROLE LEGACY
// El resto del portal usa role: 'employee'|'manager'|'rrhh'.
// Mantenemos compatibilidad mapeando.
// ═══════════════════════════════════════════════════════════════════════════
function levelToLegacyRole(level){
  switch(level){
    case LEVEL_ADMIN:    return 'rrhh';      // Admin ve todo lo de RR.HH. + extras
    case LEVEL_RRHH:     return 'rrhh';
    case LEVEL_GERENTE:  return 'manager';
    case LEVEL_GENERICO:
    default:             return 'employee';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API DE ESCRITURA (la usa la pantalla de Administración de usuarios)
// ═══════════════════════════════════════════════════════════════════════════

// Cambiar el nivel de un usuario. Solo admins pueden hacerlo, salvo
// asignar/quitar el nivel admin que está reservado al gerente de RR.HH.
function setUserLevel(targetEmp, nuevoNivel){
  if(!targetEmp || !LEVELS_ALL.includes(nuevoNivel)){
    return { ok:false, error:'Parámetros inválidos' };
  }

  const yo = currentUser?.emp;
  const miNivel = currentUser?.level;

  if(miNivel !== LEVEL_ADMIN){
    return { ok:false, error:'Solo un administrador puede cambiar niveles' };
  }

  // Solo el gerente de RR.HH. puede asignar O quitar el nivel admin
  const nivelActual = getUserLevel(targetEmp);
  const tocandoAdmin = (nuevoNivel === LEVEL_ADMIN) || (nivelActual === LEVEL_ADMIN);
  if(tocandoAdmin && !esGerenteRRHH(yo)){
    return { ok:false, error:'Solo el Gerente de RR.HH. puede asignar o quitar el rol Admin' };
  }

  // No te podés bajar a vos mismo de admin (evitamos quedar sin admins)
  if(yo && targetEmp.dni === yo.dni && nivelActual === LEVEL_ADMIN && nuevoNivel !== LEVEL_ADMIN){
    return { ok:false, error:'No te podés quitar a vos mismo el rol Admin' };
  }

  const overrides = getUserLevels();
  overrides[targetEmp.dni] = nuevoNivel;
  _saveUserLevels(overrides);

  logAudit('cambio_nivel', targetEmp, nivelActual, nuevoNivel);
  return { ok:true };
}

// Blanquear contraseña: la pone igual al DNI y marca cambio obligatorio.
function blanquearPassword(targetEmp){
  if(!targetEmp || !targetEmp.dni){
    return { ok:false, error:'Empleado inválido' };
  }
  if(currentUser?.level !== LEVEL_ADMIN){
    return { ok:false, error:'Solo un administrador puede blanquear contraseñas' };
  }

  // Reusa savePassword() de js/01-state-storage.js
  if(typeof savePassword !== 'function'){
    return { ok:false, error:'savePassword no disponible' };
  }
  savePassword(targetEmp.dni, targetEmp.dni);

  // Marcar cambio obligatorio en próximo login
  const f = getForcedPwdChanges();
  f[targetEmp.dni] = true;
  _saveForcedPwdChanges(f);

  // Si había una solicitud de blanqueo pendiente, marcarla como resuelta
  try {
    if(typeof getSolicitudesBlanqueo === 'function' && typeof saveSolicitudesBlanqueo === 'function'){
      const lista = getSolicitudesBlanqueo();
      let cambio = false;
      lista.forEach(s => {
        if(s.dni === targetEmp.dni && s.estado === 'pendiente'){
          s.estado = 'resuelto';
          s.resueltoPor = currentUser?.emp?.nom || '?';
          s.fechaResolucion = new Date().toLocaleDateString('es-AR');
          cambio = true;
        }
      });
      if(cambio){
        saveSolicitudesBlanqueo(lista);
        if(typeof actualizarCntBlanqueo === 'function') actualizarCntBlanqueo();
      }
    }
  } catch(e){ /* noop */ }

  logAudit('blanqueo_password', targetEmp, null, null, 'Contraseña reseteada al DNI');
  return { ok:true };
}

// Activar / desactivar usuario. Bloquea login.
function setUserDisabled(targetEmp, disabled){
  if(!targetEmp) return { ok:false, error:'Empleado inválido' };
  if(currentUser?.level !== LEVEL_ADMIN){
    return { ok:false, error:'Solo un administrador puede activar/desactivar usuarios' };
  }
  if(currentUser?.emp?.dni === targetEmp.dni){
    return { ok:false, error:'No te podés desactivar a vos mismo' };
  }

  const d = getDisabledUsers();
  if(disabled) d[targetEmp.dni] = true;
  else delete d[targetEmp.dni];
  _saveDisabledUsers(d);

  logAudit(disabled ? 'desactivar_usuario' : 'activar_usuario',
           targetEmp,
           disabled ? 'activo' : 'inactivo',
           disabled ? 'inactivo' : 'activo');
  return { ok:true };
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS por nivel (para la pantalla de Administración)
// ═══════════════════════════════════════════════════════════════════════════
function getUserLevelStats(){
  const stats = { admin:0, rrhh:0, gerente:0, generico:0, total:0, inactivos:0 };
  if(typeof getNomina !== 'function') return stats;
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const disabled = getDisabledUsers();
  nomina.forEach(e => {
    stats.total++;
    if(disabled[e.dni]){ stats.inactivos++; return; }
    const lvl = getUserLevel(e);
    if(stats[lvl] !== undefined) stats[lvl]++;
  });
  return stats;
}

// Etiqueta legible para mostrar en la UI
function levelLabel(level){
  switch(level){
    case LEVEL_ADMIN:    return 'Admin';
    case LEVEL_RRHH:     return 'RR.HH.';
    case LEVEL_GERENTE:  return 'Gerente';
    case LEVEL_GENERICO: return 'Genérico';
    default:             return '?';
  }
}

// Color del badge para cada nivel
function levelBadgeStyle(level){
  switch(level){
    case LEVEL_ADMIN:    return 'background:rgba(216,90,48,.12);color:#D85A30;border:1px solid rgba(216,90,48,.35)';
    case LEVEL_RRHH:     return 'background:rgba(127,119,221,.12);color:#7F77DD;border:1px solid rgba(127,119,221,.35)';
    case LEVEL_GERENTE:  return 'background:rgba(29,158,117,.12);color:#1D9E75;border:1px solid rgba(29,158,117,.35)';
    case LEVEL_GENERICO: return 'background:rgba(136,135,128,.12);color:#888780;border:1px solid rgba(136,135,128,.35)';
    default:             return '';
  }
}
