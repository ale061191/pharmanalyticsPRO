import os

def generate_updates():
    input_path = r"c:\Users\Usuario\Documents\pharmanalytics\productos_farmaceuticos_limpios.txt"
    output_dir = r"c:\Users\Usuario\Documents\pharmanalytics\sql_updates"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    batch_size = 500
    current_batch = []
    batch_index = 1
    
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            
            parts = line.split("|")
            if len(parts) != 2:
                continue
                
            name = parts[0].strip()
            brand = parts[1].strip()
            
            # Escape single quotes for SQL
            name_escaped = name.replace("'", "''")
            brand_escaped = brand.replace("'", "''")
            
            # Generate Update Statement
            # Using exact match on Name. 
            sql = f"UPDATE products SET brand = '{brand_escaped}' WHERE name = '{name_escaped}';"
            current_batch.append(sql)
            
            if len(current_batch) >= batch_size:
                write_batch(output_dir, batch_index, current_batch)
                current_batch = []
                batch_index += 1
                
    # Write remaining
    if current_batch:
        write_batch(output_dir, batch_index, current_batch)

def write_batch(directory, index, commands):
    filename = os.path.join(directory, f"batch_{index}.sql")
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(commands))
    print(f"Created {filename} with {len(commands)} statements.")

if __name__ == "__main__":
    generate_updates()
