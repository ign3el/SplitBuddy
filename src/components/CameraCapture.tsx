import { useState, useRef } from 'react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onImageCapture: (imageFile: File) => void;
  onFileSelect: (file: File) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture, onFileSelect }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const supportsGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!supportsGUM) {
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
      } catch (error) {
        // Try next constraints if available
        continue;
      }
    }

    // If all attempts failed, fallback to device camera via input
    alert('Unable to access camera directly. Opening device camera picker instead.');
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
            onImageCapture(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="camera-capture">
      <h2>📸 Scan Receipt</h2>
      
      {!isCameraActive ? (
        <div className="upload-options">
          <button onClick={startCamera} className="btn btn-primary">
            📷 Open Camera
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
            📁 Upload Image
          </button>
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
