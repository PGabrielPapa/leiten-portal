// ═══════════════════════════════════════════════════════════════════════════
// CALENDARIO DE FERIADOS NACIONALES — REPÚBLICA ARGENTINA
// ───────────────────────────────────────────────────────────────────────────
// Feriados oficiales nacionales 2024–2028, según Ley 27.399 (calendario fijo)
// + decretos anuales (días no laborables, puentes turísticos).
//
// Cubrimos:
//  - Feriados nacionales INAMOVIBLES (Año Nuevo, Carnaval, Día Memoria,
//    Día Veterano, Trabajador, Revolución de Mayo, Güemes, Bandera,
//    Independencia, San Martín, Diversidad Cultural, Soberanía,
//    Inmaculada Concepción, Navidad)
//  - Feriados MÓVILES (días que pueden trasladarse para puentes turísticos)
//  - Días NO LABORABLES (Jueves y Viernes Santo — son optativos pero
//    se pagan como feriados si la empresa los declara)
//
// REFERENCIAS:
//  - Ley 27.399 (régimen general de feriados)
//  - Decreto 1584/2010 modificado por Ley 27.399
//  - Decretos anuales que fijan feriados con fines turísticos
//
// USO:
//   getFeriadosDelMes(2026, 5) → ['2026-05-01', '2026-05-25']
//   esFeriado('2026-05-01')    → true
//
// IMPORTANTE: el cálculo de feriados en la liquidación EXCLUYE empleados
// bajo régimen UOCRA (Ley 22.250) que tienen su propio sistema indemnizatorio.
// ═══════════════════════════════════════════════════════════════════════════

const FERIADOS_AR = {
  2024: [
    '2024-01-01',  // Año Nuevo
    '2024-02-12',  // Carnaval (lunes)
    '2024-02-13',  // Carnaval (martes)
    '2024-03-24',  // Día Nacional de la Memoria por la Verdad y la Justicia
    '2024-03-28',  // Jueves Santo (día no laborable)
    '2024-03-29',  // Viernes Santo
    '2024-04-01',  // Feriado puente turístico (decreto anual)
    '2024-04-02',  // Día del Veterano y de los Caídos en Malvinas
    '2024-05-01',  // Día del Trabajador
    '2024-05-25',  // Día de la Revolución de Mayo
    '2024-06-17',  // Paso a la Inmortalidad del Gral. Güemes (trasladado)
    '2024-06-20',  // Día de la Bandera
    '2024-06-21',  // Feriado puente turístico
    '2024-07-09',  // Día de la Independencia
    '2024-08-17',  // Paso a la Inmortalidad del Gral. San Martín
    '2024-10-11',  // Feriado puente turístico
    '2024-10-12',  // Día del Respeto a la Diversidad Cultural
    '2024-11-18',  // Día de la Soberanía Nacional (trasladado)
    '2024-12-08',  // Inmaculada Concepción de María
    '2024-12-25'   // Navidad
  ],
  2025: [
    '2025-01-01',  // Año Nuevo
    '2025-03-03',  // Carnaval (lunes)
    '2025-03-04',  // Carnaval (martes)
    '2025-03-24',  // Día Memoria
    '2025-04-02',  // Día Veterano Malvinas
    '2025-04-17',  // Jueves Santo (no laborable)
    '2025-04-18',  // Viernes Santo
    '2025-05-01',  // Día Trabajador
    '2025-05-02',  // Feriado puente turístico
    '2025-05-25',  // Revolución de Mayo
    '2025-06-16',  // Güemes (trasladado al lunes 16)
    '2025-06-20',  // Día Bandera
    '2025-07-09',  // Independencia
    '2025-08-15',  // Feriado puente turístico
    '2025-08-17',  // San Martín
    '2025-10-12',  // Diversidad Cultural
    '2025-11-21',  // Feriado puente turístico
    '2025-11-24',  // Soberanía Nacional (trasladado)
    '2025-12-08',  // Inmaculada Concepción
    '2025-12-25'   // Navidad
  ],
  2026: [
    '2026-01-01',  // Año Nuevo (jueves)
    '2026-02-16',  // Carnaval (lunes)
    '2026-02-17',  // Carnaval (martes)
    '2026-03-24',  // Día Memoria (martes)
    '2026-04-02',  // Día Veterano Malvinas (jueves)
    '2026-04-02',  // Jueves Santo (mismo día — se cuenta una vez)
    '2026-04-03',  // Viernes Santo
    '2026-05-01',  // Día Trabajador (viernes)
    '2026-05-25',  // Revolución de Mayo (lunes)
    '2026-06-15',  // Güemes (trasladado al lunes 15)
    '2026-06-20',  // Día Bandera (sábado)
    '2026-07-09',  // Independencia (jueves)
    '2026-07-10',  // Feriado puente turístico (viernes)
    '2026-08-17',  // San Martín (lunes)
    '2026-10-12',  // Diversidad Cultural (lunes)
    '2026-11-20',  // Soberanía Nacional (viernes — no se traslada porque cae en viernes)
    '2026-12-07',  // Feriado puente turístico (lunes)
    '2026-12-08',  // Inmaculada Concepción (martes)
    '2026-12-25'   // Navidad (viernes)
  ],
  2027: [
    '2027-01-01',  // Año Nuevo
    '2027-02-08',  // Carnaval (lunes)
    '2027-02-09',  // Carnaval (martes)
    '2027-03-24',  // Día Memoria (miércoles)
    '2027-03-25',  // Jueves Santo
    '2027-03-26',  // Viernes Santo
    '2027-04-02',  // Día Veterano (viernes)
    '2027-05-01',  // Día Trabajador (sábado)
    '2027-05-24',  // Feriado puente turístico
    '2027-05-25',  // Revolución de Mayo (martes)
    '2027-06-17',  // Güemes (jueves)
    '2027-06-18',  // Feriado puente turístico
    '2027-06-20',  // Día Bandera (domingo — no se traslada porque cae en domingo)
    '2027-07-09',  // Independencia (viernes)
    '2027-08-16',  // San Martín (lunes — trasladado del 17)
    '2027-10-11',  // Diversidad Cultural (trasladado al lunes 11)
    '2027-11-22',  // Soberanía Nacional (lunes — trasladado del 20)
    '2027-12-08',  // Inmaculada Concepción (miércoles)
    '2027-12-25'   // Navidad (sábado)
  ],
  2028: [
    '2028-01-01',  // Año Nuevo (sábado)
    '2028-02-28',  // Carnaval (lunes)
    '2028-02-29',  // Carnaval (martes)
    '2028-03-24',  // Día Memoria (viernes)
    '2028-04-02',  // Día Veterano (domingo — feriado nacional aunque caiga en domingo)
    '2028-04-13',  // Jueves Santo
    '2028-04-14',  // Viernes Santo
    '2028-05-01',  // Día Trabajador (lunes)
    '2028-05-25',  // Revolución de Mayo (jueves)
    '2028-05-26',  // Feriado puente turístico
    '2028-06-19',  // Güemes (trasladado al lunes 19)
    '2028-06-20',  // Día Bandera (martes)
    '2028-07-09',  // Independencia (domingo)
    '2028-08-21',  // San Martín (trasladado al lunes 21)
    '2028-10-16',  // Diversidad Cultural (trasladado al lunes 16)
    '2028-11-20',  // Soberanía Nacional (lunes)
    '2028-12-08',  // Inmaculada Concepción (viernes)
    '2028-12-25'   // Navidad (lunes)
  ]
};

// Helper: filtra feriados del mes solicitado. Si el año no está en el catálogo,
// devuelve array vacío (no falla — solo no calcula el adicional para ese mes).
function getFeriadosDelMes(anio, mes){
  const arr = FERIADOS_AR[anio] || [];
  const mesPad = String(mes).padStart(2, '0');
  return arr.filter(f => f.substring(5, 7) === mesPad);
}

// Helper: chequea si una fecha ISO ('YYYY-MM-DD') es feriado nacional
function esFeriado(fechaIso){
  if(!fechaIso) return false;
  const [y] = fechaIso.split('-');
  const arr = FERIADOS_AR[parseInt(y)] || [];
  return arr.includes(fechaIso);
}

// Helper: devuelve la cantidad de feriados de un mes
function cantidadFeriadosMes(anio, mes){
  return getFeriadosDelMes(anio, mes).length;
}
