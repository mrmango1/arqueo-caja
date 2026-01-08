import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Caja } from '@/types/caja';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HistorialScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = useMemo(() => {
    const totalComisiones = cajasCerradas.reduce((sum, c) => sum + (c.totalComisiones || 0), 0);
    const promedioComisiones = cajasCerradas.length > 0 ? totalComisiones / cajasCerradas.length : 0;
    return { totalComisiones, totalArqueos: cajasCerradas.length, promedioComisiones };
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

  const handleCardPress = (cajaId: string | undefined) => {
    if (!cajaId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/detalle-caja', params: { id: cajaId } });
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
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.topBar, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Historial</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.primary}
            colors={[BrandColors.primary]}
          />
        }
      >
        {/* Stats Section */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          style={styles.statsRow}
        >
          <StatCard
            title="Ganancias Totales"
            value={`$${stats.totalComisiones.toFixed(2)}`}
            icon="dollarsign"
            iconColor={BrandColors.primary}
            variant="gradient"
            gradientColors={Gradients.primary}
            style={{ flex: 2 }}
            delay={0}
          />
          <StatCard
            title="Cierres"
            value={stats.totalArqueos}
            variant="default"
            compact
            style={{ flex: 1 }}
            delay={100}
          />
        </Animated.View>

        {/* Promedio Card */}
        {stats.totalArqueos > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View style={[styles.avgCard, { backgroundColor: colors.surface }, Shadows.xs]}>
              <View style={styles.avgCardLeft}>
                <View style={[styles.avgIcon, { backgroundColor: '#34C75915' }]}>
                  <IconSymbol size={18} name="chart.line.uptrend.xyaxis" color="#34C759" />
                </View>
                <View>
                  <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>
                    Promedio por caja
                  </Text>
                  <Text style={[styles.avgValue, { color: colors.text }]}>
                    ${stats.promedioComisiones.toFixed(2)}
                  </Text>
                </View>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
            </View>
          </Animated.View>
        )}

        <SectionHeader
          title="Cierres Recientes"
          style={{ marginTop: Spacing.lg }}
        />

        {cajasCerradas.length === 0 ? (
          <EmptyState
            icon="clock.arrow.circlepath"
            title="Sin historial aún"
            description="Aquí verás tus cierres de caja detallados"
            style={{ marginTop: Spacing.xl }}
          />
        ) : (
          <View style={styles.listContainer}>
            {cajasCerradas.map((caja, index) => (
              <Animated.View
                key={caja.id}
                entering={FadeInRight.delay(index * 80).springify()}
              >
                <AnimatedPressable
                  style={[styles.historyCard, { backgroundColor: colors.surface }, Shadows.sm]}
                  onPress={() => handleCardPress(caja.id)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardDate, { color: colors.text }]}>
                      {formatDate(caja.fechaCierre)}
                    </Text>
                    <View style={styles.cardHeaderRight}>
                      {(caja.totalComisiones || 0) > 0 && (
                        <View style={styles.badgeSuccess}>
                          <Text style={styles.badgeSuccessText}>
                            +${(caja.totalComisiones || 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

                  <View style={styles.cardStats}>
                    <View style={styles.statCol}>
                      <Text style={[styles.statColLabel, { color: colors.textTertiary }]}>Inicial</Text>
                      <Text style={[styles.statColValue, { color: colors.text }]}>
                        ${caja.montoInicial.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statColLabel, { color: colors.textTertiary }]}>Entradas</Text>
                      <Text style={[styles.statColValue, { color: '#34C759' }]}>
                        +${(caja.totalDepositos || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statColLabel, { color: colors.textTertiary }]}>Salidas</Text>
                      <Text style={[styles.statColValue, { color: '#FF3B30' }]}>
                        -${(caja.totalRetiros || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardFooter, { backgroundColor: colors.backgroundTertiary }]}>
                    <View style={styles.footerRow}>
                      <IconSymbol size={14} name="clock" color={colors.textTertiary} />
                      <Text style={[styles.footerTime, { color: colors.textTertiary }]}>
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
                </AnimatedPressable>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
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
  topBar: {
    paddingTop: 60,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },

  // Average Card
  avgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderRadius: Radius.xl,
  },
  avgCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avgIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  avgValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // List
  listContainer: {
    gap: Spacing.base,
  },
  historyCard: {
    borderRadius: Radius.xl,
    padding: Spacing.base,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  badgeSuccessText: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statColLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statColValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: -Spacing.base,
    marginBottom: -Spacing.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  diferenciaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
