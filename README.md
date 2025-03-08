# Karaoke Video Processing API

โปรเจคนี้เป็นเครื่องมือที่ช่วยแปลงไฟล์ MP4 ให้เป็นวีดีโอ karaoke แบบ dual audio (เสียงเต็มและ instrumental) พร้อมสร้างไฟล์คำบรรยาย ASS สำหรับ karaoke โดยใช้ขั้นตอนการประมวลผลเสียงหลายขั้นตอน

## ขั้นตอนการประมวลผลเสียง

1. **แยกเสียง**: ดึงเสียงจากไฟล์ MP4 มาเป็นไฟล์ WAV
2. **บีบอัดเสียง**: ปรับไฟล์ WAV ให้มี sample rate 16KHz, mono channel และใช้ codec PCM s16le
3. **ลบเสียงร้อง**: ใช้ Python script (`remove_vocals.py`) ที่ทำงานร่วมกับ Spleeter เพื่อลบเสียงร้องออกจากไฟล์เสียง
4. **รวมแทร็กเสียง**: รวมวีดีโอเข้ากับสองแทร็กเสียง (เสียงเต็มและ instrumental) และเพิ่ม metadata (title, artists)
5. **สร้างคำบรรยาย ASS**: ใช้ OpenAI Whisper (ผ่าน Python script `whisper_transcribe.py`) เพื่อแปลงไฟล์เสียงที่ถูกบีบอัดเป็นข้อความ จากนั้นสร้างไฟล์ ASS karaoke

ผลลัพธ์สุดท้ายจะถูกบันทึกไว้ในโฟลเดอร์ `output` โดยระบบจะสร้างโฟลเดอร์ใหม่เป็นลำดับ (เช่น `output/1`, `output/2`, …) และตั้งชื่อไฟล์ output วีดีโอและ ASS ตามรูปแบบ `<title>-<artists>.mp4` และ `<title>-<artists>.ass` ตามลำดับ

## คุณสมบัติ (Features)

- **API อัปโหลดไฟล์**: อัปโหลดไฟล์ MP4 พร้อมข้อมูล title และ artists
- **การประมวลผลเสียงอัตโนมัติ**: แยกเสียง, บีบอัดเสียง, ลบเสียงร้อง, รวมแทร็กเสียง
- **สร้างไฟล์คำบรรยาย ASS**: แปลงเสียงเป็นข้อความและสร้างไฟล์ ASS karaoke พร้อมเอฟเฟกต์ {\k}
- **ตั้งชื่อไฟล์อัตโนมัติ**: ตั้งชื่อไฟล์ output ตามค่า title และ artists
- **จัดเก็บผลลัพธ์ในโฟลเดอร์ใหม่**: สร้างโฟลเดอร์ output ใหม่แบบเลขลำดับ (`output/1`, `output/2`, ...)

## ความต้องการ (Requirements)

### ระบบและโปรแกรม 

- Node.js (แนะนำ Node.js เวอร์ชัน 16 หรือสูงกว่า)
- Python 3 (แนะนำ Python 3.9 หรือสูงกว่า)
- FFmpeg: ต้องติดตั้ง FFmpeg และเพิ่มใน PATH
- Visual Studio Build Tools: (สำหรับ build Python modules เช่น Spleeter หากจำเป็น)

### Dependencies สำหรับ Node.js

- Express
- Multer
- Fluent-ffmpeg

ติดตั้งด้วยคำสั่ง:

```bash
npm install express multer fluent-ffmpeg
```

### Dependencies สำหรับ Python

- `openai-whisper`: สำหรับแปลงเสียงเป็นข้อความด้วย OpenAI Whisper

ติดตั้งด้วยคำสั่ง:

```bash
pip install openai-whisper
```

- `spleeter`: สำหรับลบเสียงร้อง

ติดตั้งด้วยคำสั่ง:

```bash
pip install spleeter
```

## วิธีการติดตั้ง (Installation)

1. Clone โปรเจค:

    ```bash
    git clone <repository-url>
    cd <project-folder>
    ```

2. ติดตั้ง Node.js Dependencies:

    ```bash
    npm install
    ```

3. ติดตั้ง Python Dependencies:

    ```bash
    pip install openai-whisper
    pip install spleeter
    ```

4. ตรวจสอบให้แน่ใจว่า FFmpeg ติดตั้งและสามารถใช้งานได้ใน command line

### เตรียม Python Scripts:

- `remove_vocals.py`: สคริปต์สำหรับลบเสียงร้องด้วย Spleeter
- `whisper_transcribe.py`: สคริปต์สำหรับแปลงไฟล์เสียงเป็นข้อความด้วย OpenAI Whisper

ตัวอย่างไฟล์ `whisper_transcribe.py`:

```python
import sys
import json
import whisper

if len(sys.argv) < 2:
    print("Usage: python whisper_transcribe.py <audio_file>")
    sys.exit(1)

audio_file = sys.argv[1]
model = whisper.load_model("base")  # สามารถเปลี่ยนเป็น "small" เครื่องไม่แรงมาก, "medium" เครื่องพอประมาณ หรือ "large" เครื่องแรงสุดๆใช้เวลา render พอควรแต่แม่นนะ ได้
result = model.transcribe(audio_file, fp16=False)
segments = result.get("segments", [])
print(json.dumps(segments, ensure_ascii=False))
```

บันทึกไฟล์นี้ไว้ในโฟลเดอร์โปรเจคเดียวกัน

## วิธีการใช้งาน (Usage)

### การเริ่มเซิร์ฟเวอร์

รันเซิร์ฟเวอร์ Node.js:

```bash
node index.js
```

เซิร์ฟเวอร์จะทำงานที่ port 3000 (หรือ port ที่คุณกำหนดไว้)

เปิดหน้าเว็บสำหรับอัปโหลดไฟล์: เปิดไฟล์ `index.html` ในเบราว์เซอร์เพื่อใช้งานหน้าเว็บอัปโหลดไฟล์

### หน้าเว็บอัปโหลดไฟล์

หน้าเว็บมี form สำหรับอัปโหลดไฟล์ MP4 พร้อม input สำหรับ title และ artists เมื่อเลือกไฟล์ ระบบจะอ่านชื่อไฟล์และทำการแยก (โดยใช้เครื่องหมาย "-" เป็นตัวแบ่ง) เพื่อนำส่วนแรกไปใส่ใน input title และส่วนที่สองไปใส่ใน input artists (โดยลบนามสกุลออก)

กดปุ่ม "Upload and Process" เพื่อส่งข้อมูลไปยัง API ที่ `/upload`

### กระบวนการประมวลผล

หลังจากอัปโหลดไฟล์แล้ว เซิร์ฟเวอร์จะดำเนินการดังนี้:

1. **Extract Audio**: แยกเสียงจาก MP4 เป็นไฟล์ WAV (`original_audio.wav`)
2. **Compress Audio**: บีบอัดไฟล์เสียงให้มีคุณสมบัติที่เหมาะสม (`compressed_audio.wav`)
3. **Remove Vocals**: ลบเสียงร้องโดยเรียก Python script `remove_vocals.py` (`instrumental_audio.wav`)
4. **Combine Audio Tracks**: รวมวีดีโอและสองแทร็กเสียงเป็นไฟล์ MP4 dual audio โดยเพิ่ม metadata (ชื่อเพลงและศิลปิน)
5. **Generate ASS Karaoke**: ใช้ Python script `whisper_transcribe.py` เพื่อสร้างไฟล์ ASS karaoke (ชื่อไฟล์จะถูกตั้งเป็น `<title>-<artists>.ass`)

ผลลัพธ์ทั้งหมดจะถูกเก็บไว้ในโฟลเดอร์ output ใหม่ (เช่น `output/1`, `output/2`, ...)

## การเรียกใช้งาน API (API Endpoint)

- **URL**: `/upload`
- **Method**: POST
- **Parameters**:
  - `file`: ไฟล์ MP4 (ผ่าน form-data)
  - `title`: ชื่อเพลง
  - `artists`: ศิลปิน
- **Response**: JSON ที่มีข้อมูล output เช่น output video, output ASS, และ output folder

## ปัญหาที่พบบ่อย (Troubleshooting)

- **FFmpeg**: ตรวจสอบว่า FFmpeg ติดตั้งและอยู่ใน PATH
- **Python Modules**: ตรวจสอบว่าติดตั้ง `openai-whisper` และ `spleeter` แล้ว
- **Build Tools**: หากเกิดปัญหาในการ build Python modules (เช่น Spleeter) ให้ตรวจสอบ Visual Studio Build Tools และ environment variables
- **File Naming**: ตรวจสอบชื่อไฟล์ที่อัปโหลดให้แน่ใจว่าใช้เครื่องหมาย "-" ในการแบ่ง title และ artists