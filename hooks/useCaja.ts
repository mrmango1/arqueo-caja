import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { Caja } from '@/types/caja';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

export function useCaja() {
    const { user } = useAuth();
    const [cajaActual, setCajaActual] = useState<Caja | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const cajasRef = ref(db, 'cajas');
        // Usar onValue para actualizaciones en tiempo real
        const unsubscribe = onValue(cajasRef, (snapshot) => {
            let cajaAbierta: Caja | null = null;
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const caja = child.val();
                    if (caja.usuarioId === user.uid && caja.estado === 'abierta') {
                        cajaAbierta = { id: child.key, ...caja };
                    }
                });
            }
            setCajaActual(cajaAbierta);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { cajaActual, loading, isAbierta: !!cajaActual };
}
