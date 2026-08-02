with open('/Users/zhangrui/.gemini/antigravity-ide/brain/1cbc2164-54e8-4ab5-a959-a4e4734a627c/.system_generated/tasks/task-851.log', 'r') as f:
    lines = f.readlines()

in_table = False
files = []

for line in lines:
    if "File               |" in line:
        in_table = True
        continue
    if in_table and "All files" in line:
        pass
    if in_table and "---" in line:
        continue
    if in_table:
        parts = line.split('|')
        if len(parts) >= 5:
            filename = parts[0].strip()
            lines_cov = parts[4].strip()
            uncovered = parts[5].strip()
            try:
                cov = float(lines_cov)
                # Count total uncovered lines roughly
                num_uncovered = 0
                for rng in uncovered.split(','):
                    rng = rng.strip()
                    if not rng or rng == '...': continue
                    if '-' in rng:
                        s, e = rng.split('-')
                        try:
                            num_uncovered += int(e) - int(s) + 1
                        except: pass
                    else:
                        num_uncovered += 1
                if num_uncovered > 100:
                    files.append((filename, cov, num_uncovered))
            except:
                pass

files.sort(key=lambda x: x[2], reverse=True)
for f in files[:20]:
    print(f"{f[0]:<30} {f[1]:>6.2f}% {f[2]:>4} uncovered lines")
