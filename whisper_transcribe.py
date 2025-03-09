import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import whisper
import torch

if len(sys.argv) < 2:
    print("Usage: python whisper_transcribe.py <audio_file>")
    sys.exit(1)

audio_file = sys.argv[1]

# ตรวจสอบว่า GPU พร้อมใช้งานหรือไม่
device = "cuda" if torch.cuda.is_available() else "cpu"
#print(f"Using device: {device}")

# โหลดโมเดลและย้ายไปยัง device ที่เลือก (GPU ถ้ามี)
model = whisper.load_model("large").to(device)

# หากใช้ GPU ควรเปิดใช้งาน fp16 เพื่อลดการใช้งานหน่วยความจำและเพิ่มความเร็ว
result = model.transcribe(audio_file, fp16=(device=="cuda"))
segments = result.get("segments", [])
print(json.dumps(segments, ensure_ascii=False))
