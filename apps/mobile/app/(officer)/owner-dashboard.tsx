import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/lib/api';

// Peso formatter
const peso = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function OwnerDashboard() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [activeCycle, setActiveCycle] = useState<any>(null);

  const load = async () => {
    setError('');
    try {
      // Reliable: group financial summary + recent ledger
      const [summaryRes, ledgerRes] = await Promise.all([
        api.get(`/groups/${groupId}/reports/summary`),
        api.get(`/groups/${groupId}/reports/ledger?limit=5`),
      ]);
      setSummary(summaryRes.summary);
      setLedger(ledgerRes.ledger || []);

      // Secondary (wrapped so a missing route doesn't break the screen) —
      // confirm these paths against your real routes.
      try {
        const m = await api.get(`/groups/${groupId}/memberships`);
        const active = (m.memberships || []).filter((x: any) => x.status === 'active');
        setMemberCount(active.length);
      } catch {}
      try {
        const c = await api.get(`/groups/${groupId}/cycles`);
        setActiveCycle((c.cycles || []).find((x: any) => x.status === 'active') || null);
      } catch {}
    } catch (e: any) {
      setError(e.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId]);

  if (loading) {
    return (
      <View className="flex-1 bg-arctic-base items-center justify-center">
        <ActivityIndicator color="#2A3E4B" />
        <Text className="text-arctic-accent mt-3">Loading your dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-arctic-base"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-2xl font-bold text-arctic-navy">KapitPondo</Text>
        <View className="w-10 h-10 rounded-full bg-arctic-card items-center justify-center">
          <Text className="text-arctic-navy font-bold">OW</Text>
        </View>
      </View>

      {error ? <Text className="text-status-rejected text-sm mb-4">{error}</Text> : null}

      {/* Hero: total fund balance */}
      <View className="bg-arctic-navy rounded-3xl p-6 mb-5">
        <Text className="text-arctic-card text-xs uppercase tracking-widest mb-1">
          Total Fund Balance
        </Text>
        <Text className="text-white text-4xl font-extrabold">
          {peso(summary?.available_cash)}
        </Text>
        <View className="mt-4 bg-white/10 rounded-2xl p-4 flex-row items-center gap-3 self-start">
          <View className="w-10 h-10 bg-arctic-card rounded-full items-center justify-center">
            <Text className="text-lg">💰</Text>
          </View>
          <View>
            <Text className="text-arctic-card text-xs">Total Contributions</Text>
            <Text className="text-white text-lg font-bold">{peso(summary?.total_contributions)}</Text>
          </View>
        </View>
      </View>

      {/* Stats grid */}
      <View className="gap-3 mb-6">
        <StatCard
          icon="👥"
          label="Active Members"
          value={memberCount != null ? String(memberCount) : '—'}
        //   onPress={() => router.push({ pathname: '/(officer)/members', params: { groupId } })}
        />
        <StatCard
          icon="🔄"
          label="Active Cycle"
          value={activeCycle ? activeCycle.name : 'None active'}
          sub={activeCycle ? 'In progress' : 'Start a new cycle'}
        //   onPress={() => router.push({ pathname: '/(officer)/cycles', params: { groupId } })}
        />
        <StatCard
          icon="📥"
          label="Approvals"
          value="Review"
          sub="Tap to see pending items"
        //   onPress={() => router.push({ pathname: '/(officer)/approvals', params: { groupId } })}
        />
      </View>

      {/* Quick actions */}
      <Text className="text-xl font-bold text-arctic-navy mb-3">Quick Actions</Text>
      <View className="gap-3 mb-6">
        <ActionButton
          label="Record Payment"
          icon="💵"
          primary
        //   onPress={() => router.push({ pathname: '/(officer)/record-payment', params: { groupId } })}
        />
        <ActionButton
          label="Review Loans"
          icon="📋"
        //   onPress={() => router.push({ pathname: '/(officer)/approvals', params: { groupId } })}
        />
        <ActionButton
          label="New Cycle"
          icon="➕"
        //   onPress={() => router.push({ pathname: '/(officer)/cycles', params: { groupId } })}
        />
      </View>

      {/* Recent transactions */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-xl font-bold text-arctic-navy">Recent Transactions</Text>
        {/* <Pressable onPress={() => router.push({ pathname: '/(officer)/reports', params: { groupId } })}>
          <Text className="text-arctic-accent font-medium">View All →</Text>
        </Pressable> */}
      </View>

      <View className="bg-white rounded-3xl border border-arctic-card overflow-hidden">
        {ledger.length === 0 ? (
          <Text className="text-arctic-accent text-center py-8">No transactions yet.</Text>
        ) : (
          ledger.map((e, i) => (
            <View
              key={e.id || i}
              className={`flex-row items-center px-4 py-3 ${i < ledger.length - 1 ? 'border-b border-arctic-card' : ''}`}
            >
              <View className="w-9 h-9 rounded-full bg-arctic-card items-center justify-center mr-3">
                <Text className="text-arctic-navy text-xs font-bold">
                  {initials(e.entry_type)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-arctic-navy font-semibold capitalize">
                  {(e.entry_type || '').replace(/_/g, ' ')}
                </Text>
                <Text className="text-arctic-accent text-xs">
                  {e.posted_at ? new Date(e.posted_at).toLocaleDateString() : ''}
                </Text>
              </View>
              <Text
                className={`font-bold ${e.direction === 'credit' ? 'text-status-approved' : 'text-arctic-navy'}`}
              >
                {e.direction === 'credit' ? '+' : '−'}{peso(e.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, sub, onPress }: any) {
  return (
    <Pressable onPress={onPress} className="bg-arctic-card rounded-3xl p-4 flex-row items-center gap-4">
      <View className="w-14 h-14 bg-arctic-base rounded-2xl items-center justify-center">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-xs text-arctic-accent uppercase tracking-wider">{label}</Text>
        <Text className="text-2xl font-bold text-arctic-navy">{value}</Text>
        {sub ? <Text className="text-sm text-arctic-accent">{sub}</Text> : null}
      </View>
      <Text className="text-arctic-accent text-lg">›</Text>
    </Pressable>
  );
}

function ActionButton({ label, icon, primary, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-4 rounded-2xl ${primary ? 'bg-arctic-navy' : 'bg-white border border-arctic-card'}`}
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-xl">{icon}</Text>
        <Text className={`font-semibold ${primary ? 'text-white' : 'text-arctic-navy'}`}>{label}</Text>
      </View>
      <Text className={primary ? 'text-white' : 'text-arctic-accent'}>›</Text>
    </Pressable>
  );
}