import json

with open("/home/administrador/.gemini/antigravity-ide/brain/99cd2df0-797c-43a5-a51a-38bd8b8cb13e/.system_generated/logs/transcript_full.jsonl") as f:
    for line in f:
        obj = json.loads(line)
        if obj.get("type") == "PLANNER_RESPONSE":
            for call in obj.get("tool_calls", []):
                if call.get("name") in ("replace_file_content", "write_to_file", "multi_replace_file_content"):
                    args = call.get("args", {})
                    if "models.py" in args.get("TargetFile", ""):
                        content = str(args)
                        if "RolMenu" in content:
                            print(content)
