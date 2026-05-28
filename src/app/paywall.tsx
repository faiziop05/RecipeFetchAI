import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';
import { setPremiumStatus } from '@/store/subscriptionSlice';

export default function PaywallScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.warn("Failed to fetch offerings. Check RevenueCat setup.", e);
      } finally {
        setLoadingOfferings(false);
      }
    };
    
    fetchOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        dispatch(setPremiumStatus(true));
        Alert.alert("Success", "You are now a RecipeFetch AI Pro member!");
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Failed", e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        dispatch(setPremiumStatus(true));
        Alert.alert("Success", "Your purchases have been restored.");
        router.back();
      } else {
        Alert.alert("Restore", "No active subscriptions found.");
      }
    } catch (e: any) {
      Alert.alert("Restore Failed", e.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>Restore</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={60} color="#0A7AFF" />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Unlock RecipeFetch <Text style={{ color: '#0A7AFF' }}>Pro</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          You've reached your monthly limit of 3 free scans. Upgrade to Pro for unlimited AI culinary extraction.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.textPrimary }]}>Unlimited AI Recipe Scans</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.textPrimary }]}>Instant Offline Saving</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.textPrimary }]}>Priority AI Processing</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {loadingOfferings ? (
          <ActivityIndicator size="large" color="#0A7AFF" />
        ) : packages.length > 0 ? (
          packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[styles.purchaseBtn, { backgroundColor: '#0A7AFF' }]}
              onPress={() => handlePurchase(pkg)}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.purchaseBtnText}>
                  Subscribe for {pkg.product.priceString} / mo
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <TouchableOpacity
            style={[styles.purchaseBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => Alert.alert("Setup Required", "RevenueCat products are not configured yet.")}
          >
            <Text style={[styles.purchaseBtnText, { color: colors.textPrimary }]}>
              Subscribe (Demo Mode)
            </Text>
          </TouchableOpacity>
        )}
        
        <Text style={[styles.legalText, { color: colors.textSecondary }]}>
          Recurring billing. Cancel anytime. By subscribing, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  restoreBtn: {
    padding: 8,
  },
  restoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(10, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresList: {
    width: '100%',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  purchaseBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
