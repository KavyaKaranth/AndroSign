import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkRegistration = async () => {
      const isRegistered = await AsyncStorage.getItem("isRegistered");
      console.log("IS REGISTERED:", isRegistered);

      if (isRegistered === "true") {
        router.replace("/main" as any);
      } else {
        router.replace("/register" as any);
      }
    };

    checkRegistration();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
