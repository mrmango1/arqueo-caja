import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
  // @ts-ignore - getReactNativePersistence exists at runtime but not in types
  getReactNativePersistence,
  initializeAuth
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Validar que las variables de entorno críticas estén configuradas
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Variables de entorno faltantes:\n${missingEnvVars.join('\n')}`
  );
}

// Inicializar Firebase
import { getApp, getApps } from 'firebase/app';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializar Auth con persistencia para React Native
// @ts-ignore - getReactNativePersistence existe en runtime
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Inicializar Realtime Database
export const db = getDatabase(app);

export default app;
