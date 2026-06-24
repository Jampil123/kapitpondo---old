// apps/mobile/src/components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const base = 'rounded-xl py-4 px-6 items-center justify-center';

const variants: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-arctic-navy', text: 'text-white font-semibold' },
  secondary: { container: 'bg-arctic-card', text: 'text-arctic-navy font-semibold' },
  outline: { container: 'border border-arctic-navy bg-transparent', text: 'text-arctic-navy font-semibold' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const v = variants[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${base} ${v.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#2A3E4B'} />
      ) : (
        <Text className={`text-base ${v.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}
