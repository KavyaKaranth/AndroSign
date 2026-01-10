import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

export default function Playlists() {
  const [name, setName] = useState("");
  const [media, setMedia] = useState([]);
  const [selected, setSelected] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const token = localStorage.getItem("token");

  // fetch media
  const fetchMedia = async () => {
    const res = await axios.get(`${API}/api/media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMedia(res.data.media);
  };

  // fetch playlists
  const fetchPlaylists = async () => {
    const res = await axios.get(`${API}/api/playlists`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPlaylists(res.data.playlists);
  };

  useEffect(() => {
    fetchMedia();
    fetchPlaylists();
  }, []);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createPlaylist = async () => {
    if (!name || selected.length === 0) {
      alert("Name & media required");
      return;
    }

    const items = selected.map((id, index) => ({
      media: id,
      order: index + 1,
      duration: 10,
    }));

    await axios.post(
      `${API}/api/playlists`,
      { name, items },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("Playlist created");
    setName("");
    setSelected([]);
    fetchPlaylists(); // ✅ refresh list
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Create Playlist</h2>

      <input
        placeholder="Playlist name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <ul>
        {media.map((m) => (
          <li key={m._id}>
            <input
              type="checkbox"
              checked={selected.includes(m._id)}
              onChange={() => toggle(m._id)}
            />
            {m.originalName}
          </li>
        ))}
      </ul>

      <button onClick={createPlaylist}>Save Playlist</button>

      <hr />

      <h3>Created Playlists</h3>

      {playlists.length === 0 && <p>No playlists created</p>}

      {/* ✅ GRID VIEW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {playlists.map((p) => (
          <div
            key={p._id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              borderRadius: "6px",
            }}
          >
            <h4>{p.name}</h4>
            <p>{p.items.length} media items</p>
          </div>
        ))}
      </div>
    </div>
  );
}
