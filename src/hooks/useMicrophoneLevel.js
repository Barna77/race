import { useCallback, useEffect, useRef, useState } from 'react';

export default function useMicrophoneLevel() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);

  const stop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setStatus('idle');
  }, []);

  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setError('Ez a böngésző nem támogatja a mikrofonhozzáférést.');
      return false;
    }

    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setStatus('granted');
      return true;
    } catch (microphoneError) {
      setStatus('denied');
      setError(microphoneError?.message || 'A mikrofonengedély nem sikerült.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!analyserRef.current) {
      return undefined;
    }

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);

      // RMS hangerő: a minták négyzetes átlagának gyöke. Ez stabilabb játékérték,
      // mint egyetlen csúcsérték, de továbbra is csak szórakoztató kalibráció.
      const sum = buffer.reduce((total, sample) => total + sample * sample, 0);
      setLevel(Math.sqrt(sum / buffer.length));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => stop, [stop]);

  return {
    error,
    level,
    requestMicrophone,
    status,
    stop
  };
}
