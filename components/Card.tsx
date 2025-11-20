import { View, StyleSheet, ViewStyle } from 'react-native';
import { CommonStyles, Spacing } from '@/constants/styleGuide';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({ children, style, padding }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        padding !== undefined && { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CommonStyles.card,
    padding: Spacing.padding.card,
  },
});
