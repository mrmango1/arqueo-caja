/**
 * Utilidades para manejo de números y localización
 */

/**
 * Normaliza un string de entrada numérica, reemplazando comas por puntos
 * para manejar diferentes configuraciones regionales del teclado.
 * 
 * @param value - El valor string a normalizar
 * @returns El valor con comas reemplazadas por puntos
 */
export const normalizeNumberInput = (value: string): string => {
    return value.replace(/,/g, '.');
};

/**
 * Parsea un string a número flotante, manejando comas como separador decimal.
 * Útil para inputs de montos en dispositivos con configuración regional diferente.
 * 
 * @param value - El valor string a parsear
 * @returns El número parseado, o NaN si no es válido
 */
export const parseLocalizedFloat = (value: string): number => {
    if (!value || value.trim() === '') return NaN;
    const normalized = normalizeNumberInput(value);
    return parseFloat(normalized);
};

/**
 * Parsea un string a número flotante con un valor por defecto.
 * Maneja comas como separador decimal.
 * 
 * @param value - El valor string a parsear
 * @param defaultValue - Valor por defecto si el parseo falla (default: 0)
 * @returns El número parseado, o el valor por defecto si no es válido
 */
export const parseLocalizedFloatOrDefault = (value: string, defaultValue: number = 0): number => {
    const parsed = parseLocalizedFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Valida si un string representa un número válido (considerando coma o punto como decimal)
 * 
 * @param value - El valor string a validar
 * @returns true si es un número válido, false en caso contrario
 */
export const isValidNumber = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    const normalized = normalizeNumberInput(value);
    return !isNaN(parseFloat(normalized));
};
