import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootState } from "@/store";
import { ThemeColors } from "@/theme/colors";

const { width } = Dimensions.get("window");

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "info" | "success" | "error" | "confirm";
  buttons?: AlertButton[];
}

export function CustomAlert({
  visible,
  title,
  message,
  onClose,
  type = "info",
  buttons,
}: CustomAlertProps) {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const colors = ThemeColors[mode];

  // Set visual elements depending on Alert Type
  let iconName: string = "information-circle-outline";
  let iconColor = colors.primaryAccent;
  let accentBg = mode === "light" ? "#F2F2F7" : "#1C1C1E";

  if (type === "success") {
    iconName = "checkmark-circle-outline";
    iconColor = colors.successGreen || "#34C759";
    accentBg = mode === "light" ? "#E8F5E9" : "#1B5E2020";
  } else if (type === "error") {
    iconName = "alert-circle-outline";
    iconColor = "#EA4335";
    accentBg = mode === "light" ? "#FFEBEE" : "#C6282820";
  } else if (type === "confirm") {
    iconName = "help-circle-outline";
    iconColor = colors.primaryAccent;
    accentBg = mode === "light" ? "#F2F2F7" : "#1C1C1E";
  }

  // Fallback default single close button if none are supplied
  const resolvedButtons: AlertButton[] = buttons || [
    {
      text: "OK",
      onPress: onClose,
      style: "default",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.alertBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Top Decorative Icon */}
          <View style={[styles.iconContainer, { backgroundColor: accentBg }]}>
            <Ionicons name={iconName as any} size={32} color={iconColor} />
          </View>

          {/* Alert Content */}
          <View style={styles.contentContainer}>
            {title ? (
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {title}
              </Text>
            ) : null}
            {message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons Row/Column depending on counts */}
          <View
            style={[
              styles.buttonsContainer,
              resolvedButtons.length > 2 ? styles.buttonsColumn : styles.buttonsRow,
              { borderTopColor: colors.border },
            ]}
          >
            {resolvedButtons.map((btn, index) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";

              let btnTextColor = colors.textPrimary;
              if (isDestructive) btnTextColor = "#EA4335";
              else if (isCancel) btnTextColor = colors.textSecondary;
              else btnTextColor = colors.primaryAccent;

              const isFirst = index === 0;
              const isLast = index === resolvedButtons.length - 1;

              return (
                <TouchableOpacity
                  key={`${btn.text}-${index}`}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    if (btn.onPress) btn.onPress();
                  }}
                  style={[
                    styles.button,
                    resolvedButtons.length > 2
                      ? [styles.buttonCol, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]
                      : [
                          styles.buttonRow,
                          !isLast && { borderRightWidth: 1, borderRightColor: colors.border },
                        ],
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: btnTextColor },
                      !isCancel && { fontWeight: "700" },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertBox: {
    width: Math.min(width * 0.85, 340),
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    borderTopWidth: 1,
    width: "100%",
  },
  buttonsRow: {
    flexDirection: "row",
    height: 52,
  },
  buttonsColumn: {
    flexDirection: "column",
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonRow: {
    flex: 1,
    height: "100%",
  },
  buttonCol: {
    width: "100%",
    height: 48,
  },
  buttonText: {
    fontSize: 14,
    textAlign: "center",
  },
});
