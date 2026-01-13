import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, SemanticColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, Transaccion, getCategoriaById } from '@/types/caja';
import { BlurView } from 'expo-blur';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { get, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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

    // Filter State
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'ingreso' | 'egreso'>('all');
    const [filterChannels, setFilterChannels] = useState<string[]>([]); // Store channel names
    const [filterCategories, setFilterCategories] = useState<string[]>([]); // Store category IDs

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

    // Recalcular valores en tiempo real para excluir anuladas (ALWAYS based on ALL transactions)
    const allTransaccionesValidas = transacciones.filter(t => !t.anulada);
    const totalDepositos = allTransaccionesValidas.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const totalRetiros = allTransaccionesValidas.filter(t => t.tipo === 'egreso').reduce((sum, t) => sum + t.monto, 0);
    const totalComisiones = allTransaccionesValidas.reduce((sum, t) => sum + (t.comision || 0), 0);

    // Derived data for filters
    const availableChannels = Array.from(new Set(transacciones.map(t => t.banco || 'Efectivo'))).filter(Boolean).sort();
    const availableCategories = Array.from(new Set(transacciones.map(t => t.categoria))).filter(Boolean);

    // Filtered Transactions
    const filteredTransacciones = transacciones.filter(t => {
        if (filterType !== 'all' && t.tipo !== filterType) return false;
        if (filterChannels.length > 0 && !filterChannels.includes(t.banco || 'Efectivo')) return false;
        if (filterCategories.length > 0 && !filterCategories.includes(t.categoria)) return false;
        return true;
    });

    const activeFiltersCount = (filterType !== 'all' ? 1 : 0) + filterChannels.length + filterCategories.length;

    const toggleChannel = (channel: string) => {
        setFilterChannels(prev =>
            prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
        );
    };

    const toggleCategory = (catId: string) => {
        setFilterCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const clearFilters = () => {
        setFilterType('all');
        setFilterChannels([]);
        setFilterCategories([]);
        setFiltersVisible(false);
    };

    const saldoEsperado = (caja.montoInicial || 0) + totalDepositos - totalRetiros + totalComisiones;
    const diferencia = (caja.montoFinal || 0) - saldoEsperado;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Detalle de Cierre',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerShadowVisible: false,
                    headerBackTitle: 'Atrás',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => setFiltersVisible(true)}
                            style={{ marginRight: 8, position: 'relative' }}
                        >
                            <IconSymbol
                                name={activeFiltersCount > 0 ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"}
                                size={24}
                                color={BrandColors.primary}
                            />
                            {activeFiltersCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    backgroundColor: SemanticColors.error,
                                    borderRadius: 10,
                                    width: 16,
                                    height: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 2,
                                    borderColor: colors.background
                                }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ),
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

                    {diferencia !== undefined && Math.abs(diferencia) > 0.01 && (
                        <View style={[
                            styles.diffBadge,
                            diferencia > 0 ? styles.diffPositive : styles.diffNegative
                        ]}>
                            <IconSymbol
                                size={16}
                                name={diferencia > 0 ? "arrow.up.circle.fill" : "exclamationmark.triangle.fill"}
                                color={diferencia > 0 ? SemanticColors.info : SemanticColors.error}
                            />
                            <Text style={[
                                styles.diffText,
                                { color: diferencia > 0 ? SemanticColors.info : SemanticColors.error }
                            ]}>
                                {diferencia > 0 ? 'Sobrante: ' : 'Faltante: '}
                                ${Math.abs(diferencia).toFixed(2)}
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
                                +${totalDepositos.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.balanceItem}>
                            <View style={[styles.iconBg, { backgroundColor: '#FF3B3015' }]}>
                                <IconSymbol size={20} name="arrow.up.right" color="#FF3B30" />
                            </View>
                            <Text style={styles.balanceLabel}>Egresos</Text>
                            <Text style={[styles.balanceValue, { color: '#FF3B30' }]}>
                                -${totalRetiros.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.balanceItem}>
                            <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(248, 250, 252, 0.1)' : 'rgba(15, 23, 42, 0.1)' }]}>
                                <IconSymbol size={20} name="dollarsign" color={isDark ? '#F8FAFC' : BrandColors.primary} />
                            </View>
                            <Text style={styles.balanceLabel}>Ganancia</Text>
                            <Text style={[styles.balanceValue, { color: isDark ? '#34C759' : BrandColors.primary }]}>
                                +${totalComisiones.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Saldos en Canales - Only show if data exists */}
                {(caja as any).saldosCanalesArqueo && (caja as any).saldosCanalesArqueo.length > 0 && (
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={styles.channelHeader}>
                            <IconSymbol size={18} name="building.columns.fill" color="#007AFF" />
                            <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginBottom: 0 }]}>Saldos en Canales</Text>
                        </View>

                        {(caja as any).saldosCanalesArqueo.map((canal: any, index: number) => (
                            <View key={canal.canalNombre} style={styles.channelItem}>
                                <View style={styles.channelRow}>
                                    <Text style={[styles.channelName, isDark && styles.textDark]}>{canal.canalNombre}</Text>
                                    <Text style={[styles.channelExpected, { color: '#007AFF' }]}>
                                        ${canal.saldoEsperado?.toFixed(2) || '0.00'}
                                    </Text>
                                </View>

                                <View style={styles.channelDetails}>
                                    <Text style={styles.channelDetailText}>
                                        Inicial: ${canal.saldoInicial?.toFixed(2) || '0.00'}
                                        {canal.depositos > 0 && ` • +$${canal.depositos.toFixed(2)} dep.`}
                                        {canal.retiros > 0 && ` • -$${canal.retiros.toFixed(2)} ret.`}
                                    </Text>
                                </View>

                                {canal.saldoReal !== null && (
                                    <View style={[
                                        styles.channelVerification,
                                        canal.diferencia === 0
                                            ? { backgroundColor: 'rgba(52, 199, 89, 0.1)' }
                                            : canal.diferencia > 0
                                                ? { backgroundColor: 'rgba(14, 165, 233, 0.1)' }
                                                : { backgroundColor: 'rgba(255, 59, 48, 0.1)' }
                                    ]}>
                                        <IconSymbol
                                            size={14}
                                            name={canal.diferencia === 0 ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                                            color={canal.diferencia === 0 ? '#34C759' : canal.diferencia > 0 ? '#0EA5E9' : '#FF3B30'}
                                        />
                                        <Text style={styles.channelVerificationText}>
                                            Contado: ${canal.saldoReal?.toFixed(2)}
                                        </Text>
                                        <Text style={[
                                            styles.channelDiff,
                                            { color: canal.diferencia === 0 ? '#34C759' : canal.diferencia > 0 ? '#0EA5E9' : '#FF3B30' }
                                        ]}>
                                            {canal.diferencia >= 0 ? '+' : ''}${canal.diferencia?.toFixed(2)}
                                        </Text>
                                    </View>
                                )}

                                {index < (caja as any).saldosCanalesArqueo.length - 1 && (
                                    <View style={[styles.channelDivider, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]} />
                                )}
                            </View>
                        ))}

                        {/* Total de canales */}
                        <View style={[styles.channelTotal, { borderTopColor: isDark ? '#333' : '#e0e0e0' }]}>
                            <Text style={[styles.channelTotalLabel, isDark && styles.textDark]}>Total Esperado en Canales</Text>
                            <Text style={styles.channelTotalValue}>
                                ${(caja as any).saldosCanalesArqueo.reduce((sum: number, c: any) => sum + (c.saldoEsperado || 0), 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Lista de Transacciones */}
                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, isDark && styles.textDark]}>
                        Movimientos ({filteredTransacciones.length})
                    </Text>
                    {activeFiltersCount > 0 && (
                        <Pressable onPress={clearFilters}>
                            <Text style={{ color: BrandColors.primary, fontSize: 14 }}>Limpiar filtros</Text>
                        </Pressable>
                    )}
                </View>

                {filteredTransacciones.map((trans, index) => {
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

            {/* Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={filtersVisible}
                onRequestClose={() => setFiltersVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDark && styles.textDark]}>Filtrar Movimientos</Text>
                            <Pressable onPress={() => setFiltersVisible(false)}>
                                <IconSymbol name="xmark.circle.fill" size={24} color="#888" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Transaction Type */}
                            <Text style={[styles.filterSectionTitle, isDark && styles.textDark]}>Tipo</Text>
                            <View style={styles.filterChipContainer}>
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'ingreso', label: 'Ingresos' },
                                    { id: 'egreso', label: 'Egresos' }
                                ].map((type) => (
                                    <Pressable
                                        key={type.id}
                                        style={[
                                            styles.filterChip,
                                            filterType === type.id && { backgroundColor: BrandColors.primary },
                                            isDark && filterType !== type.id && { backgroundColor: '#333' }
                                        ]}
                                        onPress={() => setFilterType(type.id as any)}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            filterType === type.id && { color: '#fff' },
                                            isDark && filterType !== type.id && { color: '#ccc' }
                                        ]}>{type.label}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* Channels */}
                            {availableChannels.length > 0 && (
                                <>
                                    <Text style={[styles.filterSectionTitle, isDark && styles.textDark]}>Canales</Text>
                                    <View style={styles.filterChipContainer}>
                                        {availableChannels.map((channel) => (
                                            <Pressable
                                                key={channel}
                                                style={[
                                                    styles.filterChip,
                                                    filterChannels.includes(channel) && { backgroundColor: BrandColors.primary },
                                                    isDark && !filterChannels.includes(channel) && { backgroundColor: '#333' }
                                                ]}
                                                onPress={() => toggleChannel(channel)}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    filterChannels.includes(channel) && { color: '#fff' },
                                                    isDark && !filterChannels.includes(channel) && { color: '#ccc' }
                                                ]}>{channel}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* Categories */}
                            {availableCategories.length > 0 && (
                                <>
                                    <Text style={[styles.filterSectionTitle, isDark && styles.textDark]}>Servicios / Categorías</Text>
                                    <View style={styles.filterChipContainer}>
                                        {availableCategories.map((catId) => {
                                            const cat = getCategoriaById(catId);
                                            return (
                                                <Pressable
                                                    key={catId}
                                                    style={[
                                                        styles.filterChip,
                                                        filterCategories.includes(catId) && { backgroundColor: BrandColors.primary },
                                                        isDark && !filterCategories.includes(catId) && { backgroundColor: '#333' }
                                                    ]}
                                                    onPress={() => toggleCategory(catId)}
                                                >
                                                    <Text style={[
                                                        styles.filterChipText,
                                                        filterCategories.includes(catId) && { color: '#fff' },
                                                        isDark && !filterCategories.includes(catId) && { color: '#ccc' }
                                                    ]}>{cat?.nombre || catId}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable style={styles.applyButton} onPress={() => setFiltersVisible(false)}>
                                <Text style={styles.applyButtonText}>Ver Resultados</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: '#0F172A',
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
    channelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    channelItem: {
        marginBottom: 8,
    },
    channelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    channelName: {
        fontSize: 15,
        fontWeight: '600',
    },
    channelExpected: {
        fontSize: 16,
        fontWeight: '700',
    },
    channelDetails: {
        marginBottom: 8,
    },
    channelDetailText: {
        fontSize: 12,
        color: '#888',
    },
    channelVerification: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        marginTop: 4,
    },
    channelVerificationText: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    channelDiff: {
        fontSize: 14,
        fontWeight: '700',
    },
    channelDivider: {
        height: 1,
        marginVertical: 12,
    },
    channelTotal: {
        borderTopWidth: 1,
        paddingTop: 16,
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    channelTotalLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    channelTotalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#007AFF',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    modalBody: {
        marginBottom: 20,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 12,
        marginTop: 8,
    },
    filterChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    modalFooter: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    applyButton: {
        backgroundColor: BrandColors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
        marginLeft: 4,
        paddingRight: 4,
    },
});


