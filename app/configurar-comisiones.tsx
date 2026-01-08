import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    CONFIGURACION_COMISIONES_DEFAULT,
    ConfiguracionComisiones,
    ModoComision,
    RangoComision
} from '@/types/caja';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ConfigurarComisionesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const canalId = params.canalId as string | undefined;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { canales, comisionesDefault, actualizarComisionesDefault, actualizarComisionesCanal } = useCanales();

    const canal = canalId ? canales.find(c => c.id === canalId) : null;
    const isEditingDefault = !canalId;

    const [usarPersonalizadas, setUsarPersonalizadas] = useState(canal?.usarComisionesPersonalizadas || false);
    const [config, setConfig] = useState<ConfiguracionComisiones>(
        canal?.configuracionComisiones ||
        (isEditingDefault ? comisionesDefault : CONFIGURACION_COMISIONES_DEFAULT)
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [nuevoRango, setNuevoRango] = useState({
        montoMin: '',
        montoMax: '',
        comisionDeposito: '',
        comisionRetiro: '',
    });

    useEffect(() => {
        if (isEditingDefault) {
            setConfig(comisionesDefault);
        } else if (canal) {
            setConfig(canal.configuracionComisiones || CONFIGURACION_COMISIONES_DEFAULT);
            setUsarPersonalizadas(canal.usarComisionesPersonalizadas || false);
        }
    }, [canal, comisionesDefault, isEditingDefault]);

    const handleChangeModo = (modo: ModoComision) => {
        setConfig(prev => ({ ...prev, modo }));
        setHasChanges(true);
    };

    const handleUpdateSimple = (field: 'comisionDeposito' | 'comisionRetiro', value: string) => {
        const numValue = parseFloat(value) || 0;
        setConfig(prev => ({
            ...prev,
            comisionSimple: { ...prev.comisionSimple, [field]: numValue }
        }));
        setHasChanges(true);
    };

    const handleUpdateRango = (index: number, field: keyof RangoComision, value: string) => {
        if (field === 'id') return;
        const numValue = parseFloat(value) || 0;
        const newRangos = [...config.rangos];
        newRangos[index] = { ...newRangos[index], [field]: numValue };
        setConfig(prev => ({ ...prev, rangos: newRangos }));
        setHasChanges(true);
    };

    const handleDeleteRango = (index: number) => {
        Alert.alert(
            'Eliminar Rango',
            '¿Estás seguro de eliminar este rango de comisión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        const newRangos = config.rangos.filter((_, i) => i !== index);
                        setConfig(prev => ({ ...prev, rangos: newRangos }));
                        setHasChanges(true);
                    }
                }
            ]
        );
    };

    const handleAddRango = () => {
        const montoMin = parseFloat(nuevoRango.montoMin) || 0;
        const montoMax = nuevoRango.montoMax === '' ? -1 : parseFloat(nuevoRango.montoMax) || 0;
        const comisionDeposito = parseFloat(nuevoRango.comisionDeposito) || 0;
        const comisionRetiro = parseFloat(nuevoRango.comisionRetiro) || 0;

        const newRango: RangoComision = {
            id: `r_${Date.now()}`,
            montoMin,
            montoMax,
            comisionDeposito,
            comisionRetiro,
        };

        const newRangos = [...config.rangos, newRango].sort((a, b) => a.montoMin - b.montoMin);
        setConfig(prev => ({ ...prev, rangos: newRangos }));
        setHasChanges(true);
        setShowAddModal(false);
        setNuevoRango({
            montoMin: '',
            montoMax: '',
            comisionDeposito: '',
            comisionRetiro: '',
        });
    };

    const handleSave = async () => {
        try {
            if (isEditingDefault) {
                await actualizarComisionesDefault(config);
            } else if (canal) {
                await actualizarComisionesCanal(canal.id, usarPersonalizadas, usarPersonalizadas ? config : undefined);
            }
            setHasChanges(false);
            Alert.alert('Guardado', 'Configuración de comisiones guardada correctamente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    const formatMonto = (valor: number): string => {
        if (valor === -1) return '∞';
        return `$${valor.toFixed(0)}`;
    };

    // Modal para agregar rango
    const AddRangoModal = () => (
        <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAddModal(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
                <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                    <View style={styles.modalHandle} />
                    <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                        Agregar Rango de Comisión
                    </Text>

                    <View style={styles.modalBody}>
                        <View style={styles.modalRow}>
                            <View style={styles.modalInputGroup}>
                                <Text style={[styles.modalInputLabel, isDark && styles.textDarkSecondary]}>
                                    Monto Mínimo
                                </Text>
                                <View style={[styles.modalInputWrapper, isDark && styles.modalInputWrapperDark]}>
                                    <Text style={styles.modalCurrency}>$</Text>
                                    <TextInput
                                        style={[styles.modalInput, isDark && styles.textDark]}
                                        placeholder="0"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                        value={nuevoRango.montoMin}
                                        onChangeText={(val) => setNuevoRango(prev => ({ ...prev, montoMin: val }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                            <View style={styles.modalInputGroup}>
                                <Text style={[styles.modalInputLabel, isDark && styles.textDarkSecondary]}>
                                    Monto Máximo
                                </Text>
                                <View style={[styles.modalInputWrapper, isDark && styles.modalInputWrapperDark]}>
                                    <Text style={styles.modalCurrency}>$</Text>
                                    <TextInput
                                        style={[styles.modalInput, isDark && styles.textDark]}
                                        placeholder="Sin límite"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                        value={nuevoRango.montoMax}
                                        onChangeText={(val) => setNuevoRango(prev => ({ ...prev, montoMax: val }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalRow}>
                            <View style={styles.modalInputGroup}>
                                <Text style={[styles.modalInputLabel, isDark && styles.textDarkSecondary]}>
                                    Comisión Depósito
                                </Text>
                                <View style={[styles.modalInputWrapper, isDark && styles.modalInputWrapperDark]}>
                                    <Text style={styles.modalCurrency}>$</Text>
                                    <TextInput
                                        style={[styles.modalInput, isDark && styles.textDark]}
                                        placeholder="0.00"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                        value={nuevoRango.comisionDeposito}
                                        onChangeText={(val) => setNuevoRango(prev => ({ ...prev, comisionDeposito: val }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                            <View style={styles.modalInputGroup}>
                                <Text style={[styles.modalInputLabel, isDark && styles.textDarkSecondary]}>
                                    Comisión Retiro
                                </Text>
                                <View style={[styles.modalInputWrapper, isDark && styles.modalInputWrapperDark]}>
                                    <Text style={styles.modalCurrency}>$</Text>
                                    <TextInput
                                        style={[styles.modalInput, isDark && styles.textDark]}
                                        placeholder="0.00"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                        value={nuevoRango.comisionRetiro}
                                        onChangeText={(val) => setNuevoRango(prev => ({ ...prev, comisionRetiro: val }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnConfirm]}
                                onPress={handleAddRango}
                            >
                                <Text style={styles.modalBtnConfirmText}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <AddRangoModal />

            <Stack.Screen
                options={{
                    title: isEditingDefault ? 'Comisiones por Defecto' : (canal?.nombre || 'Comisiones'),
                    headerStyle: { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
                    headerTintColor: '#FF6B00',
                    headerShadowVisible: true,
                    headerBackTitle: 'Atrás',
                    headerRight: () => hasChanges ? (
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={{ color: '#FF6B00', fontSize: 17, fontWeight: '600' }}>Guardar</Text>
                        </TouchableOpacity>
                    ) : null,
                }}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Toggle para comisiones personalizadas (solo para canales) */}
                {!isEditingDefault && (
                    <>
                        <TouchableOpacity
                            style={[styles.toggleCard, isDark && styles.cardDark]}
                            onPress={() => {
                                setUsarPersonalizadas(!usarPersonalizadas);
                                setHasChanges(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.toggleLeft}>
                                <View style={[styles.toggleIcon, { backgroundColor: usarPersonalizadas ? '#34C75915' : '#88888815' }]}>
                                    <IconSymbol
                                        size={18}
                                        name={usarPersonalizadas ? "checkmark.circle.fill" : "circle"}
                                        color={usarPersonalizadas ? '#34C759' : '#888'}
                                    />
                                </View>
                                <View style={styles.toggleContent}>
                                    <Text style={[styles.toggleTitle, isDark && styles.textDark]}>
                                        Usar comisiones personalizadas
                                    </Text>
                                    <Text style={[styles.toggleSubtitle, isDark && styles.textDarkSecondary]}>
                                        {usarPersonalizadas ? 'Comisiones específicas para este canal' : 'Usando comisiones por defecto'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {!usarPersonalizadas && (
                            <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
                                <IconSymbol size={18} name="info.circle.fill" color="#007AFF" />
                                <Text style={[styles.infoText, isDark && styles.textDarkSecondary]}>
                                    Este canal usa las comisiones por defecto. Activa las comisiones personalizadas para configurar valores específicos.
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Configuración de comisiones */}
                {(isEditingDefault || usarPersonalizadas) && (
                    <>
                        {/* Selector de modo */}
                        <Text style={[styles.sectionTitle, isDark && styles.textDarkSecondary]}>
                            TIPO DE COMISIÓN
                        </Text>
                        <View style={[styles.modoCard, isDark && styles.cardDark]}>
                            <TouchableOpacity
                                style={[
                                    styles.modoOption,
                                    config.modo === 'simple' && styles.modoOptionActive
                                ]}
                                onPress={() => handleChangeModo('simple')}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.modoRadio,
                                    config.modo === 'simple' && styles.modoRadioActive
                                ]}>
                                    {config.modo === 'simple' && <View style={styles.modoRadioDot} />}
                                </View>
                                <View style={styles.modoContent}>
                                    <Text style={[styles.modoTitle, isDark && styles.textDark]}>
                                        Comisión Fija
                                    </Text>
                                    <Text style={[styles.modoDescription, isDark && styles.textDarkSecondary]}>
                                        Misma comisión para cualquier monto
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.modoDivider, isDark && styles.dividerDark]} />

                            <TouchableOpacity
                                style={[
                                    styles.modoOption,
                                    config.modo === 'rangos' && styles.modoOptionActive
                                ]}
                                onPress={() => handleChangeModo('rangos')}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.modoRadio,
                                    config.modo === 'rangos' && styles.modoRadioActive
                                ]}>
                                    {config.modo === 'rangos' && <View style={styles.modoRadioDot} />}
                                </View>
                                <View style={styles.modoContent}>
                                    <Text style={[styles.modoTitle, isDark && styles.textDark]}>
                                        Por Rangos de Monto
                                    </Text>
                                    <Text style={[styles.modoDescription, isDark && styles.textDarkSecondary]}>
                                        Comisión según el monto de la operación
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Comisión Simple */}
                        {config.modo === 'simple' && (
                            <>
                                <Text style={[styles.sectionTitle, isDark && styles.textDarkSecondary]}>
                                    COMISIÓN FIJA
                                </Text>
                                <View style={[styles.simpleCard, isDark && styles.cardDark]}>
                                    <View style={styles.simpleRow}>
                                        <View style={styles.simpleLabel}>
                                            <View style={[styles.simpleIcon, { backgroundColor: '#34C75915' }]}>
                                                <IconSymbol size={16} name="arrow.down.circle.fill" color="#34C759" />
                                            </View>
                                            <Text style={[styles.simpleLabelText, isDark && styles.textDark]}>
                                                Depósitos
                                            </Text>
                                        </View>
                                        <View style={[styles.simpleInputWrapper, isDark && styles.simpleInputWrapperDark]}>
                                            <Text style={styles.simpleCurrency}>$</Text>
                                            <TextInput
                                                style={[styles.simpleInput, isDark && styles.textDark]}
                                                value={config.comisionSimple.comisionDeposito.toString()}
                                                onChangeText={(val) => handleUpdateSimple('comisionDeposito', val)}
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? '#555' : '#aaa'}
                                            />
                                        </View>
                                    </View>

                                    <View style={[styles.simpleDivider, isDark && styles.dividerDark]} />

                                    <View style={styles.simpleRow}>
                                        <View style={styles.simpleLabel}>
                                            <View style={[styles.simpleIcon, { backgroundColor: '#FF3B3015' }]}>
                                                <IconSymbol size={16} name="arrow.up.circle.fill" color="#FF3B30" />
                                            </View>
                                            <Text style={[styles.simpleLabelText, isDark && styles.textDark]}>
                                                Retiros
                                            </Text>
                                        </View>
                                        <View style={[styles.simpleInputWrapper, isDark && styles.simpleInputWrapperDark]}>
                                            <Text style={styles.simpleCurrency}>$</Text>
                                            <TextInput
                                                style={[styles.simpleInput, isDark && styles.textDark]}
                                                value={config.comisionSimple.comisionRetiro.toString()}
                                                onChangeText={(val) => handleUpdateSimple('comisionRetiro', val)}
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? '#555' : '#aaa'}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Rangos de comisión */}
                        {config.modo === 'rangos' && (
                            <>
                                <Text style={[styles.sectionTitle, isDark && styles.textDarkSecondary]}>
                                    RANGOS DE COMISIÓN
                                </Text>

                                <View style={[styles.tableCard, isDark && styles.cardDark]}>
                                    {/* Header de tabla */}
                                    <View style={[styles.tableHeader, isDark && styles.tableHeaderDark]}>
                                        <Text style={[styles.tableHeaderText, styles.colRango]}>Rango</Text>
                                        <Text style={[styles.tableHeaderText, styles.colComision]}>Depósito</Text>
                                        <Text style={[styles.tableHeaderText, styles.colComision]}>Retiro</Text>
                                        <View style={styles.colAction} />
                                    </View>

                                    {config.rangos.map((rango, index) => (
                                        <View key={rango.id} style={styles.tableRow}>
                                            <Text style={[styles.tableCell, styles.colRango, isDark && styles.textDark]}>
                                                {formatMonto(rango.montoMin)} - {formatMonto(rango.montoMax)}
                                            </Text>
                                            <View style={[styles.inputCell, styles.colComision]}>
                                                <Text style={styles.cellCurrency}>$</Text>
                                                <TextInput
                                                    style={[styles.cellInput, isDark && styles.cellInputDark]}
                                                    value={rango.comisionDeposito.toString()}
                                                    onChangeText={(val) => handleUpdateRango(index, 'comisionDeposito', val)}
                                                    keyboardType="decimal-pad"
                                                />
                                            </View>
                                            <View style={[styles.inputCell, styles.colComision]}>
                                                <Text style={styles.cellCurrency}>$</Text>
                                                <TextInput
                                                    style={[styles.cellInput, isDark && styles.cellInputDark]}
                                                    value={rango.comisionRetiro.toString()}
                                                    onChangeText={(val) => handleUpdateRango(index, 'comisionRetiro', val)}
                                                    keyboardType="decimal-pad"
                                                />
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.colAction, styles.deleteBtn]}
                                                onPress={() => handleDeleteRango(index)}
                                            >
                                                <IconSymbol size={16} name="trash" color="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {/* Agregar nuevo rango */}
                                    <TouchableOpacity
                                        style={styles.addRangoBtn}
                                        onPress={() => setShowAddModal(true)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol size={18} name="plus.circle.fill" color="#FF6B00" />
                                        <Text style={styles.addRangoBtnText}>Agregar nuevo rango</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Info */}
                                <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
                                    <IconSymbol size={18} name="info.circle.fill" color="#007AFF" />
                                    <Text style={[styles.infoText, isDark && styles.textDarkSecondary]}>
                                        Los rangos determinan la comisión según el monto. El símbolo "∞" significa sin límite.
                                    </Text>
                                </View>
                            </>
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
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


    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },

    // Toggle
    toggleCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
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

    // Section
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
        marginBottom: 10,
        marginLeft: 4,
        letterSpacing: 0.5,
    },

    // Modo selector
    modoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    modoOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    modoOptionActive: {
        backgroundColor: '#FF6B0008',
    },
    modoRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modoRadioActive: {
        borderColor: '#FF6B00',
    },
    modoRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF6B00',
    },
    modoContent: {
        flex: 1,
    },
    modoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    modoDescription: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    modoDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 52,
    },

    // Simple
    simpleCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    simpleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    simpleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    simpleIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    simpleLabelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    simpleInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 14,
        minWidth: 100,
    },
    simpleInputWrapperDark: {
        backgroundColor: '#2c2c2e',
    },
    simpleCurrency: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF6B00',
    },
    simpleInput: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        paddingVertical: 10,
        marginLeft: 6,
        minWidth: 60,
        textAlign: 'right',
    },
    simpleDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 64,
    },

    // Table
    tableCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    tableHeaderDark: {
        backgroundColor: '#2c2c2e',
        borderBottomColor: '#3a3a3a',
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableCell: {
        fontSize: 13,
        color: '#000',
    },
    colRango: {
        flex: 2,
    },
    colComision: {
        flex: 1.5,
    },
    colAction: {
        width: 36,
        alignItems: 'center',
    },
    inputCell: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cellCurrency: {
        fontSize: 12,
        color: '#FF6B00',
        fontWeight: '600',
    },
    cellInput: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        paddingVertical: 4,
        paddingHorizontal: 4,
        minWidth: 40,
    },
    cellInputDark: {
        color: '#fff',
    },
    deleteBtn: {
        padding: 8,
    },
    addRangoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    addRangoBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B00',
    },

    // Info
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F8FF',
        borderRadius: 14,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#007AFF15',
        marginBottom: 16,
    },
    infoCardDark: {
        backgroundColor: '#0a1520',
        borderColor: '#007AFF30',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
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
    },
    modalContentDark: {
        backgroundColor: '#1c1c1e',
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
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    modalBody: {
        paddingHorizontal: 20,
    },
    modalRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    modalInputGroup: {
        flex: 1,
    },
    modalInputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
    },
    modalInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        paddingHorizontal: 12,
    },
    modalInputWrapperDark: {
        backgroundColor: '#2c2c2e',
    },
    modalCurrency: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF6B00',
    },
    modalInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        paddingVertical: 12,
        marginLeft: 4,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#f0f0f0',
    },
    modalBtnConfirm: {
        backgroundColor: '#FF6B00',
    },
    modalBtnCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    modalBtnConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    dividerDark: {
        backgroundColor: '#2a2a2a',
    },
    textDark: {
        color: '#fff',
    },
    textDarkSecondary: {
        color: '#888',
    },
});
