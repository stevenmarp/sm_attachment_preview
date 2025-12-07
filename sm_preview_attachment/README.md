# SM Preview Attachment

**Version 2.0.0** | Odoo 17.0 | LGPL-3

Preview Binary Fields & Attachments directly in Odoo 17 without downloading files.

## 🚀 Key Features

### Preview Button on Binary Fields
- One-click preview button appears next to Binary fields with files
- Works in both form view and list view
- Supports images, PDFs, Office documents, videos, and more

### Attachment Field Support  
- Preview attachments from Many2Many Binary fields
- Common use cases: employee documents, product attachments, etc.

### Modal Preview
- Clean fullscreen modal viewer
- Download button in header
- Press ESC to close quickly

### Office Document Support
- Preview Word, Excel, PowerPoint files
- Uses Office Online viewer for public URLs
- Google Docs Viewer fallback for private instances

## 📋 Supported Formats

| Type | Extensions | Preview Method |
|------|------------|----------------|
| **Images** | PNG, JPG, JPEG, GIF, BMP, SVG, WEBP | Native browser |
| **PDF** | PDF | Browser PDF viewer |
| **Word** | DOC, DOCX, ODT | Office Online / Google Docs |
| **Excel** | XLS, XLSX, ODS | Office Online / Google Docs |
| **PowerPoint** | PPT, PPTX, ODP | Office Online / Google Docs |
| **Video** | MP4, WEBM, OGG | HTML5 video player |
| **Audio** | MP3, WAV, OGG, M4A | HTML5 audio player |
| **Text** | TXT, CSV, JSON, XML, HTML | Text viewer |

## 📥 Installation

1. Download and copy `sm_preview_attachment` folder to your Odoo addons directory
2. Update Apps List (requires developer mode)
3. Search and install "SM Preview Attachment"
4. Hard refresh browser (Ctrl+Shift+R) to load new assets

## ⚙️ Technical Details

### Dependencies
- `web` (Odoo base web module)

### OWL Components Patched
- `BinaryField` - Adds preview button for single file Binary fields
- `Many2ManyBinaryField` - Adds preview buttons for attachment list fields

### Compatibility
- ✅ Odoo 17.0 Community Edition
- ✅ Odoo 17.0 Enterprise Edition

## ⚠️ Office Preview Note

For Office documents (Word, Excel, PowerPoint):
- **Public URLs**: Uses Office Online viewer (view.officeapps.live.com)
- **Private/Localhost**: Shows download modal with Google Docs Viewer option

## 📁 Module Structure

```
sm_preview_attachment/
├── __init__.py
├── __manifest__.py
├── README.md
├── static/
│   ├── description/
│   │   ├── icon.png
│   │   └── index.html
│   └── src/
│       ├── css/
│       │   └── preview.css
│       ├── js/
│       │   └── attachment_preview.js
│       └── xml/
│           └── attachment_preview.xml
```

## 👤 Author

**Steven Marpati**

## 📄 License

LGPL-3
