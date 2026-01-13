import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, Colors, Spacing } from '@/constants/theme';
import { useServicios } from '@/context/ServiciosContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CategoriaOperacion, getCategoriaById, TipoServicio } from '@/types/caja';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function SeleccionarServicioScreen() {
    // ... params and hooks (unchanged)
    const router = useRouter();
    const params = useLocalSearchParams();
    const categoria = params.categoria as CategoriaOperacion;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const { getServiciosPorCategoria, agregarServicio, setPendingServicioSeleccion } = useServicios();
    const [nuevoServicioNombre, setNuevoServicioNombre] = useState('');

    const categoriaActual = getCategoriaById(categoria);
    const servicios = getServiciosPorCategoria(categoria);

    const handleSeleccionar = (servicio: TipoServicio) => {
        setPendingServicioSeleccion(servicio);
        router.back();
    };

    const handleAgregarServicio = async () => {
        if (!nuevoServicioNombre.trim()) return;

        try {
            const nuevoServicio = await agregarServicio({
                nombre: nuevoServicioNombre.trim(),
                nombreCorto: nuevoServicioNombre.trim().substring(0, 15),
                categoria: categoria,
                activo: true,
            });
            setNuevoServicioNombre('');
            handleSeleccionar(nuevoServicio);
        } catch (error) {
            Alert.alert('Error', 'No se pudo agregar el servicio');
        }
    };

    const handleAgregarServicioPrompt = () => {
        if (Platform.OS === 'ios') {
            Alert.prompt(
                'Nuevo Servicio',
                'Ingresa el nombre del nuevo servicio',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Agregar',
                        onPress: async (nombre: string | undefined) => {
                            if (!nombre?.trim()) return;
                            try {
                                const nuevoServicio = await agregarServicio({
                                    nombre: nombre.trim(),
                                    nombreCorto: nombre.trim().substring(0, 15),
                                    categoria: categoria,
                                    activo: true,
                                });
                                handleSeleccionar(nuevoServicio);
                            } catch (error) {
                                Alert.alert('Error', 'No se pudo agregar el servicio');
                            }
                        },
                    },
                ],
                'plain-text',
                '',
                'default'
            );
        }
    };

    return (
        <SafeAreaView style={[styles.container]} edges={['bottom']}>
            <View style={styles.contentContainer}>
                {/* Sheet Handle - Removed by request */}

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                        <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Tipo de Servicio</Text>
                    <View style={styles.cancelButton} />
                </View>

                {/* Category Header - Fixed */}
                <View style={styles.categoryHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${categoriaActual?.color}20` }]}>
                        <IconSymbol
                            size={28}
                            name={categoriaActual?.icono || 'list.bullet'}
                            color={categoriaActual?.color || BrandColors.primary}
                        />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                        {categoriaActual?.nombre}
                    </Text>
                    <Text style={[styles.categorySubtitle, { color: colors.textSecondary }]}>
                        Selecciona el tipo de servicio
                    </Text>
                </View>

                {/* Services List - Scrollable with max height */}
                <ScrollView
                    style={styles.servicesList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.servicesListContent}
                    bounces={false}
                >
                    {servicios.map((servicio) => (
                        <TouchableOpacity
                            key={servicio.id}
                            style={[styles.serviceItem, { backgroundColor: colors.surface }]}
                            onPress={() => handleSeleccionar(servicio)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.serviceItemContent}>
                                <IconSymbol
                                    size={20}
                                    name="checkmark.circle"
                                    color={colors.textTertiary}
                                />
                                <Text style={[styles.serviceItemText, { color: colors.text }]}>
                                    {servicio.nombre}
                                </Text>
                            </View>
                            <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Add New Service - Fixed at bottom */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.addServiceButton, { backgroundColor: colors.surface }]}
                        onPress={handleAgregarServicioPrompt}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.addServiceIcon, { backgroundColor: BrandColors.primary + '20' }]}>
                            <IconSymbol size={20} name="plus" color={BrandColors.primary} />
                        </View>
                        <Text style={[styles.addServiceText, { color: BrandColors.primary }]}>
                            Agregar nuevo servicio
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
    },
    contentContainer: {
        // Removed flex: 1 to allow fitToContents
    },
    // handleContainer removed
    // handle removed
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
        paddingBottom: 0,
    },
    addServiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: 12,
        gap: 12,
    },
    addServiceIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addServiceText: {
        fontSize: 16,
        fontWeight: '600',
    },
    androidInput: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: 12,
        marginTop: Spacing.md,
        gap: 10,
    },
    textInput: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 15,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
