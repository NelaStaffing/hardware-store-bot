import React, { useRef, useState } from 'react';

export default function VoiceButton({ disabled, onResult }) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  const handleClick = () => {
    if (disabled) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech transcript:', transcript);
      if (onResult) onResult(transcript);
      setRecording(false);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      title={disabled ? 'Voice input disabled' : recording ? 'Stop recording' : 'Start voice input'}
      style={{
        background: disabled ? '#eee' : recording ? '#ff5252' : '#007aff',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: 36,
        height: 36,
        marginLeft: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
      }}
    >
      <span role="img" aria-label="mic">🎤</span>
    </button>
  );
}
