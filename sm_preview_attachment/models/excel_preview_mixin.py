# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import UserError
import base64
import logging

_logger = logging.getLogger(__name__)


class SmExcelPreviewMixin(models.AbstractModel):
    """
    Mixin untuk wizard Excel report dengan fitur Preview + Download.
    
    Cara pakai:
    -----------
    1. Inherit mixin ini di wizard:
       _inherit = ['sm.excel.preview.mixin']
    
    2. Implement method _generate_excel_data() yang return:
       - BytesIO object berisi Excel file
       - atau base64 encoded string
    
    3. Implement property _excel_filename untuk nama file
    
    4. Di view wizard, tambahkan 2 button:
       <button name="action_preview_excel" type="object" string="Preview" class="btn-secondary"/>
       <button name="action_download_excel" type="object" string="Download" class="btn-primary"/>
    
    Contoh:
    -------
    class MyReportWizard(models.TransientModel):
        _name = 'my.report.wizard'
        _inherit = ['sm.excel.preview.mixin']
        
        @property
        def _excel_filename(self):
            return f'My Report {fields.Date.today()}.xlsx'
        
        def _generate_excel_data(self):
            output = BytesIO()
            workbook = xlsxwriter.Workbook(output, {'in_memory': True})
            # ... generate excel ...
            workbook.close()
            output.seek(0)
            return output
    """
    _name = 'sm.excel.preview.mixin'
    _description = 'Excel Preview Mixin'

    # Field untuk store attachment sementara
    sm_preview_attachment_id = fields.Many2one(
        'ir.attachment', 
        string='Preview Attachment',
        ondelete='cascade'
    )

    @property
    def _excel_filename(self):
        """Override this to set custom filename"""
        return f'Report_{self.id}.xlsx'

    def _generate_excel_data(self):
        """
        Override this method to generate Excel file.
        
        Returns:
            BytesIO object or base64 encoded string of Excel file
        """
        raise NotImplementedError(
            "Wizard harus implement method _generate_excel_data() "
            "yang return BytesIO atau base64 string"
        )

    def _create_excel_attachment(self):
        """
        Generate Excel dan create attachment.
        Returns attachment record.
        """
        try:
            excel_data = self._generate_excel_data()
            
            # Handle BytesIO atau bytes
            if hasattr(excel_data, 'read'):
                excel_data.seek(0)
                data_b64 = base64.b64encode(excel_data.read())
            elif isinstance(excel_data, bytes):
                data_b64 = base64.b64encode(excel_data)
            else:
                # Assume already base64 encoded
                data_b64 = excel_data

            # Create attachment
            attachment = self.env['ir.attachment'].create({
                'name': self._excel_filename,
                'datas': data_b64,
                'res_model': self._name,
                'res_id': self.id,
                'type': 'binary',
                'mimetype': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            # Store reference
            self.sm_preview_attachment_id = attachment.id
            
            return attachment

        except NotImplementedError:
            raise
        except Exception as e:
            _logger.error("Error generating Excel: %s", str(e))
            raise UserError(_("Error generating Excel file: %s") % str(e))

    def action_preview_excel(self):
        """
        Generate Excel dan return client action untuk preview.
        """
        attachment = self._create_excel_attachment()
        
        # Return client action untuk preview
        return {
            'type': 'ir.actions.client',
            'tag': 'sm_excel_preview',
            'name': self._excel_filename,
            'params': {
                'attachment_id': attachment.id,
                'filename': self._excel_filename,
                'preview_url': f'/web/content/{attachment.id}?download=false',
                'download_url': f'/web/content/{attachment.id}?download=true',
            }
        }

    def action_download_excel(self):
        """
        Generate Excel dan langsung download.
        """
        attachment = self._create_excel_attachment()
        
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }

    def action_preview_and_download_excel(self):
        """
        Buka modal dengan pilihan Preview atau Download.
        Untuk dipakai sebagai single button.
        """
        attachment = self._create_excel_attachment()
        
        return {
            'type': 'ir.actions.client',
            'tag': 'sm_excel_preview',
            'name': self._excel_filename,
            'params': {
                'attachment_id': attachment.id,
                'filename': self._excel_filename,
                'preview_url': f'/web/content/{attachment.id}?download=false',
                'download_url': f'/web/content/{attachment.id}?download=true',
            }
        }
