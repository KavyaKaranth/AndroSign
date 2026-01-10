import axios from 'axios';

const api = axios.create({
  baseURL: 'http://<your-laptop-IP>:5000/api'
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;