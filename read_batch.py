
import sys

def read_file(filename, start_line=1, end_line=None):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
            start_index = max(0, int(start_line) - 1)
            end_index = int(end_line) if end_line else len(lines)
            
            for line in lines[start_index:end_index]:
                print(line, end='')
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        filename = sys.argv[1]
        start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        end = int(sys.argv[3]) if len(sys.argv) > 3 else None
        read_file(filename, start, end)
