import { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  useState(() => {
    startCamera();
    return () => stopCamera();
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm aspect-[3/4] bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10">
        <AnimatePresence mode="wait">
          {!capturedImage ? (
            <motion.div 
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
                  <X className="w-12 h-12 text-red-500 mb-4" />
                  <p className="font-bold">{error}</p>
                  <button onClick={onClose} className="mt-6 px-6 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">Cerrar</button>
                </div>
              ) : (
                <div className="absolute bottom-8 inset-x-0 flex justify-center">
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[6px] border-white/30 active:scale-90 transition-transform shadow-lg"
                  >
                    <div className="w-16 h-16 bg-white rounded-full border-2 border-gray-200" />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full"
            >
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <div className="absolute bottom-8 inset-x-0 flex justify-center gap-6">
                <button 
                  onClick={handleRetake}
                  className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all border border-white/20"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleConfirm}
                  className="w-14 h-14 bg-green-500 text-white rounded-2xl flex items-center justify-center hover:bg-green-600 transition-all shadow-lg shadow-green-900/20"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <button 
        onClick={onClose}
        className="mt-8 text-white/50 hover:text-white font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-2"
      >
        <X className="w-4 h-4" /> Cancelar
      </button>

      <canvas ref={canvasRef} className="hidden" />
      
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
