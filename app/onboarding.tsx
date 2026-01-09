import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    CONFIGURACION_COMISIONES_DEFAULT,
    ConfiguracionComisiones,
    ModoComision
} from '@/types/caja';
import { parseLocalizedFloat } from '@/utils/numbers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { height, width } = Dimensions.get('window');

type Step = 'welcome' | 'canales' | 'comisiones';

export default function OnboardingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { canales, toggleCanal, comisionesDefault, actualizarComisionesDefault } = useCanales();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [loading, setLoading] = useState(false);

    // Local state for commissions configuration
    const [comisiones, setComisiones] = useState<ConfiguracionComisiones>(
        comisionesDefault || CONFIGURACION_COMISIONES_DEFAULT
    );

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentStep === 'welcome') {
            setCurrentStep('canales');
        } else if (currentStep === 'canales') {
            setCurrentStep('comisiones');
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // Save commissions
            await actualizarComisionesDefault(comisiones);

            // Mark onboarding as completed
            if (user?.uid) {
                await AsyncStorage.setItem(`onboarding_completed_${user.uid}`, 'true');
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('Error finishing onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleModeChange = (mode: ModoComision) => {
        setComisiones((prev) => ({
            ...prev,
            modo: mode,
        }));
    };

    const handleSimpleComisionChange = (field: 'comisionDeposito' | 'comisionRetiro', value: string) => {
        // Permite empty string para borrar campo
        if (value === '') {
            setComisiones((prev) => ({
                ...prev,
                comisionSimple: {
                    ...prev.comisionSimple,
                    [field]: 0,
                },
            }));
            return;
        }
        const numValue = parseLocalizedFloat(value);
        setComisiones((prev) => ({
            ...prev,
            comisionSimple: {
                ...prev.comisionSimple,
                [field]: isNaN(numValue) ? 0 : numValue,
            },
        }));
    };

    const renderWelcome = () => (
        <View style={styles.stepContainer}>
            <IconSymbol size={80} name="building.columns.fill" color={BrandColors.primary} />
            <Text style={[styles.title, isDark && styles.textDark]}>Bienvenido a Mi Negocio</Text>
            <Text style={[styles.description, isDark && styles.textDarkSecondary]}>
                Estamos encantados de tenerte aquí. Antes de comenzar, configuremos tu negocio para que puedas operar de inmediato.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
                <View style={[styles.gradientButton, { backgroundColor: BrandColors.primary }]}>
                    <Text style={styles.buttonText}>Comenzar</Text>
                    <IconSymbol size={20} name="arrow.right" color="#fff" />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderCanales = () => {
        const canalesActivosCount = canales.filter((c) => c.activo).length;

        return (
            <View style={styles.stepContainer}>
                <Text style={[styles.stepTitle, isDark && styles.textDark]}>Canales de Transacción</Text>
                <Text style={[styles.stepDescription, isDark && styles.textDarkSecondary]}>
                    Selecciona los canales que utilizarás en tu negocio.
                </Text>

                <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                    {canales.map((canal) => (
                        <View key={canal.id} style={[styles.listItem, isDark && styles.listItemDark]}>
                            <View style={styles.listItemContent}>
                                <Text style={[styles.listItemTitle, isDark && styles.textDark]}>{canal.nombre}</Text>
                            </View>
                            <Switch
                                value={canal.activo}
                                onValueChange={() => toggleCanal(canal.id)}
                                trackColor={{ false: '#767577', true: BrandColors.primary }}
                                thumbColor={isDark ? '#f4f3f4' : '#fff'}
                            />
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.button, canalesActivosCount === 0 && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={canalesActivosCount === 0}
                >
                    <View
                        style={[
                            styles.gradientButton,
                            { backgroundColor: canalesActivosCount > 0 ? BrandColors.primary : '#999' }
                        ]}
                    >
                        <Text style={styles.buttonText}>Siguiente</Text>
                        <IconSymbol size={20} name="arrow.right" color="#fff" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderComisiones = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, isDark && styles.textDark]}>Configurar Comisiones</Text>
            <Text style={[styles.stepDescription, isDark && styles.textDarkSecondary]}>
                Define cómo quieres cobrar tus comisiones por defecto.
            </Text>

            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, isDark && styles.cardDark]}>
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>Modo de Cobro</Text>
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                comisiones.modo === 'simple' && styles.optionButtonActive,
                            ]}
                            onPress={() => handleModeChange('simple')}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    comisiones.modo === 'simple' && styles.optionTextActive,
                                ]}
                            >
                                Fijo (Simple)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                comisiones.modo === 'rangos' && styles.optionButtonActive,
                            ]}
                            onPress={() => handleModeChange('rangos')}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    comisiones.modo === 'rangos' && styles.optionTextActive,
                                ]}
                            >
                                Por Rangos
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {comisiones.modo === 'simple' ? (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, isDark && styles.textDarkSecondary]}>
                                    Comisión por Depósito ($)
                                </Text>
                                <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                                    <IconSymbol size={20} name="banknote.fill" color={isDark ? '#666' : '#999'} />
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={comisiones.comisionSimple.comisionDeposito.toString()}
                                        onChangeText={(text) => handleSimpleComisionChange('comisionDeposito', text)}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, isDark && styles.textDarkSecondary]}>
                                    Comisión por Retiro ($)
                                </Text>
                                <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                                    <IconSymbol size={20} name="banknote.fill" color={isDark ? '#666' : '#999'} />
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={comisiones.comisionSimple.comisionRetiro.toString()}
                                        onChangeText={(text) => handleSimpleComisionChange('comisionRetiro', text)}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        placeholderTextColor={isDark ? '#555' : '#aaa'}
                                    />
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.infoContainer}>
                            <IconSymbol size={32} name="info.circle.fill" color={BrandColors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoText, isDark && styles.textDarkSecondary]}>
                                    El cobro por rangos utilizará la configuración predeterminada:
                                </Text>
                                <View style={styles.rangeList}>
                                    <Text style={[styles.rangeItem, isDark && styles.textDarkSecondary]}>• $0 - $100: $0.25</Text>
                                    <Text style={[styles.rangeItem, isDark && styles.textDarkSecondary]}>• $100 - $200: $0.50</Text>
                                    <Text style={[styles.rangeItem, isDark && styles.textDarkSecondary]}>• $200 - $500: $0.75</Text>
                                    <Text style={[styles.rangeItem, isDark && styles.textDarkSecondary]}>• $500 - $1000: $1.00</Text>
                                    <Text style={[styles.rangeItem, isDark && styles.textDarkSecondary]}>• $1000+: $1.50</Text>
                                </View>
                                <Text style={[styles.infoSubtext, isDark && styles.textDarkSecondary]}>
                                    Podrás personalizar estos valores más tarde en Ajustes.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TouchableOpacity
                style={styles.button}
                onPress={handleFinish}
                disabled={loading}
            >
                <View style={[styles.gradientButton, { backgroundColor: BrandColors.primary }]}>
                    <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Finalizar'}</Text>
                    {!loading && <IconSymbol size={20} name="checkmark.circle.fill" color="#fff" />}
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.background, { backgroundColor: BrandColors.primary }]} />

            <View style={styles.content}>
                {currentStep === 'welcome' && renderWelcome()}
                {currentStep === 'canales' && renderCanales()}
                {currentStep === 'comisiones' && renderComisiones()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerDark: {
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: height,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        paddingTop: 60,
    },
    stepContainer: {
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        maxHeight: height * 0.8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 24,
        marginBottom: 16,
        color: '#000',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
        color: '#000',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 40,
        lineHeight: 24,
    },
    stepDescription: {
        fontSize: 15,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    textDark: {
        color: '#000',
    },
    textDarkSecondary: {
        color: '#666',
    },
    button: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    listContainer: {
        width: '100%',
        marginBottom: 10,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    listItemDark: {
        borderBottomColor: '#333',
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
    },
    card: {
        backgroundColor: '#f9f9f9',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        width: '100%',
    },
    cardDark: {
        backgroundColor: '#f0f0f0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    optionButtonActive: {
        borderColor: BrandColors.primary,
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
    },
    optionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    optionTextActive: {
        color: BrandColors.primary,
        fontWeight: '700',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        height: 48,
    },
    inputContainerDark: {
        backgroundColor: '#ddd',
        borderColor: '#bbb',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#000',
    },
    inputDark: {
        color: '#000',
    },
    infoContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        fontWeight: '500',
    },
    rangeList: {
        marginBottom: 8,
        paddingLeft: 4,
    },
    rangeItem: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
    infoSubtext: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    }
});
