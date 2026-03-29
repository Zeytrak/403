from pathlib import Path
import re
p = Path('work.html')
text = p.read_text('utf-8')
pattern = re.compile(r'<article\s+id="(project-[^"]+)"[^>]*?>', re.S)
count = 0

def repl(match):
    global count
    full = match.group(0)
    project_id = match.group(1)
    if 'data-project-id=' in full:
        return full
    count += 1
    return full.replace(f'id="{project_id}"', f'id="{project_id}" data-project-id="{project_id}"', 1)

new = pattern.sub(repl, text)
p.write_text(new, 'utf-8')
print('added', count)
