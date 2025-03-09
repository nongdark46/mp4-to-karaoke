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

```markdown
# การติดตั้ง CUDA สำหรับการเร่งความเร็วด้วย GPU

เพื่อเพิ่มประสิทธิภาพของโปรเจคด้วย GPU โดยเฉพาะอย่างยิ่งในการทำ inference ด้วย OpenAI Whisper หรือโมเดล deep learning อื่น ๆ คุณจำเป็นต้องติดตั้ง NVIDIA CUDA Toolkit และตรวจสอบว่า GPU ของคุณรองรับ CUDA โดยทำตามขั้นตอนต่อไปนี้:

## ขั้นตอนการติดตั้ง

### 1. ตรวจสอบการรองรับ CUDA ของ GPU

- เปิด Command Prompt และรันคำสั่งต่อไปนี้:

  ```bash
  nvidia-smi
  ```

  หากคำสั่งนี้แสดงรายละเอียดเกี่ยวกับ GPU ของคุณ แสดงว่าคุณมี NVIDIA GPU ที่รองรับ CUDA

### 2. ดาวน์โหลดและติดตั้ง CUDA Toolkit

- เข้าไปที่เว็บไซต์ [NVIDIA CUDA Toolkit](https://developer.nvidia.com/cuda-toolkit) และดาวน์โหลดเวอร์ชันที่ตรงกับระบบของคุณ (แนะนำให้เลือกเวอร์ชันที่ PyTorch รองรับ เช่น CUDA 11.x)
- ทำการติดตั้งตามขั้นตอนที่ NVIDIA แนะนำ

### 3. ติดตั้ง NVIDIA Drivers

- ตรวจสอบให้แน่ใจว่าคุณได้ติดตั้ง NVIDIA Drivers เวอร์ชันล่าสุดที่รองรับ GPU ของคุณ สามารถดาวน์โหลดได้จาก [NVIDIA Drivers Download](https://www.nvidia.com/Download/index.aspx)

### 4. ติดตั้ง PyTorch ด้วย CUDA Support

- เมื่อติดตั้ง CUDA Toolkit เสร็จแล้ว ให้ติดตั้ง PyTorch ที่รองรับ CUDA โดยปฏิบัติตามคำแนะนำที่ [PyTorch Get Started](https://pytorch.org/get-started/locally/)
- เลือกเวอร์ชันที่ตรงกับ CUDA Toolkit ที่คุณติดตั้ง ตัวอย่างเช่น สำหรับ CUDA 11.8 ให้ใช้คำสั่ง:

  ```bash
  pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu118
  ```

### 5. ตรวจสอบการติดตั้ง

- รันสคริปต์ Python ต่อไปนี้เพื่อตรวจสอบว่า PyTorch ตรวจพบ GPU ได้หรือไม่:

  ```python
  import torch
  print(torch.cuda.is_available())
  ```

  หากได้ผลลัพธ์เป็น `True` หมายความว่าการติดตั้งสำเร็จและ GPU ของคุณพร้อมใช้งาน

## บทสรุป

การติดตั้ง CUDA ช่วยให้โปรเจคของคุณทำงานด้วย GPU ได้รวดเร็วกว่าเมื่อใช้ CPU เพียงอย่างเดียว โดยเฉพาะในงานที่ต้องการการประมวลผลโมเดล deep learning ที่ซับซ้อน

## การแก้ไขปัญหา

- ตรวจสอบว่าเส้นทางระบบของคุณมีไบนารีของ CUDA และ cuDNN
- หาก GPU ไม่ถูกตรวจพบ ให้ตรวจสอบไดร์เวอร์และอัปเดตหากจำเป็น
- ดูเอกสารเพิ่มเติมจาก PyTorch และ CUDA สำหรับคำแนะนำเพิ่มเติม