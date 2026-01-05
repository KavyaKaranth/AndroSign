import React from 'react';
import DeviceCard from './DeviceCard';

function DeviceGrid({ devices, onAddDevice }) {
  return (
    <div>
      <div className="top-actions">
        <h2>Registered Devices ({devices.length})</h2>
        <button className="qr-button" onClick={onAddDevice}>
          📱 Add New Device (QR)
        </button>
      </div>

      <div className="devices-grid">
        {devices.map(device => (
          <DeviceCard key={device._id} device={device} />
        ))}
        {devices.length === 0 && (
          <p className="no-devices">
            No devices registered yet. Click "Add New Device" to get started!
          </p>
        )}
      </div>
    </div>
  );
}

export default DeviceGrid;