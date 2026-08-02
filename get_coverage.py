import re

with open('/Users/zhangrui/.gemini/antigravity-ide/brain/1cbc2164-54e8-4ab5-a959-a4e4734a627c/.system_generated/tasks/task-851.log', 'r') as f:
    lines = f.readlines()

in_table = False
files = []

for line in lines:
    if "File               |" in line:
        in_table = True
        continue
    if in_table and "All files" in line:
        pass # skip
    if in_table and "---" in line:
        continue
    if in_table:
        parts = line.split('|')
        if len(parts) >= 5:
            filename = parts[0].strip()
            lines_cov = parts[4].strip()
            try:
                cov = float(lines_cov)
                files.append((filename, cov))
            except:
                pass

files.sort(key=lambda x: x[1])
for f in files[:30]:
    if f[1] < 20:
        print(f"{f[0]:<40} {f[1]:>6.2f}%")
