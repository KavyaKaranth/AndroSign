import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
    this.api = null;
  }

  async initialize(baseURL) {
    this.api = axios.create({ baseURL });
  }

  async registerDevice(token, deviceInfo) {
    return this.api.post('/api/devices/register', {
      token,
      ...deviceInfo
    });
  }

  async sendHeartbeat(deviceId) {
    return this.api.post(`/api/devices/${deviceId}/heartbeat`);
  }

  async getPlaylist(deviceId) {
    return this.api.get(`/api/devices/${deviceId}/playlist`);
  }
}

export default new ApiService();