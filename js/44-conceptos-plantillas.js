// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLAS DE CONCEPTOS COMUNES
// ───────────────────────────────────────────────────────────────────────────
// Catálogo de conceptos pre-configurados frecuentes en payroll argentino.
// RR.HH. los puede importar con un click y luego ajustar % y flags antes de
// guardar. Todos quedan en estado pendiente_aprobacion como cualquier alta.
//
// Categorías cubiertas:
//   - Adicionales remunerativos típicos (zona, nocturnidad, turno rotativo)
//   - Bonos no remunerativos (productividad, presentismo extra)
//   - Descuentos de Ganancias 4ta y aportes adicionales
//   - Plantillas vacías por tipo (para que RR.HH. parta de cero)
// ═══════════════════════════════════════════════════════════════════════════

const PLANTILLAS_CONCEPTOS_COMUNES = [
  // ─── ADICIONALES REMUNERATIVOS ────────────────────────────────────────
  {
    grupo: 'Adicionales remunerativos',
    plantillas: [
      {
        codigo: 'PLUS_NOCTURNIDAD',
        nombre: 'Plus por trabajo nocturno',
        descripcion: 'Adicional CCT por jornadas con horario nocturno (Art. 200 LCT)',
        tipo: 'REM',
        formula: 'sueldoBasico * 0.30',  // 30% es típico, ajustable según CCT
        imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
        imponibleFCL: true, embargable: true, habitualSAC: true,
        seccionRecibo: 'haberes', f931Casillero: 'R1',
        lsdCodigo: '120', cuentaContable: '6.1.1.001'
      },
      {
        codigo: 'ZONA_DESFAVORABLE',
        nombre: 'Zona desfavorable',
        descripcion: 'Adicional por trabajo en zona desfavorable (Art. 142 Ley 24.013)',
        tipo: 'REM',
        formula: 'sueldoBasico * 0.20',
        imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
        imponibleFCL: true, embargable: true, habitualSAC: true,
        seccionRecibo: 'haberes', f931Casillero: 'R1',
        lsdCodigo: '121', cuentaContable: '6.1.1.007'
      },
      {
        codigo: 'TURNO_ROTATIVO',
        nombre: 'Adicional por turno rotativo',
        descripcion: 'Para empleados que rotan en turnos mañana/tarde/noche',
        tipo: 'REM',
        formula: 'sueldoBasico * 0.15',
        imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
        imponibleFCL: true, embargable: true, habitualSAC: true,
        seccionRecibo: 'haberes', f931Casillero: 'R1',
        lsdCodigo: '122', cuentaContable: '6.1.1.007'
      },
      {
        codigo: 'TITULO_SECUNDARIO',
        nombre: 'Adicional por título',
        descripcion: 'Adicional CCT por presentación de título habilitante',
        tipo: 'REM',
        formula: 'sueldoBasico * 0.10',
        imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
        imponibleFCL: true, embargable: true, habitualSAC: true,
        seccionRecibo: 'haberes', f931Casillero: 'R1',
        lsdCodigo: '123', cuentaContable: '6.1.1.007'
      }
    ]
  },

  // ─── BONOS NO REMUNERATIVOS ───────────────────────────────────────────
  {
    grupo: 'Bonos no remunerativos',
    plantillas: [
      {
        codigo: 'BONO_PRODUCTIVIDAD',
        nombre: 'Bono productividad',
        descripcion: 'Bono variable por cumplimiento de objetivos. Carga manual por empleado.',
        tipo: 'NO_REM_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: true,
        imponibleFCL: false, embargable: true, habitualSAC: false,
        seccionRecibo: 'exentos', f931Casillero: 'R6',
        lsdCodigo: '210', cuentaContable: '6.1.1.008'
      },
      {
        codigo: 'BONO_FIN_AÑO',
        nombre: 'Bono extraordinario fin de año',
        descripcion: 'Bono no remunerativo por única vez en diciembre. Carga manual.',
        tipo: 'NO_REM_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: true,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'exentos', f931Casillero: 'R6',
        lsdCodigo: '212', cuentaContable: '6.1.1.008'
      },
      {
        codigo: 'VIANDA_NO_REM',
        nombre: 'Vianda / Comida',
        descripcion: 'Asignación de comida no remunerativa. Por días trabajados.',
        tipo: 'NO_REM',
        formula: 'diasTrab * 5000',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'exentos', f931Casillero: 'R6',
        lsdCodigo: '215', cuentaContable: '6.1.1.008'
      },
      {
        codigo: 'REINTEGRO_GASTOS',
        nombre: 'Reintegro de gastos',
        descripcion: 'Reintegro de gastos personales del empleado. Carga manual con comprobantes.',
        tipo: 'NO_REM_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'exentos', f931Casillero: 'R6',
        lsdCodigo: '216', cuentaContable: '6.1.1.008'
      }
    ]
  },

  // ─── DESCUENTOS Y RETENCIONES ──────────────────────────────────────────
  {
    grupo: 'Descuentos y retenciones',
    plantillas: [
      {
        codigo: 'CUOTA_PRESTAMO',
        nombre: 'Cuota préstamo personal',
        descripcion: 'Descuento de cuota de préstamo. Monto se carga manual por empleado.',
        tipo: 'DESCUENTO_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'descuentos', f931Casillero: '',
        lsdCodigo: '350', cuentaContable: '2.1.1.040'
      },
      {
        codigo: 'CUOTA_SEGURO',
        nombre: 'Cuota seguro voluntario',
        descripcion: 'Descuento por seguro de vida o accidentes voluntario',
        tipo: 'DESCUENTO_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'descuentos', f931Casillero: '',
        lsdCodigo: '351', cuentaContable: '2.1.1.040'
      },
      {
        codigo: 'AFILIACION_SIND_ADIC',
        nombre: 'Afiliación sindical adicional',
        descripcion: 'Cuota especial sindical (asambleas, cursos, etc.). Manual o por % bruto.',
        tipo: 'APORTE',
        formula: 'totalHaberesRem * 0.005',  // 0.5% — ajustar según resolución sindical
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'descuentos', f931Casillero: '',
        lsdCodigo: '360', cuentaContable: '2.1.1.014'
      }
    ]
  },

  // ─── EN BLANCO POR TIPO (parten de cero) ──────────────────────────────
  {
    grupo: 'Plantillas en blanco',
    plantillas: [
      {
        codigo: 'NUEVO_REM',
        nombre: 'Nuevo concepto remunerativo',
        descripcion: '',
        tipo: 'REM',
        formula: 'sueldoBasico * 0.05',
        imponibleJub: true, imponibleOS: true, imponibleGanancias: true,
        imponibleFCL: true, embargable: true, habitualSAC: true,
        seccionRecibo: 'haberes', f931Casillero: 'R1',
        lsdCodigo: '110', cuentaContable: '6.1.1.099'
      },
      {
        codigo: 'NUEVO_NO_REM',
        nombre: 'Nuevo concepto no remunerativo',
        descripcion: '',
        tipo: 'NO_REM_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: true,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'exentos', f931Casillero: 'R6',
        lsdCodigo: '210', cuentaContable: '6.1.1.098'
      },
      {
        codigo: 'NUEVO_DESCUENTO',
        nombre: 'Nuevo descuento',
        descripcion: '',
        tipo: 'DESCUENTO_MANUAL',
        formula: '',
        imponibleJub: false, imponibleOS: false, imponibleGanancias: false,
        imponibleFCL: false, embargable: false, habitualSAC: false,
        seccionRecibo: 'descuentos', f931Casillero: '',
        lsdCodigo: '310', cuentaContable: '2.1.1.099'
      }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: galería de plantillas
// ═══════════════════════════════════════════════════════════════════════════
function abrirGaleriaPlantillas(){
  if(!_ccEsRRHHoAdmin()){ toast('⚠ Sin permiso','var(--red)'); return; }

  const grupos = PLANTILLAS_CONCEPTOS_COMUNES.map(g => `
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${g.grupo}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${g.plantillas.map(p => {
          const tInfo = TIPOS_CONCEPTO_CUSTOM.find(t => t.v === p.tipo);
          return `
            <div class="card" style="background:var(--bg2);padding:12px 14px;cursor:pointer;border:1px solid var(--border);transition:all .15s" onclick="_ccUsarPlantilla('${p.codigo}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="display:flex;align-items:flex-start;gap:8px">
                <div style="font-size:20px;flex-shrink:0">${tInfo?.icon || '?'}</div>
                <div style="min-width:0;flex:1">
                  <div style="font-size:12px;font-weight:600;color:var(--t1);line-height:1.2">${p.nombre}</div>
                  <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${p.codigo}</div>
                  ${p.descripcion ? `<div style="font-size:10px;color:var(--t3);margin-top:4px;line-height:1.4">${p.descripcion}</div>` : ''}
                  ${p.formula ? `<div style="font-size:10px;font-family:var(--font-mono);color:var(--accent2);margin-top:4px;background:var(--bg1);padding:3px 6px;border-radius:3px">${p.formula}</div>` : '<div style="font-size:9px;color:var(--t3);margin-top:4px;font-style:italic">(carga manual)</div>'}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'modal-cc-plantillas';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:880px;width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📋 Plantillas de conceptos comunes</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Tocá una plantilla para abrir el editor con sus campos pre-cargados. Después podés ajustar todo antes de guardar.</div>
        </div>
        <button onclick="document.getElementById('modal-cc-plantillas').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 22px">
        ${grupos}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function _ccUsarPlantilla(codigo){
  // Busca la plantilla en todos los grupos
  let plantilla = null;
  for(const g of PLANTILLAS_CONCEPTOS_COMUNES){
    plantilla = g.plantillas.find(p => p.codigo === codigo);
    if(plantilla) break;
  }
  if(!plantilla){ toast('⚠ Plantilla no encontrada','var(--red)'); return; }

  // Cerrar la galería
  document.getElementById('modal-cc-plantillas')?.remove();

  // Abrir editor en blanco con la plantilla cargada
  _ccConceptoEditando = null;  // alta nueva
  // Pequeño hack: guardamos la plantilla en un global temporal y el editor la lee
  _ccPlantillaPrecarga = { ...plantilla };
  abrirEditorConceptoCustom(null);
}

let _ccPlantillaPrecarga = null;
