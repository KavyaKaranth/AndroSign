import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ApiService from "../src/api/ApiService";

export default function Register() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Enter details to register");

  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const onScan = async ({ data }: { data: string }) => {
    try {
      setScanned(true);
      setStatus("Registering device...");

      const qr = JSON.parse(data);

      const deviceId = `DEVICE_${Date.now()}`;

      console.log("REGISTER PAYLOAD", {
        deviceId,
        name: deviceName,
        location,
      });

      ApiService.initialize(qr.apiUrl, qr.token);

      await ApiService.registerDevice({
        deviceId,
        name: deviceName,
        location,
      });

      await AsyncStorage.setItem("isRegistered", "true");
      await AsyncStorage.setItem("deviceId", deviceId);
      await AsyncStorage.setItem("apiUrl", qr.apiUrl);

      setStatus("Device registered successfully");
      router.replace("/main" as any);
    } catch (error: any) {
      console.error("REGISTRATION ERROR:", error.response?.data || error.message);
      setStatus("Registration failed");
      setScanned(false);
      setScanning(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No camera access</Text>;
  }

  // ---------- SCAN MODE ----------
  if (scanning) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>{status}</Text>

        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : onScan}
        />
      </View>
    );
  }

  // ---------- FORM MODE ----------
  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>AndroSign Player</Text>

      <TextInput
        style={styles.input}
        placeholder="Device Name (e.g. Test Display)"
        value={deviceName}
        onChangeText={setDeviceName}
      />

      <TextInput
        style={styles.input}
        placeholder="Location (e.g. Office)"
        value={location}
        onChangeText={setLocation}
      />

      <TouchableOpacity
        style={[
          styles.button,
          (!deviceName || !location) && styles.buttonDisabled,
        ]}
        disabled={!deviceName || !location}
        onPress={() => {
          setScanning(true);
          setStatus("Scan QR to register");
        }}
      >
        <Text style={styles.buttonText}>Scan QR Code</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Enter device details, then scan QR from dashboard
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  status: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 10,
    backgroundColor: "#000",
    color: "#fff",
    padding: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#4f46e5",
    padding: 15,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  hint: {
    textAlign: "center",
    marginTop: 15,
    color: "#666",
  },
});
