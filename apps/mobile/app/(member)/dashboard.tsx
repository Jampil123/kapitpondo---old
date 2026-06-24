import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '../../src/components/ui/Sidebar';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.78, 320);
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function DashboardScreen() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 280, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(backdropOpacity, { toValue: 0.5, duration: 280, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: -SIDEBAR_WIDTH, duration: 250, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: NATIVE_DRIVER }),
    ]).start(() => setSidebarOpen(false));
  };

  const navigateAndClose = (path: '/(member)/create-group' | '/(member)/join-group') => {
    setFabOpen(false);
    router.push(path);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 64,
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 52,
        borderBottomWidth: 1,
        borderBottomColor: '#E8F4F8',
      }}>
        <Pressable
          onPress={openSidebar}
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="menu" size={26} color="#1A3A4A" />
        </Pressable>

        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#1A3A4A', marginLeft: 4 }}>
          KapitPondo
        </Text>

        <Pressable
          onPress={openSidebar}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1A3A4A', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>K</Text>
        </Pressable>

        <Pressable
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#1A3A4A" />
        </Pressable>
      </View>

      {/* ── Empty state ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Illustration placeholder */}
        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <View style={{ width: 140, height: 100, borderWidth: 2, borderColor: '#D0E8F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FBFC' }}>
            <Ionicons name="people-outline" size={52} color="#B0D4E3" />
          </View>
          {/* Cursor accent */}
          <View style={{ position: 'absolute', bottom: 20, right: 12 }}>
            <Ionicons name="arrow-forward-circle" size={36} color="#4A90B8" />
          </View>
        </View>

        <Text style={{ fontSize: 15, color: '#7FA6B8', textAlign: 'center', marginBottom: 36 }}>
          Add a group to get started
        </Text>

        {/* CTA row — matches Google Classroom layout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Pressable
            onPress={() => router.push('/(member)/create-group')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: '#1A3A4A', fontWeight: '600', fontSize: 16 }}>
              Create group
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(member)/join-group')}
            style={({ pressed }) => ({
              backgroundColor: '#1A3A4A',
              paddingHorizontal: 28,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              Join group
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── FAB action menu (above FAB) ── */}
      {fabOpen && (
        <View style={{ position: 'absolute', bottom: 112, right: 24, gap: 10, alignItems: 'flex-end' }}>
          {[
            { icon: 'add-circle-outline' as const, label: 'Create group', path: '/(member)/create-group' as const },
            { icon: 'people-outline' as const, label: 'Join group', path: '/(member)/join-group' as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => navigateAndClose(item.path)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 28,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.14,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name={item.icon} size={20} color="#1A3A4A" />
              <Text style={{ marginLeft: 10, color: '#1A3A4A', fontWeight: '600', fontSize: 15 }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── FAB button ── */}
      <Pressable
        onPress={() => setFabOpen((o) => !o)}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 36,
          right: 24,
          width: 64,
          height: 64,
          backgroundColor: '#EBF4F8',
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name={fabOpen ? 'close' : 'add'} size={34} color="#1A3A4A" />
      </Pressable>

      {/* ── Backdrop (tap to close sidebar) ── */}
      {sidebarOpen && (
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'black',
            opacity: backdropOpacity,
            zIndex: 50,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* ── Sidebar drawer ── */}
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: SIDEBAR_WIDTH,
          transform: [{ translateX: slideX }],
          zIndex: 100,
          shadowColor: '#000',
          shadowOffset: { width: 6, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 20,
        }}
      >
        <Sidebar onClose={closeSidebar} />
      </Animated.View>
    </View>
  );
}
