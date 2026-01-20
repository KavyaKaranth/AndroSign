import React, { useEffect, useState } from "react";
import api from "../api";

export default function Analytics({ activities }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch overview only
  useEffect(() => {
    api.get("/analytics/overview")
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (!data) return <p>Failed to load analytics</p>;

  return (
    <div className="analytics-page">
      <h2>Analytics & Health</h2>

      <div className="analytics-cards">
        <div className="analytics-card blue">
          <h3>Active Devices</h3>
          <p className="big">
            {data.devices.active} / {data.devices.total}
          </p>
          <span>Online now</span>
        </div>

        <div className="analytics-card green">
          <h3>Total Media</h3>
          <p className="big">{data.totalMedia}</p>
          <span>Uploaded</span>
        </div>

        <div className="analytics-card purple">
          <h3>Active Playlists</h3>
          <p className="big">{data.activePlaylists}</p>
          <span>Currently running</span>
        </div>
      </div>

      <div className="activity-card">
        <h3>Recent Activity</h3>

        {activities.length === 0 ? (
          <p>No recent activity</p>
        ) : (
          <ul>
            {activities.slice(0, 5).map((a, i) => (
              <li key={i}>
                {a.message}
                <span>
                  {new Date(a.time || a.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
