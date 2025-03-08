# whisper_transcribe.py
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import whisper

if len(sys.argv) < 2:
    print("Usage: python whisper_transcribe.py <audio_file>")
    sys.exit(1)

audio_file = sys.argv[1]
model = whisper.load_model("large")  # เปลี่ยนเป็น "small", "medium", หรือ "large" ได้ตามต้องการ
result = model.transcribe(audio_file, fp16=False)
segments = result.get("segments", [])
print(json.dumps(segments, ensure_ascii=False))
