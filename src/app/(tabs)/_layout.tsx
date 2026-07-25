import React, { useEffect } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSelector } from 'react-redux';
import { Platform, Appearance } from 'react-native';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';

export default function TabLayout() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const isIOS = Platform.OS === 'ios';

  // FIX: Force native iOS device layer to sync with Redux state.
  // This ensures iOS tints SF Symbols and native text instantly on tab press.
  useEffect(() => {
    if (isIOS) {
      Appearance.setColorScheme(mode);
    }
  }, [mode]);

  return (
    <NativeTabs
      // The user wants a static background color. We use the deep Slate/Ocean background.
      backgroundColor={colors.background}
      indicatorColor={isIOS ? undefined : (mode === 'light' ? `${colors.primaryAccent}26` : `${colors.primaryAccent}4D`)}
      tintColor={colors.primaryAccent}
      rippleColor={isIOS ? undefined : (mode === 'light' ? `${colors.primaryAccent}1A` : `${colors.primaryAccent}33`)}
      
      // Keep key bound to mode to force smooth UI re-renders
      key={mode} 
      
      labelStyle={{ 
        selected: { 
          color: colors.primaryAccent,
          fontSize: 10,
          fontWeight: '700',
        },
        default: { 
          color: colors.textSecondary,
          fontSize: 10,
          fontWeight: '500',
        }
      }}
    >
      <NativeTabs.Trigger name="home" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
          src={require('@/assets/images/tabIcons/home.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="capture" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'viewfinder', selected: 'viewfinder' }}
          md="crop_free"
          src={require('@/assets/images/tabIcons/home.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="pantry" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>What to Cook</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'fork.knife', selected: 'fork.knife' }}
          md="kitchen"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="planner" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
          md="calendar_today"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vault" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book', selected: 'book.fill' }}
          md="history"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}