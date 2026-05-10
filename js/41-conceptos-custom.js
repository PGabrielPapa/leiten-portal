// ═══════════════════════════════════════════════════════════════════════════
// CONCEPTOS CUSTOM DE NÓMINA
// ───────────────────────────────────────────────────────────────────────────
// Permite a RR.HH. y Admin definir conceptos de liquidación adicionales sin
// tocar código fuente. Cada concepto tiene:
//
//   • Código único (ej: PLUS_NOCTURNIDAD, RET_GAN_ADIC, etc.)
//   • Nombre descriptivo
//   • Tipo: REM | NO_REM | DESCUENTO | APORTE | CONTRIBUCION_PATRONAL
//   • Fórmula (string que se evalúa con un parser seguro)
//   • Flags de imponibilidad: jubilación, OS, ganancias, FCL, embargable
//   • Mapeos a outputs:
//     - Recibo de sueldo (sección + leyenda)
//     - F.931 (qué R# va: R1/R6/R7/etc)
//     - LSD F.901 (código de concepto AFIP)
//     - Libro Art. 52 (columna donde aparece)
//     - Asiento contable (cuenta del plan)
//
// FLUJO DE APROBACIÓN
//   1. RR.HH. crea/edita un concepto → estado 'pendiente_aprobacion'
//   2. Admin (Gabriel Papa) revisa → aprueba o rechaza
//   3. Una vez aprobado, queda 'activo' y entra al motor en próximo cálculo
//   4. Cambios críticos (fórmula, tipo, flags imponibles) requieren re-aprobación
//
// CAMBIOS MENORES (sin re-aprobación):
//   • nombre, descripción
//   • activar/desactivar (sin borrar datos)
//
// CAMBIOS CRÍTICOS (requieren Admin):
//   • fórmula
//   • tipo (cambio de REM a NO_REM)
//   • flags imponibles
//   • código (cambio de identificador)
//   • eliminación
//
// PARSER DE FÓRMULAS
//   Soporta: + - * / paréntesis, números, referencias a variables.
//   NO USA eval() ni new Function() — implementación propia para seguridad.
//   Variables disponibles (whitelist):
//     sueldoBasico, antiguedad, presentismo, hsExtra50, hsExtra100, sac,
//     vacaciones, totalHaberesRem, totalExentos, totalHaberes,
//     diasTrab, ausentismo, anios, mAjuste, mCumpObj, jubilacion,
//     obraSocial, pamiEmp, anssal, sindicato, ganancias, embargo,
//     anticiposDesc, totalDescuentos, netoAPagar
//   Funciones: min(), max(), round(), abs(), if(cond, a, b)
//
// REFERENCIA: la liquidación recorre primero los conceptos custom de tipo
// REM/NO_REM (que se suman a haberes), después los DESCUENTO/APORTE (que se
// restan), y al final los CONTRIBUCION_PATRONAL (gasto empresa).
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS_CONCEPTO_CUSTOM = [
  { v:'REM',          label:'Remunerativo (con fórmula)',     desc:'Suma a haberes y a base imponible. Se calcula con fórmula automática.', icon:'💵', color:'var(--green)' },
  { v:'NO_REM',       label:'No Remunerativo (con fórmula)',  desc:'Suma a haberes pero NO a base imponible. Se calcula con fórmula automática.', icon:'🧾', color:'rgb(94,194,255)' },
  { v:'REM_MANUAL',   label:'Remunerativo (carga manual)',    desc:'El monto se carga manualmente o se importa desde archivo por empleado. Suma a base imponible.', icon:'✍️', color:'var(--green)' },
  { v:'NO_REM_MANUAL',label:'No Remunerativo (carga manual)', desc:'El monto se carga manualmente o se importa desde archivo. NO suma a base imponible.', icon:'✍️', color:'rgb(94,194,255)' },
  { v:'DESCUENTO',    label:'Descuento (Empleado)',           desc:'Resta del neto del empleado. Calculado con fórmula.', icon:'➖', color:'var(--red)' },
  { v:'DESCUENTO_MANUAL', label:'Descuento (carga manual)',   desc:'Descuento que se carga manualmente o se importa por empleado.', icon:'✍️', color:'var(--red)' },
  { v:'APORTE',       label:'Aporte (Empleado)',              desc:'Aporte previsional o de OS — descuento del empleado, calculado con fórmula', icon:'📋', color:'rgb(234,179,8)' },
  { v:'CONTRIBUCION_PATRONAL', label:'Contribución Patronal', desc:'Solo costo empresa, no afecta al empleado', icon:'🏢', color:'rgb(168,85,247)' }
];

// Subset: tipos que NO usan fórmula (se cargan manualmente por empleado)
const TIPOS_MANUALES = ['REM_MANUAL','NO_REM_MANUAL','DESCUENTO_MANUAL'];

function _ccEsTipoManual(tipo){
  return TIPOS_MANUALES.includes(tipo);
}

const ESTADOS_CONCEPTO = [
  { v:'pendiente_aprobacion', label:'Pendiente de aprobación', color:'var(--yellow)', icon:'⏳' },
  { v:'activo',               label:'Activo',                  color:'var(--green)',  icon:'✓' },
  { v:'rechazado',            label:'Rechazado',               color:'var(--red)',    icon:'✕' },
  { v:'inactivo',             label:'Inactivo',                color:'var(--t3)',     icon:'⊘' }
];

// Variables disponibles en las fórmulas — whitelist estricta para seguridad
const VARIABLES_FORMULA = {
  sueldoBasico:    { label:'Sueldo Básico', categoria:'haberes_base' },
  mAntig:          { label:'Antigüedad ($)', categoria:'haberes_base' },
  mPres:           { label:'Presentismo ($)', categoria:'haberes_base' },
  mHsE50:          { label:'Hs Extras 50% ($)', categoria:'haberes_base' },
  mHsE100:         { label:'Hs Extras 100% ($)', categoria:'haberes_base' },
  mSac:            { label:'SAC ($)', categoria:'haberes_base' },
  mVac:            { label:'Vacaciones ($)', categoria:'haberes_base' },
  mAjuste:         { label:'Ajuste de Haberes ($)', categoria:'haberes_base' },
  mCumpObj:        { label:'Cumplimiento Objetivos ($)', categoria:'haberes_base' },
  totalHaberesRem: { label:'Total Remunerativo', categoria:'totales' },
  totalExentos:    { label:'Total No Remunerativo', categoria:'totales' },
  totalHaberes:    { label:'Total Haberes (Rem + No Rem)', categoria:'totales' },
  diasTrab:        { label:'Días Trabajados', categoria:'tiempo' },
  ausentismo:      { label:'Ausentismo (días)', categoria:'tiempo' },
  anios:           { label:'Años de Antigüedad', categoria:'tiempo' },
  jubilacion:      { label:'Aporte Jubilatorio ($)', categoria:'aportes' },
  obraSocial:      { label:'Aporte Obra Social ($)', categoria:'aportes' },
  pamiEmp:         { label:'Aporte PAMI Empleado ($)', categoria:'aportes' },
  anssal:          { label:'Aporte ANSSAL ($)', categoria:'aportes' },
  sindicato:       { label:'Cuota Sindical Empleado ($)', categoria:'aportes' },
  ganancias:       { label:'Retención Ganancias 4ta ($)', categoria:'descuentos' },
  embargo:         { label:'Embargo Judicial ($)', categoria:'descuentos' },
  anticiposDesc:   { label:'Descuento Anticipos ($)', categoria:'descuentos' }
};

// Funciones disponibles
const FUNCIONES_FORMULA = {
  min:    (...args) => Math.min(...args),
  max:    (...args) => Math.max(...args),
  round:  (n)       => Math.round(n),
  floor:  (n)       => Math.floor(n),
  ceil:   (n)       => Math.ceil(n),
  abs:    (n)       => Math.abs(n),
  // if(cond, a, b) — condicional ternario
  if:     (c, a, b) => (c ? a : b)
};

// ═══════════════════════════════════════════════════════════════════════════
// PARSER DE FÓRMULAS — SHUNTING-YARD + EVALUADOR
// ───────────────────────────────────────────────────────────────────────────
// Implementación propia, NO usa eval() ni new Function() para evitar
// inyección de código. Solo permite operadores y referencias autorizadas.
// ═══════════════════════════════════════════════════════════════════════════

function _ccTokenize(formula){
  const tokens = [];
  let i = 0;
  const s = formula;
  while(i < s.length){
    const c = s[i];
    if(/\s/.test(c)){ i++; continue; }
    // Números (incluye decimales)
    if(/[0-9.]/.test(c)){
      let j = i;
      while(j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ type:'num', value: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    // Identificadores (variables y funciones)
    if(/[a-zA-Z_]/.test(c)){
      let j = i;
      while(j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      const id = s.slice(i, j);
      // Si lo que sigue es '(' es función, sino variable
      let k = j;
      while(k < s.length && /\s/.test(s[k])) k++;
      if(s[k] === '('){
        tokens.push({ type:'func', value: id });
      } else {
        tokens.push({ type:'var', value: id });
      }
      i = j;
      continue;
    }
    // Operadores y delimitadores
    if(/[+\-*/(),<>=!&|]/.test(c)){
      // Operadores de 2 chars: <=, >=, ==, !=, &&, ||
      const next = s[i+1];
      if((c === '<' || c === '>' || c === '=' || c === '!') && next === '='){
        tokens.push({ type:'op', value: c + next });
        i += 2;
        continue;
      }
      if((c === '&' && next === '&') || (c === '|' && next === '|')){
        tokens.push({ type:'op', value: c + next });
        i += 2;
        continue;
      }
      tokens.push({ type:'op', value: c });
      i++;
      continue;
    }
    throw new Error(`Carácter inválido en posición ${i}: '${c}'`);
  }
  return tokens;
}

// Precedencia y asociatividad de operadores
const _CC_PRECEDENCE = {
  '||': 1, '&&': 2,
  '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5,
  'u-': 6  // unario menos
};

function _ccShuntingYard(tokens){
  const output = [], opStack = [];
  for(let i = 0; i < tokens.length; i++){
    const t = tokens[i];
    if(t.type === 'num' || t.type === 'var'){
      output.push(t);
    } else if(t.type === 'func'){
      opStack.push(t);
    } else if(t.type === 'op'){
      // Detectar unario menos
      if(t.value === '-' && (i === 0 || (tokens[i-1].type === 'op' && tokens[i-1].value !== ')') || tokens[i-1].value === ',' || tokens[i-1].value === '(')){
        opStack.push({ type:'op', value:'u-' });
        continue;
      }
      if(t.value === '('){
        opStack.push(t);
      } else if(t.value === ')'){
        while(opStack.length && opStack[opStack.length-1].value !== '('){
          output.push(opStack.pop());
        }
        if(!opStack.length) throw new Error('Paréntesis desbalanceados');
        opStack.pop();  // descarta '('
        if(opStack.length && opStack[opStack.length-1].type === 'func'){
          output.push(opStack.pop());
        }
      } else if(t.value === ','){
        while(opStack.length && opStack[opStack.length-1].value !== '('){
          output.push(opStack.pop());
        }
        if(!opStack.length) throw new Error('Coma fuera de función');
      } else {
        const p1 = _CC_PRECEDENCE[t.value];
        if(p1 == null) throw new Error(`Operador desconocido: ${t.value}`);
        while(opStack.length){
          const top = opStack[opStack.length-1];
          if(top.type !== 'op' || top.value === '(') break;
          const p2 = _CC_PRECEDENCE[top.value];
          if(p2 < p1) break;
          output.push(opStack.pop());
        }
        opStack.push(t);
      }
    }
  }
  while(opStack.length){
    const t = opStack.pop();
    if(t.value === '(') throw new Error('Paréntesis desbalanceados');
    output.push(t);
  }
  return output;
}

function _ccEvaluarRPN(rpn, contexto){
  const stack = [];
  for(const t of rpn){
    if(t.type === 'num'){
      stack.push(t.value);
    } else if(t.type === 'var'){
      if(!Object.prototype.hasOwnProperty.call(VARIABLES_FORMULA, t.value)){
        throw new Error(`Variable no permitida: ${t.value}`);
      }
      const v = contexto[t.value];
      stack.push(typeof v === 'number' && !isNaN(v) ? v : 0);
    } else if(t.type === 'op'){
      if(t.value === 'u-'){
        const a = stack.pop();
        stack.push(-a);
        continue;
      }
      const b = stack.pop(), a = stack.pop();
      switch(t.value){
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(b === 0 ? 0 : a / b); break;
        case '<':  stack.push(a < b ? 1 : 0); break;
        case '>':  stack.push(a > b ? 1 : 0); break;
        case '<=': stack.push(a <= b ? 1 : 0); break;
        case '>=': stack.push(a >= b ? 1 : 0); break;
        case '==': stack.push(a === b ? 1 : 0); break;
        case '!=': stack.push(a !== b ? 1 : 0); break;
        case '&&': stack.push((a && b) ? 1 : 0); break;
        case '||': stack.push((a || b) ? 1 : 0); break;
        default: throw new Error(`Operador no implementado: ${t.value}`);
      }
    } else if(t.type === 'func'){
      const fn = FUNCIONES_FORMULA[t.value];
      if(!fn) throw new Error(`Función no permitida: ${t.value}`);
      // Argumentos (popeamos en orden inverso, varían según función)
      const arity = fn.length;
      // Para min/max que usan rest args, miramos cuántos hay en stack
      if(t.value === 'min' || t.value === 'max'){
        // Convención: estos siempre llegan con al menos 2 args
        const args = [stack.pop(), stack.pop()].reverse();
        stack.push(fn(...args));
      } else {
        const args = [];
        for(let i = 0; i < arity; i++) args.unshift(stack.pop());
        stack.push(fn(...args));
      }
    }
  }
  if(stack.length !== 1) throw new Error('Fórmula inválida (stack final ≠ 1)');
  const r = stack[0];
  return typeof r === 'number' && !isNaN(r) ? r : 0;
}

// API pública: evaluar una fórmula con un contexto dado
function evaluarFormula(formula, contexto){
  if(!formula || !formula.trim()) return 0;
  try {
    const tokens = _ccTokenize(formula);
    const rpn = _ccShuntingYard(tokens);
    return _ccEvaluarRPN(rpn, contexto || {});
  } catch(err){
    console.error('Error evaluando fórmula:', formula, '→', err.message);
    return 0;
  }
}

// API pública: validar una fórmula sintácticamente sin contexto
function validarFormula(formula){
  if(!formula || !formula.trim()){
    return { ok:false, error:'Fórmula vacía' };
  }
  try {
    const tokens = _ccTokenize(formula);
    // Verificar que las variables usadas estén en la whitelist
    for(const t of tokens){
      if(t.type === 'var' && !Object.prototype.hasOwnProperty.call(VARIABLES_FORMULA, t.value)){
        return { ok:false, error:`Variable no permitida: ${t.value}. Solo se aceptan las del catálogo.` };
      }
      if(t.type === 'func' && !Object.prototype.hasOwnProperty.call(FUNCIONES_FORMULA, t.value)){
        return { ok:false, error:`Función no permitida: ${t.value}. Disponibles: min, max, round, floor, ceil, abs, if.` };
      }
    }
    const rpn = _ccShuntingYard(tokens);
    // Probar con contexto dummy para detectar errores de aritmética
    const ctxDummy = {};
    Object.keys(VARIABLES_FORMULA).forEach(k => { ctxDummy[k] = 1; });
    const result = _ccEvaluarRPN(rpn, ctxDummy);
    return { ok:true, resultadoConContextoDummy: result };
  } catch(err){
    return { ok:false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA — IndexedDB store 'conceptos_custom'
// ═══════════════════════════════════════════════════════════════════════════

async function getConceptosCustom(){
  if(typeof getIDB !== 'function') return [];
  try {
    const db = await getIDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction('conceptos_custom', 'readonly');
      const r = tx.objectStore('conceptos_custom').getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  } catch(e){
    console.warn('Store conceptos_custom no disponible:', e);
    return [];
  }
}

// Solo conceptos activos — usado por el motor de liquidación
async function getConceptosCustomActivos(){
  const todos = await getConceptosCustom();
  return todos.filter(c => c.estado === 'activo');
}

async function getConceptoCustom(id){
  if(typeof getIDB !== 'function') return null;
  const db = await getIDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction('conceptos_custom', 'readonly');
    const r = tx.objectStore('conceptos_custom').get(Number(id));
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}

async function saveConceptoCustom(rec){
  if(typeof getIDB !== 'function') throw new Error('IDB no disponible');
  const db = await getIDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction('conceptos_custom', 'readwrite');
    const r = tx.objectStore('conceptos_custom').put(rec);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function deleteConceptoCustom(id){
  if(typeof getIDB !== 'function') throw new Error('IDB no disponible');
  const db = await getIDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction('conceptos_custom', 'readwrite');
    const r = tx.objectStore('conceptos_custom').delete(Number(id));
    r.onsuccess = () => res(true);
    r.onerror = () => rej(r.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RECALCULO DE LIQUIDACIONES BORRADOR
// ───────────────────────────────────────────────────────────────────────────
// Cuando se aprueba un cambio crítico, todas las liqs en estado 'borrador'
// quedan invalidadas (se marca un flag `_recalculoPendiente`). En la próxima
// vez que el operador abra la liq y haga "Calcular preview", el motor
// detecta el flag y fuerza el recálculo (cosa que ya hace porque el preview
// siempre recalcula desde cero).
// ═══════════════════════════════════════════════════════════════════════════
async function invalidarBorradoresPorCambioConcepto(motivo){
  if(typeof getLiquidaciones !== 'function') return 0;
  const liqs = await getLiquidaciones();
  const borradores = liqs.filter(l => l.estado === 'borrador');
  let cant = 0;
  for(const liq of borradores){
    liq._recalculoPendiente = {
      motivo,
      fecha: new Date().toISOString(),
      por: currentUser?.emp?.nom
    };
    if(typeof updateLiquidacion === 'function') await updateLiquidacion(liq);
    cant++;
  }
  return cant;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE PERMISOS
// ═══════════════════════════════════════════════════════════════════════════
function _ccEsAdmin(){
  // Convención del proyecto: solo Pablo Gabriel Papa puede aprobar cambios críticos
  const nom = (currentUser?.emp?.nom || '').toUpperCase();
  return nom.includes('PAPA, PABLO GABRIEL') || nom.includes('PAPA PABLO GABRIEL');
}

function _ccEsRRHHoAdmin(){
  return currentUser?.role === 'rrhh' || _ccEsAdmin();
}

// Detecta si un cambio es crítico (requiere re-aprobación Admin)
function _ccEsCambioCritico(viejo, nuevo){
  if(!viejo) return false;  // alta nueva: siempre pasa por estado pendiente
  if(viejo.formula !== nuevo.formula) return true;
  if(viejo.tipo !== nuevo.tipo) return true;
  if(viejo.codigo !== nuevo.codigo) return true;
  // Flags de imponibilidad
  const flagsCriticos = ['imponibleJub','imponibleOS','imponibleGanancias','imponibleFCL','embargable','habitualSAC'];
  for(const k of flagsCriticos){
    if(!!viejo[k] !== !!nuevo[k]) return true;
  }
  return false;
}
