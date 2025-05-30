import { useState } from 'react'
import { processAudios } from './utils/audioProcessor'
import './App.css'

const urlToBlob = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Error converting URL to blob:', error);
    throw error;
  }
};

function App() {
  const [audio1Url, setAudio1Url] = useState('https://cdn.pixabay.com/audio/2025/02/02/audio_12e1af2425.mp3')
  const [audio2Url, setAudio2Url] = useState('https://cdn.pixabay.com/audio/2023/01/09/audio_baaa3cfec7.mp3')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    if (!audio1Url || !audio2Url) {
      setError('Please provide both audio URLs')
      return
    }

    try {
      setError(null)
      setIsProcessing(true)
      console.log('Starting audio processing...')
      
      console.log('Converting URLs to blobs...')
      const audio1Blob = await urlToBlob(audio1Url)
      const audio2Blob = await urlToBlob(audio2Url)
      console.log('Blobs generated successfully')
      
      console.log('Processing audio files...')
      const resultBlob = await processAudios(audio1Blob, audio2Blob)
      console.log('Audio processing complete')
      
      setResultUrl(URL.createObjectURL(resultBlob))
    } catch (error) {
      console.error('Error in handleProcess:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while processing the audio files')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container">
      <div className="input-group">
        <input
          type="text"
          placeholder="First Audio URL"
          value={audio1Url}
          onChange={(e) => setAudio1Url(e.target.value)}
          disabled={isProcessing}
        />
        <input
          type="text"
          placeholder="Second Audio URL"
          value={audio2Url}
          onChange={(e) => setAudio2Url(e.target.value)}
          disabled={isProcessing}
        />
        <button onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Combine Audios'}
        </button>
      </div>
      
      {error && (
        <div className="error">
          {error}
        </div>
      )}
      
      {isProcessing && (
        <div className="processing">
          Processing audio files... This may take a few moments.
        </div>
      )}
      
      {resultUrl && (
        <div className="result">
          <h2>Result:</h2>
          <audio controls src={resultUrl} />
        </div>
      )}
    </div>
  )
}

export default App
