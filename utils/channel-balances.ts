/**
 * Centralized logic for calculating channel balances.
 * 
 * Bank account perspective (from the business's bank account):
 * - INCREASES: Retiros, Giros (client withdraws from their account → money comes INTO business bank)
 * - DECREASES: Depósitos, Recargas, Pagos de servicios, Pagos varios (money goes OUT from business bank)
 * 
 * Physical cash perspective:
 * - DECREASES: Retiros, Giros (cash goes OUT to client)
 * - INCREASES: Depósitos, Recargas, Pagos de servicios, Pagos varios (cash comes IN from client)
 */

import { CanalTransaccion, SaldoCanalInicial, Transaccion } from '@/types/caja';

// Categories that INCREASE the bank account balance
export const CATEGORIAS_AUMENTAN_BANCO = ['retiro', 'giro'];

// Categories that DECREASE the bank account balance
export const CATEGORIAS_DISMINUYEN_BANCO = ['deposito', 'recarga', 'pago_servicios', 'pago_varios'];

export interface SaldoCanalCalculado {
    canalId: string;
    canalNombre: string;
    saldoInicial: number;
    entradas: number;  // Money coming IN to the bank account
    salidas: number;   // Money going OUT from the bank account
    saldoEsperado: number;
}

/**
 * Determines if a transaction category increases the bank account balance
 */
export function categoriaAumentaBanco(categoria: string): boolean {
    return CATEGORIAS_AUMENTAN_BANCO.includes(categoria);
}

/**
 * Determines if a transaction category decreases the bank account balance
 */
export function categoriaDisminuyeBanco(categoria: string): boolean {
    return CATEGORIAS_DISMINUYEN_BANCO.includes(categoria);
}

/**
 * Calculates the expected balance for all channels based on transactions.
 * This is the centralized function that should be used everywhere.
 * 
 * @param saldosIniciales - Initial balances for each channel from when cash was opened
 * @param transacciones - All transactions for the current cash register session
 * @param canalesActivos - All active channels configured in the system
 * @returns Array of calculated channel balances
 */
export function calcularSaldosCanales(
    saldosIniciales: SaldoCanalInicial[],
    transacciones: Transaccion[],
    canalesActivos: CanalTransaccion[]
): SaldoCanalCalculado[] {
    // Build a map of channel movements
    const movimientosPorCanal: {
        [canalId: string]: {
            entradas: number;
            salidas: number;
            canalNombre: string;
        }
    } = {};

    // Initialize from active channels
    canalesActivos.forEach(canal => {
        movimientosPorCanal[canal.id] = {
            entradas: 0,
            salidas: 0,
            canalNombre: canal.nombre
        };
    });

    // Process transactions - only non-voided ones with a bank/channel
    transacciones
        .filter(t => !t.anulada && t.banco)
        .forEach((t) => {
            const canal = canalesActivos.find(c => c.nombre === t.banco);
            if (canal) {
                if (!movimientosPorCanal[canal.id]) {
                    movimientosPorCanal[canal.id] = {
                        entradas: 0,
                        salidas: 0,
                        canalNombre: canal.nombre
                    };
                }

                // Use category to determine if it increases or decreases bank balance
                if (categoriaAumentaBanco(t.categoria)) {
                    movimientosPorCanal[canal.id].entradas += t.monto;
                } else if (categoriaDisminuyeBanco(t.categoria)) {
                    movimientosPorCanal[canal.id].salidas += t.monto;
                }
            }
        });

    // Calculate final balances
    return canalesActivos.map(canal => {
        const saldoInicial = saldosIniciales.find(s => s.canalId === canal.id)?.saldo || 0;
        const movimientos = movimientosPorCanal[canal.id] || { entradas: 0, salidas: 0 };
        const saldoEsperado = saldoInicial + movimientos.entradas - movimientos.salidas;

        return {
            canalId: canal.id,
            canalNombre: canal.nombre,
            saldoInicial,
            entradas: movimientos.entradas,
            salidas: movimientos.salidas,
            saldoEsperado,
        };
    }).filter(s => s.saldoInicial !== 0 || s.entradas !== 0 || s.salidas !== 0);
}

/**
 * Calculates the expected balance for all channels, returning a map structure.
 * This is useful for components that need quick lookup by channel name.
 * 
 * @param saldosIniciales - Initial balances for each channel
 * @param transacciones - All transactions for the current session
 * @param canalesActivos - All active channels
 * @returns Object with channel names as keys and balance data as values
 */
export function calcularSaldosCanalesMap(
    saldosIniciales: SaldoCanalInicial[],
    transacciones: Transaccion[],
    canalesActivos: CanalTransaccion[]
): { [canalNombre: string]: Omit<SaldoCanalCalculado, 'canalId' | 'canalNombre'> & { depositos: number; retiros: number } } {
    const saldosArray = calcularSaldosCanales(saldosIniciales, transacciones, canalesActivos);

    const result: { [canalNombre: string]: any } = {};

    saldosArray.forEach(saldo => {
        result[saldo.canalNombre] = {
            saldoInicial: saldo.saldoInicial,
            depositos: saldo.salidas,  // "Depósitos" from bank perspective = money going out (salidas)
            retiros: saldo.entradas,   // "Retiros" from bank perspective = money coming in (entradas)
            saldoEsperado: saldo.saldoEsperado,
        };
    });

    return result;
}
