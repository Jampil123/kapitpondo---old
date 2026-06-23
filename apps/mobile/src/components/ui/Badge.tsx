// apps/mobile/src/components/ui/Badge.tsx
import { View, Text } from 'react-native';

type Status = 'approved' | 'pending' | 'rejected' | 'active' | 'paid' | 'neutral' | string;

// Map any status string to a tone
function toneFor(status: Status): 'approved' | 'pending' | 'rejected' | 'neutral' {
  switch (status) {
    case 'approved':
    case 'active':
    case 'paid':
    case 'verified':
      return 'approved';
    case 'pending':
    case 'submitted':
    case 'draft':
    case 'previewed':
      return 'pending';
    case 'rejected':
    case 'defaulted':
      return 'rejected';
    default:
      return 'neutral';
  }
}

const tones = {
  approved: 'bg-status-approved/15 text-status-approved',
  pending: 'bg-status-pending/15 text-status-pending',
  rejected: 'bg-status-rejected/15 text-status-rejected',
  neutral: 'bg-arctic-accent/15 text-arctic-accent',
};

export function Badge({ status, label }: { status: Status; label?: string }) {
  const tone = toneFor(status);
  const [bg, text] = tones[tone].split(' ');
  return (
    <View className={`self-start rounded-full px-3 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold capitalize ${text}`}>{label || status}</Text>
    </View>
  );
}
