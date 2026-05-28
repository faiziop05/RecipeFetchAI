import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';
import { setPremiumStatus } from '@/store/subscriptionSlice';
import { CustomAlert } from '@/components/CustomAlert';

export default function PaywallScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'confirm';
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', message: '', type: 'info' });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const handlePurchaseCompleted = ({ customerInfo, storeTransaction }: { customerInfo: any; storeTransaction: any }) => {
    const hasPremium = customerInfo.entitlements.active['premium'] !== undefined || 
                       customerInfo.entitlements.active['pro'] !== undefined;
    
    if (hasPremium) {
      dispatch(setPremiumStatus(true));
      
      const isYearly = storeTransaction.productIdentifier.includes('yearly');
      const period = isYearly ? 'Yearly' : 'Monthly';
      const expDateStr = customerInfo.entitlements.active['premium']?.expirationDate || 
                          customerInfo.entitlements.active['pro']?.expirationDate || 
                          null;
      const expDateFormatted = formatDate(expDateStr);

      const detailsMessage = 
        `👑 Upgrade Complete!\n\n` +
        `• Tier: Premium ${period}\n` +
        `• Transaction ID: ${storeTransaction.transactionIdentifier || 'N/A'}\n` +
        `• Expiration/Renewal: ${expDateFormatted}\n\n` +
        `Unlimited scans are now enabled. Thank you for supporting RecipeFetch AI!`;

      setAlertConfig({
        visible: true,
        title: "Purchase Successful",
        message: detailsMessage,
        type: "success",
        buttons: [
          { text: "Start Scanning", onPress: () => router.back() }
        ]
      });
    }
  };

  const handleRestoreCompleted = ({ customerInfo }: { customerInfo: any }) => {
    const hasPremium = customerInfo.entitlements.active['premium'] !== undefined || 
                       customerInfo.entitlements.active['pro'] !== undefined;
    
    if (hasPremium) {
      dispatch(setPremiumStatus(true));
      const entitlement = customerInfo.entitlements.active['premium'] || customerInfo.entitlements.active['pro'];
      const expDateFormatted = formatDate(entitlement.expirationDate);
      
      setAlertConfig({
        visible: true,
        title: "Premium Restored",
        message: `Your active Premium subscription has been successfully restored!\n\n• Expiration/Renewal: ${expDateFormatted}\n• Product ID: ${entitlement.productIdentifier}`,
        type: "success",
        buttons: [
          { text: "Continue", onPress: () => router.back() }
        ]
      });
    } else {
      setAlertConfig({
        visible: true,
        title: "Restore Unsuccessful",
        message: "No active Premium subscriptions or purchases were found on this Google Play account.",
        type: "info",
        buttons: [
          { text: "OK", onPress: () => {} }
        ]
      });
    }
  };

  const handlePurchaseError = ({ error }: { error: any }) => {
    if (error.userCancelled) {
      // Do nothing if user closed/cancelled the purchase flow
      return;
    }
    
    setAlertConfig({
      visible: true,
      title: "Purchase Failed",
      message: `There was an issue processing your transaction:\n\n${error.message || 'Unknown error occurred.'}\n\nError Code: ${error.code || 'N/A'}`,
      type: "error",
      buttons: [
        { text: "OK", onPress: () => {} }
      ]
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <RevenueCatUI.Paywall 
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
        onPurchaseError={handlePurchaseError}
        onDismiss={() => {
          router.back();
        }}
      />
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
