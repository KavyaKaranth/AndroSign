import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useEffect , useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ApiService from "../src/api/ApiService";
import { Image } from "expo-image";

{/*}
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";


useEffect(() => {
  NavigationBar.setVisibilityAsync("hidden");
}, []);
*/}

export default function Main() {
  const router = useRouter();

  useEffect(() => {
    startHeartbeat();
  }, []);
  

  const startHeartbeat = async () => {
    const deviceId = await AsyncStorage.getItem("deviceId");
    const apiUrl = await AsyncStorage.getItem("apiUrl");
    console.log("API URL USED:", apiUrl);

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
const [playlist, setPlaylist] = useState<any>(null);
  
useEffect(() => {
  let retries = 0;

  const loadPlaylist = async () => {
    const deviceId = await AsyncStorage.getItem("deviceId");
    const apiUrl = await AsyncStorage.getItem("apiUrl");

    if (!deviceId || !apiUrl) return;

    ApiService.initialize(apiUrl);

    try {
      const res = await ApiService.getPlaylist(deviceId);

      if (res.data.playlist) {
        console.log("PLAYLIST:", res.data.playlist);
        setPlaylist(res.data.playlist);
      } else if (retries < 5) {
        retries++;
        setTimeout(loadPlaylist, 2000); // retry after 2 sec
      }
    } catch (e: any) {
  console.log("PLAYLIST ERROR:", e?.response?.status, e?.response?.data);


      if (retries < 5) {
        retries++;
        setTimeout(loadPlaylist, 2000);
      }
    }
  };

  loadPlaylist();
}, []);



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

  const [currentIndex, setCurrentIndex] = useState(0);
useEffect(() => {
  if (!playlist || !playlist.items?.length) return;

  const currentItem = playlist.items[currentIndex];
  const timer = setTimeout(() => {
    setCurrentIndex((prev) =>
      (prev + 1) % playlist.items.length
    );
  }, currentItem.duration * 1000);

  return () => clearTimeout(timer);
}, [playlist, currentIndex]);


  return (
    
    <View style={styles.container}>
      <Text style={styles.title}>AndroSign Player</Text>
      <Text style={styles.status}>Device Online</Text>
      
      <Text style={{ color: "red", marginBottom: 10 }}>
  {playlist ? "PLAYLIST LOADED" : "NO PLAYLIST"}
</Text>
  {/*  <StatusBar hidden />*/}

      {/* 🔹 SHOW PLAYLIST IMAGE */}
    {playlist && playlist.items && playlist.items.length > 0 && (
      <Image
        source={{ uri: playlist.items[currentIndex].media.url }}
        style={styles.media}
        contentFit="cover"
      />
    )}
 

      <TouchableOpacity style={styles.resetButton} onPress={resetDevice}>
        <Text style={styles.resetText}>Register New Device</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#000",
}
,
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
  },
  media: {
  width: "100%",
  height: "100%",
}

});
