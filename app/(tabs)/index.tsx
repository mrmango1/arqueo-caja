import { ActionGrid } from '@/components/ui/action-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { TransactionItem } from '@/components/ui/transaction-item';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, getCategoriaById, SaldoCanalInicial, Transaccion } from '@/types/caja';
import { calcularSaldosCanales } from '@/utils/channel-balances';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { get, onValue, ref, update } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import Animated, {
  FadeInUp
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Activar LayoutAnimation para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user } = useAuth();
  const { canalesActivos } = useCanales();
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarSaldosCanales, setMostrarSaldosCanales] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 5000);

    const cajasRef = ref(db, 'cajas');
    const unsubscribe = onValue(cajasRef, (snapshot) => {
      clearTimeout(timeout);

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

      if (cajaAbierta) {
        const transRef = ref(db, 'transacciones');
        onValue(transRef, (transSnapshot) => {
          const trans: Transaccion[] = [];
          if (transSnapshot.exists()) {
            transSnapshot.forEach((child) => {
              const t = child.val();
              if (t.cajaId === cajaAbierta!.id) {
                trans.push({ id: child.key, ...t });
              }
            });
          }
          trans.sort((a, b) => b.fecha - a.fecha);
          setTransacciones(trans);
          setLoading(false);
        });
      } else {
        setTransacciones([]);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user]);

  const headerHeight = useHeaderHeight();

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        headerShown: true,
        headerTitle: 'Mi Caja',
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/cerrar-caja')}
            style={[styles.closeButton]}
            activeOpacity={0.7}
          >
            <IconSymbol size={16} name="lock.fill" color={isDark ? '#F8FAFC' : BrandColors.primary} />
          </TouchableOpacity>
        ),
        headerStyle: { backgroundColor: 'transparent' },
        headerTransparent: true,
      });
    }, [navigation, colors.background, isDark])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const { totalDepositos, totalRetiros, totalComisiones, saldoActual, cantidadOperaciones } = useMemo(() => {
    const validas = transacciones.filter(t => !t.anulada);
    const depositos = validas.filter((t) => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const retiros = validas.filter((t) => t.tipo === 'egreso').reduce((sum, t) => sum + t.monto, 0);
    const comisiones = validas.reduce((sum, t) => sum + (t.comision || 0), 0);
    const saldo = cajaActual ? cajaActual.montoInicial + depositos - retiros + comisiones : 0;
    return {
      totalDepositos: depositos,
      totalRetiros: retiros,
      totalComisiones: comisiones,
      saldoActual: saldo,
      cantidadOperaciones: validas.length
    };
  }, [transacciones, cajaActual]);

  const saldosPorCanal = useMemo(() => {
    if (!cajaActual) return [];
    const saldosIniciales: SaldoCanalInicial[] = (cajaActual as any).saldosCanales || [];

    // Use centralized function for consistent channel balance calculations
    return calcularSaldosCanales(saldosIniciales, transacciones, canalesActivos);
  }, [cajaActual, transacciones, canalesActivos]);

  const toggleSaldos = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMostrarSaldosCanales(!mostrarSaldosCanales);
  };

  const handleReversarTransaccion = (transaccion: Transaccion) => {
    Alert.alert(
      'Reversar Transacción',
      `¿Estás seguro de eliminar esta transacción de ${transaccion.concepto}? Se ajustarán los saldos automáticamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!cajaActual) return;
            setLoading(true);
            try {
              const cajaRef = ref(db, `cajas/${cajaActual.id}`);
              const cajaSnapshot = await get(cajaRef);

              if (cajaSnapshot.exists()) {
                const cajaData = cajaSnapshot.val();
                const updates: any = {};

                if (transaccion.tipo === 'ingreso') {
                  if (transaccion.categoria === 'deposito') {
                    updates.totalDepositos = (cajaData.totalDepositos || 0) - transaccion.monto;
                  } else {
                    updates.totalOtrosIngresos = (cajaData.totalOtrosIngresos || 0) - transaccion.monto;
                  }
                  updates.saldoEsperado = (cajaData.saldoEsperado || cajaData.montoInicial) - transaccion.monto - (transaccion.comision || 0);
                } else {
                  if (transaccion.categoria === 'retiro') {
                    updates.totalRetiros = (cajaData.totalRetiros || 0) - transaccion.monto;
                  } else {
                    updates.totalOtrosEgresos = (cajaData.totalOtrosEgresos || 0) - transaccion.monto;
                  }
                  updates.saldoEsperado = (cajaData.saldoEsperado || cajaData.montoInicial) + transaccion.monto - (transaccion.comision || 0);
                }

                updates.totalComisiones = (cajaData.totalComisiones || 0) - (transaccion.comision || 0);

                await update(cajaRef, updates);
                await update(ref(db, `transacciones/${transaccion.id}`), { anulada: true });

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Éxito', 'Transacción reversada correctamente');
              }
            } catch (error) {
              console.error(error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'No se pudo reversar la transacción');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Quick Actions
  const quickActions = [
    { id: 'deposito', label: 'Depósito', icon: 'arrow.down' as const, color: '#34C759', onPress: () => router.push('/nueva-operacion?tipo=deposito') },
    { id: 'retiro', label: 'Retiro', icon: 'arrow.up' as const, color: '#FF3B30', onPress: () => router.push('/nueva-operacion?tipo=retiro') },
    { id: 'servicios', label: 'Servicios', icon: 'doc.text.fill' as const, color: '#007AFF', onPress: () => router.push('/nueva-operacion?tipo=pago_servicios') },
    { id: 'recargas', label: 'Recargas', icon: 'bolt.fill' as const, color: '#5856D6', onPress: () => router.push('/nueva-operacion?tipo=recarga') },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // SIN CAJA ABIERTA
  if (!cajaActual) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: headerHeight }]}>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary, marginTop: Spacing.lg, marginHorizontal: Spacing.lg }]}>
          Hola, {user?.displayName?.split(' ')[0] || 'Corresponsal'} 👋
        </Text>

        <EmptyState
          icon="lock.fill"
          iconColor={BrandColors.primary}
          title="Caja Cerrada"
          description="Abre tu caja para comenzar a registrar operaciones del día."
          action={{
            label: 'Abrir Caja Ahora',
            onPress: () => router.push('/abrir-caja'),
            icon: 'arrow.right',
          }}
          style={{ marginTop: -80 }}
        />
      </View>
    );
  }

  // CON CAJA ABIERTA
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingTop: headerHeight }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
      >
        {/* Header - Date */}
        <View style={{ marginBottom: Spacing.base, marginTop: Spacing.md }}>
          <Text style={[styles.topBarDate, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        {/* Balance Card - Hero */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View
            style={[styles.balanceCard, Shadows.primary, { backgroundColor: BrandColors.primary }]}
          >
            <View style={styles.balanceCardTop}>
              <View>
                <Text style={styles.balanceLabel}>Saldo Disponible</Text>
                <Text style={styles.balanceAmount}>
                  ${saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.balanceIconBg}>
                <IconSymbol size={24} name="dollarsign.circle.fill" color="#fff" />
              </View>
            </View>

            <View style={styles.balanceStatsRow}>
              <View style={styles.balanceStatItem}>
                <Text style={styles.balanceStatLabel}>Inicio</Text>
                <Text style={styles.balanceStatValue}>${cajaActual.montoInicial.toFixed(0)}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStatItem}>
                <Text style={styles.balanceStatLabel}>Ops</Text>
                <Text style={styles.balanceStatValue}>{cantidadOperaciones}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStatItem}>
                <Text style={styles.balanceStatLabel}>Ganancia</Text>
                <Text style={styles.balanceStatValue}>${totalComisiones.toFixed(2)}</Text>
              </View>
            </View>

            {/* Saldos por Canal */}
            {saldosPorCanal.length > 0 && (
              <View style={styles.canalesSection}>
                <TouchableOpacity
                  style={styles.canalesToggle}
                  onPress={toggleSaldos}
                  activeOpacity={0.7}
                >
                  <View style={styles.canalesToggleLeft}>
                    <IconSymbol size={18} name="building.columns.fill" color="#fff" />
                    <Text style={styles.canalesToggleText}>Saldos en Bancos</Text>
                  </View>
                  <IconSymbol
                    size={16}
                    name={mostrarSaldosCanales ? "chevron.up" : "chevron.down"}
                    color="rgba(255,255,255,0.8)"
                  />
                </TouchableOpacity>

                {mostrarSaldosCanales && (
                  <View style={styles.canalesList}>
                    {saldosPorCanal.map((saldo, index) => (
                      <View
                        key={saldo.canalId}
                        style={[
                          styles.canalItem,
                          index > 0 && styles.canalItemBorder
                        ]}
                      >
                        <View style={styles.canalInfo}>
                          <Text style={styles.canalName}>{saldo.canalNombre}</Text>
                          <View style={styles.canalMovimientos}>
                            {saldo.entradas > 0 && (
                              <Text style={styles.canalMovimiento}>↑ ${saldo.entradas}</Text>
                            )}
                            {saldo.salidas > 0 && (
                              <Text style={styles.canalMovimiento}>↓ ${saldo.salidas}</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.canalSaldo}>
                          ${saldo.saldoEsperado.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Summary Cards Row */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={styles.summaryRow}
        >
          <View style={[styles.summaryItem, { backgroundColor: colors.surface }, Shadows.xs]}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
              <IconSymbol size={16} name="arrow.down.left" color="#34C759" />
            </View>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                +${totalDepositos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryItem, { backgroundColor: colors.surface }, Shadows.xs]}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 59, 48, 0.12)' }]}>
              <IconSymbol size={16} name="arrow.up.right" color="#FF3B30" />
            </View>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Egresos</Text>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                -${totalRetiros.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <SectionHeader title="Acciones Rápidas" />
          <ActionGrid actions={quickActions} columns={4} />

          <TouchableOpacity
            style={[
              styles.moreActionsBtn,
              {
                marginTop: Spacing.lg,
                backgroundColor: colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 4,
              }
            ]}
            onPress={() => router.push('/nueva-operacion')}
            activeOpacity={0.7}
          >
            <Text style={[styles.moreActionsText, { color: colors.textSecondary }]}>
              Ver todas las operaciones
            </Text>
            <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={{ marginTop: Spacing.lg }}
        >
          <SectionHeader
            title="Recientes"
            action={transacciones.length > 5 ? {
              label: 'Ver todo',
              onPress: () => router.push('/(tabs)/historial'),
            } : undefined}
          />

          {transacciones.length === 0 ? (
            <View style={[styles.emptyList, { backgroundColor: colors.surface }]}>
              <IconSymbol size={32} name="clock" color={colors.textTertiary} />
              <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                Aún no hay movimientos hoy
              </Text>
            </View>
          ) : (
            <View style={[styles.transactionsList, { backgroundColor: colors.surface }, Shadows.xs]}>
              {transacciones.slice(0, 10).map((trans, index) => {
                const categoria = getCategoriaById(trans.categoria);
                return (
                  <React.Fragment key={trans.id}>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
                    <TransactionItem
                      id={trans.id || ''}
                      title={categoria?.nombre || trans.concepto}
                      subtitle={trans.banco}
                      timestamp={new Date(trans.fecha).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      amount={trans.monto}
                      type={trans.tipo === 'ingreso' ? 'income' : 'expense'}
                      icon={categoria?.icono || 'circle'}
                      iconColor={categoria?.color || '#888'}
                      commission={trans.comision}
                      voided={trans.anulada}
                      onLongPress={() => !trans.anulada && handleReversarTransaccion(trans)}
                      index={0}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerSimple: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },

  // Top Bar
  topBar: {
    paddingTop: 60,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topBarDate: {
    fontSize: 13,
    textTransform: 'capitalize',
    marginTop: 2,
  },


  // Scroll
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },

  // Balance Card
  balanceCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  balanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  balanceStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  balanceStatValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Canales Section
  canalesSection: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.base,
  },
  canalesToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  canalesToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  canalesToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  canalesList: {
    marginTop: Spacing.base,
  },
  canalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  canalItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  canalInfo: {
    flex: 1,
  },
  canalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  canalMovimientos: {
    flexDirection: 'row',
    gap: 8,
  },
  canalMovimiento: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  canalSaldo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryItem: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
  },

  // More Actions Button
  moreActionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    gap: 6,
  },
  moreActionsText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Transactions List
  transactionsList: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  emptyList: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyListText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.base,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
