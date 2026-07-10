import subprocess
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Bắt đầu tiến trình tải dữ liệu liên tục với khả năng tự phục hồi...")

while True:
    print("\n--- Khởi động tiến trình tải ROIC ---")
    result = subprocess.run(["python", "fetch_roic.py"])
    
    if result.returncode == 0:
        print("Tiến trình tải dữ liệu đã hoàn tất thành công 100%!")
        break
    else:
        print("\n[CẢNH BÁO] Bị giới hạn Rate Limit của vnstock (Mã lỗi: 1).")
        print("Hệ thống sẽ tự động chờ 45 giây để reset API limit trước khi tiếp tục...")
        time.sleep(45)
