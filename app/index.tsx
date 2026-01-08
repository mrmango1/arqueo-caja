import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const checkNavigation = async () => {
      if (authLoading) return;

      if (!user) {
        setTarget('/login');
        return;
      }

      try {
        const completed = await AsyncStorage.getItem(`onboarding_completed_${user.uid}`);
        if (completed === 'true') {
          setTarget('/(tabs)');
        } else {
          setTarget('/onboarding');
        }
      } catch (e) {
        // Fallback safe
        setTarget('/(tabs)');
      }
    };

    checkNavigation();
  }, [user, authLoading]);

  if (authLoading || !target) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
