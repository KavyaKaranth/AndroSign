import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ApiService from "../src/api/ApiService";

export default function Main() {
  const router = useRouter();

  useEffect(() => {
    startHeartbeat();
  }, []);

  const startHeartbeat = async () => {
    const deviceId = await AsyncStorage.getItem("deviceId");
    const apiUrl = await AsyncStorage.getItem("apiUrl");

    if (!deviceId || !apiUrl) return;

    ApiService.initialize(apiUrl);

    setInterval(async () => {
      try {
        await ApiService.sendHeartbeat(deviceId);
      } catch (e) {
        console.log("Heartbeat failed");
      }
    }, 30000);
  };

  const resetDevice = async () => {
    Alert.alert(
      "Register New Device",
      "This will reset the current device and allow registering a new one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace("/register" as any);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AndroSign Player</Text>
      <Text style={styles.status}>Device Online</Text>

      <TouchableOpacity style={styles.resetButton} onPress={resetDevice}>
        <Text style={styles.resetText}>Register New Device</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  title: {
    fontSize: 26,
    marginBottom: 10
  },
  status: {
    fontSize: 16,
    color: "green",
    marginBottom: 30
  },
  resetButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 6
  },
  resetText: {
    color: "#fff",
    fontSize: 16
  }
});
