import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
const bitrate = '192k';

async function getFFmpegInstance(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    console.log('Initializing FFmpeg...');
    ffmpegInstance = new FFmpeg();
    await ffmpegInstance.load();
    console.log('FFmpeg loaded successfully');
  }
  return ffmpegInstance;
}

async function cleanupFiles(ffmpeg: FFmpeg, files: string[]) {
  try {
    await Promise.all(files.map(file => ffmpeg.deleteFile(file)));
  } catch (error) {
    console.warn('Error during cleanup:', error);
  }
}

async function getDuration(audioBlob: Blob): Promise<number> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new window.AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer.duration;
}

export const processAudios = async (audio1Blob: Blob, audio2Blob: Blob): Promise<Blob> => {
  const ffmpeg = await getFFmpegInstance();
  const tempFiles = ['input1.mp3', 'input2.mp3', 'trimmed1.mp3', 'trimmed2.mp3', 'output.mp3'];
  
  try {
    await Promise.all([
      ffmpeg.writeFile('input1.mp3', await fetchFile(audio1Blob)),
      ffmpeg.writeFile('input2.mp3', await fetchFile(audio2Blob))
    ]);
    console.log('Input files written successfully');

    // Get audio durations
    const durations = await Promise.all([getDuration(audio1Blob), getDuration(audio2Blob)]);
    console.log(`Audio durations: ${durations[0]}s and ${durations[1]}s`);

    // Determine the shorter duration
    const shorterDuration = Math.min(durations[0], durations[1]);

    // Trim the shorter audio from the end
    if (durations[0] > durations[1]) {
      console.log('Trimming audio1...');
      await ffmpeg.exec([
        '-i', 'input1.mp3',
        '-ss', `${durations[0] - shorterDuration}`,
        '-t', `${shorterDuration}`,
        '-ac', '1',
        '-y',
        'trimmed1.mp3'
      ]);
    } else {
      console.log('Copying audio1...');
      await ffmpeg.exec([
        '-i', 'input1.mp3',
        '-ac', '1',
        '-y',
        'trimmed1.mp3']);
    }

    if (durations[1] > durations[0]) {
      console.log('Trimming audio2...');
      await ffmpeg.exec([
        '-i', 'input2.mp3',
        '-ss', `${durations[1] - shorterDuration}`,
        '-t', `${shorterDuration}`,
        '-ac', '1',
        '-y',
        'trimmed2.mp3'
      ]);
    } else {
      console.log('Copying audio2...');
      await ffmpeg.exec([
        '-i', 'input2.mp3',
        '-ac', '1',
        '-y',
        'trimmed2.mp3']);
    }

    // Mix the two audio files with compression
    console.log('Mixing and compressing audio files...');
    await ffmpeg.exec([
      '-i', 'trimmed1.mp3',
      '-i', 'trimmed2.mp3',
      '-filter_complex', '[0:a][1:a]amerge=inputs=2[stereo]',
      '-map', '[stereo]',
      '-ac', '2',
      '-c:a', 'libmp3lame',
      '-b:a', bitrate,
      '-y',
      'output.mp3'
    ]);

    // Read the output file
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp3');
    console.log('Processing complete');
    return new Blob([data], { type: 'audio/mp3' });
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  } finally {
    await cleanupFiles(ffmpeg, tempFiles);
  }
};
