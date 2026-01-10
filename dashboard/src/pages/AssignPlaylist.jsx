import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

export default function AssignPlaylist() {
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [playlistId, setPlaylistId] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    axios
      .get(`${API}/api/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDevices(res.data.devices));

    axios
      .get(`${API}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setPlaylists(res.data.playlists));
  }, []);

  const assign = async () => {
    if (!deviceId || !playlistId)
      return alert("Select both device & playlist");

    await axios.post(
  `${API}/api/devices/${deviceId}/assign-playlist`,
  { playlistId },
  { headers: { Authorization: `Bearer ${token}` } }
);


    alert("Playlist assigned");
  };

  return (
    <div>
      <h2>Assign Playlist</h2>

      <select onChange={(e) => setDeviceId(e.target.value)}>
        <option value="">Select Device</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.name} ({d.location})
          </option>
        ))}
      </select>

      <select onChange={(e) => setPlaylistId(e.target.value)}>
        <option value="">Select Playlist</option>
        {playlists.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>

      <button onClick={assign}>Assign</button>
    </div>
  );
}
