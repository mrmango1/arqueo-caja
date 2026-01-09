import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, Colors } from '@/constants/theme';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    CONFIGURACION_COMISIONES_DEFAULT,
    ConfiguracionComisiones,
    ModoComision,
    RangoComision
} from '@/types/caja';
import { parseLocalizedFloatOrDefault } from '@/utils/numbers';
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
    const colors = Colors[isDark ? 'dark' : 'light'];
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

    // String states for commission inputs to avoid conversion issues
    const [comisionDepositoStr, setComisionDepositoStr] = useState(
        config.comisionSimple.comisionDeposito.toString()
    );
    const [comisionRetiroStr, setComisionRetiroStr] = useState(
        config.comisionSimple.comisionRetiro.toString()
    );
    const [rangosInputs, setRangosInputs] = useState<{ [key: string]: { deposito: string; retiro: string } }>({});

    useEffect(() => {
        if (isEditingDefault) {
            setConfig(comisionesDefault);
            setComisionDepositoStr(comisionesDefault.comisionSimple.comisionDeposito.toString());
            setComisionRetiroStr(comisionesDefault.comisionSimple.comisionRetiro.toString());
            // Initialize rangos inputs
            const newRangosInputs: { [key: string]: { deposito: string; retiro: string } } = {};
            comisionesDefault.rangos.forEach(r => {
                newRangosInputs[r.id] = {
                    deposito: r.comisionDeposito.toString(),
                    retiro: r.comisionRetiro.toString(),
                };
            });
            setRangosInputs(newRangosInputs);
        } else if (canal) {
            const configToUse = canal.configuracionComisiones || CONFIGURACION_COMISIONES_DEFAULT;
            setConfig(configToUse);
            setUsarPersonalizadas(canal.usarComisionesPersonalizadas || false);
            setComisionDepositoStr(configToUse.comisionSimple.comisionDeposito.toString());
            setComisionRetiroStr(configToUse.comisionSimple.comisionRetiro.toString());
            // Initialize rangos inputs
            const newRangosInputs: { [key: string]: { deposito: string; retiro: string } } = {};
            configToUse.rangos.forEach(r => {
                newRangosInputs[r.id] = {
                    deposito: r.comisionDeposito.toString(),
                    retiro: r.comisionRetiro.toString(),
                };
            });
            setRangosInputs(newRangosInputs);
        }
    }, [canal, comisionesDefault, isEditingDefault]);

    const handleChangeModo = (modo: ModoComision) => {
        setConfig(prev => ({ ...prev, modo }));
        setHasChanges(true);
    };

    const handleUpdateSimple = (field: 'comisionDeposito' | 'comisionRetiro', value: string) => {
        // Update the string state first
        if (field === 'comisionDeposito') {
            setComisionDepositoStr(value);
        } else {
            setComisionRetiroStr(value);
        }
        // Then update the numeric config
        const numValue = parseLocalizedFloatOrDefault(value, 0);
        setConfig(prev => ({
            ...prev,
            comisionSimple: { ...prev.comisionSimple, [field]: numValue }
        }));
        setHasChanges(true);
    };

    const handleUpdateRango = (index: number, field: keyof RangoComision, value: string) => {
        if (field === 'id') return;
        const rango = config.rangos[index];
        // Update string state
        if (field === 'comisionDeposito' || field === 'comisionRetiro') {
            setRangosInputs(prev => ({
                ...prev,
                [rango.id]: {
                    ...prev[rango.id],
                    [field === 'comisionDeposito' ? 'deposito' : 'retiro']: value,
                }
            }));
        }
        // Update numeric config
        const numValue = parseLocalizedFloatOrDefault(value, 0);
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
        const montoMin = parseLocalizedFloatOrDefault(nuevoRango.montoMin, 0);
        const montoMax = nuevoRango.montoMax === '' ? -1 : parseLocalizedFloatOrDefault(nuevoRango.montoMax, 0);
        const comisionDeposito = parseLocalizedFloatOrDefault(nuevoRango.comisionDeposito, 0);
        const comisionRetiro = parseLocalizedFloatOrDefault(nuevoRango.comisionRetiro, 0);

        const newRango: RangoComision = {
            id: `r_${Date.now()}`,
            montoMin,
            montoMax,
            comisionDeposito,
            comisionRetiro,
        };

        const newRangos = [...config.rangos, newRango].sort((a, b) => a.montoMin - b.montoMin);
        setConfig(prev => ({ ...prev, rangos: newRangos }));
        // Initialize string inputs for the new range
        setRangosInputs(prev => ({
            ...prev,
            [newRango.id]: {
                deposito: comisionDeposito.toString(),
                retiro: comisionRetiro.toString(),
            }
        }));
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AddRangoModal />

            <Stack.Screen
                options={{
                    title: isEditingDefault ? 'Comisiones por Defecto' : (canal?.nombre || 'Comisiones'),
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerTitleStyle: { color: colors.text },
                    headerShadowVisible: false,
                    headerBackTitle: 'Atrás',
                    headerRight: () => hasChanges ? (
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Guardar</Text>
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
                                    config.modo === 'simple' && styles.modoOptionActive,
                                    config.modo === 'simple' && isDark && styles.modoOptionActiveDark
                                ]}
                                onPress={() => handleChangeModo('simple')}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.modoRadio,
                                    isDark && styles.modoRadioDark,
                                    config.modo === 'simple' && styles.modoRadioActive,
                                    config.modo === 'simple' && isDark && styles.modoRadioActiveDark
                                ]}>
                                    {config.modo === 'simple' && <View style={[styles.modoRadioDot, isDark && styles.modoRadioDotDark]} />}
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
                                    config.modo === 'rangos' && styles.modoOptionActive,
                                    config.modo === 'rangos' && isDark && styles.modoOptionActiveDark
                                ]}
                                onPress={() => handleChangeModo('rangos')}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.modoRadio,
                                    isDark && styles.modoRadioDark,
                                    config.modo === 'rangos' && styles.modoRadioActive,
                                    config.modo === 'rangos' && isDark && styles.modoRadioActiveDark
                                ]}>
                                    {config.modo === 'rangos' && <View style={[styles.modoRadioDot, isDark && styles.modoRadioDotDark]} />}
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
                                            <Text style={[styles.simpleCurrency, isDark && styles.simpleCurrencyDark]}>$</Text>
                                            <TextInput
                                                style={[styles.simpleInput, isDark && styles.textDark]}
                                                value={comisionDepositoStr}
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
                                            <Text style={[styles.simpleCurrency, isDark && styles.simpleCurrencyDark]}>$</Text>
                                            <TextInput
                                                style={[styles.simpleInput, isDark && styles.textDark]}
                                                value={comisionRetiroStr}
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
                                                    value={rangosInputs[rango.id]?.deposito ?? rango.comisionDeposito.toString()}
                                                    onChangeText={(val) => handleUpdateRango(index, 'comisionDeposito', val)}
                                                    keyboardType="decimal-pad"
                                                />
                                            </View>
                                            <View style={[styles.inputCell, styles.colComision]}>
                                                <Text style={styles.cellCurrency}>$</Text>
                                                <TextInput
                                                    style={[styles.cellInput, isDark && styles.cellInputDark]}
                                                    value={rangosInputs[rango.id]?.retiro ?? rango.comisionRetiro.toString()}
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
                                        <IconSymbol size={18} name="plus.circle.fill" color={BrandColors.primary} />
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
    },
    containerDark: {
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
        backgroundColor: '#0F172A', // Slate 900 - matches colors.surface
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
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
    },
    modoOptionActiveDark: {
        backgroundColor: 'rgba(248, 250, 252, 0.05)',
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
    modoRadioDark: {
        borderColor: '#555',
    },
    modoRadioActive: {
        borderColor: BrandColors.primary, // Dark color for light mode
    },
    modoRadioActiveDark: {
        borderColor: '#F8FAFC', // Light color for dark mode
    },
    modoRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: BrandColors.primary, // Dark color for light mode
    },
    modoRadioDotDark: {
        backgroundColor: '#F8FAFC', // Light color for dark mode
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
        backgroundColor: '#1E293B', // Slate 800 - matches colors.backgroundTertiary
    },
    simpleCurrency: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748B', // Slate 500 - visible on both light and dark
    },
    simpleCurrencyDark: {
        color: '#F8FAFC', // Light color for dark mode
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
        backgroundColor: '#1E293B', // Slate 800 - matches colors.backgroundTertiary
        borderBottomColor: '#334155', // Slate 700
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
        color: BrandColors.primary,
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
        color: BrandColors.primary,
    },

    // Info
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.08)',
        marginBottom: 16,
        // Shadow for better visibility
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    infoCardDark: {
        backgroundColor: '#1E293B', // Slate 800
        borderColor: 'rgba(148, 163, 184, 0.2)',
        shadowOpacity: 0,
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
        backgroundColor: '#1E293B', // Slate 800 - matches colors.backgroundTertiary
    },
    modalCurrency: {
        fontSize: 16,
        fontWeight: '600',
        color: BrandColors.primary,
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
        backgroundColor: BrandColors.primary,
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
        backgroundColor: '#1E293B', // Slate 800 - matches colors.border
    },
    textDark: {
        color: '#fff',
    },
    textDarkSecondary: {
        color: '#888',
    },
});
