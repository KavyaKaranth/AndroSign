import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://androsign-backend.onrender.com";

export default function AssignPlaylist() {
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);

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

 

// Assign playlist to device
 const assign = async () => {
  if (!deviceId || !playlistId) {
    alert("Select both device & playlist");
    return;
  }

   if (selectedDevice?.playlists.includes(playlistId)) {
  alert("Playlist already assigned");
  return;
}

  try {
    const res = await axios.post(
      `${API}/api/devices/${deviceId}/assign-playlists`,
      { playlistIds: [playlistId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("ASSIGN RESPONSE:", res.data);
    alert("Playlist assigned");
    // refresh device data
    const res2 = await axios.get(
  `${API}/api/devices/${deviceId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
setSelectedDevice(res2.data.device);

  } catch (err) {
    console.error("ASSIGN ERROR:", err.response?.data || err.message);
    alert("Assign failed. Check console.");
  }
};

// Remove playlist from device
const removePlaylist = async (playlistId) => {
  try {
    await axios.post(
      `${API}/api/devices/${deviceId}/remove-playlist`,
      { playlistId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("Playlist removed");

    // refresh device data
    const res = await axios.get(
      `${API}/api/devices/${deviceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSelectedDevice(res.data.device);
  } catch (err) {
    console.error(err);
    alert("Remove failed");
  }
};

// Check if playlist is active now
const isPlaylistActiveNow = (playlist) => {
  if (!playlist?.startTime || !playlist?.endTime) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = playlist.startTime.split(":").map(Number);
  const [eh, em] = playlist.endTime.split(":").map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  // Normal case (morning, afternoon, evening)
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Midnight case (night playlists like 23:00 → 00:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};


  return (
    <div>
      <h2>Assign Playlist</h2>

      <select
  onChange={async (e) => {
    const id = e.target.value;
    setDeviceId(id);

    if (!id) {
      setSelectedDevice(null);
      return;
    }

    try {
      const res = await axios.get(
        `${API}/api/devices/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedDevice(res.data.device);
    } catch (err) {
      console.error("Failed to load device details", err);
    }
  }}
>
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

      {selectedDevice && (
  <>
    <h3>Assigned Playlists</h3>

    {selectedDevice.playlists.length === 0 && (
      <p>No playlists assigned</p>
    )}

    <ul>
      {selectedDevice.playlists.map((pid) => {
        const playlist = playlists.find(p => p._id === pid);
        return (
          <li
  key={pid}
  style={{
    padding: "6px",
    marginBottom: "6px",
    borderRadius: "4px",
    backgroundColor: isPlaylistActiveNow(playlist)
      ? "#d1fae5"   // light green
      : "#f9fafb",  // normal
    border: isPlaylistActiveNow(playlist)
      ? "1px solid #10b981"
      : "1px solid #ddd"
  }}
>
  <strong>{playlist?.name || pid}</strong>

  {playlist?.startTime && playlist?.endTime && (
    <span style={{ marginLeft: "8px", color: "#555" }}>
      ({playlist.startTime} – {playlist.endTime})
    </span>
  )}

  {isPlaylistActiveNow(playlist) && (
    <span style={{ marginLeft: "8px", color: "#059669", fontWeight: "bold" }}>
      ● Active
    </span>
  )}

  <button
    style={{ marginLeft: "10px" }}
    onClick={() => removePlaylist(pid)}
  >
    Remove
  </button>
</li>


        );
      })}
    </ul>
  </>
)}

    </div>
  );
}
