import { AnimatedButton } from '@/components/ui/animated-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PremiumInput } from '@/components/ui/premium-input';
import { auth } from '@/config/firebase';
import { Animation, BrandColors, Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring
} from 'react-native-reanimated';

const { height, width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');

  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const logoScale = useSharedValue(1);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate logo
    logoScale.value = withSequence(
      withSpring(0.9, Animation.spring.snappy),
      withSpring(1, Animation.spring.bouncy)
    );

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

        await updateProfile(user, { displayName: nombreUsuario });

        const initialConfig = {
          nombreNegocio: nombreNegocio,
          direccion: '',
          telefono: '',
          notificacionesPush: true,
          sonidoOperaciones: true,
          recordatorioArqueo: true,
        };
        await AsyncStorage.setItem(`config_${user.uid}`, JSON.stringify(initialConfig));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/onboarding');

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${user.uid}`);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo & Header */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.headerContainer}
        >
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View
              style={[
                styles.logoBackground,
                { backgroundColor: BrandColors.primary }
              ]}
            >
              <IconSymbol size={44} name="building.columns.fill" color="#fff" />
            </View>
          </Animated.View>
          <Text style={[styles.appName, { color: colors.text }]}>Mi Negocio</Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
            {isRegister ? 'Crea tu cuenta y comienza' : 'Bienvenido de nuevo'}
          </Text>
        </Animated.View>

        {/* Form Container */}
        <Animated.View
          layout={Layout.springify()}
          style={styles.formContainer}
        >
          {/* Register Fields */}
          {isRegister && (
            <Animated.View
              entering={FadeInUp.duration(300).springify()}
              exiting={FadeOutUp.duration(200)}
            >
              <PremiumInput
                label="Nombre Completo"
                icon="person.fill"
                placeholder="Tu nombre"
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
                autoCapitalize="words"
                editable={!loading}
              />

              <PremiumInput
                label="Negocio"
                icon="storefront.fill"
                placeholder="Nombre de tu negocio"
                value={nombreNegocio}
                onChangeText={setNombreNegocio}
                autoCapitalize="words"
                editable={!loading}
              />
            </Animated.View>
          )}

          {/* Email & Password */}
          <PremiumInput
            label="Correo Electrónico"
            icon="envelope.fill"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <PremiumInput
            label="Contraseña"
            icon="lock.fill"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye.slash.fill' : 'eye.fill'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            editable={!loading}
          />

          {/* Submit Button */}
          <AnimatedButton
            title={isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            onPress={handleAuth}
            variant="primary"
            size="lg"
            icon="arrow.right"
            iconPosition="right"
            loading={loading}
            disabled={loading}
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />

          {/* Toggle Mode */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isRegister ? '¿Ya tienes cuenta?' : '¿Nuevo usuario?'}
            </Text>
            <Pressable onPress={toggleMode} hitSlop={8}>
              <Text style={styles.toggleLink}>
                {isRegister ? 'Inicia Sesión' : 'Regístrate'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Forgot Password */}
        {!isRegister && (
          <Animated.View entering={FadeIn.delay(400)}>
            <Pressable style={styles.forgotPassword} hitSlop={8}>
              <Text style={[styles.forgotPasswordText, { color: colors.textTertiary }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: height * 0.08,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
    ...Shadows.primary,
  },
  logoBackground: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Form
  formContainer: {
    width: '100%',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  toggleText: {
    fontSize: 15,
  },
  toggleLink: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Forgot Password
  forgotPassword: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
