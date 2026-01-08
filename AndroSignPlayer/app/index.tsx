import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const registered = await AsyncStorage.getItem("isRegistered");
      if (registered === "true") {
        router.replace("/main");
      } else {
        router.replace("/register");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
