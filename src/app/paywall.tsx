import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';
import { setPremiumStatus } from '@/store/subscriptionSlice';

export default function PaywallScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const handlePurchaseOrRestoreCompleted = ({ customerInfo }: { customerInfo: any }) => {
    // Check for either 'premium' or 'pro' entitlement to be safe and flexible
    const hasPremium = customerInfo.entitlements.active['premium'] !== undefined || 
                       customerInfo.entitlements.active['pro'] !== undefined;
    
    if (hasPremium) {
      dispatch(setPremiumStatus(true));
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RevenueCatUI.Paywall 
        onPurchaseCompleted={handlePurchaseOrRestoreCompleted}
        onRestoreCompleted={handlePurchaseOrRestoreCompleted}
        onDismiss={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03203e', // Fallback navy dark theme color matching the app
  },
});
