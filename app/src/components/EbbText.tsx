import React from 'react';
import {
  TextProps,
  TextStyle,
  StyleSheet,
} from 'react-native';
import AppText from './AppText';

export type EbbTextType =
  | 'largeTitle'
  | 'headline'
  | 'body'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'button';

interface EbbTextProps extends TextProps {
  /** Typography preset from the iOS HIG hierarchy. Default: 'body' */
  type?: EbbTextType;
  children: React.ReactNode;
}

/**
 * EbbText — The sole text component for Ebb.
 *
 * Uses iOS system fonts (SF Pro) and scales with Dynamic Type
 * via the fontScale multiplier from useWindowDimensions().
 *
 * Do NOT use raw <Text> with hardcoded font sizes anywhere in the app.
 */
const EbbText: React.FC<EbbTextProps> = ({
  style,
  type = 'body',
  children,
  ...props
}) => {
  const typeStyle = getTypeStyle(type);

  return (
    <AppText style={[typeStyle, style]} {...props}>
      {children}
    </AppText>
  );
};

function getTypeStyle(type: EbbTextType): TextStyle {
  switch (type) {
    case 'largeTitle':
      return {
        fontSize: 34,
        fontFamily: 'System',
        fontWeight: '700',
        letterSpacing: 0.4,
      };
    case 'headline':
      return {
        fontSize: 17,
        fontFamily: 'System',
        fontWeight: '600',
        letterSpacing: -0.43,
      };
    case 'body':
      return {
        fontSize: 17,
        fontFamily: 'System',
        fontWeight: '400',
        letterSpacing: -0.43,
      };
    case 'subhead':
      return {
        fontSize: 15,
        fontFamily: 'System',
        fontWeight: '400',
      };
    case 'footnote':
      return {
        fontSize: 13,
        fontFamily: 'System',
        fontWeight: '400',
      };
    case 'caption':
      return {
        fontSize: 11,
        fontFamily: 'System',
        fontWeight: '500',
      };
    case 'button':
      return {
        fontSize: 17,
        fontFamily: 'System',
        fontWeight: '600',
        letterSpacing: -0.43,
      };
  }
}

export default EbbText;
