// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ARCHIVOS BANCARIOS — Multi-banco
// ───────────────────────────────────────────────────────────────────────────
// Genera archivos de pago para los bancos comunes en Argentina además
// de Galicia (que ya está en js/29-export-bancos.js):
//
//   • BNA (Banco Nación) — TXT posicional formato "Datanet"
//   • Santander — XLS con columnas estándar
//   • Macro — TXT posicional
//   • BBVA — XLS
//   • ICBC — TXT
//   • Provincia (Bapro) — TXT formato Datanet/Provincia
//   • Genérico — XLS con columnas mínimas (CBU, CUIL, importe, leyenda)
//
// Estrategia: cada banco implementa una función `genArchivo<Banco>(items, opts)`
// que devuelve un Blob, y comparten un modal único `abrirModalArchivosBanco`
// que el operador usa para elegir banco, fechas, leyenda y empresas a incluir.
//
// Reusa la infra de Galicia para la expansión multi-CBU (cada empleado puede
// tener varias cuentas con % cada una). La función `_bnkExpandirItemsMultiCBU`
// hace exactamente esto.
//
// Los formatos por banco son aproximaciones razonables — para presentación
// real conviene contrastar con la última especificación de Datanet/Pago a
// Proveedores que el banco le entregue a LEITEN. Los más estables son los TXT
// posicionales (estructura fija); los XLS varían entre versiones del banco.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Catálogo de bancos soportados ─────────────────────────────────────
const BANCOS_DISPONIBLES = [
  { v:'bna',        label:'Banco Nación (BNA)',          formato:'TXT', desc:'Datanet posicional' },
  { v:'santander',  label:'Santander',                    formato:'XLS', desc:'Pago de haberes' },
  { v:'macro',      label:'Banco Macro',                  formato:'TXT', desc:'Posicional Pagos' },
  { v:'bbva',       label:'BBVA',                         formato:'XLS', desc:'Plan sueldos' },
  { v:'icbc',       label:'ICBC',                         formato:'TXT', desc:'Posicional' },
  { v:'provincia',  label:'Banco Provincia (Bapro)',      formato:'TXT', desc:'Datanet Provincia' },
  { v:'supervielle',label:'Supervielle',                  formato:'TXT', desc:'Posicional' },
  { v:'generico',   label:'Genérico (otros bancos)',      formato:'XLS', desc:'Columnas mínimas' }
];

// ─── Helpers compartidos ───────────────────────────────────────────────
function _bnkPad(val, len, char, alignRight){
  let s = String(val ?? '');
  if(s.length > len) s = s.slice(0, len);
  if(alignRight) return s.padStart(len, char || '0');
  return s.padEnd(len, char || ' ');
}
function _bnkLimpiarCBU(cbu){ return String(cbu||'').replace(/[^\d]/g,''); }
function _bnkLimpiarCUIL(cuil){ return String(cuil||'').replace(/[^\d]/g,''); }
function _bnkSinAcentos(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'');
}
function _bnkFechaToYYYYMMDD(date){
  const d = date instanceof Date ? date : new Date(date);
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
}
function _bnkFechaToDDMMYYYY(date){
  const d = date instanceof Date ? date : new Date(date);
  return String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + d.getFullYear();
}

// Importe → string sin punto decimal (centavos pegados): 12345.67 → "1234567"
function _bnkImporteCentavos(monto, len){
  const cents = Math.round(Number(monto||0) * 100);
  const s = String(Math.abs(cents));
  return len ? _bnkPad(s, len, '0', true) : s;
}

// ─── Expansión multi-CBU (reusa la lógica de Galicia) ──────────────────
// Devuelve { items: [...con _cbu, _porcentaje, neto proporcional],
//            sinCBU: [...], sumaIncompleta: [...] }
function _bnkExpandirItemsMultiCBU(liq){
  const itemsExpand = [];
  const sinCBU = [];
  const sumaIncompleta = [];

  liq.items.forEach(i => {
    const activos = (typeof getCBUsActivos === 'function') ? getCBUsActivos(i.leg) : [];
    if(!activos.length){
      // Fallback: probar CBU embebido en el master
      const empDB = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === i.leg);
      const cbuMaster = empDB?.cbu;
      if(cbuMaster && _bnkLimpiarCBU(cbuMaster).length === 22){
        itemsExpand.push({ ...i,
          _cbu: _bnkLimpiarCBU(cbuMaster),
          _tipoCuenta: 'CA',  // default Caja de Ahorro cuando viene del master
          _porcentaje: 100, _esMultiCBU: false, _idxCBU: 1, _totalCBUs: 1
        });
        return;
      }
      sinCBU.push({ ...i });
      return;
    }
    const suma = activos.reduce((s,c) => s + Number(c.porcentaje || 0), 0);
    if(Math.abs(suma - 100) > 0.01){
      sumaIncompleta.push({ ...i, _suma: suma, _cbusActivos: activos });
      return;
    }
    activos.forEach((c, idx) => {
      const importeProp = Math.round(Number(i.netoAPagar || 0) * Number(c.porcentaje) / 100 * 100) / 100;
      itemsExpand.push({
        ...i,
        _cbu: _bnkLimpiarCBU(c.cbu),
        _tipoCuenta: c.tipoCuenta || 'CA',
        _porcentaje: Number(c.porcentaje),
        _esMultiCBU: activos.length > 1,
        _idxCBU: idx + 1,
        _totalCBUs: activos.length,
        netoAPagar: importeProp,
        neto:       importeProp
      });
    });
  });
  return { items: itemsExpand, sinCBU, sumaIncompleta };
}

// ═══════════════════════════════════════════════════════════════════════════
// BNA (Banco Nación) — formato Datanet posicional
// ───────────────────────────────────────────────────────────────────────────
// Especificación aproximada de Datanet para depósito en cuenta:
//   - Línea de cabecera (Tipo registro = 0)
//   - N líneas de detalle (Tipo registro = 1) por CBU
//   - Línea de cierre (Tipo registro = 9) con totales
// Cada línea tiene 250 caracteres de longitud fija.
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoBNA(items, opts){
  const { fechaAcred, leyenda, cuitEmpleador } = opts;
  const fechaTxt = _bnkFechaToYYYYMMDD(fechaAcred);
  const cuitClean = _bnkLimpiarCUIL(cuitEmpleador);
  const lineas = [];

  // Cabecera (registro tipo 0)
  const cabecera =
    '0' +                                    // Tipo registro (1)
    _bnkPad(cuitClean, 11, '0', true) +      // CUIT empleador (11)
    fechaTxt +                                // Fecha acreditación YYYYMMDD (8)
    _bnkPad(_bnkSinAcentos(leyenda||'').toUpperCase(), 30, ' ') + // Leyenda (30)
    _bnkPad('001', 6, '0', true) +           // Versión (6)
    _bnkPad('', 194, ' ');                   // Reserva (194)
  lineas.push(cabecera);

  // Detalle (registro tipo 1)
  let totalImporte = 0;
  let totalRegs = 0;
  items.forEach((it, idx) => {
    const cbu = _bnkPad(it._cbu, 22, '0', true);
    const importe = _bnkImporteCentavos(it.netoAPagar, 13); // 11 enteros + 2 decimales
    const cuilEmp = _bnkPad(_bnkLimpiarCUIL(it.cuil), 11, '0', true);
    const nombre  = _bnkPad(_bnkSinAcentos(it.nom||'').toUpperCase().replace(/,/g,''), 40, ' ');
    const refExt  = _bnkPad(String(it.leg || ''), 22, ' ');
    const tipoCta = it._tipoCuenta === 'CC' ? 'CC' : 'CA';
    const linea =
      '1' +                                   // Tipo registro
      cbu +                                   // CBU (22)
      importe +                               // Importe (13)
      cuilEmp +                               // CUIL empleado (11)
      nombre +                                // Nombre (40)
      tipoCta +                               // Tipo cuenta (2)
      refExt +                                // Referencia externa (22)
      _bnkPad(String(idx+1), 7, '0', true) + // Nro. ítem (7)
      _bnkPad('', 132, ' ');                 // Reserva
    lineas.push(linea);
    totalImporte += Number(it.netoAPagar) || 0;
    totalRegs++;
  });

  // Cierre (tipo 9)
  const cierre =
    '9' +
    _bnkPad(String(totalRegs), 7, '0', true) +
    _bnkImporteCentavos(totalImporte, 15) +
    _bnkPad('', 227, ' ');
  lineas.push(cierre);

  const contenido = lineas.join('\r\n') + '\r\n';
  return new Blob([contenido], { type:'text/plain;charset=ascii' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Macro — TXT posicional aproximado
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoMacro(items, opts){
  const { fechaAcred, leyenda, cuitEmpleador } = opts;
  const fechaTxt = _bnkFechaToYYYYMMDD(fechaAcred);
  const cuit = _bnkLimpiarCUIL(cuitEmpleador);
  const lineas = [];
  let total = 0;

  items.forEach((it, idx) => {
    const linea =
      _bnkPad(cuit, 11, '0', true) +
      fechaTxt +
      _bnkPad(it._cbu, 22, '0', true) +
      _bnkImporteCentavos(it.netoAPagar, 14) +     // 12 enteros + 2 decimales
      _bnkPad(_bnkLimpiarCUIL(it.cuil), 11, '0', true) +
      _bnkPad(_bnkSinAcentos(it.nom||'').toUpperCase().replace(/,/g,''), 40, ' ') +
      (it._tipoCuenta === 'CC' ? 'CC' : 'CA') +
      _bnkPad(_bnkSinAcentos(leyenda||'').toUpperCase(), 30, ' ') +
      _bnkPad(String(it.leg || ''), 10, ' ') +
      _bnkPad(String(idx+1), 6, '0', true);
    lineas.push(linea);
    total += Number(it.netoAPagar) || 0;
  });

  return new Blob([lineas.join('\r\n') + '\r\n'], { type:'text/plain;charset=ascii' });
}

// ═══════════════════════════════════════════════════════════════════════════
// ICBC — TXT
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoICBC(items, opts){
  const { fechaAcred, leyenda } = opts;
  const fechaTxt = _bnkFechaToDDMMYYYY(fechaAcred);
  const lineas = items.map((it, idx) => [
    _bnkLimpiarCBU(it._cbu),
    _bnkLimpiarCUIL(it.cuil),
    _bnkSinAcentos(it.nom||'').toUpperCase().replace(/,/g,''),
    Number(it.netoAPagar||0).toFixed(2),
    fechaTxt,
    it._tipoCuenta === 'CC' ? 'CC' : 'CA',
    _bnkSinAcentos(leyenda||'').toUpperCase(),
    String(it.leg||'')
  ].join(';'));
  return new Blob([lineas.join('\r\n') + '\r\n'], { type:'text/plain;charset=ascii' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Provincia (Bapro) — TXT Datanet
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoProvincia(items, opts){
  const { fechaAcred, leyenda, cuitEmpleador } = opts;
  const fechaTxt = _bnkFechaToYYYYMMDD(fechaAcred);
  const cuit = _bnkLimpiarCUIL(cuitEmpleador);
  const lineas = [];

  items.forEach((it, idx) => {
    const linea =
      _bnkPad('001', 3, '0', true) +                 // Tipo operación (3)
      _bnkPad(cuit, 11, '0', true) +                  // CUIT empleador
      _bnkPad(_bnkLimpiarCUIL(it.cuil), 11, '0', true) +
      _bnkPad(it._cbu, 22, '0', true) +
      _bnkImporteCentavos(it.netoAPagar, 14) +
      fechaTxt +
      _bnkPad(_bnkSinAcentos(it.nom||'').toUpperCase().replace(/,/g,''), 30, ' ') +
      _bnkPad(_bnkSinAcentos(leyenda||'').toUpperCase(), 20, ' ') +
      _bnkPad(String(it.leg||''), 8, ' ');
    lineas.push(linea);
  });

  return new Blob([lineas.join('\r\n') + '\r\n'], { type:'text/plain;charset=ascii' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Supervielle — TXT genérico
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoSupervielle(items, opts){
  const { fechaAcred, leyenda } = opts;
  const fechaTxt = _bnkFechaToDDMMYYYY(fechaAcred);
  const lineas = items.map(it => [
    _bnkLimpiarCBU(it._cbu),
    _bnkLimpiarCUIL(it.cuil),
    _bnkSinAcentos(it.nom||'').toUpperCase(),
    Number(it.netoAPagar||0).toFixed(2),
    fechaTxt,
    _bnkSinAcentos(leyenda||'').toUpperCase()
  ].join('|'));
  return new Blob([lineas.join('\r\n') + '\r\n'], { type:'text/plain;charset=ascii' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Santander — XLS
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoSantander(items, opts){
  if(typeof XLSX === 'undefined') return null;
  const { fechaAcred, leyenda } = opts;
  const fechaIso = (fechaAcred instanceof Date ? fechaAcred : new Date(fechaAcred));

  const headers = [
    'CUIL','Apellido y Nombre','CBU','Tipo Cuenta','Importe','Fecha Acreditación','Leyenda','Legajo'
  ];
  const rows = [headers, ...items.map(it => [
    _bnkLimpiarCUIL(it.cuil),
    _bnkSinAcentos(it.nom||'').toUpperCase(),
    _bnkLimpiarCBU(it._cbu),
    it._tipoCuenta === 'CC' ? 'CC' : 'CA',
    Number(it.netoAPagar||0),
    fechaIso,
    _bnkSinAcentos(leyenda||''),
    String(it.leg||'')
  ])];

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // Volver a setear cada fila con tipos correctos
  rows.slice(1).forEach((r, idx) => {
    const rowIdx = idx + 1;
    const set = (c, cell) => { ws[XLSX.utils.encode_cell({ r:rowIdx, c })] = cell; };
    set(0, { t:'s', v: r[0] });
    set(1, { t:'s', v: r[1] });
    set(2, { t:'s', v: r[2] });
    set(3, { t:'s', v: r[3] });
    set(4, { t:'n', v: r[4], z: '#,##0.00' });
    set(5, { t:'d', v: r[5], z: 'dd/mm/yyyy' });
    set(6, { t:'s', v: r[6] });
    set(7, { t:'s', v: r[7] });
  });
  // Ajustar rango
  const range = XLSX.utils.decode_range(ws['!ref']);
  range.e.r = rows.length - 1; range.e.c = 7;
  ws['!ref'] = XLSX.utils.encode_range(range);
  ws['!cols'] = [{wch:13},{wch:32},{wch:24},{wch:6},{wch:14},{wch:13},{wch:24},{wch:9}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pago Haberes');
  const arrBuf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  return new Blob([arrBuf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ═══════════════════════════════════════════════════════════════════════════
// BBVA — XLS
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoBBVA(items, opts){
  if(typeof XLSX === 'undefined') return null;
  const { fechaAcred, leyenda } = opts;
  const fechaIso = (fechaAcred instanceof Date ? fechaAcred : new Date(fechaAcred));
  const headers = [
    'Legajo','CUIT/CUIL','Beneficiario','CBU','Tipo Cuenta','Moneda','Importe','Fecha Acreditación','Concepto'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  items.forEach((it, idx) => {
    const rowIdx = idx + 1;
    const set = (c, cell) => { ws[XLSX.utils.encode_cell({ r:rowIdx, c })] = cell; };
    set(0, { t:'s', v: String(it.leg||'') });
    set(1, { t:'s', v: _bnkLimpiarCUIL(it.cuil) });
    set(2, { t:'s', v: _bnkSinAcentos(it.nom||'').toUpperCase() });
    set(3, { t:'s', v: _bnkLimpiarCBU(it._cbu) });
    set(4, { t:'s', v: it._tipoCuenta === 'CC' ? 'CC' : 'CA' });
    set(5, { t:'s', v: 'ARS' });
    set(6, { t:'n', v: Number(it.netoAPagar||0), z: '#,##0.00' });
    set(7, { t:'d', v: fechaIso, z: 'dd/mm/yyyy' });
    set(8, { t:'s', v: _bnkSinAcentos(leyenda||'') });
  });
  const range = XLSX.utils.decode_range(ws['!ref']);
  range.e.r = items.length; range.e.c = 8;
  ws['!ref'] = XLSX.utils.encode_range(range);
  ws['!cols'] = [{wch:9},{wch:13},{wch:32},{wch:24},{wch:6},{wch:7},{wch:14},{wch:14},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan Sueldos');
  const arrBuf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  return new Blob([arrBuf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Genérico — XLS con columnas mínimas
// ═══════════════════════════════════════════════════════════════════════════
function genArchivoGenerico(items, opts){
  if(typeof XLSX === 'undefined') return null;
  const { fechaAcred, leyenda } = opts;
  const fechaIso = (fechaAcred instanceof Date ? fechaAcred : new Date(fechaAcred));
  const headers = ['CBU','CUIL','Beneficiario','Importe','Fecha','Leyenda','Legajo','Tipo Cuenta'];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  items.forEach((it, idx) => {
    const rowIdx = idx + 1;
    const set = (c, cell) => { ws[XLSX.utils.encode_cell({ r:rowIdx, c })] = cell; };
    set(0, { t:'s', v: _bnkLimpiarCBU(it._cbu) });
    set(1, { t:'s', v: _bnkLimpiarCUIL(it.cuil) });
    set(2, { t:'s', v: _bnkSinAcentos(it.nom||'').toUpperCase() });
    set(3, { t:'n', v: Number(it.netoAPagar||0), z: '#,##0.00' });
    set(4, { t:'d', v: fechaIso, z: 'dd/mm/yyyy' });
    set(5, { t:'s', v: _bnkSinAcentos(leyenda||'') });
    set(6, { t:'s', v: String(it.leg||'') });
    set(7, { t:'s', v: it._tipoCuenta === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro' });
  });
  const range = XLSX.utils.decode_range(ws['!ref']);
  range.e.r = items.length; range.e.c = 7;
  ws['!ref'] = XLSX.utils.encode_range(range);
  ws['!cols'] = [{wch:24},{wch:13},{wch:32},{wch:14},{wch:13},{wch:24},{wch:9},{wch:18}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
  const arrBuf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  return new Blob([arrBuf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── Dispatcher ────────────────────────────────────────────────────────
function _bnkGenerarArchivo(banco, items, opts){
  switch(banco){
    case 'bna':         return { blob: genArchivoBNA(items, opts),         ext:'txt' };
    case 'macro':       return { blob: genArchivoMacro(items, opts),       ext:'txt' };
    case 'icbc':        return { blob: genArchivoICBC(items, opts),        ext:'txt' };
    case 'provincia':   return { blob: genArchivoProvincia(items, opts),   ext:'txt' };
    case 'supervielle': return { blob: genArchivoSupervielle(items, opts), ext:'txt' };
    case 'santander':   return { blob: genArchivoSantander(items, opts),   ext:'xlsx' };
    case 'bbva':        return { blob: genArchivoBBVA(items, opts),        ext:'xlsx' };
    case 'generico':    return { blob: genArchivoGenerico(items, opts),    ext:'xlsx' };
    default:            return { blob: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal unificado
// ═══════════════════════════════════════════════════════════════════════════
let _bnkModalCtx = null;

async function abrirModalArchivosBanco(){
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación','var(--yellow)'); return; }
  if(!liq.items?.length){ toast('⚠ Sin items en la liquidación','var(--yellow)'); return; }

  const { items: itemsExpand, sinCBU, sumaIncompleta } = _bnkExpandirItemsMultiCBU(liq);

  // Agrupar por empresa para permitir selección
  const porEmp = {};
  itemsExpand.forEach(i => {
    const k = i.empresa || '(sin empresa)';
    if(!porEmp[k]) porEmp[k] = [];
    porEmp[k].push(i);
  });

  // Defaults de fecha y leyenda
  const ultimo = new Date(liq.anio, liq.mes, 0); // último día del mes
  const procesoIso = ultimo.toISOString().slice(0, 10);
  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const tipoLabel = liq.tipo === 'quincenal_1' ? '1Q ' : liq.tipo === 'quincenal_2' ? '2Q ' : '';
  const leyendaDef = `PAGO ${tipoLabel}${MESES[liq.mes-1]} ${liq.anio}`;

  _bnkModalCtx = { liq, itemsExpand, sinCBU, sumaIncompleta, porEmp };

  const empNames = Object.keys(porEmp).sort();
  const empCheckboxes = empNames.map(e => {
    const filas = porEmp[e].length;
    const empleadosUnicos = new Set(porEmp[e].map(x => x.leg)).size;
    return `<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:var(--bg2)">
      <input type="checkbox" name="bnk-emp" value="${e.replace(/"/g,'&quot;')}" checked style="cursor:pointer;accent-color:var(--accent)">
      <span style="font-size:12px;color:var(--t1);flex:1">${e}</span>
      <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${empleadosUnicos} emp · ${filas} fila${filas!==1?'s':''}</span>
    </label>`;
  }).join('');

  const bancoOpts = BANCOS_DISPONIBLES.map(b =>
    `<option value="${b.v}">${b.label} — ${b.formato}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'modal-bnk';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:680px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">🏦 Archivo de pago bancario</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${liq.periodo} · ${itemsExpand.length} línea${itemsExpand.length!==1?'s':''} en total</div>
        </div>
        <button onclick="document.getElementById('modal-bnk').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Banco destino</label>
          <select id="bnk-banco" onchange="_bnkActualizarHelp()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            ${bancoOpts}
          </select>
          <div id="bnk-help" style="font-size:10px;color:var(--t3);margin-top:6px;font-style:italic"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha de acreditación</label>
            <input type="date" id="bnk-fecha" value="${procesoIso}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">CUIT empleador (BNA/Macro/Prov.)</label>
            <input type="text" id="bnk-cuit" placeholder="11 dígitos sin guiones" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Leyenda de crédito</label>
          <input type="text" id="bnk-leyenda" value="${leyendaDef}" maxlength="30" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Aparece en el extracto del empleado · máx 30 caracteres</div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Empresas a incluir</label>
          <div style="display:flex;flex-direction:column;gap:6px">${empCheckboxes || '<div style="color:var(--t3);font-size:11px;padding:10px">Sin empresas con CBU vigente</div>'}</div>
        </div>

        ${(sinCBU.length || sumaIncompleta.length) ? `
        <div style="background:rgba(234,179,8,.04);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--t2);line-height:1.5">
          <strong style="color:var(--yellow)">⚠ Se omitirán</strong>
          ${sinCBU.length ? `<div style="margin-top:4px"><strong>Sin CBU vigente (${sinCBU.length}):</strong> ${sinCBU.slice(0,5).map(i=>i.nom?.split(',')[0]).join(', ')}${sinCBU.length>5?'…':''}</div>` : ''}
          ${sumaIncompleta.length ? `<div style="margin-top:4px"><strong>CBUs no suman 100% (${sumaIncompleta.length}):</strong> ${sumaIncompleta.slice(0,5).map(i=>`${i.nom?.split(',')[0]} (${i._suma}%)`).join(', ')}${sumaIncompleta.length>5?'…':''}</div>` : ''}
        </div>` : ''}

        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Importante:</strong> los formatos son aproximaciones a las especificaciones publicadas por cada banco.
          Antes del primer envío real, contrastar con el documento que el banco le entregó a LEITEN.
          Galicia: usar el botón dedicado (genera planilla con MID/fórmulas exactas).
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-bnk').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="generarArchivoBancoSeleccionado()" style="font-size:13px;padding:8px 18px">📥 Generar archivo</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _bnkActualizarHelp();
}

function _bnkActualizarHelp(){
  const sel = document.getElementById('bnk-banco');
  const help = document.getElementById('bnk-help');
  if(!sel || !help) return;
  const b = BANCOS_DISPONIBLES.find(x => x.v === sel.value);
  help.textContent = b ? `${b.formato} · ${b.desc}` : '';
}

async function generarArchivoBancoSeleccionado(){
  if(!_bnkModalCtx) return;
  const banco = document.getElementById('bnk-banco')?.value;
  const fechaIso = document.getElementById('bnk-fecha')?.value;
  const cuit = document.getElementById('bnk-cuit')?.value || '';
  const leyenda = document.getElementById('bnk-leyenda')?.value || '';

  if(!banco || !fechaIso){ toast('⚠ Completá banco y fecha','var(--yellow)'); return; }
  if(['bna','macro','provincia'].includes(banco) && _bnkLimpiarCUIL(cuit).length !== 11){
    toast('⚠ CUIT empleador requerido (11 dígitos) para este banco','var(--yellow)'); return;
  }

  const empresasSel = Array.from(document.querySelectorAll('input[name="bnk-emp"]:checked')).map(x => x.value);
  if(!empresasSel.length){ toast('⚠ Elegí al menos una empresa','var(--yellow)'); return; }

  // Filtrar items por empresas seleccionadas
  const items = _bnkModalCtx.itemsExpand.filter(i => empresasSel.includes(i.empresa || '(sin empresa)'));
  if(!items.length){ toast('⚠ Sin filas para exportar','var(--yellow)'); return; }

  const opts = {
    fechaAcred: new Date(fechaIso + 'T00:00:00'),
    leyenda,
    cuitEmpleador: cuit
  };
  const { blob, ext } = _bnkGenerarArchivo(banco, items, opts);
  if(!blob){ toast('✕ Error al generar archivo','var(--red)'); return; }

  const liq = _bnkModalCtx.liq;
  const fname = `${banco}_${liq.periodo}_${empresasSel.length===1?empresasSel[0].replace(/[^a-z0-9]/gi,'_').toLowerCase():'multi'}.${ext}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  URL.revokeObjectURL(a.href);

  // Audit
  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'archivo_banco_generado', {
      liqId: liq.id, periodo: liq.periodo, banco, filas: items.length,
      empresas: empresasSel, por: currentUser?.emp?.nom
    });
  }

  toast(`✓ ${fname} descargado (${items.length} líneas)`, 'var(--green)');
  document.getElementById('modal-bnk')?.remove();
}
