import React from 'react';

function DeviceCard({ device }) {
  return (
    <div className="device-card">
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
  );
}

export default DeviceCard;