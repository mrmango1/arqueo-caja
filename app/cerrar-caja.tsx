import { AnimatedButton } from '@/components/ui/animated-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Radius, SemanticColors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, SaldoCanalInicial, Transaccion } from '@/types/caja';
import { calcularSaldosCanalesMap } from '@/utils/channel-balances';
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

  // Real balances entered by user for each channel
  const [saldosRealesCanales, setSaldosRealesCanales] = useState<{
    [canalNombre: string]: string;
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

    // Use centralized function to calculate channel balances
    const saldosPorCanal = calcularSaldosCanalesMap(saldosIniciales, transacciones, canalesActivos);

    setSaldosCanalesCalculados(saldosPorCanal);
  }, [cajaActual, transacciones, canalesActivos]);

  const calcularTotales = () => {
    const transaccionesValidas = transacciones.filter(t => !t.anulada);

    const totalDepositos = transaccionesValidas.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const totalRetiros = transaccionesValidas.filter(t => t.tipo === 'egreso').reduce((sum, t) => sum + t.monto, 0);
    const totalComisiones = transaccionesValidas.reduce((sum, t) => sum + (t.comision || 0), 0);
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
              // Prepare channel balance data for saving
              const saldosCanalesArqueo = Object.entries(saldosCanalesCalculados).map(([canalNombre, datos]) => ({
                canalNombre,
                saldoInicial: datos.saldoInicial,
                depositos: datos.depositos,
                retiros: datos.retiros,
                saldoEsperado: datos.saldoEsperado,
                saldoReal: saldosRealesCanales[canalNombre] ? parseLocalizedFloat(saldosRealesCanales[canalNombre]) : null,
                diferencia: saldosRealesCanales[canalNombre]
                  ? parseLocalizedFloat(saldosRealesCanales[canalNombre]) - datos.saldoEsperado
                  : null,
              }));

              await update(ref(db, `cajas/${cajaActual!.id}`), {
                estado: 'cerrada',
                fechaCierre: Date.now(),
                saldoReal: saldoRealNum,
                montoFinal: saldoRealNum,
                totalDepositos,
                totalRetiros,
                totalComisiones,
                diferencia,
                saldosCanalesArqueo, // Save channel balance verification data
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
        headerTransparent: true,
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: isDark ? '#fff' : '#000',
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
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Summary Card - Focus on Earnings */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View
            style={[styles.summaryCard, Shadows.lg, { backgroundColor: BrandColors.primary }]}
          >
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryHeaderLabel}>Tu Ganancia</Text>
                <Text style={[styles.summaryHeaderValue]}>${totalComisiones.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryIconBg}>
                <IconSymbol size={24} name="dollarsign.circle.fill" color="#fff" />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{transacciones.filter(t => !t.anulada).length}</Text>
                <Text style={styles.statLabel}>Operaciones</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{transacciones.filter(t => !t.anulada).length > 0 ? `${((totalComisiones / (totalDepositos + totalRetiros || 1)) * 100).toFixed(1)}%` : '0%'}</Text>
                <Text style={styles.statLabel}>Comisión</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Unified Balance Verification Section */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={[styles.verificationCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <View style={styles.verificationHeader}>
              <View style={[styles.verificationIconBg, { backgroundColor: SemanticColors.errorLight }]}>
                <IconSymbol size={20} name="checklist" color={SemanticColors.error} />
              </View>
              <View style={styles.verificationHeaderText}>
                <Text style={[styles.verificationTitle, { color: colors.text }]}>Verificación de Saldos</Text>
                <Text style={[styles.verificationSubtitle, { color: colors.textTertiary }]}>
                  Ingrese el saldo real para cada cuenta
                </Text>
              </View>
            </View>

            {/* Cash Balance Section */}
            <View style={[styles.balanceItem, { borderColor: colors.borderLight }]}>
              <View style={styles.balanceHeader}>
                <View style={styles.balanceInfo}>
                  <View style={[styles.balanceIcon, { backgroundColor: SemanticColors.errorLight }]}>
                    <IconSymbol size={16} name="banknote.fill" color={SemanticColors.error} />
                  </View>
                  <View style={styles.balanceTexts}>
                    <Text style={[styles.balanceName, { color: colors.text }]}>Efectivo en Caja</Text>
                    <Text style={[styles.balanceExpectedLabel, { color: colors.textTertiary }]}>
                      Esperado: <Text style={styles.balanceExpectedValue}>${saldoEsperado.toFixed(2)}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.balanceDetails}>
                <View style={styles.balanceDetailRow}>
                  <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>Saldo inicial:</Text>
                  <Text style={[styles.balanceDetailValue, { color: colors.textSecondary }]}>${(cajaActual?.montoInicial || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.balanceDetailRow}>
                  <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>+ Depósitos:</Text>
                  <Text style={[styles.balanceDetailValue, { color: SemanticColors.success }]}>+${totalDepositos.toFixed(2)}</Text>
                </View>
                <View style={styles.balanceDetailRow}>
                  <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>- Retiros:</Text>
                  <Text style={[styles.balanceDetailValue, { color: SemanticColors.error }]}>-${totalRetiros.toFixed(2)}</Text>
                </View>
                <View style={styles.balanceDetailRow}>
                  <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>+ Comisiones:</Text>
                  <Text style={[styles.balanceDetailValue, { color: '#007AFF' }]}>+${totalComisiones.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.balanceInputWrapper, { backgroundColor: colors.inputBackground, borderColor: SemanticColors.error }]}>
                <Text style={[styles.balanceInputCurrency, { color: SemanticColors.error }]}>$</Text>
                <TextInput
                  style={[styles.balanceInput, { color: colors.text }]}
                  placeholder="Saldo contado..."
                  placeholderTextColor={colors.inputPlaceholder}
                  value={saldoReal}
                  onChangeText={setSaldoReal}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>

              {/* Difference Indicator for Cash */}
              {hasDiferencia && (
                <Animated.View
                  entering={FadeInDown.springify()}
                  style={[
                    styles.balanceDiferencia,
                    diferencia === 0
                      ? { backgroundColor: SemanticColors.successLight }
                      : diferencia > 0
                        ? { backgroundColor: SemanticColors.infoLight }
                        : { backgroundColor: SemanticColors.errorLight }
                  ]}
                >
                  <IconSymbol
                    size={18}
                    name={diferencia === 0 ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                    color={diferencia === 0 ? SemanticColors.success : diferencia > 0 ? SemanticColors.info : SemanticColors.error}
                  />
                  <Text style={[styles.balanceDiferenciaLabel, { color: colors.textSecondary }]}>
                    {diferencia === 0 ? '¡Cuadra!' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                  </Text>
                  <Text style={[
                    styles.balanceDiferenciaValue,
                    { color: diferencia === 0 ? SemanticColors.success : diferencia > 0 ? SemanticColors.info : SemanticColors.error }
                  ]}>
                    {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Channel Balances Section */}
            {Object.entries(saldosCanalesCalculados).map(([canalNombre, datos], index) => {
              const saldoRealCanal = saldosRealesCanales[canalNombre] || '';
              const hasDiferenciaCanal = saldoRealCanal && isValidNumber(saldoRealCanal);
              const diferenciaCanal = hasDiferenciaCanal ? parseLocalizedFloat(saldoRealCanal) - datos.saldoEsperado : 0;

              return (
                <View key={canalNombre} style={[styles.balanceItem, { borderColor: colors.borderLight }]}>
                  <View style={styles.balanceHeader}>
                    <View style={styles.balanceInfo}>
                      <View style={[styles.balanceIcon, { backgroundColor: '#007AFF15' }]}>
                        <IconSymbol size={16} name="building.columns.fill" color="#007AFF" />
                      </View>
                      <View style={styles.balanceTexts}>
                        <Text style={[styles.balanceName, { color: colors.text }]} numberOfLines={1}>{canalNombre}</Text>
                        <Text style={[styles.balanceExpectedLabel, { color: colors.textTertiary }]}>
                          Esperado: <Text style={[styles.balanceExpectedValue, { color: '#007AFF' }]}>${datos.saldoEsperado.toFixed(2)}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.balanceDetails}>
                    <View style={styles.balanceDetailRow}>
                      <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>Saldo inicial:</Text>
                      <Text style={[styles.balanceDetailValue, { color: colors.textSecondary }]}>${datos.saldoInicial.toFixed(2)}</Text>
                    </View>
                    {datos.retiros > 0 && (
                      <View style={styles.balanceDetailRow}>
                        <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>+ Retiros (entrada):</Text>
                        <Text style={[styles.balanceDetailValue, { color: SemanticColors.success }]}>+${datos.retiros.toFixed(2)}</Text>
                      </View>
                    )}
                    {datos.depositos > 0 && (
                      <View style={styles.balanceDetailRow}>
                        <Text style={[styles.balanceDetailLabel, { color: colors.textTertiary }]}>- Depósitos (salida):</Text>
                        <Text style={[styles.balanceDetailValue, { color: SemanticColors.error }]}>-${datos.depositos.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.balanceInputWrapper, { backgroundColor: colors.inputBackground, borderColor: '#007AFF' }]}>
                    <Text style={[styles.balanceInputCurrency, { color: '#007AFF' }]}>$</Text>
                    <TextInput
                      style={[styles.balanceInput, { color: colors.text }]}
                      placeholder="Saldo verificado..."
                      placeholderTextColor={colors.inputPlaceholder}
                      value={saldoRealCanal}
                      onChangeText={(text) => setSaldosRealesCanales(prev => ({ ...prev, [canalNombre]: text }))}
                      keyboardType="decimal-pad"
                      editable={!saving}
                    />
                  </View>

                  {/* Difference Indicator for Channel */}
                  {hasDiferenciaCanal && (
                    <Animated.View
                      entering={FadeInDown.springify()}
                      style={[
                        styles.balanceDiferencia,
                        diferenciaCanal === 0
                          ? { backgroundColor: SemanticColors.successLight }
                          : diferenciaCanal > 0
                            ? { backgroundColor: SemanticColors.infoLight }
                            : { backgroundColor: SemanticColors.errorLight }
                      ]}
                    >
                      <IconSymbol
                        size={18}
                        name={diferenciaCanal === 0 ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                        color={diferenciaCanal === 0 ? SemanticColors.success : diferenciaCanal > 0 ? SemanticColors.info : SemanticColors.error}
                      />
                      <Text style={[styles.balanceDiferenciaLabel, { color: colors.textSecondary }]}>
                        {diferenciaCanal === 0 ? '¡Cuadra!' : diferenciaCanal > 0 ? 'Sobrante' : 'Faltante'}
                      </Text>
                      <Text style={[
                        styles.balanceDiferenciaValue,
                        { color: diferenciaCanal === 0 ? SemanticColors.success : diferenciaCanal > 0 ? SemanticColors.info : SemanticColors.error }
                      ]}>
                        {diferenciaCanal >= 0 ? '+' : ''}${diferenciaCanal.toFixed(2)}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Notes Section */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={[styles.notesCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <View style={styles.notesHeader}>
              <IconSymbol size={18} name="note.text" color={colors.textSecondary} />
              <Text style={[styles.notesTitle, { color: colors.text }]}>Observaciones</Text>
            </View>
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

  // Verification Card (unified balance verification)
  verificationCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  verificationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationHeaderText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  verificationSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Balance Item (for each cash/channel balance)
  balanceItem: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    marginTop: Spacing.base,
  },
  balanceHeader: {
    marginBottom: Spacing.sm,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceTexts: {
    flex: 1,
  },
  balanceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceExpectedLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceExpectedValue: {
    fontWeight: '700',
    color: SemanticColors.error,
  },
  balanceDetails: {
    marginLeft: 46,
    marginBottom: Spacing.md,
    gap: 4,
  },
  balanceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceDetailLabel: {
    fontSize: 12,
  },
  balanceDetailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    marginTop: Spacing.xs,
  },
  balanceInputCurrency: {
    fontSize: 20,
    fontWeight: '600',
  },
  balanceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  balanceDiferencia: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  balanceDiferenciaLabel: {
    fontSize: 12,
    flex: 1,
  },
  balanceDiferenciaValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Verification Summary
  verificationSummary: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  verificationSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  verificationSummaryLabel: {
    fontSize: 13,
  },
  verificationSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  verificationSummaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  verificationSummaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Notes Card
  notesCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesInput: {
    borderRadius: Radius.md,
    padding: Spacing.base,
    fontSize: 15,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },

  // Legacy styles (kept for compatibility)
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
});
