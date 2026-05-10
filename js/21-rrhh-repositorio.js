// ─── REPOSITORIO: BACKUP Y RESTORE ───

async function actualizarContadoresRepo(){
  const recibos   = await getRecibos();
  const ganancias = await getGanancias();
  const nRec = Object.keys(recibos).length;
  const nGan = Object.keys(ganancias).length;
  const rc = document.getElementById('repo-rec-count');
  const gc = document.getElementById('repo-gan-count');
  if(rc) rc.textContent = `${nRec} recibo${nRec!==1?'s':''} almacenado${nRec!==1?'s':''}`;
  if(gc) gc.textContent = `${nGan} documento${nGan!==1?'s':''} almacenado${nGan!==1?'s':''}`;
}

async function exportarRepositorio(tipo){
  const datos = tipo==='recibos' ? await getRecibos() : await getGanancias();
  const keys  = Object.keys(datos);
  if(!keys.length){ toast(`⚠ No hay ${tipo} para exportar`,'var(--yellow)'); return; }

  const payload = {
    tipo,
    version: 1,
    exportadoEl: new Date().toLocaleString('es-AR'),
    exportadoPor: currentUser?.emp?.nom || 'RR.HH.',
    total: keys.length,
    registros: datos
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  a.href     = url;
  a.download = `backup_${tipo}_${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`✓ Backup de ${tipo} descargado (${keys.length} documentos)`,'var(--green)');
  log_repo(`✓ Backup exportado: ${keys.length} ${tipo} — ${new Date().toLocaleString('es-AR')}`);
}

async function importarRepositorio(tipo, input){
  const file = input.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = async function(ev){
    try {
      const payload = JSON.parse(ev.target.result);
      if(payload.tipo !== tipo) throw new Error(`El archivo es de tipo "${payload.tipo}", no "${tipo}"`);

      const registros  = payload.registros || {};
      const keysNuevos = Object.keys(registros);
      if(!keysNuevos.length) throw new Error('El archivo no contiene registros');

      // Obtener existentes para no sobreescribir
      const existentes = tipo==='recibos' ? await getRecibos() : await getGanancias();
      const guardar    = tipo==='recibos' ? setRecibo : setGanancia;

      let importados = 0, omitidos = 0;
      for(const key of keysNuevos){
        if(existentes[key]){
          omitidos++;
        } else {
          await guardar(key, registros[key]);
          importados++;
        }
      }

      toast(`✓ Restaurados: ${importados} nuevos, ${omitidos} ya existían`,'var(--green)');
      log_repo(`✓ Importación ${tipo}: ${importados} nuevos, ${omitidos} omitidos — ${new Date().toLocaleString('es-AR')}`);
      actualizarContadoresRepo();
      input.value='';
    } catch(e) {
      toast('⚠ Error al importar: ' + e.message,'var(--red)');
      console.error(e);
      input.value='';
    }
  };
  reader.readAsText(file);
}

function log_repo(msg){
  const div = document.getElementById('repo-log');
  if(!div) return;
  const prev = div.innerHTML;
  div.innerHTML = `<div>${msg}</div>` + (prev ? prev : '');
}

