
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, Colors, Spacing } from '@/constants/theme';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CanalTransaccion } from '@/types/caja';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function SeleccionarCanalScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const { canalesActivos, agregarCanal, setPendingCanalSeleccion } = useCanales();

    const handleSeleccionar = (canal: CanalTransaccion) => {
        setPendingCanalSeleccion(canal);
        router.back();
    };



    return (
        <SafeAreaView style={[styles.container]} edges={['bottom']}>
            <View style={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                        <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Canal de Transacción</Text>
                    <View style={styles.cancelButton} />
                </View>

                {/* Main Header / Icon */}
                <View style={styles.categoryHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${BrandColors.primary}20` }]}>
                        <IconSymbol
                            size={28}
                            name="building.columns"
                            color={BrandColors.primary}
                        />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                        Seleccionar Banco/Caja
                    </Text>
                    <Text style={[styles.categorySubtitle, { color: colors.textSecondary }]}>
                        ¿Dónde se realiza la operación?
                    </Text>
                </View>

                {/* Channels List - Scrollable with max height */}
                <ScrollView
                    style={styles.servicesList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.servicesListContent}
                    bounces={false}
                >
                    {canalesActivos.map((canal) => (
                        <TouchableOpacity
                            key={canal.id}
                            style={[styles.serviceItem, { backgroundColor: colors.surface }]}
                            onPress={() => handleSeleccionar(canal)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.serviceItemContent}>
                                <IconSymbol
                                    size={20}
                                    name="checkmark.circle"
                                    color={colors.textTertiary}
                                />
                                <Text style={[styles.serviceItemText, { color: colors.text }]}>
                                    {canal.nombre}
                                </Text>
                            </View>
                            <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Footer Info - Channels cannot be added mid-session */}
                <View style={styles.footer}>
                    <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
                        <IconSymbol size={20} name="info.circle" color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Los canales activos se configuran al abrir la caja. Para modificar los canales disponibles, debes cerrar la caja actual.
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
    },
    contentContainer: {
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    cancelButton: {
        minWidth: 70,
    },
    categoryHeader: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.md,
    },
    categoryIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    categorySubtitle: {
        fontSize: 14,
    },
    servicesList: {
        maxHeight: 208, // Approx 4 items (44px item + 8px gap)
        paddingHorizontal: Spacing.lg,
    },
    servicesListContent: {
        gap: 8,
        paddingBottom: Spacing.sm,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderRadius: 12,
    },
    serviceItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    serviceItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl, // Extra padding for safe area/visual balance
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Align top if text wraps, or center if single line. Center usually better for short text.
        padding: Spacing.md,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        flex: 1, // Allow text to wrap
        lineHeight: 20,
    },
});
