/*import React, { useState, useEffect } from 'react';
import api from './api';
import Login from './components/Login';
import Header from './components/Header';
import DeviceGrid from './components/DeviceGrid';
import QRModal from './components/QRModal';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [devices, setDevices] = useState([]);
  const [qrData, setQrData] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchDevices();
    }
  }, []);

  const handleLogin = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setIsLoggedIn(true);
    fetchDevices();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setDevices([]);
  };

  const fetchDevices = async () => {
    try {
      const response = await api.get('/devices');
      setDevices(response.data.devices);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const generateQR = async () => {
    try {
      const response = await api.post('/devices/generate-qr');
      const qrString = JSON.stringify({
        apiUrl: 'http://YOUR_COMPUTER_IP:5000',
        token: response.data.token
      });
      setQrData(qrString);
      
      // Auto refresh devices every 3 seconds for 1 minute
      const interval = setInterval(fetchDevices, 3000);
      setTimeout(() => clearInterval(interval), 60000);
    } catch (err) {
      alert('Failed to generate QR code');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="App">
      <Header onLogout={handleLogout} />
      <main>
        <DeviceGrid 
          devices={devices} 
          onAddDevice={generateQR} 
        />
        <QRModal 
          qrData={qrData} 
          onClose={() => setQrData('')} 
        />
      </main>
    </div>
  );
}

export default App;   */
import React, { useState, useEffect } from 'react';
import api from './api';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import Header from "./components/Header";
import Media from "./pages/Media";
import Playlists from "./pages/Playlists";
import AssignPlaylist from "./pages/AssignPlaylist";
import Analytics from "./pages/Analytics";
import { io } from "socket.io-client";

// Initialize WebSocket connection
const socket = io("https://androsign-backend.onrender.com", {
  transports: ["websocket"],
});

function App() {
  const [view, setView] = useState("devices");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState('');
  const [activities, setActivities] = useState([]);


// Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchDevices();
    }
  }, []);

// Load initial activity history
  useEffect(() => {
  const loadInitialActivities = async () => {
    try {
      const res = await api.get("/analytics/activity");
      setActivities(res.data.activities || []);
    } catch (err) {
      console.error("Failed to load activity history");
    }
  };

  if (isLoggedIn) {
    loadInitialActivities();
  }
}, [isLoggedIn]);


// Real-time device status updates via WebSocket
useEffect(() => {
  socket.on("device-status", ({ deviceId, status, lastSeen }) => {
    setDevices(prev =>
      prev.map(d =>
        d.deviceId === deviceId
          ? { ...d, status, lastSeen }
          : d
      )
    );
  });

  return () => socket.off("device-status");
}, []);

// 🔴 Real-time recent activity updates
useEffect(() => {
  socket.on("activity", (data) => {
    console.log("📢 Activity received:", data);
    setActivities(prev => [data, ...prev].slice(0, 50)); // Keep only latest 50 activities
  });

  return () => socket.off("activity");
}, []);


// Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      fetchDevices();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await api.get('/devices');
      setDevices(response.data.devices);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const generateQR = async () => {
    try {
      const response = await api.post('/devices/generate-qr');
      const qrString = JSON.stringify({
        apiUrl: 'https://androsign-backend.onrender.com',
        token: response.data.token
      });
      setQrData(qrString);
      setShowQR(true);
      
      // Auto refresh devices after QR shown
      const interval = setInterval(fetchDevices, 3000);
      setTimeout(() => clearInterval(interval), 60000); // Stop after 1 min
    } catch (err) {
      alert('Failed to generate QR code');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setDevices([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="login-container">
          <h1>🖥️ AndroSign</h1>
          <h2>Digital Signage Management</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
          <p className="hint">Use: admin@androsign.com / admin123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Header
  currentView={view}
  onChangeView={setView}
  onLogout={handleLogout}
/>

      
      <main>
          {view === "devices" && (
          <>
        <div className="top-actions">
          <h2>Registered Devices ({devices.length})</h2>
          <button className="qr-button" onClick={generateQR}>
            📱 Add New Device (QR)
          </button>
        </div>

        {showQR && (
          <div className="qr-modal" onClick={() => setShowQR(false)}>
            <div className="qr-content" onClick={(e) => e.stopPropagation()}>
              <h3>Scan with Android App</h3>
              <div className="qr-code">
                <QRCodeSVG value={qrData} size={256} />
              </div>
              <p>Open AndroSign app and scan this code</p>
              <button onClick={() => setShowQR(false)}>Close</button>
            </div>
          </div>
        )}
        
        <div className="devices-grid">
          {devices.map(device => (
            <div key={device._id} className="device-card">
              <h3>{device.name}</h3>
              <p>📍 {device.location}</p>
              <p>ID: {device.deviceId}</p>
              <span className={`status ${device.status}`}>
                {device.status}
              </span>
              <p className="last-seen">
                Last seen: {new Date(device.lastSeen).toLocaleString()}
              </p>
            </div>
          ))}
          {devices.length === 0 && (
            <p className="no-devices">No devices registered yet. Click "Add New Device" to get started!</p>
          )}
        </div>

        </>
        )}
  {view === "media" && <Media />}
  {view === "playlists" && <Playlists />}
  {view === "assign" && <AssignPlaylist />}
  {view === "analytics" && <Analytics activities={activities} />}


  
  

      </main>
    </div>
  );
}

export default App;