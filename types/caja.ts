// Tipos de transacciones para corresponsalía bancaria
export type TipoTransaccion = 'ingreso' | 'egreso';

// Categorías de operaciones bancarias
export type CategoriaOperacion =
  | 'deposito'        // Cliente deposita → Ingreso
  | 'retiro'          // Cliente retira → Egreso
  | 'pago_servicios'  // Pago de luz, agua, etc → Ingreso
  | 'recarga'         // Recargas telefónicas → Ingreso
  | 'giro_enviado'    // Cliente envía giro → Ingreso
  | 'giro_recibido'   // Cliente recibe giro → Egreso
  | 'otro_ingreso'    // Otros ingresos
  | 'otro_egreso';    // Otros egresos

// Estado de la caja
export type EstadoCaja = 'abierta' | 'cerrada';

// Información de la operación bancaria
export interface OperacionBancaria {
  categoria: CategoriaOperacion;
  banco?: string;           // Banco asociado (ej: Pichincha, Guayaquil)
  numeroReferencia?: string; // Número de referencia / comprobante
  comision: number;         // Comisión cobrada al cliente
  comisionBanco?: number;   // Comisión que paga el banco al corresponsal
}

// Transacción individual
export interface Transaccion {
  id?: string;
  cajaId: string;
  tipo: TipoTransaccion;
  monto: number;
  concepto: string;
  categoria: CategoriaOperacion;
  fecha: number; // timestamp en milisegundos
  usuarioId: string;
  usuarioNombre?: string;
  // Campos específicos de corresponsalía
  banco?: string;
  numeroReferencia?: string;
  comision: number;
  comisionBanco?: number;
  anulada?: boolean; // Si fue reversada
}

// Caja (sesión de caja abierta)
export interface Caja {
  id?: string;
  estado: EstadoCaja;
  montoInicial: number;
  montoFinal?: number;
  // Totales de movimientos
  totalDepositos: number;     // Suma de depósitos
  totalRetiros: number;       // Suma de retiros
  totalOtrosIngresos: number; // Pagos servicios, recargas, giros enviados
  totalOtrosEgresos: number;  // Giros recibidos, otros
  // Comisiones
  totalComisiones: number;    // Total comisiones cobradas a clientes
  totalComisionesBanco: number; // Total comisiones que paga el banco
  // Cálculos
  saldoEsperado: number;
  saldoReal?: number;
  diferencia?: number;
  // Fechas
  fechaApertura: number;
  fechaCierre?: number;
  // Usuario
  usuarioId: string;
  usuarioNombre?: string;
  notas?: string;
}

// Resumen para mostrar en el dashboard
export interface ResumenCaja {
  caja: Caja;
  transacciones: Transaccion[];
  totalIngresos: number;
  totalEgresos: number;
  totalComisiones: number;
  saldoActual: number;
}

// Configuración de categorías con metadata
export interface CategoriaConfig {
  id: CategoriaOperacion;
  nombre: string;
  nombreCorto: string;
  tipo: TipoTransaccion;
  icono: any; // Tipo any para compatibilidad con IconSymbol
  color: string;
  requiereBanco: boolean;
  requiereReferencia: boolean;
  comisionDefault?: number;
}

// Catálogo de categorías
export const CATEGORIAS: CategoriaConfig[] = [
  {
    id: 'deposito',
    nombre: 'Depósito Bancario',
    nombreCorto: 'Depósito',
    tipo: 'ingreso',
    icono: 'arrow.down.circle.fill',
    color: '#34C759',
    requiereBanco: true,
    requiereReferencia: true,
  },
  {
    id: 'retiro',
    nombre: 'Retiro Bancario',
    nombreCorto: 'Retiro',
    tipo: 'egreso',
    icono: 'arrow.up.circle.fill',
    color: '#FF3B30',
    requiereBanco: true,
    requiereReferencia: true,
  },
  {
    id: 'pago_servicios',
    nombre: 'Pago de Servicios',
    nombreCorto: 'Servicios',
    tipo: 'ingreso',
    icono: 'doc.text.fill',
    color: '#007AFF',
    requiereBanco: false,
    requiereReferencia: true,
  },
  {
    id: 'recarga',
    nombre: 'Recarga Telefónica',
    nombreCorto: 'Recarga',
    tipo: 'ingreso',
    icono: 'phone.fill',
    color: '#5856D6',
    requiereBanco: false,
    requiereReferencia: false,
  },
  {
    id: 'giro_enviado',
    nombre: 'Giro Enviado',
    nombreCorto: 'Giro Env.',
    tipo: 'ingreso',
    icono: 'paperplane.fill',
    color: '#FF9500',
    requiereBanco: false,
    requiereReferencia: true,
  },
  {
    id: 'giro_recibido',
    nombre: 'Giro Recibido',
    nombreCorto: 'Giro Rec.',
    tipo: 'egreso',
    icono: 'tray.and.arrow.down.fill',
    color: '#FF9500',
    requiereBanco: false,
    requiereReferencia: true,
  },
  {
    id: 'otro_ingreso',
    nombre: 'Otro Ingreso',
    nombreCorto: 'Otro +',
    tipo: 'ingreso',
    icono: 'plus.circle.fill',
    color: '#34C759',
    requiereBanco: false,
    requiereReferencia: false,
  },
  {
    id: 'otro_egreso',
    nombre: 'Otro Egreso',
    nombreCorto: 'Otro -',
    tipo: 'egreso',
    icono: 'minus.circle.fill',
    color: '#FF3B30',
    requiereBanco: false,
    requiereReferencia: false,
  },
];

// Rango de comisión (monto mínimo, monto máximo, comisión)
export interface RangoComision {
  id: string;
  montoMin: number;      // Monto mínimo (incluido)
  montoMax: number;      // Monto máximo (excluido), -1 = sin límite
  comisionDeposito: number;  // Comisión para depósitos
  comisionRetiro: number;    // Comisión para retiros
}

// Comisión simple (fija)
export interface ComisionSimple {
  comisionDeposito: number;
  comisionRetiro: number;
}

// Tipo de modo de comisión
export type ModoComision = 'simple' | 'rangos';

// Configuración de comisiones
export interface ConfiguracionComisiones {
  modo: ModoComision;
  comisionSimple: ComisionSimple;
  rangos: RangoComision[];
}

// Valores por defecto para comisión simple
export const COMISION_SIMPLE_DEFAULT: ComisionSimple = {
  comisionDeposito: 0.50,
  comisionRetiro: 0.50,
};

// Rangos de comisión por defecto
export const RANGOS_COMISION_DEFAULT: RangoComision[] = [
  { id: 'r1', montoMin: 0, montoMax: 100, comisionDeposito: 0.25, comisionRetiro: 0.25 },
  { id: 'r2', montoMin: 100, montoMax: 200, comisionDeposito: 0.50, comisionRetiro: 0.50 },
  { id: 'r3', montoMin: 200, montoMax: 500, comisionDeposito: 0.75, comisionRetiro: 0.75 },
  { id: 'r4', montoMin: 500, montoMax: 1000, comisionDeposito: 1.00, comisionRetiro: 1.00 },
  { id: 'r5', montoMin: 1000, montoMax: -1, comisionDeposito: 1.50, comisionRetiro: 1.50 },
];

// Configuración de comisiones por defecto
export const CONFIGURACION_COMISIONES_DEFAULT: ConfiguracionComisiones = {
  modo: 'simple',
  comisionSimple: COMISION_SIMPLE_DEFAULT,
  rangos: RANGOS_COMISION_DEFAULT,
};

// Interfaz para Canal de Transacción
export interface CanalTransaccion {
  id: string;
  nombre: string;
  activo: boolean;
  esDefault?: boolean;
  // Comisiones personalizadas (opcional)
  usarComisionesPersonalizadas?: boolean;
  configuracionComisiones?: ConfiguracionComisiones;
}

// Canales de transacción por defecto
export const CANALES_TRANSACCION_DEFAULT: CanalTransaccion[] = [
  { id: 'pichincha', nombre: 'Banco Pichincha', activo: true, esDefault: true },
  { id: 'guayaquil', nombre: 'Banco Guayaquil', activo: true, esDefault: true },
  { id: 'western_union', nombre: 'Western Union', activo: true, esDefault: true },
  { id: 'yaganaste', nombre: 'YaGanaste', activo: true, esDefault: true },
  { id: 'recarga_facil', nombre: 'Recarga Fácil', activo: true, esDefault: true },
];

// Saldo inicial por canal al abrir caja
export interface SaldoCanalInicial {
  canalId: string;
  canalNombre: string;
  saldo: number;
}

// Mantener BANCOS como alias para compatibilidad
export const BANCOS = CANALES_TRANSACCION_DEFAULT.filter(c => c.activo).map(c => c.nombre);

// Helper para obtener categoría por ID
export const getCategoriaById = (id: CategoriaOperacion): CategoriaConfig | undefined => {
  return CATEGORIAS.find(c => c.id === id);
};

// Helper para obtener categorías por tipo
export const getCategoriasPorTipo = (tipo: TipoTransaccion): CategoriaConfig[] => {
  return CATEGORIAS.filter(c => c.tipo === tipo);
};

// Helper para calcular comisión basada en configuración
export const calcularComision = (
  monto: number,
  tipo: 'deposito' | 'retiro',
  config: ConfiguracionComisiones
): number => {
  if (config.modo === 'simple') {
    return tipo === 'deposito' ? config.comisionSimple.comisionDeposito : config.comisionSimple.comisionRetiro;
  }

  // Modo rangos
  const rango = config.rangos.find(r =>
    monto >= r.montoMin && (r.montoMax === -1 || monto < r.montoMax)
  );
  if (!rango) return 0;
  return tipo === 'deposito' ? rango.comisionDeposito : rango.comisionRetiro;
};

