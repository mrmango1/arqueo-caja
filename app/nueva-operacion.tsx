import { AnimatedButton } from '@/components/ui/animated-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { BrandColors, Colors, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    calcularComision,
    CategoriaOperacion,
    CONFIGURACION_COMISIONES_DEFAULT,
    getCategoriaById,
    getCategoriasPorTipo,
    Transaccion
} from '@/types/caja';
import { isValidNumber, parseLocalizedFloat, parseLocalizedFloatOrDefault } from '@/utils/numbers';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { get, push, ref, update } from 'firebase/database';
import React, { useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function NuevaOperacionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const tipoInicial = params.tipo as CategoriaOperacion | undefined;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const { user } = useAuth();
    const { canalesActivos, comisionesDefault } = useCanales();

    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaOperacion | null>(
        tipoInicial || null
    );
    const [monto, setMonto] = useState('');
    const [banco, setBanco] = useState('');
    const [referencia, setReferencia] = useState('');
    const [comision, setComision] = useState('');
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCanalesModal, setShowCanalesModal] = useState(false);

    // Función para mostrar selector de canales nativo en iOS
    const handleShowCanalesSelector = () => {
        if (Platform.OS === 'ios') {
            const cancelButtonIndex = canalesActivos.length;
            const options = [...canalesActivos.map(c => c.nombre), 'Cancelar'];

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: 'Seleccionar Canal de Transacción',
                },
                (buttonIndex) => {
                    if (buttonIndex !== cancelButtonIndex) {
                        setBanco(canalesActivos[buttonIndex].nombre);
                    }
                }
            );
        } else {
            setShowCanalesModal(true);
        }
    };

    const categoriaActual = categoriaSeleccionada ? getCategoriaById(categoriaSeleccionada) : null;
    const categoriasIngreso = getCategoriasPorTipo('ingreso');
    const categoriasEgreso = getCategoriasPorTipo('egreso');

    // Auto-calcular comisión
    React.useEffect(() => {
        if (!monto || !isValidNumber(monto) || !categoriaActual) {
            return;
        }

        const montoNum = parseLocalizedFloat(monto);
        const canal = canalesActivos.find(c => c.nombre === banco);

        // Determinar qué configuración usar
        const configToUse = (canal?.usarComisionesPersonalizadas && canal.configuracionComisiones)
            ? canal.configuracionComisiones
            : (comisionesDefault || CONFIGURACION_COMISIONES_DEFAULT);

        // Mapear tipo de operación a tipo de comisión ('deposito' o 'retiro')
        // Por defecto: ingresos -> deposito, egresos -> retiro
        // Si hay categorías específicas que deban comportarse distinto, ajustarlo aquí
        const tipoComision = categoriaActual.tipo === 'ingreso' ? 'deposito' : 'retiro';

        const comisionCalculada = calcularComision(montoNum, tipoComision, configToUse);
        setComision(comisionCalculada.toFixed(2));

    }, [monto, banco, categoriaSeleccionada, canalesActivos, comisionesDefault]);

    const handleGuardar = async () => {
        if (!categoriaSeleccionada) {
            Alert.alert('Error', 'Selecciona un tipo de operación');
            return;
        }

        if (!monto || !isValidNumber(monto)) {
            Alert.alert('Error', 'Ingresa un monto válido');
            return;
        }

        const montoNum = parseLocalizedFloat(monto);
        if (montoNum <= 0) {
            Alert.alert('Error', 'El monto debe ser mayor a 0');
            return;
        }

        if (!banco) {
            Alert.alert('Error', 'Selecciona el banco');
            return;
        }

        const comisionNum = comision ? parseLocalizedFloatOrDefault(comision, 0) : 0;

        setLoading(true);

        try {
            const cajasRef = ref(db, 'cajas');
            const snapshot = await get(cajasRef);

            let cajaId: string | null = null;
            let cajaData: any = null;

            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const caja = child.val();
                    if (caja.usuarioId === user!.uid && caja.estado === 'abierta') {
                        cajaId = child.key;
                        cajaData = caja;
                    }
                });
            }

            if (!cajaId) {
                setLoading(false);
                Alert.alert('Error', 'No hay una caja abierta', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
                return;
            }

            const nuevaTransaccion: Omit<Transaccion, 'id'> = {
                cajaId,
                tipo: categoriaActual!.tipo,
                monto: montoNum,
                concepto: categoriaActual!.nombre,
                categoria: categoriaSeleccionada,
                fecha: Date.now(),
                usuarioId: user!.uid,
                usuarioNombre: user!.email || 'Usuario',
                comision: comisionNum,
                ...(banco ? { banco } : {}),
                ...(referencia ? { numeroReferencia: referencia } : {}),
            };

            await push(ref(db, 'transacciones'), nuevaTransaccion);

            const cajaRef = ref(db, `cajas/${cajaId}`);
            const updates: any = {};

            if (categoriaActual!.tipo === 'ingreso') {
                if (categoriaSeleccionada === 'deposito') {
                    updates.totalDepositos = (cajaData.totalDepositos || 0) + montoNum;
                } else {
                    updates.totalOtrosIngresos = (cajaData.totalOtrosIngresos || 0) + montoNum;
                }
                updates.saldoEsperado = (cajaData.saldoEsperado || cajaData.montoInicial) + montoNum + comisionNum;
            } else {
                if (categoriaSeleccionada === 'retiro') {
                    updates.totalRetiros = (cajaData.totalRetiros || 0) + montoNum;
                } else {
                    updates.totalOtrosEgresos = (cajaData.totalOtrosEgresos || 0) + montoNum;
                }
                updates.saldoEsperado = (cajaData.saldoEsperado || cajaData.montoInicial) - montoNum + comisionNum;
            }

            updates.totalComisiones = (cajaData.totalComisiones || 0) + comisionNum;

            await update(cajaRef, updates);

            setLoading(false);
            router.back();

        } catch (error: any) {
            console.error('Error al registrar operación:', error);
            setLoading(false);
            Alert.alert('Error', error?.message || 'No se pudo registrar la operación');
        }
    };

    // Modal de selección de canal de transacción
    const CanalModal = () => (
        <Modal
            visible={showCanalesModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCanalesModal(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowCanalesModal(false)} />
                <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                    <View style={styles.modalHandle} />
                    <Text style={[styles.modalTitle, isDark && styles.textDark]}>Canal de Transacción</Text>

                    <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                        {canalesActivos.map((canal) => (
                            <TouchableOpacity
                                key={canal.id}
                                style={[
                                    styles.modalItem,
                                    banco === canal.nombre && styles.modalItemSelected,
                                ]}
                                onPress={() => {
                                    setBanco(canal.nombre);
                                    setShowCanalesModal(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.modalItemContent}>
                                    <IconSymbol
                                        size={20}
                                        name="building.columns"
                                        color={banco === canal.nombre ? BrandColors.primary : (isDark ? '#666' : '#999')}
                                    />
                                    <Text style={[
                                        styles.modalItemText,
                                        banco === canal.nombre && styles.modalItemTextSelected,
                                        isDark && styles.textDark
                                    ]}>
                                        {canal.nombre}
                                    </Text>
                                </View>
                                {banco === canal.nombre && (
                                    <IconSymbol size={20} name="checkmark.circle.fill" color={BrandColors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Selector de categorías
    if (!categoriaSeleccionada) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen
                    options={{
                        title: 'Nueva Operación',
                        headerTransparent: true,
                        headerStyle: { backgroundColor: 'transparent' },
                        headerTintColor: isDark ? '#fff' : '#000',
                        headerShadowVisible: false,
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                                <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancelar</Text>
                            </TouchableOpacity>
                        ),
                    }}
                />

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={styles.selectorContent}
                >
                    {/* Ingresos */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <View style={[styles.sectionDot, { backgroundColor: '#34C759' }]} />
                            <Text style={[styles.sectionLabel, isDark && styles.textDark]}>
                                Ingresos
                            </Text>
                        </View>
                        <Text style={[styles.sectionSubtitle, isDark && styles.textDarkSecondary]}>
                            Cliente te entrega dinero
                        </Text>
                    </View>

                    <View style={styles.categoriesGrid}>
                        {categoriasIngreso.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryCard,
                                    {
                                        backgroundColor: colors.surface,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.10,
                                        shadowRadius: 2,
                                        elevation: 4,
                                    }
                                ]}
                                onPress={() => setCategoriaSeleccionada(cat.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: `${cat.color}15`, borderRadius: 16 }]} />
                                <View style={styles.categoryIcon}>
                                    <IconSymbol size={28} name={cat.icono} color={cat.color} />
                                </View>
                                <Text style={[styles.categoryName, { color: colors.text }]}>
                                    {cat.nombreCorto}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Egresos */}
                    <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                        <View style={styles.sectionTitleRow}>
                            <View style={[styles.sectionDot, { backgroundColor: '#FF3B30' }]} />
                            <Text style={[styles.sectionLabel, isDark && styles.textDark]}>
                                Egresos
                            </Text>
                        </View>
                        <Text style={[styles.sectionSubtitle, isDark && styles.textDarkSecondary]}>
                            Tú entregas dinero al cliente
                        </Text>
                    </View>

                    <View style={styles.categoriesGrid}>
                        {categoriasEgreso.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryCard,
                                    {
                                        backgroundColor: colors.surface,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.10,
                                        shadowRadius: 2,
                                        elevation: 4,
                                    }
                                ]}
                                onPress={() => setCategoriaSeleccionada(cat.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: `${cat.color}15`, borderRadius: 16 }]} />
                                <View style={styles.categoryIcon}>
                                    <IconSymbol size={28} name={cat.icono} color={cat.color} />
                                </View>
                                <Text style={[styles.categoryName, { color: colors.text }]}>
                                    {cat.nombreCorto}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        );
    }

    const primaryColor = categoriaActual?.color || BrandColors.primary;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <CanalModal />



            <Stack.Screen
                options={{
                    title: categoriaActual?.nombre || 'Nueva Operación',
                    presentation: 'modal',
                    headerTransparent: true,
                    headerStyle: { backgroundColor: 'transparent' },
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (tipoInicial) {
                                    router.back();
                                } else {
                                    router.back();
                                }
                            }}
                            style={{ padding: 8, marginLeft: -8 }}
                        >
                            <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancelar</Text>
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => setCategoriaSeleccionada(null)}
                            disabled={!categoriaSeleccionada}
                            style={{ padding: 8, marginRight: -8, opacity: categoriaSeleccionada ? 1 : 0 }}
                        >
                            <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 17 }}>Limpiar</Text>
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingBottom: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    paddingTop: Spacing.md,
                }}
            >
                {/* Input de monto */}
                <Animated.View entering={FadeInUp.delay(100).springify()}>
                    <View style={[styles.amountCard, { backgroundColor: colors.surface }, Shadows.md]}>
                        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Monto de la operación</Text>
                        <View style={[styles.amountInputWrapper, { borderColor: primaryColor, backgroundColor: colors.inputBackground }]}>
                            <Text style={[styles.amountCurrency, { color: primaryColor }]}>$</Text>
                            <TextInput
                                style={[styles.amountInput, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? '#555' : '#ccc'}
                                value={monto}
                                onChangeText={setMonto}
                                keyboardType="decimal-pad"
                                editable={!loading}
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Formulario */}
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                    <View style={[styles.formCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                        {/* Canal de transacción */}
                        <View style={styles.formGroup}>
                            <View style={styles.labelRow}>
                                <IconSymbol size={16} name="building.columns" color={colors.textSecondary} />
                                <Text style={[styles.formLabel, { color: colors.text }]}>Canal de Transacción</Text>
                                <View style={styles.requiredBadge}>
                                    <Text style={styles.requiredText}>REQUERIDO</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.selectButton, { backgroundColor: colors.backgroundTertiary }]}
                                onPress={handleShowCanalesSelector}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.selectButtonText,
                                    !banco && styles.selectButtonPlaceholder,
                                    { color: banco ? colors.text : colors.textSecondary }
                                ]}>
                                    {banco || 'Seleccionar canal'}
                                </Text>
                                <View style={[styles.selectArrowBox, isDark && styles.selectArrowBoxDark]}>
                                    <IconSymbol size={16} name="chevron.down" color="#999" />
                                </View>
                            </TouchableOpacity>
                        </View>


                        {/* Referencia */}
                        <View style={styles.formGroup}>
                            <View style={styles.labelRow}>
                                <IconSymbol size={16} name="number" color={colors.textSecondary} />
                                <Text style={[styles.formLabel, { color: colors.text }]}>
                                    N° Referencia / Comprobante
                                </Text>
                            </View>
                            <TextInput
                                style={[styles.textInputField, { backgroundColor: colors.backgroundTertiary, color: colors.text }]}
                                placeholder="Ej: 123456789"
                                placeholderTextColor={isDark ? '#555' : '#aaa'}
                                value={referencia}
                                onChangeText={setReferencia}
                                editable={!loading}
                            />
                        </View>


                        {/* Comisión */}
                        <View style={styles.formGroup}>
                            <View style={styles.labelRow}>
                                <IconSymbol size={16} name="dollarsign.circle" color={isDark ? '#F8FAFC' : BrandColors.primary} />
                                <Text style={[styles.formLabel, { color: colors.text }]}>
                                    Comisión cobrada
                                </Text>
                                <View style={[styles.optionalBadge, isDark && styles.optionalBadgeDark]}>
                                    <Text style={styles.optionalText}>TU GANANCIA</Text>
                                </View>
                            </View>
                            <View style={[styles.comisionWrapper, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                                <Text style={[styles.comisionCurrency, { color: isDark ? '#F8FAFC' : BrandColors.primary }]}>$</Text>
                                <TextInput
                                    style={[styles.comisionInput, { color: colors.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor={isDark ? '#555' : '#bbb'}
                                    value={comision}
                                    onChangeText={setComision}
                                    keyboardType="decimal-pad"
                                    editable={!loading}
                                />
                            </View>
                            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                Esta cantidad se sumará a tu saldo en caja
                            </Text>
                        </View>

                        {/* Notas */}
                        <View style={[styles.formGroup, { marginBottom: 0 }]}>
                            <View style={styles.labelRow}>
                                <IconSymbol size={16} name="note.text" color={colors.textSecondary} />
                                <Text style={[styles.formLabel, { color: colors.text }]}>Notas</Text>
                                <View style={[styles.optionalBadge, isDark && styles.optionalBadgeDark]}>
                                    <Text style={styles.optionalText}>OPCIONAL</Text>
                                </View>
                            </View>
                            <TextInput
                                style={[styles.textAreaField, { backgroundColor: colors.backgroundTertiary, color: colors.text }]}
                                placeholder="Observaciones adicionales..."
                                placeholderTextColor={isDark ? '#555' : '#aaa'}
                                value={notas}
                                onChangeText={setNotas}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                editable={!loading}
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Botón de guardar */}
                <Animated.View entering={FadeInUp.delay(300).springify()}>
                    <AnimatedButton
                        title={loading ? 'Guardando...' : 'Registrar Operación'}
                        onPress={handleGuardar}
                        variant="primary"
                        icon="checkmark.circle.fill"
                        loading={loading}
                        disabled={loading}
                        fullWidth
                        size="lg"
                        style={{ backgroundColor: primaryColor }}
                    />
                </Animated.View>


            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerDark: {
    },

    // Header simple


    // Scroll
    scrollView: {
        flex: 1,
    },
    selectorContent: {
        padding: 20,
    },
    formContent: {
        padding: 20,
    },

    // Secciones de categorías
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sectionLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    categoryCard: {
        width: (width - 64) / 3,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    // cardDark is no longer used - colors.surface is applied directly
    categoryIcon: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },

    // Card de monto
    amountCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    amountLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    amountCurrency: {
        fontSize: 32,
        fontWeight: '300',
    },
    amountInput: {
        flex: 1,
        fontSize: 40,
        fontWeight: '700',
        color: '#000',
        paddingVertical: 12,
        marginLeft: 8,
    },

    // Card del formulario
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    requiredBadge: {
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    requiredText: {
        fontSize: 9,
        fontWeight: '700',
        color: BrandColors.primary,
    },
    optionalBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    optionalBadgeDark: {
        backgroundColor: '#1E293B',
    },
    optionalText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#888',
    },

    // Select button
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    selectButtonDark: {
        backgroundColor: '#1E293B', // Slate 800 - matches colors.backgroundTertiary
    },
    selectButtonText: {
        fontSize: 16,
        color: '#000',
    },
    selectButtonPlaceholder: {
        color: '#999',
    },
    selectArrowBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#e8e8e8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectArrowBoxDark: {
        backgroundColor: '#334155', // Slate 700
    },

    // Text inputs
    textInputField: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#000',
    },
    textInputFieldDark: {
        backgroundColor: '#1E293B', // Slate 800 - matches colors.backgroundTertiary
        color: '#fff',
    },
    textAreaField: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#000',
        minHeight: 90,
        textAlignVertical: 'top',
    },

    // Comisión
    comisionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC', // Slate 50
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.2)',
    },
    comisionWrapperDark: {
        backgroundColor: '#0F172A', // Slate 900
        borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    comisionCurrency: {
        fontSize: 20,
        fontWeight: '600',
        color: BrandColors.primary,
    },
    comisionInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        paddingVertical: 14,
        marginLeft: 8,
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        fontStyle: 'italic',
    },

    // Submit button
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 18,
        gap: 10,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingBottom: 40,
        maxHeight: height * 0.7,
    },
    modalContentDark: {
        backgroundColor: '#0F172A', // Slate 900 - matches colors.surface
    },
    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    modalList: {
        paddingHorizontal: 16,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    modalItemSelected: {
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
    },
    modalItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalItemTextSelected: {
        color: BrandColors.primary,
        fontWeight: '600',
    },

    textDark: {
        color: '#fff',
    },
    textDarkSecondary: {
        color: '#888',
    },
});
