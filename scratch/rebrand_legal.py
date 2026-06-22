import re

files = [
    "/Volumes/EassyLife Projects/Task/task_app/apps/web/src/app/terms/page.tsx",
    "/Volumes/EassyLife Projects/Task/task_app/apps/web/src/app/privacy/page.tsx"
]

replacements = [
    ("Amtariksha Tech Pvt Ltd", "Karmayog Tech Pvt Ltd"),
    ("Amtariksha", "Karmayog"),
    ("Amstarikha", "Karmayog"),
    ("amtariksha.com", "karmayog.com")
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    for target, replacement in replacements:
        # Use simple case sensitive replace
        content = content.replace(target, replacement)
    
    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Successfully rebranded {file_path}")
    else:
        print(f"⚠️ No changes made to {file_path}")
