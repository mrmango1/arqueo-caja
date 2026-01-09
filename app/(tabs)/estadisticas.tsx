import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, Transaccion, getCategoriaById } from '@/types/caja';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

export default function EstadisticasScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const { user } = useAuth();
    const [cajasCerradas, setCajasCerradas] = useState<Caja[]>([]);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const cajasRef = ref(db, 'cajas');
        const transRef = ref(db, 'transacciones');

        const unsubCajas = onValue(cajasRef, (snapshot) => {
            const cajas: Caja[] = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const caja = child.val();
                    if (caja.usuarioId === user.uid && caja.estado === 'cerrada') {
                        cajas.push({ id: child.key, ...caja });
                    }
                });
            }
            cajas.sort((a, b) => (b.fechaCierre || 0) - (a.fechaCierre || 0));
            setCajasCerradas(cajas);
        });

        const unsubTrans = onValue(transRef, (snapshot) => {
            const trans: Transaccion[] = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const t = child.val();
                    if (t.usuarioId === user.uid) {
                        trans.push({ id: child.key, ...t });
                    }
                });
            }
            trans.sort((a, b) => b.fecha - a.fecha);
            setTransacciones(trans);
            setLoading(false);
        });

        return () => {
            unsubCajas();
            unsubTrans();
        };
    }, [user]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const stats = useMemo(() => {
        const totalComisiones = cajasCerradas.reduce((sum, c) => sum + (c.totalComisiones || 0), 0);
        const totalDepositos = cajasCerradas.reduce((sum, c) => sum + (c.totalDepositos || 0), 0);
        const totalRetiros = cajasCerradas.reduce((sum, c) => sum + (c.totalRetiros || 0), 0);
        const totalOperaciones = transacciones.length;
        const promedioComisionDiario = cajasCerradas.length > 0 ? totalComisiones / cajasCerradas.length : 0;

        return {
            totalComisiones,
            totalDepositos,
            totalRetiros,
            totalOperaciones,
            promedioComisionDiario,
            diasTrabajados: cajasCerradas.length,
        };
    }, [cajasCerradas, transacciones]);

    const comisionesChartData = useMemo(() => {
        const ultimos7 = cajasCerradas.slice(0, 7).reverse();
        const labels = ultimos7.map((c) => {
            const date = new Date(c.fechaCierre || 0);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });
        const data = ultimos7.map((c) => c.totalComisiones || 0);

        return {
            labels: labels.length > 0 ? labels : ['-'],
            datasets: [{ data: data.length > 0 ? data : [0] }],
        };
    }, [cajasCerradas]);

    const distribucionData = useMemo(() => {
        const categorias: { [key: string]: number } = {};
        transacciones.forEach((t) => {
            const cat = t.categoria || 'otro';
            categorias[cat] = (categorias[cat] || 0) + 1;
        });
        const colors = [BrandColors.primary, '#34C759', '#FF3B30', '#007AFF', '#5856D6', '#64748B', '#00C7BE'];
        return Object.entries(categorias).slice(0, 5).map(([key, value], index) => {
            const categoria = getCategoriaById(key as any);
            return {
                name: categoria?.nombreCorto || key,
                population: value,
                color: categoria?.color || colors[index % colors.length],
                legendFontColor: isDark ? '#fff' : '#666',
                legendFontSize: 11,
            };
        });
    }, [transacciones, isDark]);

    const movimientosData = useMemo(() => {
        const ultimos7 = cajasCerradas.slice(0, 7).reverse();
        const labels = ultimos7.map((c) => {
            const date = new Date(c.fechaCierre || 0);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        return {
            labels: labels.length > 0 ? labels : ['-'],
            datasets: [
                { data: ultimos7.map((c) => (c.totalDepositos || 0) / 1000), color: () => '#34C759' },
                { data: ultimos7.map((c) => (c.totalRetiros || 0) / 1000), color: () => '#FF3B30' },
            ],
            legend: ['Depósitos (K)', 'Retiros (K)'],
        };
    }, [cajasCerradas]);

    const chartConfig = {
        backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
        backgroundGradientFrom: isDark ? '#1c1c1e' : '#ffffff',
        backgroundGradientTo: isDark ? '#1c1c1e' : '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`, // Slate 900
        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
        propsForDots: { r: '4', strokeWidth: '0', stroke: BrandColors.primary },
        fillShadowGradient: BrandColors.primary,
        fillShadowGradientOpacity: 0.2,
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header unificado */}
            <View style={[styles.topBar, { backgroundColor: colors.background }]}>
                <Text style={[styles.topBarTitle, isDark && styles.textDark]}>Estadísticas</Text>
            </View>

            <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BrandColors.primary} />}
            >
                {/* KPIs Grid */}
                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCardMain, isDark && styles.cardDark]}>
                        <View>
                            <Text style={styles.kpiLabel}>Ganancias Totales</Text>
                            <Text style={styles.kpiValueMain}>${stats.totalComisiones.toFixed(0)}</Text>
                        </View>
                        <View style={[styles.kpiIcon, { backgroundColor: 'rgba(15, 23, 42, 0.1)' }]}>
                            <IconSymbol size={24} name="dollarsign" color={BrandColors.primary} />
                        </View>
                    </View>

                    <View style={styles.subKpiRow}>
                        <View style={[styles.kpiCardSmall, isDark && styles.cardDark]}>
                            <View style={[styles.kpiIconSmall, { backgroundColor: '#007AFF15' }]}>
                                <IconSymbol size={18} name="number" color="#007AFF" />
                            </View>
                            <Text style={[styles.kpiValueSmall, isDark && styles.textDark]}>{stats.totalOperaciones}</Text>
                            <Text style={styles.kpiLabelSmall}>Operaciones</Text>
                        </View>
                        <View style={[styles.kpiCardSmall, isDark && styles.cardDark]}>
                            <View style={[styles.kpiIconSmall, { backgroundColor: '#34C75915' }]}>
                                <IconSymbol size={18} name="chart.line.uptrend.xyaxis" color="#34C759" />
                            </View>
                            <Text style={[styles.kpiValueSmall, isDark && styles.textDark]}>${stats.promedioComisionDiario.toFixed(0)}</Text>
                            <Text style={styles.kpiLabelSmall}>Promedio/Día</Text>
                        </View>
                    </View>
                </View>

                {/* Gráfico 1: Comisiones */}
                <View style={[styles.chartCard, isDark && styles.cardDark]}>
                    <View style={styles.chartHeader}>
                        <Text style={[styles.chartTitle, isDark && styles.textDark]}>Comisiones (7 días)</Text>
                    </View>
                    {cajasCerradas.length > 0 ? (
                        <BarChart
                            data={comisionesChartData}
                            width={chartWidth - 40}
                            height={180}
                            yAxisLabel="$"
                            yAxisSuffix=""
                            chartConfig={chartConfig}
                            style={styles.chart}
                            fromZero
                            showValuesOnTopOfBars
                            flatColor={true}
                            withInnerLines={false}
                        />
                    ) : (
                        <View style={styles.noData}>
                            <Text style={styles.noDataText}>Sin datos suficientes</Text>
                        </View>
                    )}
                </View>

                {/* Resumen de Movimientos (Barras de progreso) */}
                <View style={[styles.chartCard, isDark && styles.cardDark]}>
                    <Text style={[styles.chartTitle, isDark && styles.textDark, { marginBottom: 16 }]}>Flujo de Caja</Text>

                    <View style={styles.flowItem}>
                        <View style={styles.flowHeader}>
                            <Text style={[styles.flowLabel, isDark && styles.textDarkSecondary]}>Ingresos</Text>
                            <Text style={[styles.flowValue, { color: '#34C759' }]}>${(stats.totalDepositos / 1000).toFixed(1)}k</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#34C759' }]} />
                        </View>
                    </View>

                    <View style={[styles.flowItem, { marginTop: 16 }]}>
                        <View style={styles.flowHeader}>
                            <Text style={[styles.flowLabel, isDark && styles.textDarkSecondary]}>Egresos</Text>
                            <Text style={[styles.flowValue, { color: '#FF3B30' }]}>${(stats.totalRetiros / 1000).toFixed(1)}k</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min((stats.totalRetiros / (stats.totalDepositos || 1)) * 100, 100)}%`,
                                        backgroundColor: '#FF3B30'
                                    }
                                ]}
                            />
                        </View>
                    </View>
                </View>

                {/* Insights */}
                <View style={[styles.insightCard, isDark && styles.insightCardDark]}>
                    <View style={styles.insightHeader}>
                        <IconSymbol size={18} name="lightbulb.fill" color="#FF9500" />
                        <Text style={[styles.insightTitle, isDark && styles.textDark]}>¿Sabías que?</Text>
                    </View>
                    <Text style={[styles.insightText, isDark && styles.textDarkSecondary]}>
                        Procesas un promedio de {stats.totalOperaciones > 0 && stats.diasTrabajados > 0 ? (stats.totalOperaciones / stats.diasTrabajados).toFixed(0) : 0} operaciones cada día que trabajas.
                    </Text>
                </View>

                {/* Distribución */}
                {distribucionData.length > 0 && (
                    <View style={[styles.chartCard, isDark && styles.cardDark]}>
                        <Text style={[styles.chartTitle, isDark && styles.textDark]}>Tipos de Operación</Text>
                        <PieChart
                            data={distribucionData}
                            width={chartWidth - 40}
                            height={160}
                            chartConfig={chartConfig}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="0"
                            absolute={false}
                            center={[10, 0]}
                        />
                    </View>
                )}

                <View style={{ height: 100 }} />
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
    topBar: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    topBarDark: {
    },
    topBarTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },

    // KPIs
    kpiGrid: {
        marginBottom: 20,
    },
    kpiCardMain: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
    },
    subKpiRow: {
        flexDirection: 'row',
        gap: 12,
    },
    kpiCardSmall: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    kpiLabel: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
        marginBottom: 4,
    },
    kpiValueMain: {
        fontSize: 32,
        fontWeight: '800',
        color: BrandColors.primary,
    },
    kpiIcon: {
        width: 50,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiIconSmall: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    kpiValueSmall: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 2,
    },
    kpiLabelSmall: {
        fontSize: 12,
        color: '#888',
    },

    // Charts
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    chart: {
        paddingRight: 0,
        paddingLeft: 0,
        paddingTop: 0,
    },
    noData: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        color: '#999',
    },

    // Flow
    flowItem: {
        width: '100%',
    },
    flowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    flowLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    flowValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },

    // Insight
    insightCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    insightCardDark: {
        backgroundColor: '#1c1c1e',
    },
    insightHeader: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    insightTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
    },
    insightText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },

    textDark: { color: '#fff' },
    textDarkSecondary: { color: '#888' },
});
