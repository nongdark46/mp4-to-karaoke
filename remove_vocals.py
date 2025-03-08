import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import subprocess
import shutil

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove_vocals.py input_audio.wav output_instrumental.wav")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    # โฟลเดอร์ชั่วคราวสำหรับผลลัพธ์ของ Spleeter
    temp_dir = 'spleeter_output'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    try:
        # เรียกใช้งาน Spleeter separation แบบ 2 stems (vocals และ accompaniment)
        # คำสั่งนี้จะสร้างโฟลเดอร์ภายใน spleeter_output โดยมีชื่อไฟล์ตาม input_file
        command = f'python -m spleeter separate "{input_file}" -p spleeter:2stems -o "{temp_dir}"'
        subprocess.run(command, shell=True, check=True)
        
        # ค้นหาไฟล์ instrumental (accompaniment)
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        instrumental_path = os.path.join(temp_dir, base_name, "accompaniment.wav")
        
        if os.path.exists(instrumental_path):
            shutil.move(instrumental_path, output_file)
            print(f"Instrumental file saved to {output_file}")
        else:
            print("ไม่พบไฟล์ instrumental ที่สร้างขึ้น")
    except Exception as e:
        print("เกิดข้อผิดพลาด:", e)
    finally:
        # ลบโฟลเดอร์ชั่วคราว spleeter_output
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"ลบโฟลเดอร์ {temp_dir} เรียบร้อยแล้ว")
            
        # ถ้าโฟลเดอร์ pretrained_models ถูกสร้างขึ้นมาและคุณต้องการลบออก (โปรดระวังว่าอาจจะต้อง re-download ครั้งต่อไป)
        pretrained_models_dir = "pretrained_models"
        if os.path.exists(pretrained_models_dir):
            shutil.rmtree(pretrained_models_dir)
            print(f"ลบโฟลเดอร์ {pretrained_models_dir} เรียบร้อยแล้ว")

if __name__ == "__main__":
    main()
