import os
import sys
import subprocess
import urllib.request
import lzma
import time

def main():
    print("🤖 Frida Server Auto-Setup for Emulators/Devices")
    print("-----------------------------------------------")

    # 0. Find ADB
    adb_path = "adb" # Default
    possible_paths = [
        r"C:\LDPlayer\LDPlayer9\adb.exe",
        r"D:\LDPlayer\LDPlayer9\adb.exe",
        r"C:\leidian\LDPlayer9\adb.exe",
        r"C:\Program Files\LDPlayer\LDPlayer9\adb.exe",
        r"C:\Program Files (x86)\LDPlayer\LDPlayer9\adb.exe"
    ]
    
    # Check if 'adb' is in path
    if subprocess.call("adb version", shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL) != 0:
        print("⚠️ 'adb' not found in PATH. Searching known LDPlayer paths...")
        found = False
        for path in possible_paths:
            if os.path.exists(path):
                adb_path = f'"{path}"'
                print(f"✅ Found ADB at: {path}")
                found = True
                break
        if not found:
            print("❌ Copuld not find ADB. Please add it to PATH or edit this script with the path.")
            return

    def run_adb_cmd(cmd):
        full_cmd = f"{adb_path} {cmd}"
        res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
        return res.stdout.strip()

    # 1. Try to connect explicitly (Fix for some emulators)
    print("🔌 Attempting to connect to 127.0.0.1:5555 ...")
    run_adb_cmd("connect 127.0.0.1:5555")
    time.sleep(2)

    # 2. Check ADB Connection
    devices_output = run_adb_cmd("devices")
    print(f"DEBUG: adb devices output:\n{devices_output}\n") 
    devices = devices_output.split('\n')[1:]
    devices = [d for d in devices if d.strip() and 'offline' not in d]
    
    if not devices:
        print("❌ No device found. Please:")
        print("   1. Open your Emulator (LDPlayer/Nox).")
        print("   2. Ensure 'Root Permission' is enabled in Emulator Settings.")
        print("   3. Run this script again.")
        return

    print(f"✅ Device Connected: {devices[0].split()[0]}")

    # 2. Get Architecture
    arch = run_adb_cmd("shell getprop ro.product.cpu.abi")
    print(f"📱 Architecture: {arch}")

    frida_arch = "x86"
    if "arm64" in arch: frida_arch = "arm64"
    elif "x86_64" in arch: frida_arch = "x86_64"
    elif "armeabi" in arch: frida_arch = "arm"
    
    version = "16.1.4" # Stable version
    filename = f"frida-server-{version}-android-{frida_arch}"
    xz_filename = f"{filename}.xz"
    url = f"https://github.com/frida/frida/releases/download/{version}/{xz_filename}"

    # 3. Download
    if not os.path.exists(filename):
        print(f"⬇️  Downloading Frida Server ({frida_arch})...")
        try:
            urllib.request.urlretrieve(url, xz_filename)
            print("📦 Extracting...")
            with lzma.open(xz_filename, "rb") as f_in:
                with open(filename, "wb") as f_out:
                    f_out.write(f_in.read())
            os.remove(xz_filename)
        except Exception as e:
            print(f"❌ Error downloading: {e}")
            return
    else:
        print("✅ Frida Server binary already exists.")

    # 4. Push and Run
    print("🚀 Installing on device...")
    run_adb_cmd(f"push {filename} /data/local/tmp/frida-server")
    run_adb_cmd("shell chmod 755 /data/local/tmp/frida-server")
    
    print("\n⚡ STARTING FRIDA SERVER...")
    print("NOTE: This window might freeze or hang. That means it's running! ✅")
    print("Minimize this window and go run your interception.")
    print("------------------------------------------------")
    
    # Run in background on device
    # Uses adb_path directly
    os.system(f"{adb_path} shell \"/data/local/tmp/frida-server &\"") 

if __name__ == "__main__":
    main()
