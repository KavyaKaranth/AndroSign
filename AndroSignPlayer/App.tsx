import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './src/api';

function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    name: '',
    location: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      const registered = await AsyncStorage.getItem('isRegistered');
      if (registered === 'true') {
        setIsRegistered(true);
        startHeartbeat();
      }
    } catch (error) {
      console.error('Check registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onQRCodeRead = async (e: any) => {
    try {
      const data = JSON.parse(e.data);
      await ApiService.initialize(data.apiUrl);

      if (!deviceInfo.name || !deviceInfo.location) {
        Alert.alert('Error', 'Please enter device name and location first');
        return;
      }

      const deviceId = `DEVICE_${Date.now()}`;

      await ApiService.registerDevice(data.token, {
        deviceId,
        name: deviceInfo.name,
        location: deviceInfo.location
      });

      await AsyncStorage.setItem('isRegistered', 'true');
      await AsyncStorage.setItem('deviceId', deviceId);
      await AsyncStorage.setItem('apiUrl', data.apiUrl);

      Alert.alert('Success', 'Device registered successfully!');
      setIsRegistered(true);
      setScanning(false);
      startHeartbeat();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    }
  };

  const startHeartbeat = async () => {
    const deviceId = await AsyncStorage.getItem('deviceId');
    const apiUrl = await AsyncStorage.getItem('apiUrl');

    if (deviceId && apiUrl) {
      await ApiService.initialize(apiUrl);

      setInterval(async () => {
        try {
          await ApiService.sendHeartbeat(deviceId);
          console.log('Heartbeat sent');
        } catch (error) {
          console.error('Heartbeat error:', error);
        }
      }, 30000);
    }
  };

  const resetDevice = async () => {
    Alert.alert(
      'Reset Device',
      'Are you sure you want to reset this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setIsRegistered(false);
            setDeviceInfo({ name: '', location: '' });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (isRegistered) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🖥️ AndroSign Player</Text>
        <Text style={styles.subtitle}>Device is registered and active</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Connected</Text>
        </View>

        <Text style={styles.info}>Ready to receive playlists</Text>

        <TouchableOpacity style={styles.resetButton} onPress={resetDevice}>
          <Text style={styles.resetButtonText}>Reset Device</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /*
  QR Scanner is temporarily disabled
  because react-native-qrcode-scanner is deprecated
  */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🖥️ AndroSign Player</Text>
      <Text style={styles.subtitle}>Register this device</Text>

      <TextInput
        style={styles.input}
        placeholder="Device Name (e.g., Lobby Display)"
        value={deviceInfo.name}
        onChangeText={(text) =>
          setDeviceInfo({ ...deviceInfo, name: text })
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Location (e.g., Main Entrance)"
        value={deviceInfo.location}
        onChangeText={(text) =>
          setDeviceInfo({ ...deviceInfo, location: text })
        }
      />

      <TouchableOpacity
        style={[
          styles.button,
          (!deviceInfo.name || !deviceInfo.location) &&
            styles.buttonDisabled
        ]}
        onPress={() => Alert.alert('QR scanner setup pending')}
        disabled={!deviceInfo.name || !deviceInfo.location}
      >
        <Text style={styles.buttonText}>Scan QR Code</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Enter device details, then scan QR code from the dashboard
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#764ba2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4caf50',
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  info: {
    color: 'white',
    fontSize: 16,
    marginBottom: 40,
  },
  resetButton: {
    backgroundColor: '#ff5252',
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
