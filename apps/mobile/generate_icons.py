#!/usr/bin/env python3
"""
Generate Android app icons from source PNG image.
Creates all required mipmap sizes for Android.
"""

from PIL import Image
import os

# Source icon path
SOURCE_ICON = "/media/pradeep/Work/projects/jsr_web_app-jsr_tool/public/images/logos/amtariksha_icon.png"

# Android icon sizes (in pixels)
ICON_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Foreground icon sizes for adaptive icons (108dp with 72dp safe zone)
FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# Base directory for Android resources
BASE_DIR = "android/app/src/main/res"

def add_padding(img, target_size, padding_percent=15):
    """
    Add padding around the image to prevent cropping.

    Args:
        img: PIL Image object
        target_size: Target size (width, height) tuple
        padding_percent: Percentage of padding to add (default 15%)

    Returns:
        PIL Image with padding
    """
    # Calculate the size of the logo with padding
    logo_size = int(target_size[0] * (1 - padding_percent / 100))

    # Resize the logo to fit within the padded area
    img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Create a new transparent image with the target size
    padded_img = Image.new('RGBA', target_size, (255, 255, 255, 0))

    # Calculate position to center the logo
    x = (target_size[0] - img.width) // 2
    y = (target_size[1] - img.height) // 2

    # Paste the logo onto the padded image
    padded_img.paste(img, (x, y), img)

    return padded_img

def generate_icons():
    """Generate all required Android icon sizes."""
    print(f"Loading source icon: {SOURCE_ICON}")

    # Load source image
    source_img = Image.open(SOURCE_ICON)
    print(f"Source image size: {source_img.size}")

    # Convert to RGBA if needed
    if source_img.mode != 'RGBA':
        source_img = source_img.convert('RGBA')

    # Generate standard launcher icons
    print("\nGenerating launcher icons with 15% padding...")
    for folder, size in ICON_SIZES.items():
        output_dir = os.path.join(BASE_DIR, folder)
        os.makedirs(output_dir, exist_ok=True)

        # Create icon with padding
        icon_with_padding = add_padding(source_img.copy(), (size, size), padding_percent=15)

        # Save as PNG (replacing .webp)
        output_path = os.path.join(output_dir, "ic_launcher.png")
        icon_with_padding.save(output_path, "PNG", optimize=True)
        print(f"  ✓ {folder}/ic_launcher.png ({size}x{size})")

        # Also save round icon
        output_path_round = os.path.join(output_dir, "ic_launcher_round.png")
        icon_with_padding.save(output_path_round, "PNG", optimize=True)
        print(f"  ✓ {folder}/ic_launcher_round.png ({size}x{size})")
    
    # Generate foreground icons for adaptive icons
    # Adaptive icons need more padding (safe zone is 72dp out of 108dp)
    print("\nGenerating adaptive icon foregrounds with 20% padding...")
    for folder, size in FOREGROUND_SIZES.items():
        output_dir = os.path.join(BASE_DIR, folder)
        os.makedirs(output_dir, exist_ok=True)

        # Create foreground with more padding for adaptive icons
        foreground_with_padding = add_padding(source_img.copy(), (size, size), padding_percent=20)

        # Save as PNG
        output_path = os.path.join(output_dir, "ic_launcher_foreground.png")
        foreground_with_padding.save(output_path, "PNG", optimize=True)
        print(f"  ✓ {folder}/ic_launcher_foreground.png ({size}x{size})")
    
    print("\n✅ All icons generated successfully!")
    print("\nNext steps:")
    print("1. Remove old .webp files if needed")
    print("2. Update ic_launcher.xml to use PNG instead of webp")
    print("3. Rebuild the app")

if __name__ == "__main__":
    generate_icons()

