// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR DE REPORTES
// ───────────────────────────────────────────────────────────────────────────
// Wizard guiado de 3 pasos:
//   1. Categoría: elegir uno de los 7 datasets disponibles
//   2. Campos: marcar qué columnas incluir
//   3. Filtros + ordenamiento + agrupación → previsualización → exportar
//
// Salidas: Excel (XLSX), CSV (separador ; UTF-8 BOM), PDF (tabla formal con
// logo, título y empresa).
//
// Persistencia: las definiciones de reporte se guardan en localStorage
// (lsg_reportes_guardados) para volver a ejecutarlas.
// ═══════════════════════════════════════════════════════════════════════════

// ─── CATÁLOGO DE DATASETS ──────────────────────────────────────────────
// Cada dataset declara cómo obtener sus filas y qué campos expone para el
// wizard. fetch() devuelve el array bruto; getRows() lo proyecta agregando
// campos derivados (familiares, CBUs, edad, antigüedad).
const REPORTES_DATASETS = {

  empleados: {
    label: 'Empleados',
    icon: '👥',
    color: 'var(--accent2)',
    desc: 'Datos personales, laborales, contacto, familiares, CBUs, niveles. Todos los campos disponibles.',
    campos: {
      // ── IDENTIFICACIÓN ──
      leg:           { label: 'Legajo', tipo: 'string', grupo: 'Identificación' },
      dni:           { label: 'DNI', tipo: 'string', grupo: 'Identificación' },
      cuil:          { label: 'CUIL', tipo: 'string', grupo: 'Identificación' },
      nom:           { label: 'Apellido y Nombre', tipo: 'string', grupo: 'Identificación' },

      // ── LABORALES ──
      emp:           { label: 'Empresa', tipo: 'string', grupo: 'Laborales' },
      lugar:         { label: 'Lugar de trabajo', tipo: 'string', grupo: 'Laborales' },
      cat:           { label: 'Categoría (código)', tipo: 'string', grupo: 'Laborales' },
      tramo:         { label: 'Tramo (JR / SSR / SR / SEN)', tipo: 'string', grupo: 'Laborales' },
      desc_categoria:{ label: 'Descripción categoría', tipo: 'string', grupo: 'Laborales' },
      tarea:         { label: 'Tarea / Puesto', tipo: 'string', grupo: 'Laborales' },
      condicion:     { label: 'Condición (Mensualizado / Jornal)', tipo: 'string', grupo: 'Laborales' },
      cod_convenio:  { label: 'Código de convenio', tipo: 'string', grupo: 'Laborales' },
      area:          { label: 'Área', tipo: 'string', grupo: 'Laborales' },
      ing:           { label: 'Fecha Ingreso', tipo: 'date', grupo: 'Laborales' },
      egreso:        { label: 'Fecha Egreso', tipo: 'date', grupo: 'Laborales' },
      antig_anios:   { label: 'Antigüedad (años)', tipo: 'number', grupo: 'Laborales', derivado: true },
      antig_meses:   { label: 'Antigüedad (meses)', tipo: 'number', grupo: 'Laborales', derivado: true },
      antig_dias:    { label: 'Antigüedad (días)', tipo: 'number', grupo: 'Laborales', derivado: true },
      es_baja:       { label: 'Está de baja', tipo: 'bool', grupo: 'Laborales', derivado: true },

      // ── REMUNERACIONES (datos del archivo de nómina) ──
      sueldo:           { label: 'Sueldo (campo nómina)', tipo: 'currency', grupo: 'Remuneraciones' },
      basico:           { label: 'Básico (campo nómina)', tipo: 'currency', grupo: 'Remuneraciones' },
      antiguedad_monto: { label: 'Monto de antigüedad', tipo: 'currency', grupo: 'Remuneraciones' },
      complemento:      { label: 'Complemento', tipo: 'currency', grupo: 'Remuneraciones' },
      norem:            { label: 'No remunerativo', tipo: 'currency', grupo: 'Remuneraciones' },
      bruto:            { label: 'Bruto total', tipo: 'currency', grupo: 'Remuneraciones' },
      neto:             { label: 'Neto', tipo: 'currency', grupo: 'Remuneraciones' },
      lim:              { label: 'Límite (anticipos)', tipo: 'currency', grupo: 'Remuneraciones' },
      sueldo_basico:    { label: 'Sueldo Básico ABM', tipo: 'currency', grupo: 'Remuneraciones' },
      // ── REMUNERACIONES DERIVADAS (escala salarial) ──
      rem_escala_unif: { label: 'Remuneración escala unificada', tipo: 'currency', grupo: 'Remuneraciones', derivado: true },
      diferencia_escala:{ label: 'Diferencia vs escala ($)', tipo: 'currency', grupo: 'Remuneraciones', derivado: true },
      diferencia_escala_pct:{ label: 'Diferencia vs escala (%)', tipo: 'number', grupo: 'Remuneraciones', derivado: true },
      pct_antiguedad:  { label: '% Antigüedad aplicado', tipo: 'number', grupo: 'Remuneraciones', derivado: true },

      // ── SINDICATO Y OBRA SOCIAL ──
      cod_sindicato:    { label: 'Código Sindicato', tipo: 'string', grupo: 'Sindicato y OS' },
      nombre_sindicato: { label: 'Nombre Sindicato', tipo: 'string', grupo: 'Sindicato y OS', derivado: true },
      cod_os:           { label: 'Código Obra Social', tipo: 'string', grupo: 'Sindicato y OS' },
      desc_os:          { label: 'Obra Social (descripción)', tipo: 'string', grupo: 'Sindicato y OS' },

      // ── DATOS PERSONALES ──
      fecha_nac:    { label: 'Fecha de Nacimiento', tipo: 'date', grupo: 'Personales' },
      edad:         { label: 'Edad (años)', tipo: 'number', grupo: 'Personales', derivado: true },
      sexo:         { label: 'Sexo', tipo: 'string', grupo: 'Personales' },
      estado_civil: { label: 'Estado Civil', tipo: 'string', grupo: 'Personales' },
      nacionalidad: { label: 'Nacionalidad', tipo: 'string', grupo: 'Personales' },

      // ── CONTACTO ──
      mail:    { label: 'Email', tipo: 'string', grupo: 'Contacto' },
      tel:     { label: 'Teléfono', tipo: 'string', grupo: 'Contacto' },

      // ── DOMICILIO ──
      dom_calle:    { label: 'Domicilio - Calle', tipo: 'string', grupo: 'Domicilio' },
      dom_nro:      { label: 'Domicilio - Número', tipo: 'string', grupo: 'Domicilio' },
      dom_piso:     { label: 'Piso', tipo: 'string', grupo: 'Domicilio' },
      dom_depto:    { label: 'Depto', tipo: 'string', grupo: 'Domicilio' },
      dom_torre:    { label: 'Torre', tipo: 'string', grupo: 'Domicilio' },
      dom_bloque:   { label: 'Bloque', tipo: 'string', grupo: 'Domicilio' },
      dom_loc:      { label: 'Localidad', tipo: 'string', grupo: 'Domicilio' },
      dom_cp:       { label: 'Código Postal', tipo: 'string', grupo: 'Domicilio' },
      dom_prov:     { label: 'Provincia', tipo: 'string', grupo: 'Domicilio' },
      domicilio_completo: { label: 'Domicilio (compuesto)', tipo: 'string', grupo: 'Domicilio', derivado: true },

      // ── BANCO ──
      cbu:           { label: 'CBU principal', tipo: 'string', grupo: 'Banco' },
      cant_cbus:     { label: 'Cantidad CBUs vigentes', tipo: 'number', grupo: 'Banco', derivado: true },

      // ── FAMILIARES ──
      cant_familiares:    { label: 'Cantidad familiares vigentes', tipo: 'number', grupo: 'Familiares', derivado: true },
      cant_hijos:         { label: 'Cantidad hijos vigentes', tipo: 'number', grupo: 'Familiares', derivado: true },
      cant_hijos_menores: { label: 'Hijos menores de edad', tipo: 'number', grupo: 'Familiares', derivado: true },
      tiene_conyuge:      { label: 'Tiene cónyuge', tipo: 'bool', grupo: 'Familiares', derivado: true }
    },
    async getRows(){
      const nomina = (typeof getNomina === 'function') ? getNomina() : [];
      const hoy = new Date();
      return nomina.map(e => {
        const ingDate = _repParseFecha(e.ing);
        const egrDate = _repParseFecha(e.egreso);
        const fnacDate = _repParseFecha(e.fecha_nac || e.fnac);
        // Antigüedad
        const antigDias = ingDate ? Math.floor((hoy - ingDate) / 86400000) : 0;
        const antigAnios = antigDias > 0 ? Math.floor(antigDias / 365.25) : 0;
        const antigMeses = ingDate ? Math.max(0, (hoy.getFullYear() - ingDate.getFullYear()) * 12 + (hoy.getMonth() - ingDate.getMonth())) : 0;
        const edad = fnacDate ? Math.floor((hoy - fnacDate) / (365.25 * 86400000)) : null;

        // Familiares
        let cantFam = 0, cantHijos = 0, cantHijosMen = 0, tieneConyuge = false;
        if(typeof getFamiliaresVigentes === 'function'){
          try {
            const fams = getFamiliaresVigentes(e.leg) || [];
            cantFam = fams.length;
            const hijos = fams.filter(f => /hijo/i.test(f.parentesco || ''));
            cantHijos = hijos.length;
            cantHijosMen = hijos.filter(h => {
              const fnac = _repParseFecha(h.fechaNac || h.fecha_nac);
              if(!fnac) return false;
              const ed = Math.floor((hoy - fnac) / (365.25 * 86400000));
              return ed < 18;
            }).length;
            tieneConyuge = fams.some(f => /c[oó]nyuge|esposa?|c[oó]nyug/i.test(f.parentesco || ''));
          } catch(_){}
        }

        // CBUs
        let cantCBUs = 0;
        if(typeof getCBUsActivos === 'function'){
          try { cantCBUs = (getCBUsActivos(e.leg) || []).length; } catch(_){}
        }

        // Sindicato nombre
        let nomSind = '';
        if(typeof getNombreSindicato === 'function'){
          try { nomSind = getNombreSindicato(e) || ''; } catch(_){}
        }

        // Escala unificada — busca por categoría + tramo si existe la función
        let remEscala = 0;
        if(typeof getMontoEscala === 'function'){
          try { remEscala = getMontoEscala(e.cat, e.tramo) || 0; } catch(_){}
        }
        const sueldoNominal = $m_safe(e.sueldo) || $m_safe(e.basico) || $m_safe(e.bruto);
        const difEscala = sueldoNominal - remEscala;
        const difEscalaPct = remEscala > 0 ? +(difEscala / remEscala * 100).toFixed(2) : 0;

        // % antigüedad aplicado al empleado
        let pctAntig = 0;
        if(typeof getPctAntiguedadPorAnio === 'function'){
          try { pctAntig = getPctAntiguedadPorAnio(e) || 0; } catch(_){}
        }

        // Override del ABM (si tiene sueldo_basico cargado por RRHH)
        let sueldoBasicoABM = 0;
        try {
          const ov = JSON.parse(localStorage.getItem('lsg_abm_overrides') || '{}');
          sueldoBasicoABM = $m_safe(ov[e.leg]?.sueldo_basico) || 0;
        } catch(_){}

        return {
          ...e,
          // Antigüedad calculada
          antig_anios: antigAnios,
          antig_meses: antigMeses,
          antig_dias: antigDias,
          edad,
          es_baja: !!(e.egreso || e._deBaja),

          // Sueldo
          sueldo_basico: sueldoBasicoABM,
          rem_escala_unif: remEscala,
          diferencia_escala: difEscala,
          diferencia_escala_pct: difEscalaPct,
          pct_antiguedad: pctAntig,

          // Familiares y CBUs
          cant_familiares: cantFam,
          cant_hijos: cantHijos,
          cant_hijos_menores: cantHijosMen,
          tiene_conyuge: tieneConyuge,
          cant_cbus: cantCBUs,

          // Otros
          domicilio_completo: [e.dom_calle, e.dom_nro, e.dom_piso, e.dom_depto].filter(Boolean).join(' '),
          nombre_sindicato: nomSind
        };
      });
    }
  },

  nomina_categorias: {
    label: 'Nómina por categoría',
    icon: '📊',
    color: 'rgb(34,197,94)',
    desc: 'Sueldos básicos, escala salarial, categoría/CCT por empleado.',
    campos: {
      leg:           { label: 'Legajo', tipo: 'string' },
      nom:           { label: 'Apellido y Nombre', tipo: 'string' },
      emp:           { label: 'Empresa', tipo: 'string' },
      area:          { label: 'Área', tipo: 'string' },
      cat:           { label: 'Categoría', tipo: 'string' },
      desc_categoria:{ label: 'Descripción categoría', tipo: 'string' },
      sueldo_basico: { label: 'Sueldo Básico ($)', tipo: 'currency' },
      escala_basico: { label: 'Sueldo según escala ($)', tipo: 'currency', derivado: true },
      diferencia:    { label: 'Diferencia ($)', tipo: 'currency', derivado: true },
      antig_anios:   { label: 'Antigüedad (años)', tipo: 'number', derivado: true },
      pct_antig:     { label: '% Antigüedad', tipo: 'number', derivado: true },
      ing:           { label: 'Fecha Ingreso', tipo: 'date' },
      cod_sindicato: { label: 'Sindicato', tipo: 'string' }
    },
    async getRows(){
      const nomina = (typeof getNomina === 'function') ? getNomina() : [];
      const hoy = new Date();
      return nomina.filter(e => !e.egreso).map(e => {
        const ingDate = _repParseFecha(e.ing);
        const antigAnios = ingDate ? Math.floor((hoy - ingDate) / (365.25 * 86400000)) : 0;
        let escalaBasico = 0, pctAntig = 0;
        if(typeof getEscalaSalarialPara === 'function'){
          try { escalaBasico = getEscalaSalarialPara(e.cat) || 0; } catch(_){}
        }
        if(typeof getPctAntigPorAnio === 'function'){
          try { pctAntig = getPctAntigPorAnio(e); } catch(_){}
        }
        return {
          ...e,
          escala_basico: escalaBasico,
          diferencia: ($m_safe(e.sueldo_basico) - escalaBasico),
          antig_anios: antigAnios,
          pct_antig: pctAntig
        };
      });
    }
  },

  liquidaciones: {
    label: 'Liquidaciones',
    icon: '💼',
    color: 'rgb(168,85,247)',
    desc: 'Items de liquidación: haberes, descuentos, contribuciones, totales.',
    campos: {
      periodo:        { label: 'Período', tipo: 'string' },
      tipo:           { label: 'Tipo (mensual/quincenal/SAC)', tipo: 'string' },
      estado:         { label: 'Estado liq.', tipo: 'string' },
      leg:            { label: 'Legajo', tipo: 'string' },
      nom:            { label: 'Apellido y Nombre', tipo: 'string' },
      empresa:        { label: 'Empresa', tipo: 'string' },
      diasTrab:       { label: 'Días trabajados', tipo: 'number' },
      sueldoBasico:   { label: 'Sueldo Básico ($)', tipo: 'currency' },
      mAntig:         { label: 'Antigüedad ($)', tipo: 'currency' },
      mPres:          { label: 'Presentismo ($)', tipo: 'currency' },
      mHsE50:         { label: 'Hs Extras 50% ($)', tipo: 'currency' },
      mHsE100:        { label: 'Hs Extras 100% ($)', tipo: 'currency' },
      mSac:           { label: 'SAC ($)', tipo: 'currency' },
      mVac:           { label: 'Vacaciones ($)', tipo: 'currency' },
      totalHaberesRem:{ label: 'Total Remunerativo ($)', tipo: 'currency' },
      totalExentos:   { label: 'Total No Remunerativo ($)', tipo: 'currency' },
      totalHaberes:   { label: 'Total Haberes ($)', tipo: 'currency' },
      jubilacion:     { label: 'Aporte Jubilatorio ($)', tipo: 'currency' },
      obraSocial:     { label: 'Aporte OS ($)', tipo: 'currency' },
      anssal:         { label: 'ANSSAL ($)', tipo: 'currency' },
      pamiEmp:        { label: 'Aporte PAMI emp ($)', tipo: 'currency' },
      sindicato:      { label: 'Cuota sindical ($)', tipo: 'currency' },
      ganancias:      { label: 'Ret. Ganancias ($)', tipo: 'currency' },
      embargo:        { label: 'Embargo ($)', tipo: 'currency' },
      anticiposDesc:  { label: 'Desc. anticipos ($)', tipo: 'currency' },
      totalDescuentos:{ label: 'Total descuentos ($)', tipo: 'currency' },
      netoAPagar:     { label: 'Neto a pagar ($)', tipo: 'currency' },
      jubPatronal:    { label: 'Contrib. Jubilación ($)', tipo: 'currency' },
      osPatronal:     { label: 'Contrib. OS ($)', tipo: 'currency' },
      pamiPatronal:   { label: 'Contrib. PAMI ($)', tipo: 'currency' },
      desempleo:      { label: 'Fondo Desempleo ($)', tipo: 'currency' },
      art:            { label: 'ART ($)', tipo: 'currency' },
      sindPatronal:   { label: 'Contrib. Sind. Pat. ($)', tipo: 'currency' },
      mFCL:           { label: 'FCL UOCRA ($)', tipo: 'currency' },
      mIeric:         { label: 'IERIC ($)', tipo: 'currency' },
      totalContrib:   { label: 'Total Contribuciones ($)', tipo: 'currency' },
      totalCosto:     { label: 'Costo Empresa Total ($)', tipo: 'currency' }
    },
    async getRows(){
      const liqs = (typeof getLiquidaciones === 'function') ? await getLiquidaciones() : [];
      const filas = [];
      liqs.forEach(liq => {
        (liq.items || []).forEach(i => {
          filas.push({
            periodo: liq.periodo,
            tipo: liq.tipo,
            estado: liq.estado,
            ...i
          });
        });
      });
      return filas;
    }
  },

  licencias: {
    label: 'Licencias',
    icon: '🏖️',
    color: 'rgb(94,194,255)',
    desc: 'Vacaciones, licencias especiales LCT y por enfermedad / maternidad.',
    campos: {
      tipo_origen:  { label: 'Origen (anual/especial/médica)', tipo: 'string', derivado: true },
      leg:          { label: 'Legajo', tipo: 'string' },
      nom:          { label: 'Apellido y Nombre', tipo: 'string', derivado: true },
      empresa:      { label: 'Empresa', tipo: 'string', derivado: true },
      area:         { label: 'Área', tipo: 'string', derivado: true },
      tipo:         { label: 'Tipo de licencia', tipo: 'string' },
      desde:        { label: 'Desde', tipo: 'date' },
      hasta:        { label: 'Hasta', tipo: 'date' },
      dias:         { label: 'Días', tipo: 'number' },
      estado:       { label: 'Estado', tipo: 'string' },
      motivo:       { label: 'Motivo / observaciones', tipo: 'string' },
      solicitado_el:{ label: 'Solicitado el', tipo: 'date' },
      aprobado_por: { label: 'Aprobado por', tipo: 'string' }
    },
    async getRows(){
      const filas = [];
      const nomina = (typeof getNomina === 'function') ? getNomina() : [];
      const enrich = (l, origen) => {
        const e = nomina.find(x => x.leg === l.leg);
        return {
          ...l,
          tipo_origen: origen,
          nom: e?.nom || l.nom || '',
          empresa: e?.emp || l.empresa || '',
          area: e?.area || l.area || ''
        };
      };
      if(typeof getLicAnuales === 'function'){
        try { (await getLicAnuales() || []).forEach(l => filas.push(enrich(l, 'anual'))); } catch(_){}
      }
      if(typeof getLicenciasEspeciales === 'function'){
        try { (await getLicenciasEspeciales() || []).forEach(l => filas.push(enrich(l, 'especial'))); } catch(_){}
      }
      if(typeof getLicencias === 'function'){
        try { (await getLicencias() || []).forEach(l => filas.push(enrich(l, 'médica'))); } catch(_){}
      }
      return filas;
    }
  },

  sanciones: {
    label: 'Sanciones disciplinarias',
    icon: '⚖️',
    color: 'rgb(239,68,68)',
    desc: 'Sanciones aplicadas: llamados de atención, suspensiones, despidos.',
    campos: {
      id:           { label: 'ID', tipo: 'number' },
      leg:          { label: 'Legajo', tipo: 'string' },
      nom:          { label: 'Apellido y Nombre', tipo: 'string' },
      empresa:      { label: 'Empresa', tipo: 'string', derivado: true },
      tipo:         { label: 'Tipo (llamado/suspensión/despido)', tipo: 'string' },
      dias:         { label: 'Días suspensión', tipo: 'number' },
      fecha:        { label: 'Fecha aplicación', tipo: 'date' },
      desde:        { label: 'Desde', tipo: 'date' },
      hasta:        { label: 'Hasta', tipo: 'date' },
      motivo:       { label: 'Motivo / hechos', tipo: 'string' },
      aplicada_por: { label: 'Aplicada por', tipo: 'string' },
      estado:       { label: 'Estado', tipo: 'string' }
    },
    async getRows(){
      const sanc = (typeof getSanciones === 'function') ? getSanciones() : [];
      const nomina = (typeof getNomina === 'function') ? getNomina() : [];
      return sanc.map(s => {
        const e = nomina.find(x => x.leg === s.leg);
        return { ...s, empresa: e?.emp || '' };
      });
    }
  },

  anticipos: {
    label: 'Anticipos',
    icon: '💵',
    color: 'rgb(234,179,8)',
    desc: 'Solicitudes de anticipo: pendientes, aprobadas, rechazadas.',
    campos: {
      id:            { label: 'ID', tipo: 'number' },
      leg:           { label: 'Legajo', tipo: 'string' },
      nom:           { label: 'Apellido y Nombre', tipo: 'string' },
      empresa:       { label: 'Empresa', tipo: 'string', derivado: true },
      monto:         { label: 'Monto solicitado ($)', tipo: 'currency' },
      monto_aprobado:{ label: 'Monto aprobado ($)', tipo: 'currency' },
      cuotas:        { label: 'Cuotas', tipo: 'number' },
      motivo:        { label: 'Motivo', tipo: 'string' },
      estado:        { label: 'Estado', tipo: 'string' },
      fecha:         { label: 'Fecha solicitud', tipo: 'date' },
      aprobado_el:   { label: 'Aprobado el', tipo: 'date' },
      aprobado_por:  { label: 'Aprobado por', tipo: 'string' }
    },
    async getRows(){
      const sols = (typeof solicitudes !== 'undefined' && Array.isArray(solicitudes)) ? solicitudes : [];
      const nomina = (typeof getNomina === 'function') ? getNomina() : [];
      return sols.map(s => {
        const e = nomina.find(x => x.leg === s.leg);
        return { ...s, empresa: e?.emp || s.empresa || '' };
      });
    }
  },

  auditoria: {
    label: 'Auditoría del sistema',
    icon: '🔍',
    color: 'rgb(168,85,247)',
    desc: 'Eventos de auditoría: cambios, aprobaciones, accesos sensibles.',
    campos: {
      ts:         { label: 'Timestamp', tipo: 'date' },
      fecha:      { label: 'Fecha', tipo: 'string' },
      hora:       { label: 'Hora', tipo: 'string' },
      category:   { label: 'Categoría', tipo: 'string' },
      action:     { label: 'Acción', tipo: 'string' },
      by_nom:     { label: 'Ejecutó', tipo: 'string' },
      target_nom: { label: 'Sobre', tipo: 'string' },
      detail:     { label: 'Detalle', tipo: 'string', derivado: true }
    },
    async getRows(){
      const log = (typeof getAuditLog === 'function') ? getAuditLog() : [];
      return log.map(r => ({
        ...r,
        detail: r.detail ? (typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail).slice(0, 300)) : ''
      }));
    }
  }
};

// ─── HELPERS ───────────────────────────────────────────────────────────
function $m_safe(v){ return Number(v) || 0; }
function _repParseFecha(s){
  if(!s) return null;
  if(s instanceof Date) return s;
  let partes;
  if(String(s).includes('-')) partes = String(s).split('-');
  else if(String(s).includes('/')) partes = String(s).split('/').reverse();
  else return null;
  const y = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  const d = parseInt(partes[2] || '1', 10);
  if(isNaN(y) || isNaN(m)) return null;
  return new Date(y, m - 1, d);
}

function _repFmtCell(val, tipo){
  if(val == null || val === '') return '';
  if(tipo === 'currency'){
    const n = Number(val);
    if(isNaN(n)) return val;
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if(tipo === 'date'){
    if(val instanceof Date) return val.toLocaleDateString('es-AR');
    return String(val);
  }
  if(tipo === 'bool') return val ? 'Sí' : 'No';
  if(tipo === 'number'){
    const n = Number(val);
    return isNaN(n) ? val : n.toString();
  }
  return String(val);
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DEL WIZARD
// ═══════════════════════════════════════════════════════════════════════════
let _repEstado = {
  paso: 1,                  // 1=categoría, 2=campos, 3=filtros+preview
  datasetKey: null,
  campos: [],               // campos seleccionados
  filtros: [],              // [{campo, op, valor}]
  ordenPor: null,
  ordenDir: 'asc',
  filas: [],                // filas calculadas (post-filtros)
  filasOriginales: []       // filas brutas del dataset
};

// ═══════════════════════════════════════════════════════════════════════════
// PUNTO DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════
function abrirGeneradorReportes(){
  if(currentUser?.role !== 'rrhh' && !(typeof _ccEsAdmin === 'function' && _ccEsAdmin())){
    toast('⚠ Solo RR.HH. y Admin','var(--red)'); return;
  }
  _repEstado = { paso: 1, datasetKey: null, campos: [], filtros: [], ordenPor: null, ordenDir: 'asc', filas: [], filasOriginales: [] };
  _repRender();
}

function _repRender(){
  const cont = document.getElementById('panel-generador-reportes');
  if(!cont) return;
  if(_repEstado.paso === 1) _repRenderPaso1();
  else if(_repEstado.paso === 2) _repRenderPaso2();
  else if(_repEstado.paso === 3) _repRenderPaso3();
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 1 — Selección de categoría
// ═══════════════════════════════════════════════════════════════════════════
function _repRenderPaso1(){
  const cont = document.getElementById('panel-generador-reportes');
  if(!cont) return;

  const cards = Object.entries(REPORTES_DATASETS).map(([key, ds]) => `
    <div class="card" onclick="_repSeleccionarDataset('${key}')" style="cursor:pointer;padding:16px;background:var(--bg2);border:1px solid var(--border);transition:all .15s;display:flex;gap:12px;align-items:flex-start" onmouseover="this.style.borderColor='${ds.color}';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
      <div style="font-size:28px;flex-shrink:0">${ds.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px">${ds.label}</div>
        <div style="font-size:11px;color:var(--t3);line-height:1.4">${ds.desc}</div>
        <div style="font-size:10px;color:${ds.color};margin-top:6px;font-family:var(--font-mono)">${Object.keys(ds.campos).length} campos disponibles →</div>
      </div>
    </div>
  `).join('');

  // Reportes guardados
  const guardados = _repGetGuardados();
  const guardadosHtml = guardados.length ? `
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">📌 Reportes guardados (${guardados.length})</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">
        ${guardados.map((r, i) => {
          const ds = REPORTES_DATASETS[r.datasetKey];
          return `
            <div class="card" style="padding:10px 12px;background:var(--bg2);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div onclick="_repCargarGuardado(${i})" style="cursor:pointer;flex:1;min-width:0">
                <div style="font-size:11px;font-weight:600;color:var(--t1);truncate">${(r.nombre||'(sin nombre)').replace(/</g,'&lt;')}</div>
                <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${ds?.icon || '?'} ${ds?.label || r.datasetKey} · ${r.campos?.length || 0} campos</div>
              </div>
              <button onclick="event.stopPropagation();_repBorrarGuardado(${i})" style="background:none;border:none;color:var(--red);font-size:13px;cursor:pointer;padding:2px 6px" title="Borrar">🗑</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  cont.innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:14px;font-weight:600;color:var(--t1)">📈 Generador de Reportes</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">Wizard guiado — paso 1 de 3</div>
    </div>

    ${guardadosHtml}

    <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">1. Elegí la categoría de datos</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
      ${cards}
    </div>
  `;
}

function _repSeleccionarDataset(key){
  _repEstado.datasetKey = key;
  // Por defecto, seleccionar los primeros 6 campos (suelen ser los más relevantes)
  const ds = REPORTES_DATASETS[key];
  _repEstado.campos = Object.keys(ds.campos).slice(0, 6);
  _repEstado.paso = 2;
  _repRender();
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 2 — Selección de campos
// ═══════════════════════════════════════════════════════════════════════════
function _repRenderPaso2(){
  const cont = document.getElementById('panel-generador-reportes');
  if(!cont) return;
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  if(!ds) return;

  // Agrupar campos por su propiedad `grupo` (si la tienen)
  const grupos = {};
  Object.entries(ds.campos).forEach(([key, c]) => {
    const g = c.grupo || 'Otros campos';
    if(!grupos[g]) grupos[g] = [];
    grupos[g].push({ key, ...c });
  });

  const renderCampo = (key, c) => {
    const checked = _repEstado.campos.includes(key);
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border:1px solid var(--border);border-radius:4px;background:${checked?'rgba(61,127,255,.05)':'var(--bg2)'};font-size:11px;color:var(--t1)" onclick="_repToggleCampo('${key}')">
        <input type="checkbox" ${checked?'checked':''} style="cursor:pointer;accent-color:var(--accent);pointer-events:none">
        <div style="flex:1;min-width:0">
          <div style="font-weight:500">${c.label}</div>
          <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono)">${key} · ${c.tipo}${c.derivado?' (calc.)':''}</div>
        </div>
      </label>
    `;
  };

  const gruposHtml = Object.entries(grupos).map(([nombre, campos]) => {
    const seleccionadosGrupo = campos.filter(c => _repEstado.campos.includes(c.key)).length;
    return `
      <details ${seleccionadosGrupo > 0 ? 'open' : ''} style="margin-bottom:10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px">
        <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.05em">
          <span>${nombre} <span style="color:var(--t3);font-weight:400">(${campos.length} campo${campos.length!==1?'s':''})</span></span>
          <span style="display:flex;gap:6px;align-items:center">
            ${seleccionadosGrupo > 0 ? `<span style="font-size:10px;padding:1px 7px;border-radius:8px;background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.3)">${seleccionadosGrupo} ✓</span>` : ''}
            <button onclick="event.preventDefault();event.stopPropagation();_repSeleccionarGrupo('${nombre.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--t3);font-size:9px;cursor:pointer;padding:2px 6px" title="Seleccionar todos del grupo">+ todos</button>
            <button onclick="event.preventDefault();event.stopPropagation();_repDeseleccionarGrupo('${nombre.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--t3);font-size:9px;cursor:pointer;padding:2px 6px" title="Deseleccionar todos del grupo">− todos</button>
          </span>
        </summary>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin-top:10px">
          ${campos.map(c => renderCampo(c.key, c)).join('')}
        </div>
      </details>
    `;
  }).join('');

  cont.innerHTML = `
    <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${ds.icon} ${ds.label}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Wizard — paso 2 de 3 · Elegí qué columnas incluir</div>
      </div>
      <button class="btn btn-ghost" onclick="_repIrPaso(1)" style="font-size:12px;padding:6px 12px">← Cambiar categoría</button>
    </div>

    <div style="margin-bottom:14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-ghost" onclick="_repSeleccionarTodos()" style="font-size:11px;padding:5px 10px;color:var(--green);border-color:rgba(34,197,94,.3)">✓ Seleccionar todos</button>
      <button class="btn btn-ghost" onclick="_repDeseleccionarTodos()" style="font-size:11px;padding:5px 10px;color:var(--t3)">Deseleccionar todos</button>
      <input type="text" id="rep-buscar-campo" placeholder="🔍 Buscar campo..." oninput="_repFiltrarCampos(this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 10px;color:var(--t1);font-size:11px;outline:none;flex:1;min-width:160px">
      <span style="font-size:11px;color:var(--t2);align-self:center">
        <strong id="rep-count-campos">${_repEstado.campos.length}</strong> de ${Object.keys(ds.campos).length} campos
      </span>
    </div>

    <div id="rep-campos-grupos" style="max-height:520px;overflow-y:auto;padding-right:6px">
      ${gruposHtml}
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" onclick="_repIrPaso(1)" style="font-size:13px;padding:8px 14px">Atrás</button>
      <button class="btn btn-primary" onclick="_repIrPaso(3)" style="font-size:13px;padding:8px 18px" ${_repEstado.campos.length === 0 ? 'disabled' : ''}>Siguiente: filtros →</button>
    </div>
  `;
}

function _repSeleccionarGrupo(nombreGrupo){
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  Object.entries(ds.campos).forEach(([key, c]) => {
    const g = c.grupo || 'Otros campos';
    if(g === nombreGrupo && !_repEstado.campos.includes(key)){
      _repEstado.campos.push(key);
    }
  });
  _repRender();
}

function _repDeseleccionarGrupo(nombreGrupo){
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  _repEstado.campos = _repEstado.campos.filter(key => {
    const c = ds.campos[key];
    const g = c?.grupo || 'Otros campos';
    return g !== nombreGrupo;
  });
  _repRender();
}

function _repFiltrarCampos(q){
  const cont = document.getElementById('rep-campos-grupos');
  if(!cont) return;
  const query = q.toLowerCase().trim();
  cont.querySelectorAll('label[onclick*="_repToggleCampo"]').forEach(lbl => {
    const txt = lbl.textContent.toLowerCase();
    lbl.style.display = !query || txt.includes(query) ? 'flex' : 'none';
  });
  // Mostrar todos los grupos abiertos para que se vean los matches
  if(query){
    cont.querySelectorAll('details').forEach(d => d.open = true);
  }
}

function _repToggleCampo(key){
  const i = _repEstado.campos.indexOf(key);
  if(i >= 0) _repEstado.campos.splice(i, 1);
  else _repEstado.campos.push(key);
  _repRender();
}

function _repSeleccionarTodos(){
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  _repEstado.campos = Object.keys(ds.campos);
  _repRender();
}

function _repDeseleccionarTodos(){
  _repEstado.campos = [];
  _repRender();
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 3 — Filtros + ordenamiento + previsualización
// ═══════════════════════════════════════════════════════════════════════════
async function _repRenderPaso3(){
  const cont = document.getElementById('panel-generador-reportes');
  if(!cont) return;
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  if(!ds) return;

  // Cargar filas si no están
  if(!_repEstado.filasOriginales.length){
    cont.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3)">⏳ Cargando datos...</div>';
    try {
      _repEstado.filasOriginales = await ds.getRows();
    } catch(err){
      cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red)">✕ Error: ${err.message}</div>`;
      return;
    }
  }

  // Aplicar filtros + orden
  _repAplicarFiltros();

  const camposActivos = _repEstado.campos.map(k => ({ key: k, ...ds.campos[k] }));

  // Filtros UI
  const opsPorTipo = {
    string: ['contiene','=','≠','vacío','no vacío'],
    number: ['=','≠','>','<','>=','<=','vacío','no vacío'],
    currency: ['=','≠','>','<','>=','<='],
    date: ['=','>','<','>=','<=','vacío','no vacío'],
    bool: ['= sí','= no']
  };

  const filtrosHtml = _repEstado.filtros.map((f, i) => {
    const c = ds.campos[f.campo];
    const tipo = c?.tipo || 'string';
    const ops = opsPorTipo[tipo] || ['contiene','=','≠'];
    return `
      <div style="display:grid;grid-template-columns:1.4fr .8fr 1.4fr auto;gap:6px;align-items:center;margin-bottom:6px">
        <select onchange="_repFiltroSetCampo(${i}, this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:11px;outline:none">
          ${Object.entries(ds.campos).map(([k, cc]) => `<option value="${k}" ${k===f.campo?'selected':''}>${cc.label}</option>`).join('')}
        </select>
        <select onchange="_repFiltroSetOp(${i}, this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:11px;outline:none">
          ${ops.map(o => `<option value="${o}" ${o===f.op?'selected':''}>${o}</option>`).join('')}
        </select>
        <input type="text" oninput="_repFiltroSetValor(${i}, this.value)" value="${(f.valor||'').replace(/"/g,'&quot;')}" placeholder="${tipo==='date'?'YYYY-MM-DD':'valor'}" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:11px;outline:none">
        <button onclick="_repFiltroBorrar(${i})" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--red);font-size:11px;cursor:pointer;padding:5px 8px">✕</button>
      </div>
    `;
  }).join('');

  // Tabla de previsualización
  const filasPreview = _repEstado.filas.slice(0, 100);
  const tablaHtml = filasPreview.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
        <tr>
          ${camposActivos.map(c => `
            <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:${c.tipo==='currency'||c.tipo==='number'?'right':'left'};text-transform:uppercase;letter-spacing:.05em;cursor:pointer;white-space:nowrap" onclick="_repOrdenar('${c.key}')">
              ${c.label} ${_repEstado.ordenPor === c.key ? (_repEstado.ordenDir === 'asc' ? '↑' : '↓') : ''}
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${filasPreview.map(f => `
          <tr style="border-bottom:1px solid var(--border)">
            ${camposActivos.map(c => `<td style="padding:5px 8px;color:var(--t1);text-align:${c.tipo==='currency'||c.tipo==='number'?'right':'left'};white-space:nowrap;${c.tipo==='currency'?'font-family:var(--font-mono)':''}">${_repFmtCell(f[c.key], c.tipo).replace(/</g,'&lt;')}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<div style="padding:30px;text-align:center;color:var(--t3);font-style:italic">No hay filas que coincidan con los filtros</div>';

  cont.innerHTML = `
    <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${ds.icon} ${ds.label}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Wizard — paso 3 de 3 · Filtros y previsualización</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="_repIrPaso(2)" style="font-size:12px;padding:6px 12px">← Cambiar campos</button>
        <button class="btn btn-ghost" onclick="_repGuardarReporte()" style="font-size:12px;padding:6px 12px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📌 Guardar como plantilla</button>
      </div>
    </div>

    <!-- FILTROS -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Filtros (${_repEstado.filtros.length})</div>
        <button class="btn btn-ghost" onclick="_repFiltroAgregar()" style="font-size:11px;padding:4px 10px;color:var(--green);border-color:rgba(34,197,94,.3)">+ Sumar filtro</button>
      </div>
      ${filtrosHtml || '<div style="font-size:11px;color:var(--t3);font-style:italic">Sin filtros — se exporta el dataset completo</div>'}
    </div>

    <!-- RESULTADO -->
    <div style="background:linear-gradient(135deg,rgba(34,197,94,.05),rgba(94,194,255,.03));border:1px solid rgba(34,197,94,.2);border-radius:var(--r);padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--green);text-transform:uppercase;letter-spacing:.05em">Resultado</div>
        <div style="font-size:13px;color:var(--t1);font-weight:600">
          ${_repEstado.filas.length.toLocaleString('es-AR')} fila${_repEstado.filas.length !== 1 ? 's' : ''}
          <span style="color:var(--t3);font-weight:400;font-size:11px">de ${_repEstado.filasOriginales.length.toLocaleString('es-AR')} totales</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="_repExportar('csv')" style="font-size:12px;padding:7px 12px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📄 CSV</button>
        <button class="btn btn-ghost" onclick="_repExportar('xlsx')" style="font-size:12px;padding:7px 12px;color:var(--green);border-color:rgba(34,197,94,.3)">📊 Excel</button>
        <button class="btn btn-primary" onclick="_repExportar('pdf')" style="font-size:12px;padding:7px 12px">📑 PDF</button>
      </div>
    </div>

    <!-- TABLA -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:auto;max-height:520px">
      ${tablaHtml}
    </div>
    ${_repEstado.filas.length > 100 ? `<div style="font-size:10px;color:var(--t3);text-align:center;margin-top:6px;font-style:italic">Mostrando primeras 100 filas. El export incluye las ${_repEstado.filas.length.toLocaleString('es-AR')} filas filtradas.</div>` : ''}
  `;
}

function _repIrPaso(p){
  if(p === 3 && _repEstado.paso !== 3){
    // Refrescar filas al entrar a paso 3
    _repEstado.filasOriginales = [];
  }
  _repEstado.paso = p;
  _repRender();
}

function _repFiltroAgregar(){
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  const primerCampo = Object.keys(ds.campos)[0];
  _repEstado.filtros.push({ campo: primerCampo, op: 'contiene', valor: '' });
  _repRender();
}

function _repFiltroSetCampo(i, c){ if(_repEstado.filtros[i]){ _repEstado.filtros[i].campo = c; _repRender(); } }
function _repFiltroSetOp(i, op){ if(_repEstado.filtros[i]){ _repEstado.filtros[i].op = op; _repRender(); } }
function _repFiltroSetValor(i, v){ if(_repEstado.filtros[i]){ _repEstado.filtros[i].valor = v; _repAplicarFiltros(); _repActualizarConteo(); } }
function _repFiltroBorrar(i){ _repEstado.filtros.splice(i, 1); _repRender(); }

function _repActualizarConteo(){
  // Actualización rápida sin re-render completo
  _repRender();
}

function _repOrdenar(campo){
  if(_repEstado.ordenPor === campo){
    _repEstado.ordenDir = _repEstado.ordenDir === 'asc' ? 'desc' : 'asc';
  } else {
    _repEstado.ordenPor = campo;
    _repEstado.ordenDir = 'asc';
  }
  _repAplicarFiltros();
  _repRender();
}

function _repAplicarFiltros(){
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  if(!ds) return;
  let filas = [..._repEstado.filasOriginales];

  _repEstado.filtros.forEach(f => {
    if(!f.campo) return;
    const c = ds.campos[f.campo];
    const tipo = c?.tipo || 'string';
    const op = f.op;
    const val = f.valor;

    filas = filas.filter(row => {
      const v = row[f.campo];
      if(op === 'vacío')      return v == null || v === '';
      if(op === 'no vacío')   return !(v == null || v === '');
      if(op === '= sí')       return !!v;
      if(op === '= no')       return !v;
      if(val == null || val === '') return true;  // sin valor: no filtra
      if(tipo === 'number' || tipo === 'currency'){
        const nv = Number(v), nval = Number(val);
        if(isNaN(nval)) return true;
        if(op === '=')  return nv === nval;
        if(op === '≠')  return nv !== nval;
        if(op === '>')  return nv > nval;
        if(op === '<')  return nv < nval;
        if(op === '>=') return nv >= nval;
        if(op === '<=') return nv <= nval;
      }
      if(tipo === 'date'){
        const dv = _repParseFecha(v);
        const dval = _repParseFecha(val);
        if(!dv || !dval) return true;
        if(op === '=')  return dv.getTime() === dval.getTime();
        if(op === '>')  return dv > dval;
        if(op === '<')  return dv < dval;
        if(op === '>=') return dv >= dval;
        if(op === '<=') return dv <= dval;
      }
      // string
      const sv = String(v ?? '').toLowerCase();
      const sval = String(val).toLowerCase();
      if(op === 'contiene') return sv.includes(sval);
      if(op === '=')        return sv === sval;
      if(op === '≠')        return sv !== sval;
      return true;
    });
  });

  // Ordenamiento
  if(_repEstado.ordenPor){
    const c = ds.campos[_repEstado.ordenPor];
    const tipo = c?.tipo || 'string';
    const dir = _repEstado.ordenDir === 'asc' ? 1 : -1;
    filas.sort((a, b) => {
      const va = a[_repEstado.ordenPor], vb = b[_repEstado.ordenPor];
      if(va == null && vb == null) return 0;
      if(va == null) return 1;
      if(vb == null) return -1;
      if(tipo === 'number' || tipo === 'currency'){
        return (Number(va) - Number(vb)) * dir;
      }
      if(tipo === 'date'){
        const da = _repParseFecha(va), db = _repParseFecha(vb);
        if(!da && !db) return 0; if(!da) return 1; if(!db) return -1;
        return (da - db) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  _repEstado.filas = filas;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA DE REPORTES GUARDADOS
// ═══════════════════════════════════════════════════════════════════════════
const _REP_LS = 'lsg_reportes_guardados';

function _repGetGuardados(){
  try { return JSON.parse(localStorage.getItem(_REP_LS) || '[]'); }
  catch(_){ return []; }
}

function _repSaveGuardados(arr){
  localStorage.setItem(_REP_LS, JSON.stringify(arr));
}

function _repGuardarReporte(){
  const nombre = prompt('Nombre del reporte:');
  if(!nombre) return;
  const guardados = _repGetGuardados();
  guardados.push({
    nombre,
    datasetKey: _repEstado.datasetKey,
    campos: [..._repEstado.campos],
    filtros: [..._repEstado.filtros],
    ordenPor: _repEstado.ordenPor,
    ordenDir: _repEstado.ordenDir,
    creadoEl: new Date().toISOString(),
    creadoPor: currentUser?.emp?.nom || ''
  });
  _repSaveGuardados(guardados);
  toast(`✓ Reporte "${nombre}" guardado`, 'var(--green)');
}

function _repCargarGuardado(idx){
  const guardados = _repGetGuardados();
  const r = guardados[idx];
  if(!r) return;
  _repEstado = {
    paso: 3,
    datasetKey: r.datasetKey,
    campos: [...r.campos],
    filtros: [...r.filtros],
    ordenPor: r.ordenPor || null,
    ordenDir: r.ordenDir || 'asc',
    filas: [],
    filasOriginales: []
  };
  _repRender();
}

function _repBorrarGuardado(idx){
  const guardados = _repGetGuardados();
  if(!guardados[idx]) return;
  if(!confirm(`¿Borrar el reporte "${guardados[idx].nombre}"?`)) return;
  guardados.splice(idx, 1);
  _repSaveGuardados(guardados);
  _repRender();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR — CSV / Excel / PDF
// ═══════════════════════════════════════════════════════════════════════════
async function _repExportar(formato){
  if(!_repEstado.filas.length){ toast('⚠ Sin filas para exportar','var(--yellow)'); return; }
  const ds = REPORTES_DATASETS[_repEstado.datasetKey];
  const campos = _repEstado.campos.map(k => ({ key: k, ...ds.campos[k] }));

  const ahora = new Date();
  const fechaStr = ahora.toISOString().slice(0, 10);
  const fname = `reporte_${_repEstado.datasetKey}_${fechaStr}`;

  if(formato === 'csv'){
    _repExportCSV(campos, fname);
  } else if(formato === 'xlsx'){
    _repExportXLSX(campos, fname, ds);
  } else if(formato === 'pdf'){
    await _repExportPDF(campos, fname, ds);
  }

  if(typeof logAuditX === 'function'){
    logAuditX('reportes', 'export_'+formato, {
      dataset: _repEstado.datasetKey,
      filas: _repEstado.filas.length,
      campos: _repEstado.campos.length,
      por: currentUser?.emp?.nom
    });
  }
}

function _repExportCSV(campos, fname){
  const headers = campos.map(c => c.label);
  const rows = _repEstado.filas.map(f => campos.map(c => {
    const v = f[c.key];
    if(v == null) return '';
    if(c.tipo === 'currency' || c.tipo === 'number'){
      return Number(v) || 0;
    }
    if(c.tipo === 'date'){
      if(v instanceof Date) return v.toLocaleDateString('es-AR');
      return String(v);
    }
    return String(v);
  }));
  const csv = [headers, ...rows].map(r => r.map(v => {
    const s = String(v ?? '');
    return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`✓ CSV descargado (${_repEstado.filas.length} filas)`, 'var(--green)');
}

function _repExportXLSX(campos, fname, ds){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const headers = campos.map(c => c.label);
  const rows = _repEstado.filas.map(f => campos.map(c => {
    const v = f[c.key];
    if(v == null) return '';
    if(c.tipo === 'currency' || c.tipo === 'number'){
      const n = Number(v);
      return isNaN(n) ? v : n;
    }
    if(c.tipo === 'date'){
      if(v instanceof Date) return v.toLocaleDateString('es-AR');
      return String(v);
    }
    return v;
  }));
  // Sumar título y meta
  const aoa = [
    [`REPORTE: ${ds.label}`],
    [`Generado el ${new Date().toLocaleString('es-AR')} por ${currentUser?.emp?.nom || ''}`],
    [`Filas: ${_repEstado.filas.length} · Campos: ${campos.length}${_repEstado.filtros.length ? ' · '+_repEstado.filtros.length+' filtros' : ''}`],
    [],
    headers,
    ...rows
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Anchos de columna automáticos (estimados)
  ws['!cols'] = campos.map(c => ({
    wch: c.tipo === 'currency' || c.tipo === 'number' ? 14 :
         c.tipo === 'date' ? 11 :
         Math.min(40, Math.max(10, c.label.length + 2))
  }));
  // Mergear título
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:Math.max(0,campos.length-1)} },
    { s:{r:1,c:0}, e:{r:1,c:Math.max(0,campos.length-1)} },
    { s:{r:2,c:0}, e:{r:2,c:Math.max(0,campos.length-1)} }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ds.label.slice(0, 28));
  XLSX.writeFile(wb, fname + '.xlsx');
  toast(`✓ Excel descargado (${_repEstado.filas.length} filas)`, 'var(--green)');
}

async function _repExportPDF(campos, fname, ds){
  if(typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined'){
    toast('⚠ jsPDF no disponible','var(--red)'); return;
  }
  const { jsPDF } = window.jspdf || jspdf;
  // Si hay muchos campos, orientación landscape
  const orientacion = campos.length > 6 ? 'l' : 'p';
  const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = margin;

  // Encabezado
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Reporte: ${ds.label}`, margin, y); y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${new Date().toLocaleString('es-AR')} por ${currentUser?.emp?.nom || ''}`, margin, y); y += 4;
  doc.text(`Filas: ${_repEstado.filas.length} · Campos: ${campos.length}${_repEstado.filtros.length ? ' · '+_repEstado.filtros.length+' filtros aplicados' : ''}`, margin, y); y += 6;
  doc.setLineWidth(.3);
  doc.line(margin, y, pageW - margin, y); y += 4;

  // Tabla
  const colW = (pageW - 2 * margin) / campos.length;
  const rowH = 5;

  const dibujarHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setFillColor(230, 230, 240);
    doc.rect(margin, y, pageW - 2 * margin, rowH, 'F');
    campos.forEach((c, i) => {
      const x = margin + i * colW + 1;
      doc.text(String(c.label).slice(0, Math.floor(colW / 1.4)), x, y + 3.5);
    });
    y += rowH;
    doc.setFont('helvetica', 'normal');
  };

  dibujarHeader();

  doc.setFontSize(7);
  let zebra = 0;
  for(const fila of _repEstado.filas){
    if(y + rowH > pageH - margin - 5){
      // Pie de página
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 5, { align: 'right' });
      doc.addPage();
      y = margin;
      doc.setTextColor(0, 0, 0);
      dibujarHeader();
      doc.setFontSize(7);
    }
    if(zebra % 2 === 0){
      doc.setFillColor(245, 245, 248);
      doc.rect(margin, y, pageW - 2 * margin, rowH, 'F');
    }
    campos.forEach((c, i) => {
      const x = margin + i * colW + 1;
      let v = _repFmtCell(fila[c.key], c.tipo);
      // truncar
      const maxChars = Math.floor(colW / 1.5);
      if(String(v).length > maxChars) v = String(v).slice(0, maxChars - 1) + '…';
      const align = (c.tipo === 'currency' || c.tipo === 'number') ? 'right' : 'left';
      const xText = align === 'right' ? margin + (i+1) * colW - 1 : x;
      doc.text(String(v), xText, y + 3.5, { align });
    });
    y += rowH;
    zebra++;
  }

  // Pie de la última página
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Página ${doc.internal.getNumberOfPages()} · Generado por Portal RR.HH. LEITEN S.A.`, pageW - margin, pageH - 5, { align: 'right' });

  doc.save(fname + '.pdf');
  toast(`✓ PDF descargado (${_repEstado.filas.length} filas, ${doc.internal.getNumberOfPages()} págs)`, 'var(--green)');
}
