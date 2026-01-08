import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja } from '@/types/caja';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

export default function HistorialScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const [cajasCerradas, setCajasCerradas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const cajasRef = ref(db, 'cajas');
    const unsubscribe = onValue(cajasRef, (snapshot) => {
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simular refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = useMemo(() => {
    const totalComisiones = cajasCerradas.reduce((sum, c) => sum + (c.totalComisiones || 0), 0);
    return { totalComisiones, totalArqueos: cajasCerradas.length };
  }, [cajasCerradas]);

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header unificado */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <Text style={[styles.topBarTitle, isDark && styles.textDark]}>Historial</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
      >
        {/* Stats cards modernas */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, isDark && styles.cardDark]}>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Ganancias Totales</Text>
              <Text style={styles.statValue}>${stats.totalComisiones.toFixed(2)}</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: '#FF6B0020' }]}>
              <IconSymbol size={24} name="dollarsign" color="#FF6B00" />
            </View>
          </View>

          <View style={[styles.statCardSmall, isDark && styles.cardDark]}>
            <Text style={styles.statLabel}>Cierres</Text>
            <Text style={[styles.statValue, isDark && styles.textDark]}>{stats.totalArqueos}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
          Cierres Recientes
        </Text>

        {cajasCerradas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, isDark && styles.emptyIconBgDark]}>
              <IconSymbol size={40} name="clock.arrow.circlepath" color={isDark ? '#666' : '#ccc'} />
            </View>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
              Sin historial aún
            </Text>
            <Text style={[styles.emptySubtitle, isDark && styles.textDarkSecondary]}>
              Aquí verás tus cierres de caja detallados
            </Text>
          </View>
        ) : (
          <FlatList
            data={cajasCerradas}
            keyExtractor={(item) => item.id || ''}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            renderItem={({ item: caja }) => (
              <TouchableOpacity
                style={[styles.historyCard, isDark && styles.cardDark]}
                onPress={() => router.push({ pathname: '/detalle-caja', params: { id: caja.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardDate, isDark && styles.textDark]}>
                    {formatDate(caja.fechaCierre)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {(caja.totalComisiones || 0) > 0 && (
                      <View style={styles.badgeSuccess}>
                        <Text style={styles.badgeSuccessText}>+${(caja.totalComisiones || 0).toFixed(2)}</Text>
                      </View>
                    )}
                    <IconSymbol size={16} name="chevron.right" color={isDark ? '#666' : '#ccc'} />
                  </View>
                </View>

                <View style={[styles.divider, isDark && styles.dividerDark]} />

                <View style={styles.cardStats}>
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>Inicial</Text>
                    <Text style={[styles.statColValue, isDark && styles.textDark]}>
                      ${caja.montoInicial.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>Entradas</Text>
                    <Text style={[styles.statColValue, { color: '#34C759' }]}>
                      +${(caja.totalDepositos || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statColLabel}>Salidas</Text>
                    <Text style={[styles.statColValue, { color: '#FF3B30' }]}>
                      -${(caja.totalRetiros || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardFooter, isDark && styles.cardFooterDark]}>
                  <View style={styles.footerRow}>
                    <IconSymbol size={14} name="clock" color="#888" />
                    <Text style={styles.footerTime}>
                      {formatTime(caja.fechaApertura)} - {formatTime(caja.fechaCierre)}
                    </Text>
                  </View>

                  {caja.diferencia !== undefined && caja.diferencia !== 0 && (
                    <View style={styles.footerRow}>
                      <IconSymbol
                        size={14}
                        name="exclamationmark.triangle.fill"
                        color={(caja.diferencia || 0) > 0 ? '#007AFF' : '#FF3B30'}
                      />
                      <Text style={[
                        styles.diferenciaText,
                        { color: (caja.diferencia || 0) > 0 ? '#007AFF' : '#FF3B30' }
                      ]}>
                        {(caja.diferencia || 0) > 0 ? 'Sobran' : 'Faltan'} ${(Math.abs(caja.diferencia || 0)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
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
  topBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarDark: {
    backgroundColor: '#000',
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  statContent: {
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    marginLeft: 4,
  },

  // List
  listContainer: {
    gap: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textTransform: 'capitalize',
  },
  badgeSuccess: {
    backgroundColor: '#34C75915',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  dividerDark: {
    backgroundColor: '#333',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statColLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  statColValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: -16,
    marginBottom: -16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cardFooterDark: {
    backgroundColor: '#252525',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTime: {
    fontSize: 12,
    color: '#888',
  },
  diferenciaText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconBgDark: {
    backgroundColor: '#333',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },

  textDark: { color: '#fff' },
  textDarkSecondary: { color: '#888' },
});
