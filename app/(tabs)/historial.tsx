import { formatDateHeader, groupCajasByDate } from '@/app/utils/date-utils';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
import Animated, { FadeInDown, FadeInRight, FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';

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

  // State for expanded days (default collapsed for stacking effect)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

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

      // Default state is now COLLAPSED (false) to show the stack effect initially
      const grouped = groupCajasByDate(cajas);
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(grouped).forEach(key => {
        initialExpandedState[key] = false;
      });
      setExpandedDays(initialExpandedState);

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

  const groupedCajas = useMemo(() => {
    return groupCajasByDate(cajasCerradas);
  }, [cajasCerradas]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
    Haptics.selectionAsync();
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

  const renderCajaCard = (caja: Caja, index: number, isStacked: boolean, totalInStack: number) => {
    // If stacked, only show top card fully.
    // Cards behind get scale/translate/opacity styles

    let animatedStyle = {};
    const MAX_STACK_VISIBLE = 2; // How many cards behind to show

    if (isStacked) {
      if (index === 0) {
        // Top card - normal
        // Add margin to account for the stack fanning out below
        animatedStyle = { zIndex: 100, marginBottom: 24 };
      } else if (index <= MAX_STACK_VISIBLE) {
        // Cards behind
        const scale = 1 - (index * 0.05); // slightly smaller
        const translateY = index * 12;     // slightly lower (increased from 8)

        // Don't fade out too much so the shadow is visible, but maybe darken or something?
        // Actually keep opacity but ensure shadow is strong.
        const opacity = 1;

        animatedStyle = {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          transform: [{ scale }, { translateY }],
          zIndex: 100 - index,
          opacity,
        };
      } else {
        // Hidden cards in stack
        return null;
      }
    }

    // Shadow container needs to be the outer Animated.View (or a wrapper inside it)
    // The pressing logic should probably be on the card content or the whole container.
    // Ideally: Animated.View (Shadow Wrapper) -> AnimatedPressable (Content Wrapper + overflow hidden)

    return (
      <Animated.View
        key={caja.id}
        entering={isStacked ? undefined : FadeInRight.delay(index * 50).springify()}
        exiting={FadeOut.duration(200)}
        layout={index === 0 ? undefined : LinearTransition.springify().damping(70).stiffness(500)}
        style={[
          // Base layout styles - first card always on top
          isStacked ? animatedStyle : { marginBottom: Spacing.md, zIndex: index === 0 ? 100 : 50 - index },
          // Shadow styles apply to this outer container
          Shadows.md, // Increased shadow
          {
            backgroundColor: colors.surface,
            borderRadius: Radius.xl,
            // Make sure background cards have contrast if they are white on white
            // (shadow handles it, but maybe slight darkening?)
          }
        ]}
      >
        <AnimatedPressable
          style={[
            styles.historyCard,
            // IMPORTANT: No shadow here, handled by parent
            { backgroundColor: colors.surface }
          ]}
          onPress={() => isStacked ? toggleDay(String(Object.keys(groupedCajas).find(key => groupedCajas[key].includes(caja)))) : handleCardPress(caja.id)}
          disabled={false}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconSymbol size={16} name="archivebox" color={colors.textSecondary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Cierre de Caja
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              {(caja.totalComisiones || 0) > 0 && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>
                    +${(caja.totalComisiones || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {!isStacked && (
                <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
              )}
              {isStacked && index === 0 && (
                <View style={{ backgroundColor: colors.backgroundTertiary, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{totalInStack}</Text>
                </View>
              )}
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
    );
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

        <View style={{ marginTop: Spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cierres Recientes</Text>
        </View>

        {cajasCerradas.length === 0 ? (
          <EmptyState
            icon="clock.arrow.circlepath"
            title="Sin historial aún"
            description="Aquí verás tus cierres de caja detallados"
            style={{ marginTop: Spacing.xl }}
          />
        ) : (
          <View style={styles.listContainer}>
            {Object.entries(groupedCajas).map(([dateKey, cajasForDay], groupIndex) => {
              const headerTitle = formatDateHeader(cajasForDay[0].fechaCierre!);
              const isExpanded = expandedDays[dateKey];
              const isSingleItem = cajasForDay.length === 1;

              return (
                <View key={dateKey} style={styles.dayGroup}>
                  {/* Header - Make it clickable to toggle as well */}
                  <Pressable
                    style={styles.dayHeader}
                    onPress={() => !isSingleItem && toggleDay(dateKey)}
                    hitSlop={8}
                  >
                    <Text style={[styles.dayHeaderText, { color: colors.textSecondary }]}>
                      {headerTitle}
                    </Text>
                    {!isSingleItem && (
                      <Text style={{ fontSize: 12, color: isDark ? '#60A5FA' : BrandColors.primary, fontWeight: '600' }}>
                        {isExpanded ? 'Ver menos' : 'Ver todo'}
                      </Text>
                    )}
                  </Pressable>

                  {/* Content - Stacked or Expanded */}
                  <Animated.View
                    layout={LinearTransition.springify().damping(60).stiffness(600)}
                    style={[styles.dayContent]}
                  >
                    {cajasForDay.map((caja, index) =>
                      // If single item, always show normal. If multiple:
                      // - Expanded: Show all normally
                      // - Collapsed: Show as stack
                      renderCajaCard(caja, index, !isExpanded && !isSingleItem, cajasForDay.length)
                    )}
                  </Animated.View>
                </View>
              );
            })}
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
    justifyContent: 'center',
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

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },

  // List Groups
  listContainer: {
    gap: Spacing.base,
  },
  dayGroup: {
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dayContent: {
    // No fixed gap when stacking to allow overlap
  },

  // Card
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
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
