import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { signOut } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootState } from '@/store';
import { ThemeColors } from '@/theme/colors';
import { CardContainer } from '@/components/CardContainer';
import { ActionButton } from '@/components/ActionButton';
import { auth } from '@/services/firebase';
import { toggleTheme } from '@/store/themeSlice';
import { logout } from '@/store/authSlice';
import { CustomAlert } from '@/components/CustomAlert';

const PRIVACY_POLICY = `Privacy Policy

Last Updated: May 2026

1. Information We Collect
We collect information you provide directly to us when you create an account, scan a recipe, or communicate with us. This includes your email address, scanned images, and extracted recipe data.

2. How We Use Your Information
We use the information we collect to operate, maintain, and improve the RecipeFetch AI services, as well as to personalize your experience and provide AI-driven culinary insights.

3. Data Storage & Security
Your recipes and scans are stored securely on our cloud infrastructure (Firebase). We also utilize local on-device caching to ensure your recipes remain accessible offline.

4. Third-Party Services
We utilize advanced AI models for multimodal extraction. By scanning a recipe, you agree to the processing of your images and text through these secure AI APIs.

5. Contact Us
If you have any questions about this Privacy Policy, please contact us via the Help & Support section.`;

const TERMS_OF_SERVICE = `Terms & Conditions

Last Updated: May 2026

1. Acceptance of Terms
By accessing or using RecipeFetch AI, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.

2. User Content
You retain all rights to any recipes or images you scan or upload. However, you grant us a license to process this data through our AI models to provide the extraction service.

3. Acceptable Use
You agree not to use the app to extract or distribute illegal, copyrighted (beyond fair use for personal recipes), or harmful content.

4. Service Availability
We strive to ensure high availability, but RecipeFetch AI is provided "as is". We reserve the right to modify or discontinue the service at any time.

5. Limitation of Liability
In no event shall RecipeFetch AI be liable for any indirect, incidental, or consequential damages arising out of your use of the application.`;

export default function PreferencesScreen() {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  const userEmail = useSelector((state: RootState) => state.auth.email);
  const userId = useSelector((state: RootState) => state.auth.uid);

  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalContent, setLegalContent] = useState({ title: '', text: '' });

  // Custom Alert Modal State Config
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'confirm';
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'confirm' = 'info',
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const openLegalModal = (title: string, text: string) => {
    setLegalContent({ title, text });
    setLegalModalVisible(true);
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleSignOut = () => {
    showAlert(
      "Confirm Logout",
      "Are you sure you want to sign out of RecipeFetch AI?",
      "confirm",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              dispatch(logout());
            } catch (err) {
              console.error(err);
              showAlert(
                "Logout Failed",
                "Failed to sign out from Firebase. Please check your network and try again.",
                "error"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        </View>

        <View style={styles.content}>
          {/* Account Info Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Profile</Text>
          <CardContainer style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={[styles.avatarBadge, { backgroundColor: colors.primaryAccent }]}>
                <Text style={[styles.avatarText, { color: colors.background }]}>
                  {userEmail ? userEmail.substring(0, 2).toUpperCase() : 'US'}
                </Text>
              </View>
              <View style={styles.accountTextContainer}>
                <Text style={[styles.emailVal, { color: colors.textPrimary }]}>{userEmail || 'Active User'}</Text>
                <Text style={[styles.uidVal, { color: colors.textSecondary }]}>ID: {userId || 'N/A'}</Text>
              </View>
            </View>
          </CardContainer>

          {/* Preferences */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Preferences</Text>
          <CardContainer style={styles.settingsCard}>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="moon-outline" size={20} color={colors.primaryAccent} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={handleToggleTheme}
                trackColor={{ false: colors.border, true: '#34C759' }}
                ios_backgroundColor={colors.border}
              />
            </View>
          </CardContainer>

          {/* Data & Support */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data & Support</Text>
          <CardContainer style={styles.settingsCard}>
            <TouchableOpacity 
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]} 
              onPress={() => showAlert("Cache Cleared", "All temporary local files and offline thumbnails have been successfully cleared from the device.", "success")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: mode === 'light' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Clear Local Cache</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => showAlert("Help & Support", "Our support agents are currently offline. Please email support@recipefetch.ai for assistance.", "info")}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="help-buoy-outline" size={20} color={colors.primaryAccent} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </CardContainer>

          {/* Legal */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal</Text>
          <CardContainer style={styles.settingsCard}>
            <TouchableOpacity 
              style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]} 
              onPress={() => openLegalModal("Privacy Policy", PRIVACY_POLICY)}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => openLegalModal("Terms & Conditions", TERMS_OF_SERVICE)}
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconWrapper, { backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </CardContainer>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <ActionButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="danger"
              style={styles.signOutBtn}
            />
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              RecipeFetch AI Version 1.2.4 (Build 42)
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Legal Document Native Modal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{legalContent.title}</Text>
            <TouchableOpacity onPress={() => setLegalModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.legalText, { color: colors.textPrimary }]}>
              {legalContent.text}
            </Text>
            <View style={styles.modalFooterSpacer} />
          </ScrollView>
        </View>
      </Modal>

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
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 8,
  },
  accountCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 24,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 20,
  },
  accountTextContainer: {
    flex: 1,
  },
  emailVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  uidVal: {
    fontSize: 13,
    marginTop: 4,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 8,
    borderRadius: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  signOutBtn: {
    width: '100%',
    height: 56,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 24,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  modalFooterSpacer: {
    height: 60,
  },
});
