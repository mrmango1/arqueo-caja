import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, Transaccion } from '@/types/caja';
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

export default function CerrarCajaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [saldoReal, setSaldoReal] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isClosing = React.useRef(false);

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
        // Solo mostramos error si NO estamos cerrando la caja intencionalmente
        if (!isClosing.current) {
          Alert.alert('Error', 'No hay caja abierta', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const calcularTotales = () => {
    const totalDepositos = transacciones.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const totalRetiros = transacciones.filter(t => t.tipo === 'egreso').reduce((sum, t) => sum + t.monto, 0);
    const totalComisiones = transacciones.reduce((sum, t) => sum + (t.comision || 0), 0);
    const saldoEsperado = (cajaActual?.montoInicial || 0) + totalDepositos - totalRetiros + totalComisiones;
    return { totalDepositos, totalRetiros, totalComisiones, saldoEsperado };
  };

  const handleCerrarCaja = async () => {
    if (!saldoReal || isNaN(Number(saldoReal))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Ingresa el saldo real contado');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const saldoRealNum = parseFloat(saldoReal);
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
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!cajaActual) return null;

  const { totalDepositos, totalRetiros, totalComisiones, saldoEsperado } = calcularTotales();
  const diferencia = saldoReal ? parseFloat(saldoReal) - saldoEsperado : 0;
  const hasDiferencia = saldoReal && !isNaN(parseFloat(saldoReal));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <Stack.Screen options={{
        title: 'Arqueo de Caja',
        headerStyle: { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
        headerTintColor: '#FF3B30',
        headerShadowVisible: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
            <IconSymbol size={28} name="chevron.left" color="#FF3B30" />
            <Text style={{ color: '#FF3B30', fontSize: 17, marginLeft: -4 }}>Atrás</Text>
          </TouchableOpacity>
        )
      }} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Resumen del día */}
        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <View style={styles.summaryHeader}>
            <IconSymbol size={18} name="chart.bar.fill" color="#FF6B00" />
            <Text style={[styles.summaryTitle, isDark && styles.textDark]}>Resumen del Día</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Efectivo inicial</Text>
            <Text style={[styles.summaryValue, isDark && styles.textDark]}>${cajaActual.montoInicial.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Depósitos recibidos</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#34C759' }]}>+${totalDepositos.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Retiros entregados</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>-${totalRetiros.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#FF6B00' }]} />
              <Text style={[styles.summaryLabel, isDark && styles.textDarkSecondary]}>Comisiones</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#FF6B00' }]}>+${totalComisiones.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTotal}>
            <Text style={[styles.totalLabel, isDark && styles.textDark]}>Saldo Esperado</Text>
            <Text style={styles.totalValue}>${saldoEsperado.toFixed(2)}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, isDark && styles.statBoxDark]}>
              <Text style={[styles.statValue, isDark && styles.textDark]}>{transacciones.length}</Text>
              <Text style={[styles.statLabel, isDark && styles.textDarkSecondary]}>Operaciones</Text>
            </View>
            <View style={[styles.statBox, isDark && styles.statBoxDark]}>
              <Text style={[styles.statValue, { color: '#FF6B00' }]}>${totalComisiones.toFixed(2)}</Text>
              <Text style={[styles.statLabel, isDark && styles.textDarkSecondary]}>Tu ganancia</Text>
            </View>
          </View>
        </View>

        {/* Conteo de efectivo */}
        <View style={[styles.countCard, isDark && styles.cardDark]}>
          <View style={styles.countHeader}>
            <IconSymbol size={18} name="banknote.fill" color="#FF3B30" />
            <Text style={[styles.countTitle, isDark && styles.textDark]}>Conteo de Efectivo</Text>
          </View>

          <Text style={[styles.inputLabel, isDark && styles.textDarkSecondary]}>
            Saldo Real Contado
          </Text>
          <View style={[styles.amountInputWrapper, isDark && styles.amountInputWrapperDark]}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.amountInput, isDark && styles.textDark]}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#444' : '#ccc'}
              value={saldoReal}
              onChangeText={setSaldoReal}
              keyboardType="decimal-pad"
              editable={!saving}
            />
          </View>

          {/* Indicador de diferencia */}
          {hasDiferencia && (
            <View style={[
              styles.diferenciaCard,
              diferencia === 0 ? styles.diferenciaOk : diferencia > 0 ? styles.diferenciaSobrante : styles.diferenciaFaltante
            ]}>
              <IconSymbol
                size={22}
                name={diferencia === 0 ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                color={diferencia === 0 ? '#34C759' : diferencia > 0 ? '#007AFF' : '#FF3B30'}
              />
              <View style={styles.diferenciaContent}>
                <Text style={[styles.diferenciaLabel, isDark && styles.textDarkSecondary]}>
                  {diferencia === 0 ? '¡Cuadra perfecto!' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                </Text>
                <Text style={[
                  styles.diferenciaValue,
                  { color: diferencia === 0 ? '#34C759' : diferencia > 0 ? '#007AFF' : '#FF3B30' }
                ]}>
                  {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Notas */}
          <View style={styles.notesSection}>
            <Text style={[styles.inputLabel, isDark && styles.textDarkSecondary]}>
              Observaciones
            </Text>
            <TextInput
              style={[styles.notesInput, isDark && styles.notesInputDark]}
              placeholder="Notas del cierre..."
              placeholderTextColor={isDark ? '#555' : '#aaa'}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>
        </View>

        {/* Botón de cerrar */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleCerrarCaja}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol size={20} name="lock.fill" color="#fff" />
              <Text style={styles.submitText}>Confirmar Cierre</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header


  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B00',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statBoxDark: {
    backgroundColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },

  // Count card
  countCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  countHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  countTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  amountInputWrapperDark: {
    backgroundColor: '#2a2a2a',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FF3B30',
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    paddingVertical: 12,
    marginLeft: 8,
  },
  diferenciaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  diferenciaOk: {
    backgroundColor: '#34C75915',
  },
  diferenciaSobrante: {
    backgroundColor: '#007AFF15',
  },
  diferenciaFaltante: {
    backgroundColor: '#FF3B3015',
  },
  diferenciaContent: {
    flex: 1,
  },
  diferenciaLabel: {
    fontSize: 13,
    color: '#888',
  },
  diferenciaValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  notesSection: {
    marginTop: 20,
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesInputDark: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },

  // Submit
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 18,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  textDark: {
    color: '#fff',
  },
  textDarkSecondary: {
    color: '#888',
  },
});
