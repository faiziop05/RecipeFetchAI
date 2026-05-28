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
      backgroundColor={colors.surface}
      indicatorColor={isIOS ? undefined : (mode === 'light' ? `${colors.primaryAccent}26` : `${colors.primaryAccent}4D`)}
      tintColor={colors.primaryAccent}
      rippleColor={isIOS ? undefined : (mode === 'light' ? `${colors.primaryAccent}1A` : `${colors.primaryAccent}33`)}
      
      // Keep key bound to mode to force smooth UI re-renders
      key={mode} 
      
      labelStyle={{ 
        selected: { 
          color: colors.primaryAccent,
          fontSize: 12,
          fontWeight: '700',
        },
        default: { 
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      <NativeTabs.Trigger name="capture" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Extract</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'viewfinder', selected: 'viewfinder' }}
          md="crop_free"
          src={require('@/assets/images/tabIcons/home.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="recipes" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>My Recipes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
          md="bookmark"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vault" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Scanned</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'clock.arrow.circlepath', selected: 'clock.arrow.circlepath' }}
          md="history"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="preferences" labelVisibilityMode="labeled">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
          src={require('@/assets/images/tabIcons/explore.png')}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}