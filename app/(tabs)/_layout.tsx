import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { BrandColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <NativeTabs
      tintColor={BrandColors.primary}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'building.columns', selected: 'building.columns.fill' }}
          androidSrc={require('@/assets/images/tab-caja.png')}
        />
        <Label>Caja</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="historial">
        <Icon
          sf={{ default: 'clock', selected: 'clock.fill' }}
          androidSrc={require('@/assets/images/tab-history.png')}
        />
        <Label>Historial</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="estadisticas">
        <Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          androidSrc={require('@/assets/images/tab-stats.png')}
        />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          androidSrc={require('@/assets/images/tab-settings.png')}
        />
        <Label>Ajustes</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
