// apps/mobile/src/components/ui/Card.tsx
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'navy' | 'soft';
}

const variants = {
  default: 'bg-white border border-arctic-card',
  navy: 'bg-arctic-navy',
  soft: 'bg-arctic-card',
};

export function Card({ variant = 'default', className = '', children, ...rest }: CardProps & { className?: string }) {
  return (
    <View className={`rounded-2xl p-4 ${variants[variant]} ${className}`} {...rest}>
      {children}
    </View>
  );
}
