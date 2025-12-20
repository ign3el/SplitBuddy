import { useState, useRef } from 'react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onFileSelect?: (file: File) => void;
  onFilesProcess?: (files: File[]) => void;
  onError?: (message: string) => void;
  isDisabled?: boolean;
  disableReason?: string;
  onDisabledClick?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onFileSelect, onFilesProcess, onError, isDisabled, disableReason, onDisabledClick }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [showTips, setShowTips] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIOSStandalone = () => {
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
    return isiOS && isStandalone;
  };

  const openDeviceCameraFallback = () => {
    try {
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment');
        fileInputRef.current.click();
      }
    } catch {
      // no-op
    }
  };

  const startCamera = async () => {
    // iOS PWA standalone sometimes blocks getUserMedia; prefer device camera picker
    if (isIOSStandalone()) {
      setCameraMessage('On iOS installed apps, direct camera access can be limited. Opening the device camera instead.');
      openDeviceCameraFallback();
      return;
    }

    const supportsGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!supportsGUM) {
      setCameraMessage('Your browser does not support direct camera access. Please use the device camera picker.');
      openDeviceCameraFallback();
      return;
    }

    const constraintsList: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } } as MediaTrackConstraints },
      { video: { facingMode: 'environment' } },
      { video: true },
    ];

    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS Safari inline playback workaround
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => {});
          setIsCameraActive(true);
          return;
        }
      } catch (error: any) {
        // Try next constraints if available
        setCameraMessage(error?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow access or use the device camera option.'
          : 'Unable to access camera directly. Trying alternative methods...');
        if (error?.name === 'NotAllowedError' && onError) {
          onError('Camera permission denied. Please allow access or use the device camera option.');
        }
        continue;
      }
    }

    // If all attempts failed, fallback to device camera via input
    setCameraMessage('Unable to access camera directly. Opening device camera picker instead.');
    openDeviceCameraFallback();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            setQueuedFiles(prev => [...prev, file]);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQueuedFiles(prev => [...prev, file]);
      if (onFileSelect) onFileSelect(file);
    }
  };

  return (
    <div className="camera-capture">
      <h2>📸 Scan Receipt</h2>
      
      {!isCameraActive ? (
        <div className="upload-options">
          <button 
            onClick={isDisabled ? onDisabledClick : startCamera} 
            className="btn btn-primary"
            disabled={isDisabled}
            title={disableReason}
            style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            📷 Open Camera
          </button>
          <button 
            onClick={isDisabled ? onDisabledClick : () => fileInputRef.current?.click()} 
            className="btn btn-secondary"
            disabled={isDisabled}
            title={disableReason}
            style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            📁 Upload Image
          </button>
          <div className="queue-info">
            <div className="queue-meta">
              <div className="queue-label">Photos queued</div>
              <div className="queue-count">{queuedFiles.length}</div>
            </div>
            {queuedFiles.length > 0 && (
              <div className="queue-actions">
                <button
                  className="pill-btn primary"
                  onClick={() => onFilesProcess && onFilesProcess(queuedFiles)}
                >
                  ⚙️ Process All Photos
                </button>
                <button
                  className="pill-btn ghost"
                  onClick={() => setQueuedFiles([])}
                >
                  🧹 Clear
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-secondary" onClick={() => setShowTips(v => !v)}>
            ℹ️ OCR Tips
          </button>
          {showTips && (
            <div className="ocr-tips">
              <ul>
                <li>Place receipt flat with even lighting.</li>
                <li>Fill the frame; avoid tiny text.</li>
                <li>Avoid strong shadows and angles.</li>
                <li>Capture long receipts in multiple sections.</li>
              </ul>
            </div>
          )}
          {cameraMessage && (
            <div className="camera-error">{cameraMessage}</div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="camera-controls">
            <button onClick={capturePhoto} className="btn btn-primary">
              📸 Capture
            </button>
            <button onClick={stopCamera} className="btn btn-secondary">
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
