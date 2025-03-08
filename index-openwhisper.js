const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// สร้างโฟลเดอร์ base สำหรับเก็บไฟล์ผลลัพธ์ (แบบเลขลำดับ)
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
const outputFolder = newFolderPath;
console.log('Created folder:', newFolderPath);

/**
 * ฟังก์ชันสำหรับแยกเสียงจากไฟล์ MP4 เป็นไฟล์ WAV
 * @param {string} mp4File - ไฟล์ MP4 อินพุต
 * @param {string} outputAudioFile - ชื่อไฟล์เสียงที่แยกออกมา (Full path)
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
 * ฟังก์ชันสำหรับบีบอัดไฟล์เสียงให้มี sample rate 16KHz, mono channel และ PCM s16le
 * @param {string} inputFile - ไฟล์เสียงต้นฉบับ (Full path)
 * @param {string} outputFile - ไฟล์เสียงที่บีบอัดแล้ว (Full path)
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
 * ฟังก์ชันสำหรับสร้างเวอร์ชัน instrumental โดยใช้ Python script (Spleeter)
 * @param {string} inputAudio - ไฟล์เสียงต้นฉบับ (Full path)
 * @param {string} outputInstrumental - ไฟล์ instrumental ที่สร้างขึ้น (Full path)
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
 * ฟังก์ชันสำหรับรวมไฟล์วีดีโอกับแทร็กเสียงสองแทร็ก (เสียงเต็มและ instrumental)
 * @param {string} mp4File - ไฟล์วีดีโอต้นฉบับ (Full path)
 * @param {string} originalAudio - ไฟล์เสียงต้นฉบับ (Full path)
 * @param {string} instrumentalAudio - ไฟล์ instrumental (Full path)
 * @param {string} outputMp4 - ไฟล์ MP4 ผลลัพธ์ที่รวมแทร็กเสียงแล้ว (Full path)
 */
async function combineAudioTracks(mp4File, originalAudio, instrumentalAudio, outputMp4) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(mp4File)
      .input(originalAudio)
      .input(instrumentalAudio)
      .outputOptions([
        '-map 0:v',     // วีดีโอจากไฟล์ต้นฉบับ
        '-map 1:a',     // แทร็กเสียงที่มีนักร้อง
        '-map 2:a',     // แทร็ก instrumental
        '-c:v copy',    // คัดลอกวีดีโอโดยไม่เข้ารหัสใหม่
        '-c:a aac',     // เข้ารหัสเสียงเป็น aac
        '-shortest'
      ])
      .output(outputMp4)
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
 * แปลงจำนวนวินาทีให้เป็นรูปแบบเวลาใน ASS (H:MM:SS.CS)
 * โดย CS คือ centiseconds (1/100 วินาที)
 * @param {number} seconds - จำนวนวินาที
 * @returns {string} เวลาในรูปแบบ ASS
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
 * @returns {string} header ของ ASS file
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
 * @param {number} startTime - เวลาเริ่มของบรรทัด (วินาที)
 * @param {number} endTime - เวลาสิ้นสุดของบรรทัด (วินาที)
 * @param {Array} words - Array ของวัตถุแต่ละคำ {duration, text}
 * @returns {string} dialogue line สำหรับ ASS
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
 * สร้างไฟล์ ASS karaoke โดยใช้ OpenAI Whisper ผ่าน Python script
 * โดยเรียกใช้ script "whisper_transcribe.py" ซึ่งจะคืนผลลัพธ์เป็น JSON array ของ segment
 * แต่ละ segment มี {start, end, text}
 * @param {string} audioFile - ไฟล์เสียงต้นฉบับ (Full path)
 * @param {string} outputASS - ไฟล์ ASS ที่จะสร้าง (Full path)
 * @returns {Promise<void>}
 */
function generateASSfromAudioWhisper(audioFile, outputASS) {
  return new Promise((resolve, reject) => {
    // เรียกใช้ Python script whisper_transcribe.py โดยส่ง audioFile เป็น argument
    exec(`python whisper_transcribe.py "${audioFile}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error transcribing with Whisper:", error);
        return reject(error);
      }
      try {
        // คาดว่า stdout จะเป็น JSON array ของ segment
        const segments = JSON.parse(stdout);
        let assContent = createASSHeader();
        segments.forEach(segment => {
          const startTime = segment.start;
          const endTime = segment.end;
          // แบ่งข้อความใน segment ออกเป็นคำ โดยแจกจ่ายเวลาเท่า ๆ กัน
          const wordsArray = segment.text.split(/\s+/).filter(w => w.length > 0);
          const totalDuration = Math.round((endTime - startTime) * 100); // centiseconds
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
 * ฟังก์ชันหลักสำหรับประมวลผลสร้าง MP4 แบบ dual audio (มีทั้งเสียงเต็มและ instrumental)
 * พร้อมสร้างไฟล์ ASS karaoke subtitle
 * @param {string} mp4File - ไฟล์ MP4 อินพุต (Full path)
 */
async function processKaraoke(mp4File) {
  try {
    // กำหนด path สำหรับไฟล์ต่าง ๆ ภายในโฟลเดอร์ output
    const originalAudioFile = path.join(outputFolder, 'original_audio.wav');
    const instrumentalAudioFile = path.join(outputFolder, 'instrumental_audio.wav');
    const compressedAudioFile = path.join(outputFolder, 'compressed_audio.wav');
    const outputMp4 = path.join(outputFolder, 'output_dual_audio.mp4');
    const outputASS = path.join(outputFolder, 'output_karaoke.ass');

    // Step 1: แยกเสียงต้นฉบับออกจาก MP4
    await extractAudio(mp4File, originalAudioFile);

    // Step 2: บีบอัดไฟล์เสียงเพื่อลดขนาดก่อนแปลงเป็นข้อความ
    await compressAudio(originalAudioFile, compressedAudioFile);

    // Step 3: สร้างเวอร์ชัน instrumental (ไม่มีเสียงนักร้อง)
    await removeVocals(originalAudioFile, instrumentalAudioFile);

    // Step 4: รวมไฟล์วีดีโอกับสองแทร็กเสียงเข้าด้วยกัน
    await combineAudioTracks(mp4File, originalAudioFile, instrumentalAudioFile, outputMp4);

    // Step 5: สร้างไฟล์ ASS karaoke subtitle จากไฟล์เสียงที่ถูกบีบอัด (สำหรับ transcription)
    await generateASSfromAudioWhisper(compressedAudioFile, outputASS);

    console.log('กระบวนการสร้างไฟล์ MP4 แบบ dual audio และ ASS karaoke เสร็จสิ้น');
  } catch (err) {
    console.error('Error during processing:', err);
  }
}

// เริ่มกระบวนการด้วยไฟล์ MP4 อินพุต (ใช้ full path หรือ relative path ตามต้องการ)
processKaraoke('input.mp4');
