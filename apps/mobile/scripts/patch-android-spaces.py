#!/usr/bin/env python3
# patch-android-spaces.py
# Fixes Android build tasks that break when the project path contains spaces.

import os
import sys

def main():
    print("🔧 Patching Android project files for paths with spaces...")
    
    script_dir = os.path.dirname(os.path.realpath(__file__))
    mobile_dir = os.path.dirname(script_dir)
    
    gradle_plugin_kt = os.path.join(
        mobile_dir,
        "node_modules",
        "@react-native",
        "gradle-plugin",
        "react-native-gradle-plugin",
        "src",
        "main",
        "kotlin",
        "com",
        "facebook",
        "react",
        "tasks",
        "GenerateAutolinkingNewArchitecturesFileTask.kt"
    )
    
    if not os.path.exists(gradle_plugin_kt):
        print(f"  ⚠️ Warning: {gradle_plugin_kt} not found.")
        return

    with open(gradle_plugin_kt, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Fix sanitizeCmakeListsPath
    target_sanitize = '    internal fun sanitizeCmakeListsPath(cmakeListsPath: String): String =\n        cmakeListsPath.replace("CMakeLists.txt", "").replace(" ", "\\\\ ")'
    replacement_sanitize = '    internal fun sanitizeCmakeListsPath(cmakeListsPath: String): String =\n        cmakeListsPath.replace("CMakeLists.txt", "")'

    # 2. Fix add_subdirectory calls to wrap in if(EXISTS)
    target_subdir = '''          if (libraryName != null && cmakeListsPath != null) {
            // If user provided a custom cmakeListsPath, let's honor it.
            val nativeFolderPath = sanitizeCmakeListsPath(cmakeListsPath)
            addDirectoryString +=
                "add_subdirectory(\\"$nativeFolderPath\\" ${libraryName}_autolinked_build)"
          }
          if (cxxModuleCMakeListsPath != null) {
            // If user provided a custom cxxModuleCMakeListsPath, let's honor it.
            val nativeFolderPath = sanitizeCmakeListsPath(cxxModuleCMakeListsPath)
            addDirectoryString +=
                "\\nadd_subdirectory(\\"$nativeFolderPath\\" ${libraryName}_cxxmodule_autolinked_build)"
          }'''

    replacement_subdir = '''          if (libraryName != null && cmakeListsPath != null) {
            // If user provided a custom cmakeListsPath, let's honor it.
            val nativeFolderPath = sanitizeCmakeListsPath(cmakeListsPath)
            addDirectoryString +=
                "if(EXISTS \\"$nativeFolderPath\\")\\n  add_subdirectory(\\"$nativeFolderPath\\" ${libraryName}_autolinked_build)\\nendif()"
          }
          if (cxxModuleCMakeListsPath != null) {
            // If user provided a custom cxxModuleCMakeListsPath, let's honor it.
            val nativeFolderPath = sanitizeCmakeListsPath(cxxModuleCMakeListsPath)
            addDirectoryString +=
                "\\nif(EXISTS \\"$nativeFolderPath\\")\\n  add_subdirectory(\\"$nativeFolderPath\\" ${libraryName}_cxxmodule_autolinked_build)\\nendif()"
          }'''

    changed = False

    # Normalize line endings to avoid matching issues
    normalized_content = content.replace('\r\n', '\n')

    if target_sanitize in normalized_content:
        normalized_content = normalized_content.replace(target_sanitize, replacement_sanitize)
        changed = True
        print("  ✓ Patched sanitizeCmakeListsPath")

    if target_subdir in normalized_content:
        normalized_content = normalized_content.replace(target_subdir, replacement_subdir)
        changed = True
        print("  ✓ Patched add_subdirectory calls with if(EXISTS)")

    if changed:
        with open(gradle_plugin_kt, "w", encoding="utf-8") as f:
            f.write(normalized_content)
        print("  ✓ GenerateAutolinkingNewArchitecturesFileTask.kt patched successfully")
    else:
        print("  ✓ GenerateAutolinkingNewArchitecturesFileTask.kt already up to date")
        
    print("✅ Android space-in-path patches applied successfully!")

if __name__ == "__main__":
    main()
