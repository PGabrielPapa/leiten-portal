// ─── LICENCIAS ANUALES ───────────────────────────────────────

async function getLicAnuales(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx  = db.transaction('licencias_anuales','readonly');
    const req = tx.objectStore('licencias_anuales').getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}

async function addLicAnual(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx  = db.transaction('licencias_anuales','readwrite');
    const req = tx.objectStore('licencias_anuales').add(rec);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}

async function updateLicAnual(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx  = db.transaction('licencias_anuales','readwrite');
    const req = tx.objectStore('licencias_anuales').put(rec);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

// ── LICENCIAS ESPECIALES (sin goce, maternidad, excedencia) ─────
async function getLicenciasEspeciales(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('licencias_especiales','readonly');
    const req = tx.objectStore('licencias_especiales').getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}
async function addLicenciaEspecial(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('licencias_especiales','readwrite');
    const req = tx.objectStore('licencias_especiales').add(rec);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}
async function updateLicenciaEspecial(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('licencias_especiales','readwrite');
    const req = tx.objectStore('licencias_especiales').put(rec);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

// Metadatos por tipo
const TIPOS_LIC_ESPECIAL = {
  sin_goce:   { label:'Sin goce de haberes', minDias:1,   maxDias:365, flujo:'autorizacion', requiereMotivo:true },
  maternidad: { label:'Maternidad',          minDias:90,  maxDias:90,  flujo:'conocimiento', requiereMotivo:false },
  excedencia: { label:'Excedencia',          minDias:90,  maxDias:180, flujo:'conocimiento', requiereMotivo:false }
};

// ═══════════════════════════════════════════════════════════════
// HISTORIAL DE EMPLEADOS — cambios con fecha de inicio/fin
// ═══════════════════════════════════════════════════════════════
// Cada cambio en un campo rastreable crea un registro con desde/hasta.
// El valor actual sigue en el objeto emp (lectura rápida); el historial
// permite auditar y reconstruir el estado a cualquier fecha.
// ═══════════════════════════════════════════════════════════════

const CAMPOS_HISTORIAL = [
  { key:'domicilio',    label:'Domicilio',          icon:'🏠', compound:true,
    fields:['dom_calle','dom_nro','dom_piso','dom_depto','dom_torre','dom_bloque','dom_loc','dom_cp','dom_prov'],
    render: (v) => {
      if(!v) return '—';
      const p1 = [v.dom_calle, v.dom_nro].filter(Boolean).join(' ');
      const p2 = [v.dom_piso && `P${v.dom_piso}`, v.dom_depto && `Dpto ${v.dom_depto}`, v.dom_torre && `T${v.dom_torre}`, v.dom_bloque && `B${v.dom_bloque}`].filter(Boolean).join(' ');
      const p3 = [v.dom_loc, v.dom_cp && `CP ${v.dom_cp}`, v.dom_prov].filter(Boolean).join(', ');
      return [p1, p2, p3].filter(Boolean).join(' · ');
    }
  },
  { key:'estado_civil', label:'Estado civil',       icon:'💍' },
  { key:'cat',          label:'Categoría',          icon:'📊' },
  { key:'tramo',        label:'Tramo',              icon:'🪜' },
  { key:'tarea',        label:'Función/Tarea',      icon:'🔧' },
  { key:'lugar',        label:'Lugar de trabajo',   icon:'📍' },
  { key:'mail',         label:'Correo electrónico', icon:'📧' },
  { key:'telefono',     label:'Teléfono',           icon:'📞' },
  { key:'basico',       label:'Sueldo básico',      icon:'💰', numeric:true,
    render: (v) => v != null ? `$${Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—' },
  { key:'condicion',    label:'Condición',          icon:'📋' },
  { key:'cod_convenio', label:'Convenio',           icon:'📜' },
  { key:'cod_os',       label:'Obra Social',        icon:'🏥' },
  { key:'cod_sindicato',label:'Sindicato',          icon:'🤝' }
];

const CAMPOS_HISTORIAL_MAP = Object.fromEntries(CAMPOS_HISTORIAL.map(c => [c.key, c]));

async function getHistorialEmpleado(leg, campo){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('empleado_historial','readonly');
    const store = tx.objectStore('empleado_historial');
    let req;
    if(campo){
      const idx = store.index('leg_campo');
      req = idx.getAll([leg, campo]);
    } else {
      const idx = store.index('leg');
      req = idx.getAll(leg);
    }
    req.onsuccess = () => res(req.result.sort((a,b) => (a.desde||'').localeCompare(b.desde||'')));
    req.onerror   = e => rej(e.target.error);
  });
}

async function getHistorialTodos(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('empleado_historial','readonly');
    const req = tx.objectStore('empleado_historial').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function addHistorialRecord(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('empleado_historial','readwrite');
    const req = tx.objectStore('empleado_historial').add(rec);
    req.onsuccess = () => res(req.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function updateHistorialRecord(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('empleado_historial','readwrite');
    const req = tx.objectStore('empleado_historial').put(rec);
    req.onsuccess = () => res();
    req.onerror   = e => rej(e.target.error);
  });
}

// Registra un cambio histórico: cierra el vigente (hasta=día anterior) y abre uno nuevo.
// Si no existía vigente, abre el primero con el valor nuevo.
async function registrarCambioHistorico({leg, campo, valorAnterior, valorNuevo, desde, motivo, usuario, liqImpactada}){
  if(!leg || !campo) throw new Error('leg y campo son requeridos');
  desde = desde || new Date().toISOString().slice(0,10);

  // Si no hay cambio real, no crear registro
  const esIgual = JSON.stringify(valorAnterior ?? null) === JSON.stringify(valorNuevo ?? null);
  if(esIgual) return null;

  // Cerrar el registro vigente (si existe)
  const historial = await getHistorialEmpleado(leg, campo);
  const vigente = historial.find(h => !h.hasta);
  if(vigente){
    // El "hasta" del anterior es el día previo al "desde" del nuevo
    const d = new Date(desde + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    vigente.hasta = d.toISOString().slice(0,10);
    await updateHistorialRecord(vigente);
  }

  // Abrir el nuevo registro vigente
  const nuevo = {
    leg, campo,
    valorAnterior: valorAnterior ?? null,
    valorNuevo:    valorNuevo ?? null,
    desde, hasta: null,
    motivo: motivo || '',
    usuario: usuario || (currentUser?.emp?.nom || 'sistema'),
    fechaRegistro: new Date().toISOString(),
    liqImpactada: liqImpactada || null
  };
  return await addHistorialRecord(nuevo);
}

// Detecta qué campos cambiaron entre dos snapshots de empleado y los registra en historial
async function registrarCambiosEmpleado(empAnterior, empNuevo, {desde, motivo, usuario} = {}){
  const registros = [];
  for(const c of CAMPOS_HISTORIAL){
    let vA, vN;
    if(c.compound){
      // Compare only the listed fields
      vA = {}; vN = {};
      c.fields.forEach(f => {
        if(empAnterior && empAnterior[f] != null && empAnterior[f] !== '') vA[f] = empAnterior[f];
        if(empNuevo    && empNuevo[f]    != null && empNuevo[f]    !== '') vN[f] = empNuevo[f];
      });
      if(!Object.keys(vA).length) vA = null;
      if(!Object.keys(vN).length) vN = null;
    } else {
      vA = empAnterior?.[c.key] ?? null;
      vN = empNuevo?.[c.key] ?? null;
      if(vA === '') vA = null;
      if(vN === '') vN = null;
    }
    const r = await registrarCambioHistorico({
      leg: empNuevo?.leg || empAnterior?.leg,
      campo: c.key,
      valorAnterior: vA,
      valorNuevo: vN,
      desde, motivo, usuario
    });
    if(r) registros.push(r);
  }
  return registros;
}

// Retorna el valor vigente de un campo a una fecha específica (para reportes retroactivos)
async function obtenerValorEnFecha(leg, campo, fechaISO){
  const historial = await getHistorialEmpleado(leg, campo);
  if(!historial.length) return null;
  const fecha = fechaISO || new Date().toISOString().slice(0,10);
  const reg = historial.find(h => h.desde <= fecha && (!h.hasta || h.hasta >= fecha));
  return reg ? reg.valorNuevo : null;
}
