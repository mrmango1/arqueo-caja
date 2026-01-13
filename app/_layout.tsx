import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { CanalesProvider } from '@/context/CanalesContext';
import { ServiciosProvider } from '@/context/ServiciosContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <CanalesProvider>
        <ServiciosProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: true, title: '' }} />
              <Stack.Screen name="abrir-caja" options={{ presentation: 'modal', headerShown: true, headerBackTitle: '' }} />
              <Stack.Screen name="nueva-operacion" options={{ presentation: 'modal', headerShown: true, headerBackTitle: '', contentStyle: { backgroundColor: 'transparent' } }} />

              <Stack.Screen name="cerrar-caja" options={{ presentation: 'modal', headerShown: true, headerBackTitle: '' }} />
              <Stack.Screen name="configurar-comisiones" options={{ headerShown: true, headerBackTitle: '' }} />
              <Stack.Screen name="editar-perfil" options={{ headerShown: true, headerBackTitle: '' }} />
              <Stack.Screen name="detalle-caja" options={{ headerShown: true, headerBackTitle: '' }} />
              <Stack.Screen name="seleccionar-servicio" options={{
                presentation: 'formSheet',
                sheetAllowedDetents: 'fitToContents',
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' }
              }} />
              <Stack.Screen name="seleccionar-canal" options={{
                presentation: 'formSheet',
                sheetAllowedDetents: 'fitToContents',
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' }
              }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ServiciosProvider>
      </CanalesProvider>
    </AuthProvider>
  );
}
