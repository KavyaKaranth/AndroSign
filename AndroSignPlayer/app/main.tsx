import ApiService from "@/src/api/ApiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";

SplashScreen.preventAutoHideAsync();

// Get deviceId from storage

export default function Main() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [appReady, setAppReady] = useState(false);
  const [playlist, setPlaylist] = useState<any>(null);
  const [localUris, setLocalUris] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "online" | "offline"
  >("offline");
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // ---------------- LOG API URL ----------------
  useEffect(() => {
    AsyncStorage.getItem("apiUrl").then((url) => {
      console.log("API URL USED:", url);
    });
  }, []);

  // ---------------- LOAD DEVICE ID ----------------
  useEffect(() => {
    AsyncStorage.getItem("deviceId").then(setDeviceId);
  }, []);

  // ---------------- WEBSOCKET CONNECTION ----------------
  const socketRef = useRef<any>(null);
  useEffect(() => {
    const connectWS = async () => {
      const deviceId = await AsyncStorage.getItem("deviceId");
      const apiUrl = await AsyncStorage.getItem("apiUrl");

      if (!deviceId || !apiUrl) {
        console.log("❌ Missing deviceId or apiUrl");
        return;
      }

      socketRef.current = io(apiUrl, {
        transports: ["websocket"],
      });
      console.log("EMITTING DEVICE_ONLINE", deviceId);
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
          const myDeviceId = await AsyncStorage.getItem("deviceId");
          if (deviceId !== myDeviceId) return;

          console.log("🔔 Playlist update received!");

          // fetch immediately
          const apiUrl = await AsyncStorage.getItem("apiUrl");
          if (!apiUrl) return;
          ApiService.initialize(apiUrl);

          const res = await ApiService.getPlaylist(deviceId);
          const playlists = res.data.playlists;
          const active = getActivePlaylist(playlists);
          await AsyncStorage.setItem(
            "cachedPlaylists",
            JSON.stringify(playlists),
          );

          if (active) {
            setPlaylist(active);
            setCurrentIndex(0);
          }
          console.log("✅ Playlist updated via WebSocket");
        },
      );
    };

    connectWS();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ---------------- HEARTBEAT ----------------
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const startHeartbeat = async () => {
      const deviceId = await AsyncStorage.getItem("deviceId");
      const apiUrl = await AsyncStorage.getItem("apiUrl");

      if (!deviceId || !apiUrl) return;

      ApiService.initialize(apiUrl);

      // Send first heartbeat immediately
      try {
        await ApiService.sendHeartbeat(deviceId);
        console.log("✅ Initial heartbeat sent");
      } catch (err) {
        console.log("❌ Initial heartbeat failed");
      }

      // Then every 30 seconds
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

  // ---------------- REFRESH PLAYLISTS ----------------
  useEffect(() => {
    const refreshPlaylistsFromServer = async () => {
      try {
        const deviceId = await AsyncStorage.getItem("deviceId");
        const apiUrl = await AsyncStorage.getItem("apiUrl");
        if (!deviceId || !apiUrl) return;

        ApiService.initialize(apiUrl);

        const res = await ApiService.getPlaylist(deviceId);
        const playlists = res.data.playlists;

        if (playlists) {
          await AsyncStorage.setItem(
            "cachedPlaylists",
            JSON.stringify(playlists),
          );
          console.log("🔄 Playlists refreshed from server");
        }
      } catch {
        console.log("📴 Could not refresh playlists");
      }
    };

    // refresh every 2 minutes
    const interval = setInterval(refreshPlaylistsFromServer, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  //active playlits
  // helper: handles normal + midnight-crossing ranges
  const isTimeInRange = (time: string, start?: string, end?: string) => {
    if (!start || !end) return false;

    // normal case (09:00 → 16:00)
    if (start < end) {
      return time >= start && time < end;
    }

    // midnight-crossing case (23:30 → 00:00)
    return time >= start || time < end;
  };

  // get currently active playlist
  const getActivePlaylist = (playlists: any[]) => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5); // HH:mm

    console.log("🕒 DEVICE TIME:", time);
    const activePlaylists = playlists.filter((p) =>
      isTimeInRange(time, p.startTime, p.endTime),
    );

    if (activePlaylists.length === 0) return null;

    // 🔑 pick the one with latest startTime
    activePlaylists.sort((a: any, b: any) =>
      b.startTime.localeCompare(a.startTime),
    );

    return activePlaylists[0];
  };

  // ---------------- BUILD LOCAL URIS FROM CACHE ----------------
  const buildLocalUrisFromCache = async (items: any[]) => {
    const map: Record<string, string> = {};
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) return map;

    const mediaDir = baseDir + "media/";

    for (const item of items) {
      if (!item.media) continue;

      // Get original file extension from originalName
      const ext =
        item.media.originalName?.split(".").pop()?.toLowerCase() || "jpg";
      const localPath = mediaDir + `media_${item.media._id}.${ext}`;

      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) {
        map[item.media._id] = localPath;
        console.log(`✅ Found cached: ${item.media.originalName}`);
      } else {
        console.log(`❌ Not cached: ${item.media.originalName}`);
      }
    }

    return map;
  };

  // ---------------- CACHE MEDIA (IMAGES & VIDEOS) ----------------
  const cacheMedia = async (media: any) => {
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) return null;

    const mediaDir = baseDir + "media/";

    // Ensure media directory exists
    const dirInfo = await FileSystem.getInfoAsync(mediaDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(mediaDir, {
        intermediates: true,
      });
      console.log("📁 Created media directory");
    }

    // Get file extension from originalName
    const ext = media.originalName?.split(".").pop()?.toLowerCase() || "jpg";
    const localPath = mediaDir + `media_${media._id}.${ext}`;

    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) {
      console.log(
        `📥 Downloading: ${media.originalName} (${(media.size / 1024 / 1024).toFixed(2)}MB)`,
      );
      try {
        // Your backend URL format
        const downloadUrl = media.url;
        console.log(`🔗 URL: ${downloadUrl}`);

        await FileSystem.downloadAsync(downloadUrl, localPath);
        console.log(`✅ Downloaded: ${media.originalName}`);
      } catch (err) {
        console.log(`❌ Download failed: ${media.originalName}`, err);
        return null;
      }
    } else {
      console.log(`✅ Already cached: ${media.originalName}`);
    }

    return localPath;
  };

  // ---------------- PLAYLIST SWITCHER (TIME-BASED) ----------------
  useEffect(() => {
    const interval = setInterval(async () => {
      const cached = await AsyncStorage.getItem("cachedPlaylists");
      if (!cached) return;

      const playlists = JSON.parse(cached);
      const active = getActivePlaylist(playlists);

      // 🛑 No active playlist
      if (!active) {
        if (playlist !== null) {
          console.log("⏹️ No active playlist → stopping playback");
          setPlaylist(null);
          setCurrentIndex(0);
          setLocalUris({});
        }
        return;
      }
      // ✅ Cache any new media files for active playlist
      for (const item of active.items) {
        if (!localUris[item.media._id]) {
          const local = await cacheMedia(item.media);
          if (local) {
            setLocalUris((prev) => ({
              ...prev,
              [item.media._id]: local,
            }));
          }
        }
      }

      // 🔁 Switch only if playlist changed
      if (!playlist || active._id !== playlist._id) {
        console.log(`⏰ Time change → switching to ${active.name}`);
        setCurrentIndex(0);
        setPlaylist(active);

        const rebuiltMap = await buildLocalUrisFromCache(active.items);
        setLocalUris(rebuiltMap);
      }
    }, 10 * 1000); // every 10 seconds

    return () => clearInterval(interval);
  }, [playlist]);

  // ---------------- LOAD PLAYLIST ----------------
  useEffect(() => {
    const loadPlaylist = async () => {
      console.log("🚀 Loading playlists...");

      // 1️⃣ Load cached playlists FIRST (offline support)
      const cached = await AsyncStorage.getItem("cachedPlaylists");
      if (cached) {
        const playlists = JSON.parse(cached);
        const active = getActivePlaylist(playlists);
        if (active) {
          setPlaylist(active);
          setCurrentIndex(0);
        } else {
          setPlaylist(null);
        }
        if (!active) {
          console.log("⏹️ No active playlist at startup");
          setPlaylist(null);
          setLocalUris({});
        } else {
          setPlaylist(active);
          console.log(
            `📋 Loaded cached active playlist: ${active.name} (${active.items.length} items)`,
          );

          const rebuiltMap = await buildLocalUrisFromCache(active.items);
          setLocalUris(rebuiltMap);
          console.log(
            `📦 Found ${Object.keys(rebuiltMap).length} cached files`,
          );
        }
      }

      // App can render now
      setAppReady(true);
      await SplashScreen.hideAsync();

      // 2️⃣ Try network in background
      try {
        const deviceId = await AsyncStorage.getItem("deviceId");
        const apiUrl = await AsyncStorage.getItem("apiUrl");

        if (!deviceId || !apiUrl) {
          console.log("⚠️ No device ID or API URL");
          return;
        }

        console.log(`🌐 Fetching playlists from: ${apiUrl}`);
        ApiService.initialize(apiUrl);

        const res = await ApiService.getPlaylist(deviceId);
        const playlists = res.data.playlists;
        const active = getActivePlaylist(playlists);
        if (active) {
          setPlaylist(active);
          setCurrentIndex(0);
        } else {
          setPlaylist(null);
        }

        if (playlists && playlists.length > 0) {
          const active = getActivePlaylist(playlists);
          if (!active) {
            console.log("⏹️ No active playlist from server");
            setPlaylist(null);
            setLocalUris({});
            return;
          }
          console.log(
            `🌐 Active playlist: ${active.name} (${active.items.length} items)`,
          );

          setPlaylist(active);

          // ✅ cache ALL playlists
          await AsyncStorage.setItem(
            "cachedPlaylists",
            JSON.stringify(playlists),
          );

          // Download media for active playlist
          const map: Record<string, string> = {};
          for (const item of active.items) {
            const local = await cacheMedia(item.media);
            if (local) map[item.media._id] = local;
          }

          setLocalUris(map);
          console.log(`✅ Media cached for active playlist`);
        }
      } catch (err: any) {
        console.log("📴 Offline mode - using cached playlists");
        console.log("Error:", err.message);
      }
    };

    loadPlaylist();
  }, []);

  // ---------------- AUTOPLAY (IMAGES ONLY) ----------------
  useEffect(() => {
    if (!playlist || !playlist.items?.length) return;

    const item = playlist.items[currentIndex];

    if (!item || !item.media) {
      console.log("⚠️ Invalid media in autoplay, skipping");
      goToNext();
      return;
    }

    // Only set timer for images, videos handle their own timing
    if (item.media.type === "image") {
      // 🔔 PLAYBACK START (IMAGE)
      if (deviceId && socketRef.current) {
        socketRef.current.emit("PLAYBACK_START", {
          deviceId,
          mediaId: item.media._id,
          mediaName: item.media.originalName,
          playlistId: playlist._id,
          startedAt: Date.now(),
        });
      }
      const duration = item.duration || 10; // default 10 seconds
      console.log(`⏱️ Image timer: ${duration}s`);

      const timer = setTimeout(() => {
        if (deviceId && socketRef.current && item) {
          socketRef.current.emit("PLAYBACK_END", {
            deviceId,
            mediaId: item.media._id,
            endedAt: Date.now(),
          });
        }
        goToNext();
      }, duration * 1000);

      return () => clearTimeout(timer);
    }
  }, [playlist, currentIndex]);

  // ---------------- VIDEO PLAYBACK STATUS ----------------
  const onVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        console.log("🎬 Video finished, moving to next...");
        if (
          status.didJustFinish &&
          deviceId &&
          socketRef.current &&
          currentItem
        ) {
          socketRef.current.emit("PLAYBACK_END", {
            deviceId,
            mediaId: currentItem.media._id,
            endedAt: Date.now(),
          });
        }

        goToNext();
      }
    }
  };

  // ---------------- GO TO NEXT MEDIA ----------------
  const goToNext = () => {
    if (!playlist || !playlist.items?.length) return;

    setCurrentIndex((prev) => {
      const next = (prev + 1) % playlist.items.length;
      const nextItem = playlist.items[next];
      console.log(
        `➡️ Moving to: ${nextItem.media.originalName} (${next + 1}/${playlist.items.length})`,
      );
      return next;
    });
  };

  // ---------------- CURRENT MEDIA ----------------

  const currentItem =
    playlist &&
    playlist.items &&
    playlist.items.length > 0 &&
    playlist.items[currentIndex];

  const mediaId = currentItem?.media?._id;
  const imageUri =
  mediaId
    ? localUris[mediaId] || currentItem?.media?.url
    : null;


  const mediaType = currentItem?.media?.type || "image";
  const mediaName = currentItem?.media?.originalName || "Unknown";

  // ---------------- RESET DEVICE ----------------
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
            console.log("🔄 Resetting device...");
            await AsyncStorage.clear();
            router.replace("/register" as any);
          },
        },
      ],
    );
  };

  // ---------------- AUDIO MODE SETUP ----------------
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // ---------------- RENDER ----------------
  return (
    <View style={styles.container}>
      {!appReady ? null : (
        <>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <Text style={styles.title}>🖥️ AndroSign Player</Text>
            <Text
              style={[
                styles.status,
                {
                  color: connectionStatus === "online" ? "#4ade80" : "#ef4444",
                },
              ]}
            >
              ● {connectionStatus === "online" ? "Online" : "Offline"}
            </Text>
            {!imageUri && (
              <Text style={{ color: "#facc15", fontSize: 12 }}>
                ⚠️ Waiting for internet to download media
              </Text>
            )}

            {playlist && (
              <>
                <Text style={styles.playlistInfo}>📋 {playlist.name}</Text>
                <Text style={styles.playlistInfo}>
                  {mediaType === "video" ? "🎬" : "🖼️"} {mediaName} (
                  {currentIndex + 1}/{playlist.items.length})
                </Text>
              </>
            )}
          </View>

          {/* Media Display */}
          {playlist &&
          playlist.items &&
          playlist.items.length > 0 &&
          imageUri ? (
            <View style={styles.mediaContainer}>
              {mediaType === "video" ? (
                <Video
                  ref={videoRef}
                  source={{ uri: imageUri }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping={false}
                  onLoad={() => {
                    if (deviceId && socketRef.current && currentItem) {
                      socketRef.current.emit("PLAYBACK_START", {
                        deviceId,
                        mediaId: currentItem.media._id,
                        mediaName: currentItem.media.originalName,
                        playlistId: playlist._id,
                        startedAt: Date.now(),
                      });
                    }
                  }}
                  onPlaybackStatusUpdate={onVideoPlaybackStatusUpdate}
                  useNativeControls={false}
                />
              ) : (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.media}
                  contentFit="cover"
                />
              )}
            </View>
          ) : (
            <View style={styles.noContent}>
              <Text style={styles.noContentText}>
                {playlist
                  ? "📭 No media in playlist"
                  : "⏳ Loading playlist..."}
              </Text>
            </View>
          )}

          {/* Reset Button (tap to show alert) */}
          <TouchableOpacity style={styles.resetButton} onPress={resetDevice}>
            <Text style={styles.resetText}>🔄</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  statusBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    paddingTop: 40,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  status: {
    fontSize: 14,
    color: "#4ade80",
    marginTop: 5,
  },
  playlistInfo: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 5,
  },
  mediaContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  noContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noContentText: {
    color: "#fff",
    fontSize: 18,
  },
  resetButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  resetText: {
    fontSize: 24,
  },
});
