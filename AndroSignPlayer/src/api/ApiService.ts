import axios from "axios";

class ApiService {
  api: any = null;

  initialize(baseURL: string, token?: string) {
  console.log("API URL USED:", baseURL);

  this.api = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
}


  registerDevice(data: any) {
    return this.api.post("/api/devices/register", data);
  }

  sendHeartbeat(deviceId: string) {
    return this.api.post(`/api/devices/${deviceId}/heartbeat`);
  }

  getPlaylist(deviceId: string) {
    return this.api.get(`/api/devices/${deviceId}/playlist`);
  }
}

export default new ApiService();
