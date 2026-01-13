import {
    CategoriaOperacion,
    SERVICIOS_DEFAULT,
    TipoServicio,
} from '@/types/caja';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ServiciosContextType {
    servicios: TipoServicio[];
    serviciosActivos: TipoServicio[];
    loading: boolean;
    pendingServicioSeleccion: TipoServicio | null;
    setPendingServicioSeleccion: (servicio: TipoServicio | null) => void;
    agregarServicio: (servicio: Omit<TipoServicio, 'id' | 'esDefault'>) => Promise<TipoServicio>;
    toggleServicio: (id: string) => Promise<void>;
    eliminarServicio: (id: string) => Promise<void>;
    getServiciosPorCategoria: (categoria: CategoriaOperacion) => TipoServicio[];
    recargarServicios: () => Promise<void>;
}

const ServiciosContext = createContext<ServiciosContextType | undefined>(undefined);

export function ServiciosProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [servicios, setServicios] = useState<TipoServicio[]>(SERVICIOS_DEFAULT);
    const [loading, setLoading] = useState(true);
    const [pendingServicioSeleccion, setPendingServicioSeleccion] = useState<TipoServicio | null>(null);

    const storageKey = `servicios_${user?.uid || 'default'}`;

    useEffect(() => {
        cargarDatos();
    }, [user?.uid]);

    const cargarDatos = async () => {
        try {
            const savedServicios = await AsyncStorage.getItem(storageKey);
            if (savedServicios) {
                const parsed = JSON.parse(savedServicios) as TipoServicio[];
                // Merge default services with saved services
                const merged = [...SERVICIOS_DEFAULT];
                parsed.forEach((servicio) => {
                    const idx = merged.findIndex(s => s.id === servicio.id);
                    if (idx >= 0) {
                        // Update existing service (could be toggled off)
                        merged[idx] = { ...merged[idx], ...servicio };
                    } else {
                        // Add custom service
                        merged.push(servicio);
                    }
                });
                setServicios(merged);
            } else {
                setServicios(SERVICIOS_DEFAULT);
            }
        } catch (error) {
            console.error('Error loading servicios:', error);
            setServicios(SERVICIOS_DEFAULT);
        } finally {
            setLoading(false);
        }
    };

    const guardarServicios = async (newServicios: TipoServicio[]) => {
        try {
            // Only save non-default services and changes to default services
            const serviciosToSave = newServicios.filter(s => {
                if (!s.esDefault) return true; // Always save custom services
                // For default services, only save if they differ from default
                const defaultService = SERVICIOS_DEFAULT.find(d => d.id === s.id);
                return defaultService && JSON.stringify(defaultService) !== JSON.stringify(s);
            });
            await AsyncStorage.setItem(storageKey, JSON.stringify(serviciosToSave));
            setServicios(newServicios);
        } catch (error) {
            console.error('Error saving servicios:', error);
            throw error;
        }
    };

    const agregarServicio = async (servicio: Omit<TipoServicio, 'id' | 'esDefault'>): Promise<TipoServicio> => {
        const id = servicio.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_áéíóúñ]/gi, '');
        const nuevoServicio: TipoServicio = {
            id: `custom_${id}_${Date.now()}`,
            esDefault: false,
            ...servicio,
        };
        const newServicios = [...servicios, nuevoServicio];
        await guardarServicios(newServicios);
        return nuevoServicio;
    };

    const toggleServicio = async (id: string) => {
        const newServicios = servicios.map(s =>
            s.id === id ? { ...s, activo: !s.activo } : s
        );
        await guardarServicios(newServicios);
    };

    const eliminarServicio = async (id: string) => {
        const servicio = servicios.find(s => s.id === id);
        if (servicio?.esDefault) {
            throw new Error('No se puede eliminar un servicio por defecto');
        }
        const newServicios = servicios.filter(s => s.id !== id);
        await guardarServicios(newServicios);
    };

    const getServiciosPorCategoria = (categoria: CategoriaOperacion): TipoServicio[] => {
        return servicios.filter(s => s.categoria === categoria && s.activo);
    };

    const recargarServicios = async () => {
        setLoading(true);
        await cargarDatos();
    };

    const serviciosActivos = servicios.filter(s => s.activo);

    return (
        <ServiciosContext.Provider
            value={{
                servicios,
                serviciosActivos,
                loading,
                pendingServicioSeleccion,
                setPendingServicioSeleccion,
                agregarServicio,
                toggleServicio,
                eliminarServicio,
                getServiciosPorCategoria,
                recargarServicios,
            }}
        >
            {children}
        </ServiciosContext.Provider>
    );
}

export function useServicios() {
    const context = useContext(ServiciosContext);
    if (context === undefined) {
        throw new Error('useServicios must be used within a ServiciosProvider');
    }
    return context;
}
