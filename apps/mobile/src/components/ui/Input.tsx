// apps/mobile/src/components/ui/Input.tsx
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...rest }: InputProps & { className?: string }) {
  return (
    <View className="w-full mb-4">
      {label ? <Text className="text-arctic-navy font-medium mb-2">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#7FA6B8"
        className={`bg-arctic-card rounded-xl px-4 py-4 text-arctic-navy ${error ? 'border border-status-rejected' : ''} ${className}`}
        {...rest}
      />
      {error ? <Text className="text-status-rejected text-sm mt-1">{error}</Text> : null}
    </View>
  );
}
