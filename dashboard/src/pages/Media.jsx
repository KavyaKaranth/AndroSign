import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://androsign-backend.onrender.com"; // change to LAN IP if needed

export default function Media() {
  const [file, setFile] = useState(null);
  const [media, setMedia] = useState([]);

  const token = localStorage.getItem("token");

  const fetchMedia = async () => {
    const res = await axios.get(`${API}/api/media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMedia(res.data.media);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const uploadMedia = async () => {
  if (!file) {
    alert("Please select a file");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", file); // MUST be "file"

    await axios.post(`${API}/api/media`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    alert("Upload success");
    setFile(null);
    fetchMedia();
  } catch (err) {
    console.error(err.response?.data || err.message);
    alert("Upload failed");
  }
};




  return (
    <div>
      <h2>Media Upload</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={uploadMedia}>Upload</button>

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginTop: "20px",
  }}
>
  {media.map((m) => (
  <div
    key={m._id}
    style={{
      border: "1px solid #ddd",
      padding: "10px",
      textAlign: "center",
    }}
  >
    {m.type === "image" && (
      <img
        src={m.url}
        alt={m.originalName}
        style={{
          width: "100%",
          height: "180px",
          objectFit: "cover",
          borderRadius: "6px",
        }}
      />
    )}

    {m.type === "video" && (
      <video
        src={m.url}
        controls
        style={{
          width: "100%",
          height: "180px",
          objectFit: "cover",
          borderRadius: "6px",
        }}
      />
    )}

    <p style={{ marginTop: "8px" }}>{m.originalName}</p>
  </div>
))}

</div>


    </div>
  );
}
