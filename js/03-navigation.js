function buildNav(){
  const role = currentUser?.role;
  const level = currentUser?.level;
  const isEmployee = role === 'employee';
  const isManager  = role === 'manager';
  const isAdmin    = level === 'admin';
  const esPapa     = currentUser?.emp?.nom?.toUpperCase().includes('PAPA, PABLO GABRIEL');
  const verGerente = isManager || esPapa;
  const items = document.querySelectorAll('.sb-item');
  // items: 0=nueva, 1=pendientes, 2=rrhhpanel, 3=historial, 4=recibos, 5=gestionrecibos
  items[1].style.display = verGerente ? 'flex' : 'none';
  items[2].style.display = role==='rrhh' ? 'flex' : 'none';
  items[0].innerHTML = '<div class="sb-dot blue"></div>Inicio';
  items[3].innerHTML = isEmployee ? '<div class="sb-dot"></div>Mis Solicitudes' : '<div class="sb-dot"></div>Todas las solicitudes';
  items[0].onclick = ()=>nav('home');
  items[1].onclick = ()=>nav('pendientes');
  items[2].onclick = ()=>nav('rrhhpanel');
  items[3].onclick = ()=>nav('historial');
  // Item de Administración de usuarios — solo visible para nivel admin
  const sbAdmin = document.getElementById('sb-admin-usuarios');
  if(sbAdmin) sbAdmin.style.display = isAdmin ? 'flex' : 'none';
  // Tarjeta del gerente ya no está en el home del empleado
  actualizarCntRecibos();
  actualizarDotRRHH();
}

// ─── NAVIGATION ───
// ════════════════════════════════════════════════════════════════
// Helper de resaltado del sidebar
// ════════════════════════════════════════════════════════════════
// Marca como activo el sb-item que corresponde a `sec`. Cuando hay varios
// ítems apuntando a la misma sección (ej. Licencias: Comprobante + Informar),
// se desempata por el segundo argumento `tab`: el ítem cuyo onclick contenga
// `licTab('xxx')` (o `gerTab`, `simTab`, etc.) coincidente con `tab` gana.
// Si no se pasa `tab`, gana el primero. Llamadas idempotentes — primero
// limpia la clase active de todos los items.
function _setSidebarActive(sec, tab){
  if(!sec) return;
  const items = document.querySelectorAll('.sb-item');
  items.forEach(s => s.classList.remove('active'));

  // Filtrar items que apuntan a esta sec
  const candidatos = [];
  items.forEach(item => {
    const onclick = item.getAttribute('onclick') || '';
    const mNav = /nav\s*\(\s*['"]([^'"]+)['"]/.exec(onclick);
    if(!mNav || mNav[1] !== sec) return;
    // Detectar tab opcional declarado en el mismo onclick
    const mTab = /(?:lic|ger|sim|hys|rrhh)Tab\s*\(\s*['"]([^'"]+)['"]/.exec(onclick);
    candidatos.push({ item, tab: mTab ? mTab[1] : null });
  });

  if(!candidatos.length) return;

  // Si pasaron `tab`, buscamos el match exacto
  if(tab){
    const match = candidatos.find(c => c.tab === tab);
    if(match){ match.item.classList.add('active'); return; }
  }

  // Sin tab o sin match: gana el que NO declara tab (es el "general"),
  // o en su defecto el primero.
  const sinTab = candidatos.find(c => !c.tab);
  (sinTab || candidatos[0]).item.classList.add('active');
}

function nav(sec){
  const role = currentUser?.role;
  const level = currentUser?.level;

  // ── Control de acceso (se evalúa ANTES de mostrar cualquier sección) ──
  if(sec === 'admin-usuarios' && level !== 'admin'){
    mostrarAccesoNoAutorizado(); return;
  }
  if(sec === 'rrhhpanel' && role !== 'rrhh'){
    mostrarAccesoNoAutorizado(); return;
  }
  if(sec === 'pendientes' && role !== 'manager' && role !== 'rrhh'){
    mostrarAccesoNoAutorizado(); return;
  }
  if(sec === 'licencias-gerente' && role !== 'manager'){
    mostrarAccesoNoAutorizado(); return;
  }
  if(sec === 'organigrama' && role !== 'rrhh' && role !== 'manager'){
    mostrarAccesoNoAutorizado(); return;
  }
  // licencias-gerente redirige al panel gerente con tab licencias
  if(sec === 'licencias-gerente'){
    nav('pendientes');
    setTimeout(()=>gerTab('licencias'), 50);
    return;
  }

  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(s=>s.classList.remove('active'));
  const targetSec = document.getElementById('sec-'+sec);
  if(!targetSec){ console.warn('nav: sección no encontrada:', sec); return; }
  targetSec.classList.add('active');

  // ── Resaltar sidebar ──
  // Cuando hay UN solo sb-item hacia esa `sec`, lo marcamos. Cuando hay varios
  // (ej. Licencias tiene "Comprobante" e "Informar" apuntando ambos a
  // `nav('licencias')` con distintos `licTab()`), elegimos el que corresponde
  // al tab que viene en el onclick. Si no se especifica tab al navegar, se
  // marca el primero (default) — luego `licTab()`/`gerTab()` re-sincronizan.
  let tabActivo = null;
  // Si el click vino de un sb-item, leemos su tab del propio onclick para
  // no parpadear entre items con distintos tabs (ej. Comprobante → Informar).
  try {
    const ev = window.event;
    const origin = ev && ev.currentTarget && ev.currentTarget.classList
                 && ev.currentTarget.classList.contains('sb-item') ? ev.currentTarget : null;
    if(origin){
      const oc = origin.getAttribute('onclick') || '';
      const mTab = /(?:lic|ger|sim|hys|rrhh)Tab\s*\(\s*['"]([^'"]+)['"]/.exec(oc);
      if(mTab) tabActivo = mTab[1];
    }
  } catch(_){ /* noop — fallback al default */ }
  if(!tabActivo && sec === 'licencias') tabActivo = 'comprobante'; // default si no llegó del sidebar
  _setSidebarActive(sec, tabActivo);
  if(sec==='home'){ mostrarBannerCumpleanos(); actualizarHomeBadges(); actualizarBadgesEval(); _gerSancActualizarBadge(); }
  if(sec==='pendientes'){ renderPendientes(); gerTab('adelantos'); actualizarBadgesEval(); _gerSancActualizarBadge(); }
  if(sec==='rrhhpanel'){ navRRHH(null); actualizarBannerDelegacion(); actualizarRRHHBadges(); _rrhhSancActualizarBadge(); }
  if(sec==='historial') renderHistorial();
  if(sec==='recibos') renderRecibos();
  if(sec==='licencias'){ renderMisLicencias(); nuevaLicencia(); licTab('comprobante'); nuevoInformeLicencia(); }
  if(sec==='ganancias') renderGanancias();
  if(sec==='misdatos') renderMisDatos();
  if(sec==='familiares') renderMisFamiliares();
  if(sec==='mensajes'){ nuevoMensaje(); renderMisMensajes(); }
  if(sec==='admin-usuarios'){ renderAdminUsuarios(); }
  if(sec==='lic-anual'){ nuevaSolicitudAnual(); renderMisLicAnuales(); }
  if(sec==='lic-especial'){ leNuevo(); renderMisLicEspeciales(); }
  if(sec==='organigrama'){
    _orgExpandido = new Set(); // reset al entrar
    renderOrganigrama();
  }
  if(sec==='nueva' && currentUser){
    empresaActual = currentUser.emp.emp;
    selectEmp();
  }
}

function mostrarAccesoNoAutorizado(){
  // Mostrar mensaje flotante y volver al home
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-home').classList.add('active');
  mostrarBannerCumpleanos();
  actualizarHomeBadges();
  // Toast de acceso denegado
  const t = document.getElementById('toast');
  t.textContent = '🚫 Acceso no autorizado';
  t.style.borderColor = 'var(--red)';
  t.style.color = 'var(--red)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 4000);
}

function showWelcome(msg){
  const banner = document.getElementById('welcome-banner');
  document.getElementById('wb-text').innerHTML = msg.replace(/(,\s*)(\w+)(\s*👋)/, ', <span>$2</span>$3');
  banner.classList.add('show');
  setTimeout(()=>banner.classList.remove('show'), 4000);
}

