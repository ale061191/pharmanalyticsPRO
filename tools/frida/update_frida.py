import urllib.request
import lzma
import os
import subprocess
import time

# Configuration
VERSION = "17.6.0"
ARCH = "x86_64" # Confirmed x86_64 via adb shell getprop
ADB_PATH = r"C:\LDPlayer\LDPlayer9\adb.exe"
DEVICE = "127.0.0.1:5555"

SERVER_NAME = f"frida-server-{VERSION}-android-{ARCH}"
XZ_NAME = f"{SERVER_NAME}.xz"
URL = f"https://github.com/frida/frida/releases/download/{VERSION}/{XZ_NAME}"

def run_adb(cmd):
    full_cmd = f'"{ADB_PATH}" -s {DEVICE} {cmd}'
    print(f"Running: {full_cmd}")
    subprocess.run(full_cmd, shell=True)

def main():
    print(f"🔄 Updating Frida Server to {VERSION}...")

    # 1. Download
    if not os.path.exists(SERVER_NAME):
        print(f"⬇️ Downloading {URL}...")
        try:
            urllib.request.urlretrieve(URL, XZ_NAME)
            print("📦 Extracting...")
            with lzma.open(XZ_NAME, "rb") as f_in:
                with open(SERVER_NAME, "wb") as f_out:
                    f_out.write(f_in.read())
            os.remove(XZ_NAME)
        except Exception as e:
            print(f"❌ Download failed: {e}")
            return
    else:
        print("✅ Correct version already downloaded.")

    # 2. Kill old server
    print("💀 Killing old server...")
    run_adb("shell pkill frida-server")

    # 3. Push new server
    print("🚀 Pushing new server...")
    run_adb(f"push {SERVER_NAME} /data/local/tmp/frida-server")
    run_adb("shell chmod 755 /data/local/tmp/frida-server")

    # 4. Run background
    print("⚡ Starting new server...")
    subprocess.Popen(f'"{ADB_PATH}" -s {DEVICE} shell "/data/local/tmp/frida-server &"', shell=True)
    
    print("✅ Done! Waiting 5s for startup...")
    time.sleep(5)

if __name__ == "__main__":
    main()
