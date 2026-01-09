import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, SemanticColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, Transaccion, getCategoriaById } from '@/types/caja';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function DetalleCajaScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const { user } = useAuth();

    const [caja, setCaja] = useState<Caja | null>(null);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !id) return;

        const fetchData = async () => {
            try {
                const cajaRef = ref(db, `cajas/${id}`);
                const cajaSnapshot = await get(cajaRef);

                if (cajaSnapshot.exists()) {
                    const cajaData = cajaSnapshot.val();
                    setCaja({ id: cajaSnapshot.key, ...cajaData });

                    const transRef = ref(db, 'transacciones');
                    const transSnapshot = await get(transRef);
                    const trans: Transaccion[] = [];

                    if (transSnapshot.exists()) {
                        transSnapshot.forEach((child) => {
                            const t = child.val();
                            if (t.cajaId === id) {
                                trans.push({ id: child.key, ...t });
                            }
                        });
                    }
                    trans.sort((a, b) => b.fecha - a.fecha);
                    setTransacciones(trans);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, id]);

    const formatDate = (timestamp: number | undefined) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (timestamp: number | undefined) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
        );
    }

    if (!caja) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Detalle de Cierre',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerShadowVisible: false,
                    headerBackTitle: 'Atrás',
                }}
            />

            <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {/* Info Principal */}
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <Text style={[styles.dateTitle, isDark && styles.textDark]}>{formatDate(caja.fechaCierre)}</Text>
                    <Text style={styles.timeSubtitle}>
                        {formatTime(caja.fechaApertura)} - {formatTime(caja.fechaCierre)}
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.summaryLabel}>Monto Inicial</Text>
                            <Text style={[styles.summaryValue, isDark && styles.textDark]}>${caja.montoInicial.toFixed(2)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.summaryLabel}>Monto Final</Text>
                            <Text style={[styles.summaryValue, isDark && styles.textDark]}>${(caja.montoFinal || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    {caja.diferencia !== undefined && caja.diferencia !== 0 && (
                        <View style={[
                            styles.diffBadge,
                            caja.diferencia > 0 ? styles.diffPositive : styles.diffNegative
                        ]}>
                            <IconSymbol
                                size={16}
                                name={caja.diferencia > 0 ? "arrow.up.circle.fill" : "exclamationmark.triangle.fill"}
                                color={caja.diferencia > 0 ? SemanticColors.info : SemanticColors.error}
                            />
                            <Text style={[
                                styles.diffText,
                                { color: caja.diferencia > 0 ? SemanticColors.info : SemanticColors.error }
                            ]}>
                                {caja.diferencia > 0 ? 'Sobrante: ' : 'Faltante: '}
                                ${Math.abs(caja.diferencia).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {caja.notas && (
                        <View style={styles.notesContainer}>
                            <IconSymbol size={16} name="quote.opening" color="#888" />
                            <Text style={[styles.notesText, isDark && styles.textDarkSecondary]}>{caja.notas}</Text>
                        </View>
                    )}
                </View>

                {/* Resumen Financiero */}
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Balance</Text>

                    <View style={styles.balanceRow}>
                        <View style={styles.balanceItem}>
                            <View style={[styles.iconBg, { backgroundColor: '#34C75915' }]}>
                                <IconSymbol size={20} name="arrow.down.left" color="#34C759" />
                            </View>
                            <Text style={styles.balanceLabel}>Ingresos</Text>
                            <Text style={[styles.balanceValue, { color: '#34C759' }]}>
                                +${(caja.totalDepositos || 0).toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.balanceItem}>
                            <View style={[styles.iconBg, { backgroundColor: '#FF3B3015' }]}>
                                <IconSymbol size={20} name="arrow.up.right" color="#FF3B30" />
                            </View>
                            <Text style={styles.balanceLabel}>Egresos</Text>
                            <Text style={[styles.balanceValue, { color: '#FF3B30' }]}>
                                -${(caja.totalRetiros || 0).toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.balanceItem}>
                            <View style={[styles.iconBg, { backgroundColor: 'rgba(15, 23, 42, 0.1)' }]}>
                                <IconSymbol size={20} name="dollarsign" color={BrandColors.primary} />
                            </View>
                            <Text style={styles.balanceLabel}>Ganancia</Text>
                            <Text style={[styles.balanceValue, { color: BrandColors.primary }]}>
                                +${(caja.totalComisiones || 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Lista de Transacciones */}
                <Text style={[styles.listTitle, isDark && styles.textDark]}>Movimientos ({transacciones.length})</Text>

                {transacciones.map((trans, index) => {
                    const categoria = getCategoriaById(trans.categoria);
                    return (
                        <View
                            key={trans.id}
                            style={[
                                styles.transItem,
                                isDark && styles.cardDark,
                                trans.anulada && { opacity: 0.5 }
                            ]}
                        >
                            <View style={[styles.transIcon, { backgroundColor: trans.anulada ? (isDark ? '#333' : '#eee') : `${categoria?.color}20` }]}>
                                <IconSymbol
                                    size={20}
                                    name={trans.anulada ? 'xmark.circle.fill' : (categoria?.icono || 'circle')}
                                    color={trans.anulada ? (isDark ? '#555' : '#999') : (categoria?.color || '#888')}
                                />
                            </View>

                            <View style={styles.transContent}>
                                <Text style={[
                                    styles.transTitle,
                                    isDark && styles.textDark,
                                    trans.anulada && { textDecorationLine: 'line-through', color: isDark ? '#555' : '#999' }
                                ]}>
                                    {categoria?.nombre || trans.concepto} {trans.anulada ? '(Anulada)' : ''}
                                </Text>
                                <Text style={styles.transTime}>
                                    {new Date(trans.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} • {trans.banco || 'Efectivo'}
                                </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[
                                    styles.transAmount,
                                    { color: trans.anulada ? (isDark ? '#555' : '#999') : (trans.tipo === 'ingreso' ? '#34C759' : '#FF3B30') },
                                    trans.anulada && { textDecorationLine: 'line-through' }
                                ]}>
                                    {trans.tipo === 'ingreso' ? '+' : '-'}${trans.monto.toFixed(2)}
                                </Text>
                                {!trans.anulada && trans.comision > 0 && (
                                    <Text style={styles.transCom}>
                                        +${trans.comision.toFixed(2)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerDark: {
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
    },
    dateTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
        marginBottom: 4,
        textTransform: 'capitalize',
    },
    timeSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 13,
        color: '#888',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
    },
    diffPositive: {
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
    },
    diffNegative: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    diffText: {
        fontWeight: '600',
        fontSize: 14,
    },
    notesContainer: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 12,
    },
    notesText: {
        flex: 1,
        fontSize: 14,
        color: '#444',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    balanceItem: {
        flex: 1,
        alignItems: 'center',
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    balanceLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
        marginTop: 8,
        marginLeft: 4,
    },
    transItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    transIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transContent: {
        flex: 1,
    },
    transTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    transTime: {
        fontSize: 12,
        color: '#888',
    },
    transAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    transCom: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    textDark: { color: '#fff' },
    textDarkSecondary: { color: '#888' },
});
