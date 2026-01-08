import {
    CANALES_TRANSACCION_DEFAULT,
    CONFIGURACION_COMISIONES_DEFAULT,
    CanalTransaccion,
    ConfiguracionComisiones,
    calcularComision
} from '@/types/caja';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface CanalesContextType {
    canales: CanalTransaccion[];
    canalesActivos: CanalTransaccion[];
    comisionesDefault: ConfiguracionComisiones;
    loading: boolean;
    agregarCanal: (nombre: string) => Promise<void>;
    toggleCanal: (id: string) => Promise<void>;
    eliminarCanal: (id: string) => Promise<void>;
    actualizarComisionesCanal: (id: string, usarPersonalizadas: boolean, config?: ConfiguracionComisiones) => Promise<void>;
    actualizarComisionesDefault: (config: ConfiguracionComisiones) => Promise<void>;
    obtenerComision: (canalId: string, monto: number, tipo: 'deposito' | 'retiro') => number;
    recargarCanales: () => Promise<void>;
}

const CanalesContext = createContext<CanalesContextType | undefined>(undefined);

export function CanalesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [canales, setCanales] = useState<CanalTransaccion[]>(CANALES_TRANSACCION_DEFAULT);
    const [comisionesDefault, setComisionesDefault] = useState<ConfiguracionComisiones>(CONFIGURACION_COMISIONES_DEFAULT);
    const [loading, setLoading] = useState(true);

    const storageKeyCanales = `canales_${user?.uid || 'default'}`;
    const storageKeyComisiones = `comisiones_${user?.uid || 'default'}`;

    useEffect(() => {
        cargarDatos();
    }, [user?.uid]);

    const cargarDatos = async () => {
        try {
            // Cargar canales
            const savedCanales = await AsyncStorage.getItem(storageKeyCanales);
            if (savedCanales) {
                const parsed = JSON.parse(savedCanales) as CanalTransaccion[];
                const merged = [...CANALES_TRANSACCION_DEFAULT];
                parsed.forEach((canal) => {
                    const idx = merged.findIndex(c => c.id === canal.id);
                    if (idx >= 0) {
                        merged[idx] = canal;
                    } else {
                        merged.push(canal);
                    }
                });
                setCanales(merged);
            } else {
                setCanales(CANALES_TRANSACCION_DEFAULT);
            }

            // Cargar comisiones default
            const savedComisiones = await AsyncStorage.getItem(storageKeyComisiones);
            if (savedComisiones) {
                setComisionesDefault(JSON.parse(savedComisiones));
            } else {
                setComisionesDefault(CONFIGURACION_COMISIONES_DEFAULT);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setCanales(CANALES_TRANSACCION_DEFAULT);
            setComisionesDefault(CONFIGURACION_COMISIONES_DEFAULT);
        } finally {
            setLoading(false);
        }
    };

    const guardarCanales = async (newCanales: CanalTransaccion[]) => {
        try {
            await AsyncStorage.setItem(storageKeyCanales, JSON.stringify(newCanales));
            setCanales(newCanales);
        } catch (error) {
            console.error('Error saving canales:', error);
            throw error;
        }
    };

    const guardarComisionesDefault = async (config: ConfiguracionComisiones) => {
        try {
            await AsyncStorage.setItem(storageKeyComisiones, JSON.stringify(config));
            setComisionesDefault(config);
        } catch (error) {
            console.error('Error saving comisiones:', error);
            throw error;
        }
    };

    const agregarCanal = async (nombre: string) => {
        const id = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const nuevoCanal: CanalTransaccion = {
            id: `custom_${id}_${Date.now()}`,
            nombre,
            activo: true,
            esDefault: false,
            usarComisionesPersonalizadas: false,
        };
        const newCanales = [...canales, nuevoCanal];
        await guardarCanales(newCanales);
    };

    const toggleCanal = async (id: string) => {
        const newCanales = canales.map(c =>
            c.id === id ? { ...c, activo: !c.activo } : c
        );
        await guardarCanales(newCanales);
    };

    const eliminarCanal = async (id: string) => {
        const canal = canales.find(c => c.id === id);
        if (canal?.esDefault) {
            throw new Error('No se puede eliminar un canal por defecto');
        }
        const newCanales = canales.filter(c => c.id !== id);
        await guardarCanales(newCanales);
    };

    const actualizarComisionesCanal = async (
        id: string,
        usarPersonalizadas: boolean,
        config?: ConfiguracionComisiones
    ) => {
        const newCanales = canales.map(c =>
            c.id === id
                ? { ...c, usarComisionesPersonalizadas: usarPersonalizadas, configuracionComisiones: config }
                : c
        );
        await guardarCanales(newCanales);
    };

    const actualizarComisionesDefault = async (config: ConfiguracionComisiones) => {
        await guardarComisionesDefault(config);
    };

    const obtenerComision = (canalId: string, monto: number, tipo: 'deposito' | 'retiro'): number => {
        const canal = canales.find(c => c.id === canalId);

        // Si el canal tiene comisiones personalizadas
        if (canal?.usarComisionesPersonalizadas && canal.configuracionComisiones) {
            return calcularComision(monto, tipo, canal.configuracionComisiones);
        }

        // Usar comisiones por defecto
        return calcularComision(monto, tipo, comisionesDefault);
    };

    const recargarCanales = async () => {
        setLoading(true);
        await cargarDatos();
    };

    const canalesActivos = canales.filter(c => c.activo);

    return (
        <CanalesContext.Provider
            value={{
                canales,
                canalesActivos,
                comisionesDefault,
                loading,
                agregarCanal,
                toggleCanal,
                eliminarCanal,
                actualizarComisionesCanal,
                actualizarComisionesDefault,
                obtenerComision,
                recargarCanales,
            }}
        >
            {children}
        </CanalesContext.Provider>
    );
}

export function useCanales() {
    const context = useContext(CanalesContext);
    if (context === undefined) {
        throw new Error('useCanales must be used within a CanalesProvider');
    }
    return context;
}
