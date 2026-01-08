import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');

  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    if (isRegister && (!nombreUsuario || !nombreNegocio)) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y el nombre de tu negocio');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Ingresa un correo electrónico válido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Actualizar perfil de usuario (DisplayName)
        await updateProfile(user, { displayName: nombreUsuario });

        // Guardar configuración inicial del negocio
        const initialConfig = {
          nombreNegocio: nombreNegocio,
          direccion: '',
          telefono: '',
          notificacionesPush: true,
          sonidoOperaciones: true,
          recordatorioArqueo: true,
        };
        await AsyncStorage.setItem(`config_${user.uid}`, JSON.stringify(initialConfig));

        // Ir a onboarding para configurar canales y comisiones
        router.replace('/onboarding');

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar si ya completó el onboarding
        const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${user.uid}`);

        if (onboardingCompleted === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let mensaje = 'Ocurrió un error';

      switch (error.code) {
        case 'auth/user-not-found':
          mensaje = 'No existe una cuenta con este correo';
          break;
        case 'auth/wrong-password':
          mensaje = 'Contraseña incorrecta';
          break;
        case 'auth/email-already-in-use':
          mensaje = 'Este correo ya está registrado';
          break;
        case 'auth/invalid-email':
          mensaje = 'Correo electrónico inválido';
          break;
        case 'auth/weak-password':
          mensaje = 'La contraseña es muy débil';
          break;
        case 'auth/network-request-failed':
          mensaje = 'Error de conexión. Verifica tu internet';
          break;
        default:
          mensaje = error.message;
      }

      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsRegister(!isRegister);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.containerDark]}
    >
      {/* Background Decorativo */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#000'] : ['#f0f0f5', '#ffffff']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.circleDecoration, { backgroundColor: isDark ? 'rgba(255,107,0,0.05)' : 'rgba(255,107,0,0.08)' }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.headerContainer}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FF6B00', '#FF8533']}
              style={styles.iconBackground}
            >
              <IconSymbol size={40} name="building.columns.fill" color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.appName, isDark && styles.textDark]}>Mi Negocio</Text>
          <Text style={[styles.appTagline, isDark && styles.textDarkSecondary]}>
            {isRegister ? 'Crea tu cuenta y comienza' : 'Bienvenido de nuevo'}
          </Text>
        </Animated.View>

        <Animated.View
          layout={Layout.springify()}
          style={[styles.formContainer, isDark && styles.cardDark]}
        >
          {/* Nombre Completo - Registro */}
          {isRegister && (
            <Animated.View entering={FadeInUp.duration(400)} exiting={FadeInUp.duration(200)}>
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, isDark && styles.textDarkSecondary]}>Nombre Completo</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark && styles.inputContainerDark,
                    focusedInput === 'nombre' && styles.inputFocused
                  ]}
                >
                  <IconSymbol size={20} name="person.fill" color={focusedInput === 'nombre' ? '#FF6B00' : (isDark ? '#666' : '#999')} />
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="Tu nombre"
                    placeholderTextColor={isDark ? '#555' : '#aaa'}
                    value={nombreUsuario}
                    onChangeText={setNombreUsuario}
                    onFocus={() => setFocusedInput('nombre')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.label, isDark && styles.textDarkSecondary]}>Negocio</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isDark && styles.inputContainerDark,
                    focusedInput === 'negocio' && styles.inputFocused
                  ]}
                >
                  <IconSymbol size={20} name="storefront.fill" color={focusedInput === 'negocio' ? '#FF6B00' : (isDark ? '#666' : '#999')} />
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    placeholder="Nombre de tu negocio"
                    placeholderTextColor={isDark ? '#555' : '#aaa'}
                    value={nombreNegocio}
                    onChangeText={setNombreNegocio}
                    onFocus={() => setFocusedInput('negocio')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, isDark && styles.textDarkSecondary]}>Correo Electrónico</Text>
            <View
              style={[
                styles.inputContainer,
                isDark && styles.inputContainerDark,
                focusedInput === 'email' && styles.inputFocused
              ]}
            >
              <IconSymbol size={20} name="envelope.fill" color={focusedInput === 'email' ? '#FF6B00' : (isDark ? '#666' : '#999')} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={isDark ? '#555' : '#aaa'}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, isDark && styles.textDarkSecondary]}>Contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                isDark && styles.inputContainerDark,
                focusedInput === 'password' && styles.inputFocused
              ]}
            >
              <IconSymbol size={20} name="lock.fill" color={focusedInput === 'password' ? '#FF6B00' : (isDark ? '#666' : '#999')} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#555' : '#aaa'}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  size={20}
                  name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  color={isDark ? '#666' : '#999'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón de Acción */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#999', '#777'] : ['#FF6B00', '#FF8533']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
                  </Text>
                  <IconSymbol
                    size={20}
                    name="arrow.right"
                    color="#fff"
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleText, isDark && styles.textDarkSecondary]}>
              {isRegister ? '¿Ya tienes cuenta?' : '¿Nuevo usuario?'}
            </Text>
            <TouchableOpacity onPress={toggleMode} activeOpacity={0.6}>
              <Text style={styles.toggleLink}>
                {isRegister ? 'Inicia Sesión' : 'Regístrate'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {!isRegister && (
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, isDark && styles.textDarkSecondary]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  circleDecoration: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    transform: [{ scaleX: 1.5 }],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: height * 0.1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  cardDark: {
    // Si quisieramos card style
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  inputFocused: {
    borderColor: '#FF6B00',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    height: '100%',
  },
  inputDark: {
    color: '#fff',
    backgroundColor: 'transparent',
  },
  submitButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    opacity: 0.8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  toggleText: {
    fontSize: 15,
    color: '#666',
  },
  toggleLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
  },
  forgotPassword: {
    marginTop: 32,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  textDark: {
    color: '#fff',
  },
  textDarkSecondary: {
    color: '#999',
  },
});
