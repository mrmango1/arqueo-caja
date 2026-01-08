import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja, SaldoCanalInicial } from '@/types/caja';
import { isValidNumber, parseLocalizedFloat, parseLocalizedFloatOrDefault } from '@/utils/numbers';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { get, push, ref } from 'firebase/database';
import React, { useMemo, useState } from 'react';
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

export default function AbrirCajaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const { canalesActivos } = useCanales();

  const [montoInicial, setMontoInicial] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const [saldosCanales, setSaldosCanales] = useState<{ [key: string]: string }>({});

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  // Calcular total de saldos en canales
  const totalSaldosCanales = useMemo(() => {
    return Object.values(saldosCanales).reduce((sum, val) => {
      const num = parseLocalizedFloatOrDefault(val, 0);
      return sum + num;
    }, 0);
  }, [saldosCanales]);

  const handleUpdateSaldoCanal = (canalId: string, valor: string) => {
    setSaldosCanales(prev => ({
      ...prev,
      [canalId]: valor
    }));
  };

  const handleAbrirCaja = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!montoInicial || !isValidNumber(montoInicial)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }

    const monto = parseLocalizedFloat(montoInicial);
    if (monto < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'El monto no puede ser negativo');
      return;
    }

    setLoading(true);

    try {
      const cajasRef = ref(db, 'cajas');
      const snapshot = await get(cajasRef);

      let existeCajaAbierta = false;
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const caja = child.val();
          if (caja.usuarioId === user!.uid && caja.estado === 'abierta') {
            existeCajaAbierta = true;
          }
        });
      }

      if (existeCajaAbierta) {
        setLoading(false);
        Alert.alert('Error', 'Ya existe una caja abierta', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      // Preparar saldos de canales
      const saldosInicialesCanales: SaldoCanalInicial[] = canalesActivos.map(canal => ({
        canalId: canal.id,
        canalNombre: canal.nombre,
        saldo: parseLocalizedFloatOrDefault(saldosCanales[canal.id] || '0', 0),
      }));

      const nuevaCaja: Omit<Caja, 'id'> & { saldosCanales?: SaldoCanalInicial[] } = {
        estado: 'abierta',
        montoInicial: monto,
        totalDepositos: 0,
        totalRetiros: 0,
        totalOtrosIngresos: 0,
        totalOtrosEgresos: 0,
        totalComisiones: 0,
        totalComisionesBanco: 0,
        saldoEsperado: monto,
        fechaApertura: Date.now(),
        usuarioId: user!.uid,
        usuarioNombre: user!.email || 'Usuario',
        ...(notas ? { notas } : {}),
        saldosCanales: saldosInicialesCanales,
      };

      await push(ref(db, 'cajas'), nuevaCaja);
      setLoading(false);
      router.back();

    } catch (error: any) {
      console.error('Error al abrir caja:', error);
      setLoading(false);
      Alert.alert('Error', error?.message || 'No se pudo abrir la caja.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.containerDark]}
    >
      <Stack.Screen
        options={{
          title: 'Abrir Caja',
          headerStyle: { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
          headerTintColor: '#FF6B00',
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
              <IconSymbol size={28} name="chevron.left" color="#FF6B00" />
              <Text style={{ color: '#FF6B00', fontSize: 17, marginLeft: -4 }}>Atrás</Text>
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Saludo */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, isDark && styles.textDark]}>{getGreeting()}</Text>
          <Text style={[styles.greetingSubtext, isDark && styles.textDarkSecondary]}>
            Ingresa el efectivo con el que inicias tu jornada
          </Text>
        </View>

        {/* Input de monto principal */}
        <View style={[styles.amountCard, isDark && styles.cardDark]}>
          <Text style={[styles.amountLabel, isDark && styles.textDarkSecondary]}>
            Efectivo Inicial en Caja
          </Text>
          <View style={[styles.amountInputWrapper, isDark && styles.amountInputWrapperDark]}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.amountInput, isDark && styles.textDark]}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#444' : '#ccc'}
              value={montoInicial}
              onChangeText={setMontoInicial}
              keyboardType="decimal-pad"
              editable={!loading}
              autoFocus
            />
          </View>
        </View>

        {/* Saldos por canal - Siempre visible */}

        <View style={[styles.canalesCard, isDark && styles.cardDark]}>
          <View style={styles.canalesHeader}>
            <Text style={[styles.canalesTitle, isDark && styles.textDark]}>
              Saldos en Canales de Transacción
            </Text>
            <Text style={[styles.canalesSubtitle, isDark && styles.textDarkSecondary]}>
              Ingresa el saldo disponible en cada cuenta
            </Text>
          </View>

          {canalesActivos.map((canal, index) => (
            <View key={canal.id}>
              {index > 0 && <View style={[styles.divider, isDark && styles.dividerDark]} />}
              <View style={styles.canalInputRow}>
                <View style={styles.canalInfo}>
                  <View style={[styles.canalIcon, { backgroundColor: '#FF6B0015' }]}>
                    <IconSymbol size={16} name="building.columns" color="#FF6B00" />
                  </View>
                  <Text style={[styles.canalName, isDark && styles.textDark]} numberOfLines={1}>
                    {canal.nombre}
                  </Text>
                </View>
                <View style={[styles.canalInputWrapper, isDark && styles.canalInputWrapperDark]}>
                  <Text style={styles.canalCurrency}>$</Text>
                  <TextInput
                    style={[styles.canalInput, isDark && styles.textDark]}
                    placeholder="0.00"
                    placeholderTextColor={isDark ? '#555' : '#bbb'}
                    value={saldosCanales[canal.id] || ''}
                    onChangeText={(val) => handleUpdateSaldoCanal(canal.id, val)}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
              </View>
            </View>
          ))}

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, isDark && styles.textDark]}>
              Total en Canales
            </Text>
            <Text style={styles.totalValue}>
              ${totalSaldosCanales.toFixed(2)}
            </Text>
          </View>
        </View>


        {/* Card de notas */}
        <View style={[styles.notesCard, isDark && styles.cardDark]}>
          <View style={styles.notesHeader}>
            <IconSymbol size={16} name="note.text" color={isDark ? '#666' : '#999'} />
            <Text style={[styles.notesLabel, isDark && styles.textDark]}>Notas</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>OPCIONAL</Text>
            </View>
          </View>
          <TextInput
            style={[styles.notesInput, isDark && styles.notesInputDark]}
            placeholder="Ej: Turno mañana, efectivo contado..."
            placeholderTextColor={isDark ? '#555' : '#aaa'}
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
          <IconSymbol size={18} name="info.circle.fill" color="#FF6B00" />
          <Text style={[styles.infoText, isDark && styles.textDarkSecondary]}>
            Cuenta físicamente todo el dinero antes de iniciar. Este monto será tu referencia para el arqueo.
          </Text>
        </View>

        {/* Botón de abrir caja */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleAbrirCaja}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol size={20} name="lock.open.fill" color="#fff" />
              <Text style={styles.submitText}>Abrir Caja</Text>
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

  // Header


  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Greeting
  greetingSection: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000',
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  // Amount card
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderRadius: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  amountInputWrapperDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#FF6B00',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FF6B00',
  },
  amountInput: {
    flex: 1,
    fontSize: 44,
    fontWeight: '700',
    color: '#000',
    paddingVertical: 16,
    marginLeft: 8,
  },

  // Toggle card
  toggleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  expandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },

  // Canales card
  canalesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  canalesHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  canalesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  canalesSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  canalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  canalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  canalIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  canalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    width: 110,
  },
  canalInputWrapperDark: {
    backgroundColor: '#2c2c2e',
  },
  canalCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
  },
  canalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 10,
    marginLeft: 4,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FF6B0008',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 58,
  },
  dividerDark: {
    backgroundColor: '#2a2a2a',
  },

  // Notes card
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  optionalText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesInputDark: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8F5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF6B0015',
  },
  infoCardDark: {
    backgroundColor: '#1a1512',
    borderColor: '#FF6B0030',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Submit button
  submitButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
