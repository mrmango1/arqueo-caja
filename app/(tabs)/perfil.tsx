import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useCanales } from '@/context/CanalesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCaja } from '@/hooks/useCaja';
import { CanalTransaccion } from '@/types/caja';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ConfiguracionData {
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  notificacionesPush: boolean;
  sonidoOperaciones: boolean;
  recordatorioArqueo: boolean;
}

const defaultConfig: ConfiguracionData = {
  nombreNegocio: '',
  direccion: '',
  telefono: '',
  notificacionesPush: true,
  sonidoOperaciones: true,
  recordatorioArqueo: true,
};

export default function ConfiguracionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, signOut } = useAuth();
  const { canales, toggleCanal, agregarCanal, eliminarCanal } = useCanales();
  const { isAbierta } = useCaja();

  const [config, setConfig] = useState<ConfiguracionData>(defaultConfig);
  const [showAddCanalModal, setShowAddCanalModal] = useState(false);
  const [nuevoCanal, setNuevoCanal] = useState('');

  // Cargar configuración cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [user])
  );

  const loadConfig = async () => {
    try {
      if (!user) return;
      // Recargar datos de usuario (por si cambió el nombre)
      await user.reload();

      const saved = await AsyncStorage.getItem(`config_${user.uid}`);
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  // Solo para persistir cambios en TOGGLES in-place (ya no para inputs de texto)
  const updateToggle = async (key: keyof ConfiguracionData, value: boolean) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    try {
      await AsyncStorage.setItem(`config_${user?.uid}`, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving toggle:', error);
    }
  };

  const handleAddCanalPress = () => {
    if (isAbierta) {
      Alert.alert(
        'Caja Abierta',
        'No puedes agregar canales mientras la caja está abierta. Debes cerrar la caja para modificar los canales activos.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Usar Alert.prompt nativo en iOS para mejor experiencia
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Nuevo Canal',
        'Ingresa el nombre del banco o billetera',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Agregar',
            onPress: async (text?: string) => {
              if (text && text.trim()) {
                try {
                  await agregarCanal(text.trim());
                  Alert.alert(
                    'Canal Agregado',
                    'El nuevo canal se ha agregado correctamente. Estará disponible en el próximo arqueo de caja.'
                  );
                } catch (error) {
                  Alert.alert('Error', 'No se pudo agregar el canal');
                }
              }
            },
          },
        ],
        'plain-text',
        '',
        'default'
      );
    } else {
      setShowAddCanalModal(true);
    }
  };

  const handleAddCanal = async () => {
    if (!nuevoCanal.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para el canal');
      return;
    }
    try {
      await agregarCanal(nuevoCanal.trim());
      setNuevoCanal('');
      setShowAddCanalModal(false);
      Alert.alert(
        'Canal Agregado',
        'El nuevo canal se ha agregado correctamente. Estará disponible en el próximo arqueo de caja.'
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el canal');
    }
  };

  const handleToggleCanal = (id: string) => {
    if (isAbierta) {
      Alert.alert(
        'Caja Abierta',
        'No puedes modificar los canales activos mientras la caja está abierta. Los cambios solo se aplicarán en el próximo arqueo.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    toggleCanal(id);
  };

  const handleDeleteCanal = (canal: CanalTransaccion) => {
    if (canal.esDefault) {
      Alert.alert('No permitido', 'Los canales por defecto no se pueden eliminar, solo desactivar.');
      return;
    }
    if (isAbierta) {
      Alert.alert(
        'Caja Abierta',
        'No puedes eliminar canales mientras la caja está abierta.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    Alert.alert('Eliminar Canal', `¿Eliminar "${canal.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => eliminarCanal(canal.id) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch (error) {
            Alert.alert('Error', 'No se pudo cerrar sesión');
          }
        }
      },
    ]);
  };

  const getInitials = () => {
    // Prioridad al nombre real, si no email
    const name = user?.displayName || user?.email || '?';
    return name.substring(0, 2).toUpperCase();
  };

  const AddCanalModal = () => (
    <Modal
      visible={showAddCanalModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowAddCanalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAddCanalModal(false)} />
        <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
          <Text style={[styles.modalTitle, isDark && styles.textDark]}>Nuevo Canal</Text>
          <Text style={[styles.modalSubtitle, isDark && styles.textDarkSecondary]}>
            Ingresa el nombre del banco o billetera
          </Text>
          <TextInput
            style={[styles.modalInput, isDark && styles.modalInputDark]}
            placeholder="Ej: Banco XYZ"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={nuevoCanal}
            onChangeText={setNuevoCanal}
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setShowAddCanalModal(false)}
            >
              <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnConfirm]}
              onPress={handleAddCanal}
            >
              <Text style={styles.modalBtnTextConfirm}>Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <AddCanalModal />

      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <Text style={[styles.topBarTitle, isDark && styles.textDark]}>Ajustes</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Perfil Header */}
        <View style={[styles.profileSection, isDark && styles.cardDark]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isDark && styles.textDark]}>
              {user?.displayName || 'Corresponsal'}
            </Text>
            <Text style={[styles.profileEmail, isDark && styles.textDarkSecondary]}>
              {user?.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileEditBtn}
            onPress={() => router.push('/editar-perfil')}
          >
            <IconSymbol size={16} name="pencil" color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Sección: Finanzas */}
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Finanzas</Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/configurar-comisiones')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#34C75915' }]}>
              <IconSymbol size={18} name="dollarsign" color="#34C759" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, isDark && styles.textDark]}>Comisiones</Text>
              <Text style={styles.menuSubtitle}>Configurar valores por defecto y por banco</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Sección: Canales */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginBottom: 0 }]}>Canales Activos</Text>
          <TouchableOpacity onPress={handleAddCanalPress}>
            <Text style={[styles.actionText, isAbierta && { opacity: 0.5 }]}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, isDark && styles.cardDark]}>
          {canales.map((canal, index) => (
            <View key={canal.id}>
              {index > 0 && <View style={[styles.divider, isDark && styles.dividerDark]} />}
              <View style={styles.channelRow}>
                <TouchableOpacity
                  style={styles.channelInfo}
                  onPress={() => router.push(`/configurar-comisiones?canalId=${canal.id}`)}
                >
                  <View style={[styles.channelIcon, { backgroundColor: canal.activo ? '#FF6B0015' : '#eee' }]}>
                    <IconSymbol size={16} name="building.columns" color={canal.activo ? '#FF6B00' : '#999'} />
                  </View>
                  <View>
                    <Text style={[styles.channelName, isDark && styles.textDark, !canal.activo && styles.textDisabled]}>
                      {canal.nombre}
                    </Text>
                    {canal.usarComisionesPersonalizadas && (
                      <Text style={styles.customBadge}>Personalizado</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <Switch
                  value={canal.activo}
                  onValueChange={() => handleToggleCanal(canal.id)}
                  trackColor={{ false: '#e0e0e0', true: '#FF6B0050' }}
                  thumbColor={canal.activo ? '#FF6B00' : '#f4f3f4'}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Sección: Configuración App (Toggles) */}
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Aplicación</Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.channelRow}>
            <View style={[styles.channelInfo, { gap: 12 }]}>
              <IconSymbol size={20} name="bell.fill" color="#FF9500" />
              <Text style={[styles.menuTitle, isDark && styles.textDark]}>Notificaciones</Text>
            </View>
            <Switch
              value={config.notificacionesPush}
              onValueChange={(v) => updateToggle('notificacionesPush', v)}
              trackColor={{ false: '#e0e0e0', true: '#FF6B0050' }}
              thumbColor={config.notificacionesPush ? '#FF6B00' : '#f4f3f4'}
            />
          </View>
          <View style={[styles.divider, isDark && styles.dividerDark]} />
          <View style={styles.channelRow}>
            <View style={[styles.channelInfo, { gap: 12 }]}>
              <IconSymbol size={20} name="speaker.wave.2.fill" color="#5856D6" />
              <Text style={[styles.menuTitle, isDark && styles.textDark]}>Sonidos</Text>
            </View>
            <Switch
              value={config.sonidoOperaciones}
              onValueChange={(v) => updateToggle('sonidoOperaciones', v)}
              trackColor={{ false: '#e0e0e0', true: '#5856D650' }}
              thumbColor={config.sonidoOperaciones ? '#5856D6' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Soporte */}
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Soporte</Text>
        <View style={[styles.card, isDark && styles.cardDark]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:soporte@minegocio.com')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FF6B0015' }]}>
              <IconSymbol size={18} name="envelope.fill" color="#FF6B00" />
            </View>
            <Text style={[styles.menuTitle, isDark && styles.textDark]}>Contactar Soporte</Text>
          </TouchableOpacity>
        </View>


        <TouchableOpacity
          style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Versión 1.0.3</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
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
  topBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarDark: {
    backgroundColor: '#000',
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },

  // Profile
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B00',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
  },
  profileEditBtn: {
    padding: 8,
    backgroundColor: '#007AFF10',
    borderRadius: 12,
  },

  // Generic Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
  },

  // Info Rows (Read Only)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dividerDark: {
    backgroundColor: '#333',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#888',
  },

  // Channels
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  channelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  textDisabled: {
    color: '#aaa',
  },
  customBadge: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '600',
  },

  // Logout
  logoutButton: {
    backgroundColor: '#ffe5e5',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonDark: {
    backgroundColor: '#3a0000',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 12,
    marginTop: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  modalCardDark: {
    backgroundColor: '#1c1c1e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  modalInputDark: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalBtnConfirm: {
    backgroundColor: '#FF6B00',
  },
  modalBtnTextCancel: {
    color: '#000',
    fontWeight: '600',
  },
  modalBtnTextConfirm: {
    color: '#fff',
    fontWeight: '700',
  },

  textDark: { color: '#fff' },
  textDarkSecondary: { color: '#888' },
});
