# -*- coding: utf-8 -*-
{
    'name': 'Preview Attachment : Images, PDFs, Office docs, Excel Reports',
    'version': '18.0.5.0.0',
    'category': 'Tools',
    'summary': 'Preview Binary fields, attachments, PDF reports & Excel wizard reports before download',
    'description': '''
        SM Preview Attachment
        =====================
        
        Add preview buttons to Binary fields, Many2Many attachment fields, PDF reports,
        and Excel wizard reports. Preview images, PDFs, Office documents, videos, and more
        directly in Odoo without downloading files.
        
        Key Features:
        -------------
        - Preview button on Binary fields (form & list view)
        - Preview button on Many2Many attachment fields  
        - Preview PDF reports/printouts before download
        - **NEW: Excel Preview Mixin for Wizard Reports**
        - Modal preview with download option
        - Print directly from preview modal
        - Office document preview via Office Online / Google Docs
        - Keyboard shortcut (ESC to close)
        
        Excel Preview Mixin:
        --------------------
        Easy-to-use mixin for wizard Excel reports. Just inherit the mixin
        and implement 2 methods to get Preview + Download buttons!
        
        Usage:
            class MyWizard(models.TransientModel):
                _name = 'my.wizard'
                _inherit = ['sm.excel.preview.mixin']
                
                @property
                def _excel_filename(self):
                    return 'my_report.xlsx'
                
                def _generate_excel_data(self):
                    # Return BytesIO with Excel data
                    return output
        
        Compatibility:
        - Odoo 18.0 Community & Enterprise
        - Uses OWL 2 component system
    ''',
    'author': 'Steven Marp',
    'website': 'https://apps.odoo.com/apps/browse?repo_maintainer_id=512936',
    'license': 'LGPL-3',
    'depends': ['web'],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'sm_preview_attachment/static/src/css/preview.css',
            'sm_preview_attachment/static/src/js/attachment_preview.js',
            'sm_preview_attachment/static/src/js/report_preview.js',
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
