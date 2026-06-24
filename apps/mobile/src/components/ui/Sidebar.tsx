import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  onClose: () => void;
}

const NAV_ITEMS: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { icon: 'home-outline', label: 'Home' },
  { icon: 'people-outline', label: 'My Groups' },
  { icon: 'settings-outline', label: 'Settings' },
];

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [initial, setInitial] = useState('K');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.phone) {
        setPhone(user.phone);
        const digits = user.phone.replace(/\D/g, '');
        setInitial(digits.slice(-2, -1).toUpperCase() || 'K');
      }
    });
  }, []);

  const handleLogout = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace('/(auth)/landing');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 56 }}>
      {/* Profile */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E8F4F8' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#1A3A4A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 26, fontWeight: 'bold' }}>{initial}</Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A3A4A' }}>My Account</Text>
        <Text style={{ fontSize: 13, color: '#7FA6B8', marginTop: 3 }}>{phone || 'Loading...'}</Text>
      </View>

      {/* Nav items */}
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 8 }}>
        {NAV_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: pressed ? '#F0F7FA' : 'transparent',
            })}
          >
            <Ionicons name={item.icon} size={22} color="#1A3A4A" />
            <Text style={{ marginLeft: 16, fontSize: 16, color: '#1A3A4A' }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Sign out */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderTopWidth: 1,
          borderTopColor: '#E8F4F8',
          backgroundColor: pressed ? '#FFF5F5' : 'transparent',
        })}
      >
        <Ionicons name="log-out-outline" size={22} color="#E53935" />
        <Text style={{ marginLeft: 16, fontSize: 16, color: '#E53935', fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
