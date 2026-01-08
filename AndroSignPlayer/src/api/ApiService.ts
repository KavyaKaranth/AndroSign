import axios from "axios";

class ApiService {
  api: any = null;

  initialize(baseURL: string, token?: string) {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
    });
  }

  registerDevice(deviceInfo: any) {
    return this.api.post("/api/devices/register", deviceInfo);
  }

  sendHeartbeat(deviceId: string) {
    return this.api.post(`/api/devices/${deviceId}/heartbeat`);
  }
}

export default new ApiService();
