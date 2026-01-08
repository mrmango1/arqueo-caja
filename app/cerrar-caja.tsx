import { AnimatedButton } from '@/components/ui/animated-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Radius, SemanticColors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, SaldoCanalInicial, Transaccion } from '@/types/caja';
import { isValidNumber, parseLocalizedFloat } from '@/utils/numbers';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { get, onValue, ref, update } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function CerrarCajaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { user } = useAuth();
  const { canalesActivos } = useCanales();

  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [saldoReal, setSaldoReal] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isClosing = React.useRef(false);

  const [saldosCanalesCalculados, setSaldosCanalesCalculados] = useState<{
    [canalNombre: string]: {
      saldoInicial: number;
      depositos: number;
      retiros: number;
      saldoEsperado: number;
    };
  }>({});

  useEffect(() => {
    if (!user) return;

    const cajasRef = ref(db, 'cajas');
    const unsubscribe = onValue(cajasRef, async (snapshot) => {
      let cajaAbierta: Caja | null = null;

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const caja = child.val();
          if (caja.usuarioId === user.uid && caja.estado === 'abierta') {
            cajaAbierta = { id: child.key, ...caja };
          }
        });
      }

      if (cajaAbierta) {
        setCajaActual(cajaAbierta);

        const transRef = ref(db, 'transacciones');
        const transSnapshot = await get(transRef);
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
      } else {
        if (!isClosing.current) {
          Alert.alert('Error', 'No hay caja abierta', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!cajaActual) return;

    const saldosIniciales: SaldoCanalInicial[] = (cajaActual as any).saldosCanales || [];

    const saldosPorCanal: {
      [canalNombre: string]: {
        saldoInicial: number;
        depositos: number;
        retiros: number;
        saldoEsperado: number;
      };
    } = {};

    saldosIniciales.forEach((saldo) => {
      saldosPorCanal[saldo.canalNombre] = {
        saldoInicial: saldo.saldo,
        depositos: 0,
        retiros: 0,
        saldoEsperado: saldo.saldo,
      };
    });

    canalesActivos.forEach((canal) => {
      if (!saldosPorCanal[canal.nombre]) {
        saldosPorCanal[canal.nombre] = {
          saldoInicial: 0,
          depositos: 0,
          retiros: 0,
          saldoEsperado: 0,
        };
      }
    });

    transacciones.forEach((trans) => {
      if (!trans.banco) return;
      if (trans.anulada) return;

      const bancoNombre = trans.banco;

      if (!saldosPorCanal[bancoNombre]) {
        saldosPorCanal[bancoNombre] = {
          saldoInicial: 0,
          depositos: 0,
          retiros: 0,
          saldoEsperado: 0,
        };
      }

      if (trans.categoria === 'deposito') {
        saldosPorCanal[bancoNombre].depositos += trans.monto;
        saldosPorCanal[bancoNombre].saldoEsperado += trans.monto;
      } else if (trans.categoria === 'retiro') {
        saldosPorCanal[bancoNombre].retiros += trans.monto;
        saldosPorCanal[bancoNombre].saldoEsperado -= trans.monto;
      }
    });

    setSaldosCanalesCalculados(saldosPorCanal);
  }, [cajaActual, transacciones, canalesActivos]);

  const calcularTotales = () => {
    const totalDepositos = transacciones.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const totalRetiros = transacciones.filter(t => t.tipo === 'egreso').reduce((sum, t) => sum + t.monto, 0);
    const totalComisiones = transacciones.reduce((sum, t) => sum + (t.comision || 0), 0);
    const saldoEsperado = (cajaActual?.montoInicial || 0) + totalDepositos - totalRetiros + totalComisiones;
    return { totalDepositos, totalRetiros, totalComisiones, saldoEsperado };
  };

  const handleCerrarCaja = async () => {
    if (!saldoReal || !isValidNumber(saldoReal)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Ingresa el saldo real contado');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const saldoRealNum = parseLocalizedFloat(saldoReal);
    const { totalDepositos, totalRetiros, totalComisiones, saldoEsperado } = calcularTotales();
    const diferencia = saldoRealNum - saldoEsperado;

    Alert.alert(
      '¿Confirmar Arqueo?',
      `Saldo esperado: $${saldoEsperado.toFixed(2)}\nSaldo contado: $${saldoRealNum.toFixed(2)}\nDiferencia: ${diferencia >= 0 ? '+' : ''}$${diferencia.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            isClosing.current = true;
            setSaving(true);
            try {
              await update(ref(db, `cajas/${cajaActual!.id}`), {
                estado: 'cerrada',
                fechaCierre: Date.now(),
                saldoReal: saldoRealNum,
                montoFinal: saldoRealNum,
                totalDepositos,
                totalRetiros,
                totalComisiones,
                diferencia,
                ...(notas ? { notas } : {}),
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSaving(false);
              Alert.alert(
                '¡Arqueo Completado!',
                `Ganancia por comisiones: $${totalComisiones.toFixed(2)}`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              isClosing.current = false;
              setSaving(false);
              Alert.alert('Error', 'No se pudo cerrar la caja');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={SemanticColors.error} />
      </View>
    );
  }

  if (!cajaActual) return null;

  const { totalDepositos, totalRetiros, totalComisiones, saldoEsperado } = calcularTotales();
  const diferencia = saldoReal ? parseLocalizedFloat(saldoReal) - saldoEsperado : 0;
  const hasDiferencia = saldoReal && isValidNumber(saldoReal);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{
        title: 'Arqueo de Caja',
        presentation: 'modal',
        headerStyle: { backgroundColor: isDark ? colors.surface : '#fff' },
        headerTintColor: isDark ? '#fff' : '#000',
        headerShadowVisible: true,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancelar</Text>
          </TouchableOpacity>
        )
      }} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Card */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View
            style={[styles.summaryCard, Shadows.lg, { backgroundColor: BrandColors.primary }]}
          >
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryHeaderLabel}>Saldo Esperado</Text>
                <Text style={styles.summaryHeaderValue}>${saldoEsperado.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryIconBg}>
                <IconSymbol size={24} name="chart.bar.fill" color="#fff" />
              </View>
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <View style={[styles.summaryDot, { backgroundColor: SemanticColors.success }]} />
                <Text style={styles.summaryStatLabel}>Depósitos</Text>
                <Text style={styles.summaryStatValue}>+${totalDepositos.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <View style={[styles.summaryDot, { backgroundColor: SemanticColors.error }]} />
                <Text style={styles.summaryStatLabel}>Retiros</Text>
                <Text style={styles.summaryStatValue}>-${totalRetiros.toFixed(0)}</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <View style={[styles.summaryDot, { backgroundColor: BrandColors.primary }]} />
                <Text style={styles.summaryStatLabel}>Comisiones</Text>
                <Text style={styles.summaryStatValue}>+${totalComisiones.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{transacciones.length}</Text>
                <Text style={styles.statLabel}>Operaciones</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#FFD700' }]}>${totalComisiones.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Tu ganancia</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Channel Balances */}
        {Object.keys(saldosCanalesCalculados).length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View style={[styles.channelsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
              <View style={styles.channelsHeader}>
                <IconSymbol size={18} name="building.columns.fill" color="#007AFF" />
                <Text style={[styles.channelsTitle, { color: colors.text }]}>Saldos en Canales</Text>
              </View>
              <Text style={[styles.channelsSubtitle, { color: colors.textTertiary }]}>
                Balance esperado en cada cuenta bancaria
              </Text>

              {Object.entries(saldosCanalesCalculados).map(([canalNombre, datos], index) => (
                <View key={canalNombre}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
                  <View style={styles.channelRow}>
                    <View style={styles.channelInfo}>
                      <View style={[styles.channelIcon, { backgroundColor: '#007AFF15' }]}>
                        <IconSymbol size={14} name="building.columns" color="#007AFF" />
                      </View>
                      <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>
                        {canalNombre}
                      </Text>
                    </View>
                    <Text style={[styles.channelSaldo, { color: datos.saldoEsperado >= 0 ? '#007AFF' : SemanticColors.error }]}>
                      ${datos.saldoEsperado.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.channelDetails}>
                    <View style={styles.channelDetailRow}>
                      <Text style={[styles.channelDetailLabel, { color: colors.textTertiary }]}>Saldo inicial:</Text>
                      <Text style={[styles.channelDetailValue, { color: colors.textSecondary }]}>${datos.saldoInicial.toFixed(2)}</Text>
                    </View>
                    {datos.depositos > 0 && (
                      <View style={styles.channelDetailRow}>
                        <Text style={[styles.channelDetailLabel, { color: colors.textTertiary }]}>+ Depósitos:</Text>
                        <Text style={[styles.channelDetailValue, { color: SemanticColors.success }]}>+${datos.depositos.toFixed(2)}</Text>
                      </View>
                    )}
                    {datos.retiros > 0 && (
                      <View style={styles.channelDetailRow}>
                        <Text style={[styles.channelDetailLabel, { color: colors.textTertiary }]}>- Retiros:</Text>
                        <Text style={[styles.channelDetailValue, { color: SemanticColors.error }]}>-${datos.retiros.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.borderLight, marginTop: Spacing.base }]} />
              <View style={styles.channelsTotalRow}>
                <Text style={[styles.channelsTotalLabel, { color: colors.text }]}>Total en Canales</Text>
                <Text style={styles.channelsTotalValue}>
                  ${Object.values(saldosCanalesCalculados).reduce((sum, datos) => sum + datos.saldoEsperado, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Cash Count Card */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={[styles.countCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <View style={styles.countHeader}>
              <IconSymbol size={18} name="banknote.fill" color={SemanticColors.error} />
              <Text style={[styles.countTitle, { color: colors.text }]}>Conteo de Efectivo</Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              SALDO REAL CONTADO
            </Text>
            <View style={[styles.amountInputWrapper, { backgroundColor: colors.inputBackground }]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.inputPlaceholder}
                value={saldoReal}
                onChangeText={setSaldoReal}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>

            {/* Difference Indicator */}
            {hasDiferencia && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={[
                  styles.diferenciaCard,
                  diferencia === 0
                    ? { backgroundColor: SemanticColors.successLight }
                    : diferencia > 0
                      ? { backgroundColor: SemanticColors.infoLight }
                      : { backgroundColor: SemanticColors.errorLight }
                ]}
              >
                <IconSymbol
                  size={24}
                  name={diferencia === 0 ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                  color={diferencia === 0 ? SemanticColors.success : diferencia > 0 ? SemanticColors.info : SemanticColors.error}
                />
                <View style={styles.diferenciaContent}>
                  <Text style={[styles.diferenciaLabel, { color: colors.textSecondary }]}>
                    {diferencia === 0 ? '¡Cuadra perfecto!' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                  </Text>
                  <Text style={[
                    styles.diferenciaValue,
                    { color: diferencia === 0 ? SemanticColors.success : diferencia > 0 ? SemanticColors.info : SemanticColors.error }
                  ]}>
                    {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                OBSERVACIONES
              </Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Notas del cierre..."
                placeholderTextColor={colors.inputPlaceholder}
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </View>
        </Animated.View>

        {/* Submit Button */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={{ marginTop: Spacing.lg }}>
          <AnimatedButton
            title={saving ? 'Procesando...' : 'Confirmar Cierre'}
            onPress={handleCerrarCaja}
            variant="danger"
            icon="lock.fill"
            loading={saving}
            disabled={saving}
            fullWidth
            size="lg"
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  backText: {
    color: SemanticColors.error,
    fontSize: 17,
    marginLeft: -4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // Summary Card
  summaryCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  summaryHeaderLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryHeaderValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  summaryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Channels Card
  channelsCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  channelsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  channelsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  channelsSubtitle: {
    fontSize: 12,
    marginBottom: Spacing.base,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  channelIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  channelSaldo: {
    fontSize: 18,
    fontWeight: '700',
  },
  channelDetails: {
    marginLeft: 38,
    marginTop: Spacing.xs,
    gap: 2,
  },
  channelDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelDetailLabel: {
    fontSize: 12,
  },
  channelDetailValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  channelsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  channelsTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  channelsTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },

  // Count Card
  countCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  countTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    borderWidth: 2,
    borderColor: SemanticColors.error,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '300',
    color: SemanticColors.error,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  diferenciaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginTop: Spacing.base,
    gap: Spacing.md,
  },
  diferenciaContent: {
    flex: 1,
  },
  diferenciaLabel: {
    fontSize: 13,
  },
  diferenciaValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  notesSection: {
    marginTop: Spacing.lg,
  },
  notesInput: {
    borderRadius: Radius.md,
    padding: Spacing.base,
    fontSize: 15,
    minHeight: 80,
  },
});
