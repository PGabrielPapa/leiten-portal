// ─── MENSAJES IDB ───
async function getMensajes(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('mensajes','readonly');
    const req=tx.objectStore('mensajes').getAll();
    req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error);
  });
}
async function addMensaje(rec){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('mensajes','readwrite');
    const req=tx.objectStore('mensajes').add(rec);
    req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error);
  });
}
async function marcarMensajeLeido(id){
  const db=await abrirIDB();
  const todos=await getMensajes();
  const m=todos.find(x=>x.id===id); if(!m||m.estado==='leido') return;
  m.estado='leido';
  await new Promise((res,rej)=>{
    const tx=db.transaction('mensajes','readwrite');
    const req=tx.objectStore('mensajes').put(m);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
}

// ── Empleado: enviar mensaje ──
async function enviarMensajeRRHH(){
  const texto = document.getElementById('msg-texto').value.trim();
  if(!texto){ toast('⚠ Escribí un mensaje','var(--yellow)'); return; }
  if(texto.length>500){ toast('⚠ El mensaje no puede superar los 500 caracteres','var(--yellow)'); return; }
  const emp = currentUser.emp;
  const btn = document.querySelector('#msg-form-card .btn-primary');
  btn.disabled=true; btn.textContent='Enviando...';
  await addMensaje({
    leg:emp.leg, nom:emp.nom, emp:emp.emp,
    area: getValidador(emp)?.area||'', lugar:emp.lugar||'',
    texto,
    estado:'nuevo',
    fecha: new Date().toLocaleDateString('es-AR'),
    hora:  new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });
  btn.disabled=false; btn.textContent='↑ Enviar mensaje';
  document.getElementById('msg-form-card').style.display='none';
  document.getElementById('msg-confirmacion').style.display='block';
  document.getElementById('msg-counter').textContent='0 / 500';
  renderMisMensajes();
  actualizarRRHHBadges();
}

function nuevoMensaje(){
  document.getElementById('msg-form-card').style.display='block';
  document.getElementById('msg-confirmacion').style.display='none';
  document.getElementById('msg-texto').value='';
  document.getElementById('msg-counter').textContent='0 / 500';
}

// ── Empleado: ver sus mensajes ──
async function renderMisMensajes(){
  const div=document.getElementById('list-mis-mensajes');
  if(!div) return;
  const todos=await getMensajes();
  const mios=todos.filter(m=>m.leg===currentUser?.emp?.leg).sort((a,b)=>b.id-a.id);
  if(!mios.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">💬</div><div class="empty-text">No enviaste mensajes aún</div></div>';
    return;
  }
  div.innerHTML=`<div class="card" style="padding:0;overflow:hidden">`+
    mios.map(m=>`
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-size:13px;color:var(--t1);line-height:1.6;margin-bottom:6px">${m.texto}</div>
            <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${m.fecha} ${m.hora}
              <span style="margin-left:10px;padding:1px 7px;border-radius:8px;border:1px solid ${m.estado==='leido'?'rgba(34,197,94,.3)':'rgba(61,127,255,.3)'};color:${m.estado==='leido'?'var(--green)':'var(--accent2)'}">
                ${m.estado==='leido'?'✓ Leído':'Enviado'}
              </span>
            </div>
          </div>
          ${m.estado==='leido'?`
          <button class="btn btn-ghost" style="flex-shrink:0;font-size:11px;padding:3px 9px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="borrarMensaje(${m.id})" title="Eliminar mensaje">
            🗑
          </button>`:''}
        </div>
      </div>`).join('')+`</div>`;
}

async function borrarMensaje(id){
  const db=await abrirIDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction('mensajes','readwrite');
    const req=tx.objectStore('mensajes').delete(id);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
  toast('Mensaje eliminado','var(--t3)');
  renderMisMensajes();
}

// ── RR.HH.: ver todos los mensajes ──
async function renderMensajesAdmin(){
  const div=document.getElementById('list-mensajes-admin');
  if(!div) return;
  const q=(document.getElementById('msg-admin-search')?.value||'').toLowerCase();
  const filtro=document.getElementById('msg-admin-filtro')?.value||'';
  const todos=await getMensajes();
  let lista=todos.sort((a,b)=>b.id-a.id);
  if(q) lista=lista.filter(m=>m.nom.toLowerCase().includes(q)||m.emp.toLowerCase().includes(q));
  if(filtro) lista=lista.filter(m=>m.estado===filtro);
  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">Sin mensajes</div>';
    return;
  }
  div.innerHTML=lista.map(m=>`
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);${m.estado==='nuevo'?'background:rgba(61,127,255,.03)':''}">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--accent-glow);border:1px solid rgba(61,127,255,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent2);flex-shrink:0">${m.nom.split(',')[0].trim().substring(0,2)}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${m.nom}</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${m.emp} · ${m.area||'—'} · ${m.lugar||'—'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">${m.fecha} ${m.hora}</div>
          <span style="font-size:10px;padding:1px 7px;border-radius:8px;border:1px solid ${m.estado==='leido'?'rgba(34,197,94,.3)':'rgba(61,127,255,.3)'};color:${m.estado==='leido'?'var(--green)':'var(--accent2)'}">
            ${m.estado==='leido'?'✓ Leído':'● Nuevo'}
          </span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--t1);line-height:1.6;padding:10px 14px;background:var(--bg2);border-radius:var(--r);margin-left:44px">${m.texto}</div>
      ${m.estado==='nuevo'?`<div style="margin-left:44px;margin-top:8px"><button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="marcarLeidoAdmin(${m.id})">✓ Marcar como leído</button></div>`:''}
    </div>`).join('');
}

async function marcarLeidoAdmin(id){
  await marcarMensajeLeido(id);
  renderMensajesAdmin();
  actualizarRRHHBadges();
}

// ─── RRHH: cambios de domicilio ───
async function getCambiosDomicilio(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('cambios_domicilio','readonly');
    const req=tx.objectStore('cambios_domicilio').getAll();
    req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error);
  });
}

async function renderCambiosDomicilio(){
  const div = document.getElementById('list-cambios-dom');
  if(!div) return;
  const todos = await getCambiosDomicilio();
  const pendientes = todos.filter(c=>c.estado==='pendiente').sort((a,b)=>b.id-a.id);
  if(!pendientes.length){
    div.innerHTML='<div style="padding:14px 18px;color:var(--t3);font-size:13px"><span style="color:var(--green)">✓</span> Sin cambios de domicilio pendientes.</div>';
    return;
  }
  div.innerHTML = pendientes.map(c=>`
    <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px">${c.nom}</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:8px">${c.emp} · ${c.area||'—'} · ${c.fecha} ${c.hora}</div>
          <div style="font-size:12px;color:var(--t3);margin-bottom:4px">Domicilio anterior: <span style="color:var(--t2)">${c.domAnterior||'—'}</span></div>
          <div style="font-size:12px;color:var(--t2);font-weight:500">Nuevo domicilio: <span style="color:var(--accent2)">${c.domNuevo}</span></div>
        </div>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--green);border-color:rgba(34,197,94,.3);white-space:nowrap" onclick="confirmarCambioDom(${c.id})">✓ Registrado</button>
      </div>
    </div>`).join('');
}

async function confirmarCambioDom(id){
  const db = await abrirIDB();
  const todos = await getCambiosDomicilio();
  const c = todos.find(x=>x.id===id); if(!c) return;
  c.estado='registrado';
  c.fechaRegistroRRHH = new Date().toISOString();
  c.usuarioRRHH = currentUser?.emp?.nom || 'RR.HH.';
  await new Promise((res,rej)=>{
    const tx=db.transaction('cambios_domicilio','readwrite');
    const req=tx.objectStore('cambios_domicilio').put(c);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });

  // Construir nuevo domicilio
  const partes = [c.calle, c.nro || ''].filter(Boolean);
  if(c.piso)  partes.push(`Piso ${c.piso}`);
  if(c.depto) partes.push(`Dto ${c.depto}`);
  const domStr    = partes.join(' ').trim();
  const ciudadStr = (c.loc||'') + (c.prov ? ', ' + c.prov : '') + (c.cp ? ' (' + c.cp + ')' : '');

  // 1. Capturar valor anterior en formato historial (9 subcampos)
  const domAnteriorObj = {};
  const domActual = DOMICILIOS[c.leg] || {};
  if(domActual.calle !== undefined){
    ['calle','nro','piso','depto','loc','prov','cp'].forEach(k => {
      if(domActual[k]) domAnteriorObj['dom_'+k] = domActual[k];
    });
  } else if(domActual.dom){
    const m = (domActual.dom||'').match(/^(.*?)\s+(\d[\w]*)(?:\s+Piso\s+(\S+))?(?:\s+Dto\s+(\S+))?$/);
    if(m){
      domAnteriorObj.dom_calle = m[1];
      domAnteriorObj.dom_nro   = m[2];
      if(m[3]) domAnteriorObj.dom_piso  = m[3];
      if(m[4]) domAnteriorObj.dom_depto = m[4];
    } else {
      domAnteriorObj.dom_calle = domActual.dom;
    }
    const mc = (domActual.ciudad||'').match(/^(.+?),\s*(.+?)\s*(?:\((\d+)\))?$/);
    if(mc){
      domAnteriorObj.dom_loc  = mc[1];
      domAnteriorObj.dom_prov = mc[2];
      if(mc[3]) domAnteriorObj.dom_cp = mc[3];
    } else if(domActual.ciudad){
      domAnteriorObj.dom_loc = domActual.ciudad;
    }
  }

  // 2. Actualizar DOMICILIOS en memoria (pisa el valor anterior)
  if(!DOMICILIOS[c.leg]) DOMICILIOS[c.leg] = {};
  DOMICILIOS[c.leg].dom    = domStr;
  DOMICILIOS[c.leg].ciudad = ciudadStr;
  // Guardar también los campos separados para facilidad de uso
  DOMICILIOS[c.leg].calle  = c.calle || '';
  DOMICILIOS[c.leg].nro    = c.nro   || '';
  DOMICILIOS[c.leg].piso   = c.piso  || '';
  DOMICILIOS[c.leg].depto  = c.depto || '';
  DOMICILIOS[c.leg].loc    = c.loc   || '';
  DOMICILIOS[c.leg].prov   = c.prov  || '';
  DOMICILIOS[c.leg].cp     = c.cp    || '';

  // 3. Persistir en localStorage para que sobreviva al cierre del browser
  try {
    const domOverrides = JSON.parse(localStorage.getItem('lsg_dom_overrides') || '{}');
    domOverrides[c.leg] = {
      dom: domStr, ciudad: ciudadStr,
      calle:c.calle||'', nro:c.nro||'', piso:c.piso||'', depto:c.depto||'',
      loc:c.loc||'', prov:c.prov||'', cp:c.cp||''
    };
    localStorage.setItem('lsg_dom_overrides', JSON.stringify(domOverrides));
  } catch(e) { console.error('Error guardando domicilio:', e); }

  // 4. ── Registrar en el historial (campo "domicilio" compuesto) ──
  const domNuevoObj = {
    dom_calle:c.calle||'', dom_nro:c.nro||'', dom_piso:c.piso||'', dom_depto:c.depto||'',
    dom_loc:c.loc||'', dom_prov:c.prov||'', dom_cp:c.cp||''
  };
  // Limpiar campos vacíos
  Object.keys(domNuevoObj).forEach(k => { if(!domNuevoObj[k]) delete domNuevoObj[k]; });

  try {
    await registrarCambioHistorico({
      leg: c.leg,
      campo: 'domicilio',
      valorAnterior: Object.keys(domAnteriorObj).length ? domAnteriorObj : null,
      valorNuevo: domNuevoObj,
      desde: (c.fechaVigencia || new Date().toISOString().slice(0,10)),
      motivo: c.motivo || 'Cambio informado por el empleado',
      usuario: currentUser?.emp?.nom || 'RR.HH.'
    });
  } catch(e){ console.warn('No se pudo registrar historial:', e); }

  toast('✓ Domicilio actualizado y registrado en el historial del empleado','var(--green)',3500);
  renderCambiosDomicilio();
  actualizarRRHHBadges();
}

// ─── LICENCIAS IDB ───
async function getLicencias(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('licencias','readonly');
    const req=tx.objectStore('licencias').getAll();
    req.onsuccess=()=>res(req.result);
    req.onerror=e=>rej(e.target.error);
  });
}
async function addLicencia(rec){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('licencias','readwrite');
    const req=tx.objectStore('licencias').add(rec);
    req.onsuccess=()=>res(req.result);
    req.onerror=e=>rej(e.target.error);
  });
}
async function deleteLicencia(id){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('licencias','readwrite');
    const req=tx.objectStore('licencias').delete(id);
    req.onsuccess=()=>res();
    req.onerror=e=>rej(e.target.error);
  });
}

function mostrarAvisoMudanza(){
  const tipo  = document.getElementById('lic-tipo')?.value;
  const aviso = document.getElementById('lic-aviso-mudanza');
  if(aviso) aviso.style.display = tipo === 'Mudanza' ? 'block' : 'none';
}

// Reglamento de licencias: días máximos por tipo
