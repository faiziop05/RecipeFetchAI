import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CardContainer } from "@/components/CardContainer";

interface PreferenceToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: () => void;
  colors: any;
  mode: string;
  iconColor?: string;
}

export const PreferenceToggle: React.FC<PreferenceToggleProps> = ({
  icon,
  label,
  value,
  onValueChange,
  colors,
  mode,
  iconColor,
}) => {
  return (
    <CardContainer style={styles.settingsCard}>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor:
                  mode === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
              },
            ]}
          >
            <Ionicons name={icon} size={20} color={iconColor || colors.primaryAccent} />
          </View>
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: "#34C759" }}
          ios_backgroundColor={colors.border}
        />
      </View>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  settingsCard: {
    marginBottom: 8,
    borderRadius: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
