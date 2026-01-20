import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

function QRModal({ qrData, onClose }) {
  if (!qrData) return null;

  return (
    <div className="qr-modal" onClick={onClose}>
      <div className="qr-content" onClick={(e) => e.stopPropagation()}>
        <h3>Scan with Android App</h3>
        <div className="qr-code">
          <QRCodeSVG value={qrData} size={256} />
        </div>
        <p>Open AndroSign app and scan this code</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default QRModal;