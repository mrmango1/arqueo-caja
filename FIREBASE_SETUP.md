# Configuración de Firebase

Este proyecto utiliza Firebase para la autenticación. Sigue estos pasos para configurarlo:

## 1. Crear un proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Sigue los pasos para crear tu proyecto

## 2. Configurar Authentication

1. En Firebase Console, ve a **Authentication** en el menú lateral
2. Haz clic en **Get Started**
3. En la pestaña **Sign-in method**, habilita **Email/Password**

## 3. Configurar Firestore Database

1. En Firebase Console, ve a **Firestore Database** en el menú lateral
2. Haz clic en **Create database**
3. Selecciona **Start in production mode** (configuraremos las reglas a continuación)
4. Selecciona una ubicación para tu base de datos

### Configurar las Reglas de Seguridad

⚠️ **IMPORTANTE**: Sin estas reglas, la aplicación no podrá leer ni escribir datos.

1. Ve a **Firestore Database** > **Rules**
2. Reemplaza las reglas existentes con las siguientes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección de cajas
    match /cajas/{cajaId} {
      // Permitir lectura si el usuario está autenticado y es el dueño
      allow read: if request.auth != null && resource.data.usuarioId == request.auth.uid;
      // Permitir crear si el usuario está autenticado
      allow create: if request.auth != null && request.resource.data.usuarioId == request.auth.uid;
      // Permitir actualizar si el usuario está autenticado y es el dueño
      allow update: if request.auth != null && resource.data.usuarioId == request.auth.uid;
      // No permitir eliminar
      allow delete: if false;
    }
    
    // Reglas para la colección de transacciones
    match /transacciones/{transaccionId} {
      // Permitir lectura si el usuario está autenticado y es el dueño
      allow read: if request.auth != null && resource.data.usuarioId == request.auth.uid;
      // Permitir crear si el usuario está autenticado
      allow create: if request.auth != null && request.resource.data.usuarioId == request.auth.uid;
      // No permitir actualizar ni eliminar transacciones
      allow update, delete: if false;
    }
  }
}
```

3. Haz clic en **Publish**

### Crear Índices (Opcional pero recomendado)

Para mejorar el rendimiento de las consultas, crea los siguientes índices en **Firestore Database** > **Indexes**:

1. Índice para cajas:
   - Collection: `cajas`
   - Fields: `usuarioId` (Ascending), `estado` (Ascending)

2. Índice para transacciones:
   - Collection: `transacciones`
   - Fields: `cajaId` (Ascending), `fecha` (Descending)

## 4. Obtener las credenciales de Firebase

1. Ve a **Project Settings** (ícono de engranaje en el menú lateral)
2. En la sección **General**, desplázate hasta **Your apps**
3. Haz clic en el ícono **Web** (</>)
4. Registra tu app (puedes usar el nombre "mi-negocio")
5. Copia las credenciales que aparecen en `firebaseConfig`

## 5. Configurar el proyecto

Crea un archivo `.env` en la raíz del proyecto con tus credenciales:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu-api-key-aqui
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 6. Ejecutar la aplicación

```bash
npm start
```

## Solución de Problemas

### La app se queda en "Abriendo..." o "Guardando..."

Esto generalmente indica que las reglas de Firestore no están configuradas correctamente:

1. Verifica que hayas creado la base de datos Firestore
2. Verifica que las reglas de seguridad estén publicadas correctamente
3. Asegúrate de que el usuario esté autenticado correctamente

Para probar temporalmente (⚠️ **SOLO DESARROLLO**), puedes usar reglas permisivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Notas de Seguridad

- **NUNCA** subas tus credenciales de Firebase a un repositorio público
- El archivo `.env` está incluido en `.gitignore` para evitar exponer tus credenciales
- Para producción, usa las reglas de seguridad detalladas (no las permisivas)
