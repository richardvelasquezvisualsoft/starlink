import glob

files = glob.glob("src/pages/cliente/*.tsx")

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    new_content = content.replace('placeholder-st-muted', 'placeholder-client-text-secondary')

    with open(file_path, "w") as f:
        f.write(new_content)

print("Placeholders fixed.")
