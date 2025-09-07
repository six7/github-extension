#!/usr/bin/env python3
"""
Validation script for the Chrome extension
"""
import json
import os

def validate_extension():
    print("Validating Chrome Extension...")
    
    # Check if manifest.json exists and is valid
    if not os.path.exists('manifest.json'):
        print("❌ manifest.json not found")
        return False
    
    try:
        with open('manifest.json', 'r') as f:
            manifest = json.load(f)
        print("✅ manifest.json is valid JSON")
    except json.JSONDecodeError as e:
        print(f"❌ manifest.json is invalid JSON: {e}")
        return False
    
    # Check required fields
    required_fields = ['manifest_version', 'name', 'version']
    for field in required_fields:
        if field not in manifest:
            print(f"❌ Missing required field: {field}")
            return False
        print(f"✅ Found required field: {field}")
    
    # Check content scripts
    if 'content_scripts' not in manifest:
        print("❌ No content scripts defined")
        return False
    
    content_scripts = manifest['content_scripts']
    for i, script in enumerate(content_scripts):
        if 'js' in script:
            for js_file in script['js']:
                if os.path.exists(js_file):
                    print(f"✅ Content script found: {js_file}")
                else:
                    print(f"❌ Content script not found: {js_file}")
                    return False
        
        if 'css' in script:
            for css_file in script['css']:
                if os.path.exists(css_file):
                    print(f"✅ CSS file found: {css_file}")
                else:
                    print(f"❌ CSS file not found: {css_file}")
                    return False
    
    # Check icons
    if 'icons' in manifest:
        for size, icon_file in manifest['icons'].items():
            if os.path.exists(icon_file):
                print(f"✅ Icon found: {icon_file}")
            else:
                print(f"❌ Icon not found: {icon_file}")
                return False
    
    print("\n🎉 Extension validation passed!")
    return True

if __name__ == "__main__":
    validate_extension()