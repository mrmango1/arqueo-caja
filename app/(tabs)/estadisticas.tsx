import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, Transaccion, getCategoriaById } from '@/types/caja';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect, useNavigation } from 'expo-router';
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
    const navigation = useNavigation();
    const [cajasCerradas, setCajasCerradas] = useState<Caja[]>([]);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headerHeight = useHeaderHeight();

    useFocusEffect(
        React.useCallback(() => {
            navigation.getParent()?.setOptions({
                headerShown: true,
                headerTitle: 'Estadísticas',
                headerRight: null,
                headerStyle: { backgroundColor: 'transparent' },
                headerTransparent: true,
            });
        }, [navigation, colors.background])
    );

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
        backgroundColor: isDark ? colors.surface : '#ffffff',
        backgroundGradientFrom: isDark ? colors.surface : '#ffffff',
        backgroundGradientTo: isDark ? colors.surface : '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => isDark ? `rgba(248, 250, 252, ${opacity})` : `rgba(15, 23, 42, ${opacity})`, // Theme text colors
        labelColor: (opacity = 1) => isDark ? `rgba(248, 250, 252, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
        propsForDots: { r: '4', strokeWidth: '0', stroke: isDark ? '#F8FAFC' : BrandColors.primary },
        fillShadowGradient: isDark ? '#F8FAFC' : BrandColors.primary,
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


            <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.contentContainer, { paddingTop: headerHeight }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BrandColors.primary} />}
            >
                {/* KPIs Grid */}
                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCardMain, { backgroundColor: colors.surface }]}>
                        <View>
                            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Ganancias Totales</Text>
                            <Text style={[styles.kpiValueMain, isDark && { color: '#10B981' }]}>${stats.totalComisiones.toFixed(0)}</Text>
                        </View>
                        <View style={[styles.kpiIcon, { backgroundColor: isDark ? 'rgba(248, 250, 252, 0.1)' : 'rgba(15, 23, 42, 0.1)' }]}>
                            <IconSymbol size={24} name="dollarsign" color={isDark ? '#F8FAFC' : BrandColors.primary} />
                        </View>
                    </View>

                    <View style={styles.subKpiRow}>
                        <View style={[styles.kpiCardSmall, { backgroundColor: colors.surface }]}>
                            <View style={[styles.kpiIconSmall, { backgroundColor: '#007AFF15' }]}>
                                <IconSymbol size={18} name="number" color="#007AFF" />
                            </View>
                            <Text style={[styles.kpiValueSmall, { color: colors.text }]}>{stats.totalOperaciones}</Text>
                            <Text style={[styles.kpiLabelSmall, { color: colors.textSecondary }]}>Operaciones</Text>
                        </View>
                        <View style={[styles.kpiCardSmall, { backgroundColor: colors.surface }]}>
                            <View style={[styles.kpiIconSmall, { backgroundColor: '#34C75915' }]}>
                                <IconSymbol size={18} name="chart.line.uptrend.xyaxis" color="#34C759" />
                            </View>
                            <Text style={[styles.kpiValueSmall, { color: colors.text }]}>${stats.promedioComisionDiario.toFixed(0)}</Text>
                            <Text style={[styles.kpiLabelSmall, { color: colors.textSecondary }]}>Promedio/Día</Text>
                        </View>
                    </View>
                </View>

                {/* Gráfico 1: Comisiones */}
                <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.chartHeader}>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Comisiones (7 días)</Text>
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
                <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }, { marginBottom: 16 }]}>Flujo de Caja</Text>

                    <View style={styles.flowItem}>
                        <View style={styles.flowHeader}>
                            <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Ingresos</Text>
                            <Text style={[styles.flowValue, { color: '#34C759' }]}>${(stats.totalDepositos / 1000).toFixed(1)}k</Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.backgroundTertiary : '#f0f0f0' }]}>
                            <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#34C759' }]} />
                        </View>
                    </View>

                    <View style={[styles.flowItem, { marginTop: 16 }]}>
                        <View style={styles.flowHeader}>
                            <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Egresos</Text>
                            <Text style={[styles.flowValue, { color: '#FF3B30' }]}>${(stats.totalRetiros / 1000).toFixed(1)}k</Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.backgroundTertiary : '#f0f0f0' }]}>
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
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.insightHeader}>
                        <IconSymbol size={18} name="lightbulb.fill" color="#FF9500" />
                        <Text style={[styles.insightTitle, { color: colors.text }]}>¿Sabías que?</Text>
                    </View>
                    <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                        Procesas un promedio de {stats.totalOperaciones > 0 && stats.diasTrabajados > 0 ? (stats.totalOperaciones / stats.diasTrabajados).toFixed(0) : 0} operaciones cada día que trabajas.
                    </Text>
                </View>

                {/* Distribución */}
                {distribucionData.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Tipos de Operación</Text>
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
    contentContainer: {
        paddingBottom: 40,
        paddingHorizontal: Spacing.lg,
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
    // cardDark is no longer used - colors.surface is applied directly
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
    // insightCardDark is no longer used - colors.surface is applied directly
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
