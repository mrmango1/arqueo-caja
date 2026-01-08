import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
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

export default function EditarPerfilScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user } = useAuth();

    const [nombreUsuario, setNombreUsuario] = useState('');
    const [nombreNegocio, setNombreNegocio] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        // Cargar nombre de usuario
        setNombreUsuario(user.displayName || '');

        // Cargar config del negocio
        try {
            const saved = await AsyncStorage.getItem(`config_${user.uid}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setConfig(parsed);
                setNombreNegocio(parsed.nombreNegocio || '');
            }
        } catch (error) {
            console.error('Error loading config', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!nombreUsuario.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }

        setSaving(true);
        try {
            // 1. Actualizar Display Name en Auth
            if (user && user.displayName !== nombreUsuario) {
                await updateProfile(user, { displayName: nombreUsuario });
            }

            // 2. Actualizar Config en Storage
            const newConfig = {
                ...config,
                nombreNegocio,
            };

            await AsyncStorage.setItem(`config_${user?.uid}`, JSON.stringify(newConfig));

            Alert.alert('Éxito', 'Perfil actualizado correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudieron guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>

            <Stack.Screen options={{
                title: 'Editar Perfil',
                headerStyle: { backgroundColor: isDark ? '#000' : '#F2F2F7' },
                headerTintColor: BrandColors.primary,
                headerShadowVisible: true,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
                        <IconSymbol size={28} name="chevron.left" color={BrandColors.primary} />
                        <Text style={{ color: BrandColors.primary, fontSize: 17, marginLeft: -4 }}>Atrás</Text>
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color={BrandColors.primary} />
                        ) : (
                            <Text style={{ fontSize: 17, fontWeight: '600', color: BrandColors.primary }}>Guardar</Text>
                        )}
                    </TouchableOpacity>
                )
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >

                    <Text style={[styles.sectionTitle, isDark && styles.textDarkSecondary]}>
                        INFORMACIÓN
                    </Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={styles.inputRow}>
                            <Text style={[styles.label, isDark && styles.textDark]}>Nombre</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={nombreUsuario}
                                onChangeText={setNombreUsuario}
                                placeholder="Tu nombre completo"
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={[styles.divider, isDark && styles.dividerDark]} />
                        <View style={styles.inputRow}>
                            <Text style={[styles.label, isDark && styles.textDark]}>Email</Text>
                            <Text style={[styles.input, { color: '#888' }]}>{user?.email}</Text>
                        </View>
                        <View style={[styles.divider, isDark && styles.dividerDark]} />
                        <View style={styles.inputRow}>
                            <Text style={[styles.label, isDark && styles.textDark]}>Negocio</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={nombreNegocio}
                                onChangeText={setNombreNegocio}
                                placeholder="Nombre de tu negocio"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <Text style={styles.helperText}>
                        Esta información aparecerá en tus reportes.
                    </Text>

                </ScrollView>
            </KeyboardAvoidingView>
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

    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
        marginLeft: 16,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 50,
    },
    label: {
        width: 90,
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    inputDark: {
        color: '#fff',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 16,
    },
    dividerDark: {
        backgroundColor: '#333',
    },
    helperText: {
        textAlign: 'center',
        fontSize: 13,
        color: '#999',
        marginTop: -10,
    },
    textDark: {
        color: '#fff',
    },
    textDarkSecondary: {
        color: '#888',
    },
});
