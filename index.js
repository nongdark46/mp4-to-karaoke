const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 3000;

// ตั้งค่า Multer สำหรับเก็บไฟล์อัปโหลดในโฟลเดอร์ uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

/**
 * สร้างโฟลเดอร์ output ใหม่แบบเลขลำดับ
 */
function createNewOutputFolder() {
  const baseFolder = path.join(__dirname, 'output');
  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
  }
  let folderNumber = 1;
  let newFolderPath = path.join(baseFolder, String(folderNumber));
  while (fs.existsSync(newFolderPath)) {
    folderNumber++;
    newFolderPath = path.join(baseFolder, String(folderNumber));
  }
  fs.mkdirSync(newFolderPath);
  console.log('Created folder:', newFolderPath);
  return newFolderPath;
}

/**
 * แยกเสียงจากไฟล์ MP4 เป็นไฟล์ WAV
 */
async function extractAudio(mp4File, outputAudioFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(mp4File)
      .output(outputAudioFile)
      .on('end', () => {
        console.log('Extracted audio:', outputAudioFile);
        resolve();
      })
      .on('error', err => {
        console.error('Error extracting audio:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * บีบอัดไฟล์เสียงให้มี sample rate 16KHz, mono channel และ codec PCM s16le
 */
async function compressAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .audioFrequency(16000)
      .audioChannels(1)
      .outputOptions(['-c:a pcm_s16le'])
      .output(outputFile)
      .on('end', () => {
        console.log('Compressed audio saved as:', outputFile);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error compressing audio:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * สร้างเวอร์ชัน instrumental โดยใช้ Python script (Spleeter)
 */
async function removeVocals(inputAudio, outputInstrumental) {
  return new Promise((resolve, reject) => {
    exec(`python remove_vocals.py "${inputAudio}" "${outputInstrumental}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error removing vocals:', error);
        reject(error);
      } else {
        console.log('Removed vocals, output instrumental:', outputInstrumental);
        resolve();
      }
    });
  });
}

/**
 * รวมไฟล์วีดีโอกับแทร็กเสียงสองแทร็ก (เสียงเต็มและ instrumental)
 * เพิ่ม metadata title และ artist ลงในไฟล์วีดีโอด้วย
 */
async function combineAudioTracks(mp4File, originalAudio, instrumentalAudio, outputMp4, metadata) {
  return new Promise((resolve, reject) => {
    let ff = ffmpeg()
      .input(mp4File)
      .input(originalAudio)
      .input(instrumentalAudio)
      .outputOptions([
        '-map 0:v',
        '-map 1:a',
        '-map 2:a',
        '-c:v copy',
        '-c:a aac',
        '-shortest'
      ]);
    // if (metadata && metadata.title && metadata.artists) {
    //   ff = ff.outputOptions([
    //     `-metadata title=${metadata.title}`,
    //     `-metadata artist=${metadata.artists}`
    //   ]);
    // }
    ff.output(outputMp4)
      .on('end', () => {
        console.log('Combined dual audio tracks into:', outputMp4);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error combining audio tracks:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * แปลงเวลาจำนวนวินาทีให้เป็นรูปแบบ ASS (H:MM:SS.CS)
 */
function formatTimeASS(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * สร้าง header ของไฟล์ ASS สำหรับ karaoke subtitle
 */
function createASSHeader() {
  return `[Script Info]
Title: Karaoke Subtitle
ScriptType: v4.00+
PlayResX: 640
PlayResY: 480

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,40,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * สร้าง dialogue line สำหรับ ASS karaoke โดยใช้ tag {\k} สำหรับแต่ละคำ
 */
function createASSDialogue(startTime, endTime, words) {
  let line = '';
  words.forEach(word => {
    line += `{\\k${word.duration}}${word.text} `;
  });
  line = line.trim();
  return `Dialogue: 0,${formatTimeASS(startTime)},${formatTimeASS(endTime)},Default,,0,0,0,,${line}`;
}

/**
 * สร้างไฟล์ ASS karaoke โดยใช้ OpenAI Whisper ผ่าน Python script (whisper_transcribe.py)
 * คาดว่า Python script จะคืนค่า JSON array ของ segment ที่มี {start, end, text}
 */
function generateASSfromAudioWhisper(audioFile, outputASS) {
  return new Promise((resolve, reject) => {
    exec(`python whisper_transcribe.py "${audioFile}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error transcribing with Whisper:", error);
        return reject(error);
      }
      try {
        const segments = JSON.parse(stdout);
        let assContent = createASSHeader();
        segments.forEach(segment => {
          const startTime = segment.start;
          const endTime = segment.end;
          // แบ่งข้อความใน segment ออกเป็นคำ แล้วแจกจ่ายเวลาเท่า ๆ กัน
          const wordsArray = segment.text.split(/\s+/).filter(w => w.length > 0);
          const totalDuration = Math.round((endTime - startTime) * 100);
          const perWordDuration = wordsArray.length > 0 ? Math.floor(totalDuration / wordsArray.length) : 10;
          const wordsKaraoke = wordsArray.map(word => ({ duration: perWordDuration, text: word }));
          const dialogueLine = createASSDialogue(startTime, endTime, wordsKaraoke);
          assContent += dialogueLine + "\n";
        });
        fs.writeFileSync(outputASS, assContent, 'utf8');
        console.log("Generated ASS file using Whisper at:", outputASS);
        resolve();
      } catch (e) {
        console.error("Error processing transcription output:", e);
        reject(e);
      }
    });
  });
}

/**
 * ฟังก์ชันหลักสำหรับประมวลผลสร้าง MP4 แบบ dual audio พร้อม ASS karaoke
 * รับพารามิเตอร์เพิ่มเติม title กับ artists เพื่อใช้ในการตั้งชื่อไฟล์และ metadata
 */
async function processKaraoke(mp4File, title, artists) {
  try {
    const outputFolder = createNewOutputFolder();

    // กำหนดไฟล์ต่าง ๆ ภายใน output folder
    const originalAudioFile = path.join(outputFolder, 'original_audio.wav');
    const instrumentalAudioFile = path.join(outputFolder, 'instrumental_audio.wav');
    const compressedAudioFile = path.join(outputFolder, 'compressed_audio.wav');
    // ใช้ชื่อไฟล์ output จาก title กับ artists (เช่น "MySong-Artist.mp4")
    const baseName = `${title}-${artists}`.replace(/\s+/g, '');
    const outputMp4 = path.join(outputFolder, `${baseName}.mp4`);
    const outputASS = path.join(outputFolder, `${baseName}.ass`);

    // ขั้นตอนต่าง ๆ
    await extractAudio(mp4File, originalAudioFile);
    await compressAudio(originalAudioFile, compressedAudioFile);
    await removeVocals(originalAudioFile, instrumentalAudioFile);
    await combineAudioTracks(mp4File, originalAudioFile, instrumentalAudioFile, outputMp4, { title, artists });
    await generateASSfromAudioWhisper(compressedAudioFile, outputASS);

    console.log('กระบวนการสร้างไฟล์ MP4 แบบ dual audio และ ASS karaoke เสร็จสิ้น');
    return { outputMp4, outputASS, outputFolder };
  } catch (err) {
    console.error('Error during processing:', err);
    throw err;
  }
}

// API Endpoint สำหรับอัปโหลดไฟล์เพลง พร้อม parameter title กับ artists
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const { title, artists } = req.body;
    if (!title || !artists) {
      return res.status(400).json({ error: 'Missing title or artists parameter.' });
    }
    console.log(`Received file: ${filePath}`);
    console.log(`Title: ${title}, Artists: ${artists}`);

    const result = await processKaraoke(filePath, title, artists);
    res.json({
      message: 'Processing complete',
      outputVideo: result.outputMp4,
      outputASS: result.outputASS,
      outputFolder: result.outputFolder
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
