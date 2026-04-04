# -*- coding: utf-8 -*-
{
    'name': 'Preview Attachment : Images, PDFs, Office docs, videos, etc.',
    'version': '17.0.5.0.0',
    'category': 'Tools',
    'summary': 'Preview button for Binary fields and attachment fields in form/list views',
    'description': '''
        SM Preview Attachment
        =====================
        
        Add preview buttons to Binary fields and Many2Many attachment fields.
        Preview images, PDFs, Office documents (Word, Excel, PowerPoint), videos, and more
        directly in Odoo without downloading files.
        
        Key Features:
        - Preview button on Binary fields (form & list view)
        - Preview button on Many2Many attachment fields  
        - Modal preview with download option
        - Office document preview via Office Online / Google Docs
        - Keyboard shortcut (ESC to close)
        
        Compatibility:
        - Odoo 17.0 Community & Enterprise
        - Uses OWL 2 component system
    ''',
    'author': 'Steven Marp',
    'website': 'https://apps.odoo.com/apps/browse?repo_maintainer_id=512936',
    'license': 'LGPL-3',
    'depends': ['web'],  # Only web dependency needed
    'data': [],
    'assets': {
        'web.assets_backend': [
            'sm_preview_attachment/static/src/css/preview.css',
            'sm_preview_attachment/static/src/js/attachment_preview.js',
            'sm_preview_attachment/static/src/xml/attachment_preview.xml',
        ],
    },
    'images': ['static/description/banner.gif'],
    'installable': True,
    'auto_install': False,
    'application': False,
    'price': 69.99,
    'currency': 'USD',
}
