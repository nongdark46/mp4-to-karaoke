import sys
sys.stdout.reconfigure(encoding='utf-8')
import torch
import torchaudio
# ตั้งค่า backend เป็น sox_io ก่อน
torchaudio.set_audio_backend("sox_io")
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

def format_time_ass(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int((seconds - int(seconds)) * 100)
    return f"{hrs}:{str(mins).zfill(2)}:{str(secs).zfill(2)}.{str(cs).zfill(2)}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_ass_wav2vec2.py <audio_file>")
        sys.exit(1)
    audio_file = sys.argv[1]
    
    # ถ้า sox_io ไม่สามารถโหลดได้ ลองเปลี่ยนเป็น soundfile
    try:
        waveform, sr = torchaudio.load(audio_file, format="wav")
    except Exception as e:
        print("sox_io backend failed, trying sox_io backend...", e)
        torchaudio.set_audio_backend("sox_io")
        waveform, sr = torchaudio.load(audio_file, format="wav")
    
    target_sr = 16000
    if sr != target_sr:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=target_sr)
        waveform = resampler(waveform)
        sr = target_sr
    if waveform.size(0) > 1:
        waveform = waveform[0:1]
    waveform = waveform.squeeze().numpy()
    duration = len(waveform) / sr

    processor = Wav2Vec2Processor.from_pretrained("airesearch/wav2vec2-large-xlsr-53-th")
    model = Wav2Vec2ForCTC.from_pretrained("airesearch/wav2vec2-large-xlsr-53-th")
    
    inputs = processor(waveform, sampling_rate=sr, return_tensors="pt", padding=True)
    with torch.no_grad():
        logits = model(inputs.input_values).logits
    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0]

    words = transcription.split()
    num_words = len(words)
    if num_words == 0:
        raise ValueError("No transcription output found.")
    
    total_duration_cs = int(duration * 100)
    per_word_duration = total_duration_cs // num_words
    
    header = (
        "[Script Info]\n"
        "Title: Karaoke Subtitle\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 640\n"
        "PlayResY: 480\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Default,Arial,40,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    
    dialogue_line = f"Dialogue: 0,0:00:00.00,{format_time_ass(duration)},Default,,0,0,0,,"
    for word in words:
        dialogue_line += f"{{\\k{per_word_duration}}}{word} "
    dialogue_line = dialogue_line.strip() + "\n"
    
    ass_content = header + dialogue_line
    print(ass_content)

if __name__ == "__main__":
    main()
