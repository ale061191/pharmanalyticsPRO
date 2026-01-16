
import os

def scan_file():
    path = r"c:\Users\Usuario\Documents\pharmanalytics\har_analysis_results.txt"
    out_path = r"c:\Users\Usuario\Documents\pharmanalytics\scan_results.txt"
    print(f"Scanning {path}...")
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write(f"Total lines in HAR analysis: {len(lines)}\n")
            url_count = 0
            for i, line in enumerate(lines, 1):
                line_stripped = line.strip()
                if line_stripped.startswith("URL:"):
                    url_count += 1
                    out.write(f"Line {i}: {line_stripped}\n")
                    # Check next line for Method
                    if i < len(lines):
                        out.write(f"  -> {lines[i].strip()}\n")
                
                if "nearby" in line_stripped:
                    out.write(f"  [MATCH 'nearby' at Line {i}]\n")
                
                if "23645003297" in line_stripped and not line_stripped.startswith("URL:"):
                    out.write(f"  [MATCH ID at Line {i}]: {line_stripped[:200]}\n")

            out.write(f"\nTotal URL lines found: {url_count}\n")
            
        print(f"Scan complete. Results written to {out_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    scan_file()
