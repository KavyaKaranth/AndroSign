import ApiService from "@/src/api/ApiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { io } from "socket.io-client";

SplashScreen.preventAutoHideAsync();

export default function Main() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const socketRef = useRef<any>(null);

  // ---------------- STATE ----------------
  const [appReady, setAppReady] = useState(false);
  const [playlist, setPlaylist] = useState<any>(null);
  const [localUris, setLocalUris] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<"online" | "offline">("offline");

  // ======================================================
  // 🕒 TIME + PLAYLIST HELPERS
  // ======================================================

  const isTimeInRange = (time: string, start?: string, end?: string) => {
    if (!start || !end) return false;

    // normal range
    if (start < end) {
      return time >= start && time < end;
    }

    // midnight-crossing range
    return time >= start || time < end;
  };

  const getActivePlaylist = (playlists: any[]) => {
    const time = new Date().toTimeString().slice(0, 5); // HH:mm
    console.log("🕒 DEVICE TIME:", time);
    const activePlaylists = playlists.filter(p =>
    isTimeInRange(time, p.startTime, p.endTime)
  );

  if (activePlaylists.length === 0) return null;

  // 🔑 pick the one with latest startTime
  activePlaylists.sort((a, b) =>
    b.startTime.localeCompare(a.startTime)
  );
 return activePlaylists[0];
  };

  // ======================================================
  // 🔌 WEBSOCKET CONNECTION
  // ======================================================

  useEffect(() => {
    const connectWS = async () => {
      const deviceId = await AsyncStorage.getItem("deviceId");
      const apiUrl = await AsyncStorage.getItem("apiUrl");
      if (!deviceId || !apiUrl) return;

      socketRef.current = io(apiUrl, { transports: ["websocket"] });

      socketRef.current.on("connect", () => {
        console.log("🟢 WS connected");
        setConnectionStatus("online");
        socketRef.current.emit("DEVICE_ONLINE", { deviceId });
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔴 WS disconnected");
        setConnectionStatus("offline");
      });

      socketRef.current.on(
        "playlist-updated",
        async ({ deviceId }: { deviceId: string }) => {
          const myId = await AsyncStorage.getItem("deviceId");
          if (deviceId !== myId) return;

          console.log("🔔 Playlist update received");

          const apiUrl = await AsyncStorage.getItem("apiUrl");
          if (!apiUrl) return;

          ApiService.initialize(apiUrl);
          const res = await ApiService.getPlaylist(deviceId);
          const playlists = res.data.playlists;

          await AsyncStorage.setItem(
            "cachedPlaylists",
            JSON.stringify(playlists)
          );

          const active = getActivePlaylist(playlists);
          setPlaylist(active);
          setCurrentIndex(0);

          console.log("✅ Playlist updated via WebSocket");
        }
      );
    };

    connectWS();
    return () => socketRef.current?.disconnect();
  }, []);

  // ======================================================
  // 💓 HEARTBEAT
  // ======================================================

  useEffect(() => {
     let interval: ReturnType<typeof setInterval>;

    const startHeartbeat = async () => {
      const deviceId = await AsyncStorage.getItem("deviceId");
      const apiUrl = await AsyncStorage.getItem("apiUrl");
      if (!deviceId || !apiUrl) return;

      ApiService.initialize(apiUrl);

      await ApiService.sendHeartbeat(deviceId).catch(() =>
        console.log("❌ Initial heartbeat failed")
      );

      interval = setInterval(async () => {
        try {
          await ApiService.sendHeartbeat(deviceId);
          console.log("💓 Heartbeat sent");
        } catch {
          console.log("❌ Heartbeat failed");
        }
      }, 30000);
    };

    const timer = setTimeout(startHeartbeat, 5000);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, []);

  // ======================================================
  // 🔄 PERIODIC PLAYLIST REFRESH (fallback)
  // ======================================================

  useEffect(() => {
    const refresh = async () => {
      try {
        const deviceId = await AsyncStorage.getItem("deviceId");
        const apiUrl = await AsyncStorage.getItem("apiUrl");
        if (!deviceId || !apiUrl) return;

        ApiService.initialize(apiUrl);
        const res = await ApiService.getPlaylist(deviceId);

        await AsyncStorage.setItem(
          "cachedPlaylists",
          JSON.stringify(res.data.playlists)
        );

        console.log("🔄 Playlists refreshed");
      } catch {
        console.log("📴 Refresh failed");
      }
    };

    const interval = setInterval(refresh, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ======================================================
  // 📦 MEDIA CACHE HELPERS
  // ======================================================

  const buildLocalUrisFromCache = async (items: any[]) => {
    const map: Record<string, string> = {};
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) return map;

    const mediaDir = baseDir + "media/";

    for (const item of items) {
      const ext =
        item.media.originalName?.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${mediaDir}media_${item.media._id}.${ext}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) map[item.media._id] = path;
    }

    return map;
  };

  const cacheMedia = async (media: any) => {
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) return null;

    const mediaDir = baseDir + "media/";
    await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });

    const ext =
      media.originalName?.split(".").pop()?.toLowerCase() || "jpg";
    const localPath = `${mediaDir}media_${media._id}.${ext}`;

    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) {
      await FileSystem.downloadAsync(media.url, localPath);
    }

    return localPath;
  };

  // ======================================================
  // ⏰ TIME-BASED PLAYLIST SWITCH
  // ======================================================

  useEffect(() => {
    const interval = setInterval(async () => {
      const cached = await AsyncStorage.getItem("cachedPlaylists");
      if (!cached) return;

      const playlists = JSON.parse(cached);
      const active = getActivePlaylist(playlists);

      if (!active) {
          if (playlist !== null) {
        setPlaylist(null);
        console.log("⏹️ No active playlist → stopping playback");
        setCurrentIndex(0);
        setLocalUris({});
        }
        return;
      }

      if (!playlist || active._id !== playlist._id) {
        console.log(`⏰ Time change → switching to ${active.name}`);
        setPlaylist(active);
        setCurrentIndex(0);
        const rebuiltMap = await buildLocalUrisFromCache(active.items);
      setLocalUris(rebuiltMap);
    }
  }, 10 * 1000);

    return () => clearInterval(interval);
  }, [playlist]);

  // ======================================================
  // 🚀 INITIAL LOAD
  // ======================================================

  useEffect(() => {
    const load = async () => {
      const cached = await AsyncStorage.getItem("cachedPlaylists");
      if (cached) {
        const playlists = JSON.parse(cached);
        const active = getActivePlaylist(playlists);
        setPlaylist(active);
        if (active)
          setLocalUris(await buildLocalUrisFromCache(active.items));
      }

      setAppReady(true);
      await SplashScreen.hideAsync();
    };

    load();
  }, []);

  // ======================================================
  // 🎞️ PLAYBACK
  // ======================================================

  useEffect(() => {
    if (!playlist) return;
    const item = playlist.items[currentIndex];
    if (item?.media.type === "image") {
      const timer = setTimeout(
        () => setCurrentIndex((i) => (i + 1) % playlist.items.length),
        (item.duration || 10) * 1000
      );
      return () => clearTimeout(timer);
    }
  }, [playlist, currentIndex]);

  const onVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      setCurrentIndex((i) => (i + 1) % playlist.items.length);
    }
  };

  // ======================================================
  // 🔊 AUDIO SETUP
  // ======================================================

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  // ======================================================
  // 🖥️ UI
  // ======================================================

  return (
    <View style={styles.container}>
      {appReady && (
        <>
          <View style={styles.statusBar}>
            <Text style={styles.title}>🖥️ AndroSign Player</Text>
            <Text
              style={[
                styles.status,
                { color: connectionStatus === "online" ? "#4ade80" : "#ef4444" },
              ]}
            >
              ● {connectionStatus}
            </Text>
          </View>

          {playlist && playlist.items.length > 0 ? (
            <View style={styles.mediaContainer}>
              {playlist.items[currentIndex].media.type === "video" ? (
                <Video
                  ref={videoRef}
                  source={{ uri: playlist.items[currentIndex].media.url }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  onPlaybackStatusUpdate={onVideoPlaybackStatusUpdate}
                />
              ) : (
                <Image
                  source={{ uri: playlist.items[currentIndex].media.url }}
                  style={styles.media}
                  contentFit="cover"
                />
              )}
            </View>
          ) : (
            <View style={styles.noContent}>
              <Text style={styles.noContentText}>
                ⏳ No active playlist right now
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  statusBar: { padding: 10, paddingTop: 40 },
  title: { color: "#fff", fontSize: 18 },
  status: { marginTop: 5 },
  mediaContainer: { flex: 1 },
  media: { width: "100%", height: "100%" },
  noContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  noContentText: { color: "#fff", fontSize: 18 },
});
