# Portal RR.HH. — LEITEN S.A.

Sistema integral de gestión de Recursos Humanos y Liquidación de Sueldos para el grupo LEITEN.

## Empresas del grupo

- LEITEN S.A.
- SINIS S.A.
- BARTON REBAR SA
- LEITEN SALTA S.A.

## Módulos principales

### Empleado
- Mis datos (laborales, contacto, familiares, contactos de emergencia)
- Familiares con vigencias (alta/baja con motivo)
- CBUs múltiples con porcentajes de distribución
- Mis recibos de sueldo (PDF firmable)
- Solicitud de anticipos
- Reglamento interno

### RR.HH.
- ABM de empleados, empresas, sindicatos, áreas, categorías
- Liquidación de haberes con motor completo (mensual, quincenal, SAC, vacaciones, final, complementaria)
- Sanciones disciplinarias con descuentos automáticos
- Licencias (vacaciones, enfermedad, maternidad, especiales LCT)
- Anticipos con flujo de aprobación de dos pasos
- Higiene y seguridad
- Mensajería interna con confirmaciones de lectura
- Repositorio de documentos
- Auditoría completa de eventos

### Liquidación — capacidades del motor

- Cálculo proporcional por días trabajados (alta, baja en período)
- Ajuste automático para liquidaciones quincenales (factor 0.5)
- Antigüedad por escalas configurables
- Presentismo, premio asistencia
- Horas extras 50% / 100%
- SAC primer / segundo semestre con cálculo correcto
- Ganancias 4ta categoría con SIRADIG (importable)
- Embargos múltiples coexistentes (alimentos % + común con tope Art. 147 LCT)
- Liquidación final automática (Arts. 121, 156, 232, 233, 245 LCT)
- Régimen Ley 22.250 UOCRA con FCL, IERIC, Fondo Sanidad, CAR, CESLU
- Plus categorizados con flag remunerativo / habitual (afecta SAC)
- Cumplimiento de objetivos con importador masivo
- Validaciones cruzadas pre-aprobación (9 reglas)
- Historial de reaperturas con auditoría

### Outputs legales

- **F.931 / SICOSS** (RG 3834/2016) — Excel + TXT posicional
- **DDJJ Sindical por Convenio** — Excel multi-hoja por sindicato
- **DDJJ UOCRA Ley 22.250** — FCL, IERIC, Fondo Sanidad, CAR
- **Libro Sueldo Digital (LSD)** — F.901, F.902, F.903 (RG AFIP 3781)
- **Libro Art. 52 LCT** (papel rubricable) — Excel
- **Asiento contable de sueldos** — balanceado por empresa, plan de cuentas argentino
- **Recibo de sueldo PDF firmable** con publicación automática a Mis Recibos
- **Archivos bancarios multi-banco**: Galicia, BNA, Santander, Macro, BBVA, ICBC, Provincia, Supervielle

## Stack

- **Frontend**: HTML + CSS + JavaScript vanilla (sin framework)
- **Storage**: IndexedDB para datos pesados (recibos, liquidaciones, novedades) + localStorage para overrides y configs
- **Libs**: SheetJS (xlsx), jsPDF, html2canvas, pdf.js, pdf-lib
- **Backend**: serverless en Vercel (sólo entrega de assets — toda la lógica corre en el cliente)
- **Auth**: SSO de Vercel a nivel de team (datos sensibles protegidos)

## Estructura

```
.
├── index.html              # SPA single-page, ~220 KB
├── css/                    # Estilos globales
├── data/                   # Datos embebidos (empleados, cumpleaños, logos)
├── js/                     # 39 módulos numerados por orden de carga
│   ├── 01-state-storage.js          # IndexedDB + estado global
│   ├── 02-auth.js                   # Login + sesión
│   ├── ...
│   ├── 17-rrhh-liquidacion.js       # Motor de liquidación (~250 KB)
│   ├── ...
│   ├── 34-f931.js                   # F.931 / SICOSS
│   ├── 35-recibo-pdf.js             # Generación PDF firmable
│   ├── 36-archivos-banco.js         # Multi-banco
│   ├── 37-ddjj-sindical.js          # DDJJ por convenio
│   ├── 38-libro-sueldos.js          # LSD + Art. 52 LCT
│   ├── 39-asiento-contable.js       # Asiento contable balanceado
│   └── 40-uocra.js                  # Régimen Ley 22.250
└── vercel.json
```

## Marco legal y referencias

- Ley 20.744 (LCT) — Contrato de Trabajo
- Ley 22.250 — Régimen de la Industria de la Construcción
- Ley 25.371 — IERIC
- RG (AFIP) 3834/2016 — Sistema SICOSS
- RG (AFIP) 3781/2015 — Libro Sueldo Digital
- RT 8 y 9 FACPCE — Normas contables profesionales
- Art. 147 LCT — Tope embargo (20% del excedente del SMVM)
- Arts. 121, 156, 232, 233, 245 LCT — Liquidación final
- CCT por sindicato (UOCRA 76/75, SEC, UOM, ASIMRA, PLASTICO)

## Deploy

```bash
# Vercel CLI
vercel deploy --prod
```

URL de producción: `https://leiten-portal-leiten-team.vercel.app` (acceso restringido por SSO del team)

## Privacidad

El portal contiene datos sensibles de empleados (DNI, CUIL, sueldos, datos familiares, salud). El acceso está restringido por:

1. SSO del team de Vercel (`leiten-team`)
2. Niveles de usuario internos (Empleado / Gerente / RR.HH. / Admin)
3. Auditoría completa de eventos sensibles

## Autor

Desarrollado por Pablo Gabriel Papa para LEITEN S.A.
