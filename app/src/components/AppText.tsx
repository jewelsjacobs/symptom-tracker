import React from 'react';
import { Text, TextProps } from 'react-native';

export default function AppText(props: TextProps) {
  return <Text allowFontScaling={false} {...props} />;
}
