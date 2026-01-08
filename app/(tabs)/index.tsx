import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, getCategoriaById, SaldoCanalInicial, Transaccion } from '@/types/caja';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { get, onValue, ref, update } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Activar LayoutAnimation para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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
          trans.sort((a, b) => b.fecha - a.fecha); // Ordenar por fecha descendente
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simular recarga ya que Firebase es tiempo real
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
    const movimientosPorCanal: { [key: string]: { entradas: number; salidas: number } } = {};
    const categoriasAumentan = ['retiro', 'giro'];
    const categoriasDisminuyen = ['deposito', 'recarga', 'pago_servicios', 'pago_varios'];

    transacciones.filter(t => !t.anulada).forEach((t) => {
      if (t.banco) {
        const canal = canalesActivos.find(c => c.nombre === t.banco);
        if (canal) {
          if (!movimientosPorCanal[canal.id]) {
            movimientosPorCanal[canal.id] = { entradas: 0, salidas: 0 };
          }
          if (categoriasAumentan.includes(t.categoria)) {
            movimientosPorCanal[canal.id].entradas += t.monto;
          } else if (categoriasDisminuyen.includes(t.categoria)) {
            movimientosPorCanal[canal.id].salidas += t.monto;
          }
        }
      }
    });

    return canalesActivos.map(canal => {
      const saldoInicial = saldosIniciales.find(s => s.canalId === canal.id)?.saldo || 0;
      const movimientos = movimientosPorCanal[canal.id] || { entradas: 0, salidas: 0 };
      const saldoActual = saldoInicial + movimientos.entradas - movimientos.salidas;
      return {
        canalId: canal.id,
        canalNombre: canal.nombre,
        saldoInicial,
        entradas: movimientos.entradas,
        salidas: movimientos.salidas,
        saldoActual,
      };
    }).filter(s => s.saldoInicial !== 0 || s.entradas !== 0 || s.salidas !== 0);
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

                // Revertir contadores
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

                // Actualizar caja y marcar transacción como anulada
                await update(cajaRef, updates);
                await update(ref(db, `transacciones/${transaccion.id}`), { anulada: true });

                Alert.alert('Éxito', 'Transacción reversada correctamente');
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo reversar la transacción');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  // SIN CAJA ABIERTA
  if (!cajaActual) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.headerSimple, isDark && styles.headerSimpleDark]}>
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>Mi Negocio</Text>
          <Text style={[styles.headerSubtitle, isDark && styles.textDarkSecondary]}>
            Hola, {user?.displayName?.split(' ')[0] || 'Corresponsal'} 👋
          </Text>
        </View>
        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyIcon, isDark && styles.emptyIconDark]}>
            <IconSymbol size={40} name="lock.fill" color="#FF6B00" />
          </View>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>Caja Cerrada</Text>
          <Text style={[styles.emptySubtitle, isDark && styles.textDarkSecondary]}>
            Abre tu caja para comenzar a registrar operaciones del día.
          </Text>
          <TouchableOpacity
            style={styles.openCajaButton}
            onPress={() => router.push('/abrir-caja')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF8533']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.openCajaGradient}
            >
              <Text style={styles.openCajaText}>Abrir Caja Ahora</Text>
              <IconSymbol size={20} name="arrow.right" color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // CON CAJA ABIERTA
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header fijo minimalista */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <View>
          <Text style={[styles.topBarTitle, isDark && styles.textDark]}>Mi Caja</Text>
          <Text style={[styles.topBarDate, isDark && styles.textDarkSecondary]}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/cerrar-caja')}
          style={[styles.closeButton, isDark && styles.closeButtonDark]}
        >
          <IconSymbol size={16} name="lock.fill" color={isDark ? '#FF6B00' : '#FF6B00'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
      >
        {/* Tarjeta Principal de Balance */}
        <LinearGradient
          colors={['#FF6B00', '#FF8E00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
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
              <Text style={styles.balanceStatLabel}>Coms</Text>
              <Text style={styles.balanceStatValue}>${totalComisiones.toFixed(2)}</Text>
            </View>
          </View>

          {/* Saldos por Canal (Integrado) */}
          {saldosPorCanal.length > 0 && (
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={toggleSaldos}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <IconSymbol size={18} name="building.columns.fill" color="#fff" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Saldos en Bancos</Text>
                </View>
                <IconSymbol size={16} name={mostrarSaldosCanales ? "chevron.up" : "chevron.down"} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>

              {mostrarSaldosCanales && (
                <View style={{ marginTop: 16 }}>
                  {saldosPorCanal.map((saldo, index) => (
                    <View key={saldo.canalId} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: 'rgba(255,255,255,0.1)'
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 }}>{saldo.canalNombre}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {saldo.entradas > 0 && <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>↑ ${saldo.entradas}</Text>}
                          {saldo.salidas > 0 && <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>↓ ${saldo.salidas}</Text>}
                        </View>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                        ${saldo.saldoActual.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </LinearGradient>

        {/* Resumen Entradas / Salidas */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, isDark && styles.cardDark]}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
              <IconSymbol size={16} name="arrow.down.left" color="#34C759" />
            </View>
            <View>
              <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Ingresos</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                +${totalDepositos.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.summaryItem, isDark && styles.cardDark]}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
              <IconSymbol size={16} name="arrow.up.right" color="#FF3B30" />
            </View>
            <View>
              <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Egresos</Text>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                -${totalRetiros.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas (Grid Unificado) */}
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, isDark && styles.cardDark]}
            onPress={() => router.push('/nueva-operacion?tipo=deposito')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#34C759' }]}>
              <IconSymbol size={22} name="arrow.down" color="#fff" />
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textDark]}>Depósito</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isDark && styles.cardDark]}
            onPress={() => router.push('/nueva-operacion?tipo=retiro')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF3B30' }]}>
              <IconSymbol size={22} name="arrow.up" color="#fff" />
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textDark]}>Retiro</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isDark && styles.cardDark]}
            onPress={() => router.push('/nueva-operacion?tipo=pago_servicios')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
              <IconSymbol size={22} name="doc.text.fill" color="#fff" />
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textDark]}>Servicios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isDark && styles.cardDark]}
            onPress={() => router.push('/nueva-operacion?tipo=recarga')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#5856D6' }]}>
              <IconSymbol size={22} name="bolt.fill" color="#fff" />
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textDark]}>Recargas</Text>
          </TouchableOpacity>
        </View>
        {/* Botón extra para más acciones */}
        <TouchableOpacity
          style={[styles.moreActionsBtn, isDark && styles.cardDark]}
          onPress={() => router.push('/nueva-operacion')}
          activeOpacity={0.7}
        >
          <Text style={[styles.moreActionsText, { color: isDark ? '#fff' : '#555' }]}>Ver todas las operaciones</Text>
          <IconSymbol size={16} name="chevron.right" color={isDark ? '#666' : '#bbb'} />
        </TouchableOpacity>



        {/* Últimas Transacciones */}
        <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginTop: 24 }]}>Recientes</Text>
        {transacciones.length === 0 ? (
          <View style={[styles.emptyList, isDark && styles.cardDark]}>
            <Text style={[styles.emptyListText, isDark && styles.textDarkSecondary]}>Aún no hay movimientos hoy</Text>
          </View>
        ) : (
          <View style={[styles.transactionsList, isDark && styles.cardDark]}>
            {transacciones.slice(0, 10).map((trans, index) => {
              const categoria = getCategoriaById(trans.categoria);
              return (
                <TouchableOpacity
                  key={trans.id}
                  style={[
                    styles.transItem,
                    index > 0 && styles.transBorder,
                    isDark && styles.transBorderDark,
                    trans.anulada && { opacity: 0.5 }
                  ]}
                  onLongPress={() => !trans.anulada && handleReversarTransaccion(trans)}
                  activeOpacity={trans.anulada ? 1 : 0.7}
                >
                  <View style={[styles.transIcon, { backgroundColor: trans.anulada ? (isDark ? '#333' : '#eee') : `${categoria?.color}20` }]}>
                    <IconSymbol
                      size={18}
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
                    <Text style={[styles.transTime, isDark && styles.textDarkSecondary]}>
                      {trans.banco ? `${trans.banco} • ` : ''}
                      {new Date(trans.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.transAmountCol}>
                    <Text style={[
                      styles.transAmount,
                      { color: trans.anulada ? (isDark ? '#555' : '#999') : (trans.tipo === 'ingreso' ? '#34C759' : '#FF3B30') },
                      trans.anulada && { textDecorationLine: 'line-through' }
                    ]}>
                      {trans.tipo === 'ingreso' ? '+' : '-'}${trans.monto.toFixed(2)}
                    </Text>
                    {!trans.anulada && trans.comision > 0 && (
                      <Text style={styles.transCom}>+${trans.comision.toFixed(2)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: -50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FF6B0015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconDark: {
    backgroundColor: '#333',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  openCajaButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  openCajaGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  openCajaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSimple: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  headerSimpleDark: {
    backgroundColor: '#1c1c1e',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },

  // Logged In UI
  topBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  topBarDark: {
    backgroundColor: '#000',
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  topBarDate: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonDark: {
    backgroundColor: '#1c1c1e',
  },

  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Balance Card
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  },
  balanceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    padding: 12,
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
    marginBottom: 2,
  },
  balanceStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Actions Grid
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    marginLeft: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  moreActionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 30,
    gap: 6,
  },
  moreActionsText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Channels Section
  channelsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginBottom: 10,
  },
  channelsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  channelsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  channelsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  channelBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  channelFlow: {
    flexDirection: 'row',
    gap: 8,
  },
  flowIn: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  flowOut: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '500',
  },
  channelBalance: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  // Transactions List
  emptyList: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#888',
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 10,
  },
  transItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  transBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
  },
  transBorderDark: {
    borderTopColor: '#222',
  },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
    color: '#999',
  },
  transAmountCol: {
    alignItems: 'flex-end',
  },
  transAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transCom: {
    fontSize: 11,
    color: '#FF6B00',
    fontWeight: '500',
    marginTop: 2,
  },

  // Dark Mode Styles
  textDark: { color: '#fff' },
  textDarkSecondary: { color: '#888' },
  cardDark: { backgroundColor: '#1c1c1e' },
});
