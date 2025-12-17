/** @odoo-module **/

import { registry } from "@web/core/registry";
import { patch } from "@web/core/utils/patch";

/**
 * SM Report Preview - Preview PDF & Excel Reports Before Download
 * 
 * Intercepts report generation and shows preview modal instead of direct download.
 * User can then choose to download or print from the preview.
 * 
 * Supports:
 * - PDF reports (native iframe preview)
 * - Excel reports from ir.actions.report (qweb-xlsx)
 * - Excel downloads from ir.actions.act_url (wizard generated)
 */

// Load SheetJS library dynamically for Excel preview
let sheetJSLoaded = false;
let sheetJSLoading = false;

async function loadSheetJS() {
    if (sheetJSLoaded || window.XLSX) {
        sheetJSLoaded = true;
        return true;
    }
    
    if (sheetJSLoading) {
        // Wait for existing load
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (sheetJSLoaded || window.XLSX) {
                    clearInterval(checkInterval);
                    sheetJSLoaded = true;
                    resolve(true);
                }
            }, 100);
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(false);
            }, 10000);
        });
    }
    
    sheetJSLoading = true;
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = () => {
            sheetJSLoaded = true;
            sheetJSLoading = false;
            console.log('[SM Preview] SheetJS loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            sheetJSLoading = false;
            console.warn('[SM Preview] Could not load SheetJS library');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

// ============================================================================
// PDF Report Preview Modal
// ============================================================================

function showReportPreviewModal(reportUrl, reportName, downloadUrl) {
    // Remove existing modals
    document.querySelectorAll('.sm-report-preview-backdrop, .sm-report-preview-modal').forEach(el => el.remove());
    
    const backdrop = document.createElement('div');
    backdrop.className = 'sm-report-preview-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'sm-report-preview-modal';
    
    modal.innerHTML = `
        <div class="sm-report-preview-header">
            <span class="sm-report-preview-title">
                <i class="fa fa-file-pdf-o text-danger me-2"></i>
                ${reportName || 'Report Preview'}
            </span>
            <div class="sm-report-preview-actions">
                <button class="btn btn-outline-secondary btn-sm me-2 sm-print-btn" title="Print">
                    <i class="fa fa-print me-1"></i> Print
                </button>
                <button class="btn btn-primary btn-sm me-2 sm-download-btn" title="Download">
                    <i class="fa fa-download me-1"></i> Download
                </button>
                <button class="btn btn-secondary btn-sm sm-close-btn" title="Close (ESC)">
                    <i class="fa fa-times"></i>
                </button>
            </div>
        </div>
        <div class="sm-report-preview-body">
            <div class="sm-report-loading">
                <i class="fa fa-spinner fa-spin fa-3x"></i>
                <p>Loading report preview...</p>
            </div>
            <iframe src="${reportUrl}" class="sm-report-iframe" frameborder="0"></iframe>
        </div>
    `;
    
    // Close modal handler
    const closeModal = () => {
        backdrop.remove();
        modal.remove();
        document.removeEventListener('keydown', escHandler);
    };
    
    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escHandler);
    
    backdrop.addEventListener('click', closeModal);
    modal.querySelector('.sm-close-btn').addEventListener('click', closeModal);
    
    // Download handler
    modal.querySelector('.sm-download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = (reportName || 'report') + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Print handler
    modal.querySelector('.sm-print-btn').addEventListener('click', () => {
        const iframe = modal.querySelector('.sm-report-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        }
    });
    
    // Iframe load/error events
    const iframe = modal.querySelector('.sm-report-iframe');
    const loading = modal.querySelector('.sm-report-loading');
    
    iframe.addEventListener('load', () => {
        loading.style.display = 'none';
    });
    
    iframe.addEventListener('error', () => {
        loading.innerHTML = `
            <i class="fa fa-exclamation-triangle fa-3x text-warning"></i>
            <p>Unable to load report preview</p>
            <button class="btn btn-primary mt-2 sm-download-fallback">
                <i class="fa fa-download me-1"></i> Download Instead
            </button>
        `;
        const fallbackBtn = modal.querySelector('.sm-download-fallback');
        if (fallbackBtn) {
            fallbackBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = (reportName || 'report') + '.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    });
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    return { closeModal };
}

// ============================================================================
// Excel Report Preview Modal (using SheetJS)
// ============================================================================

async function showExcelPreviewModal(reportUrl, reportName, downloadUrl) {
    // Remove existing modals
    document.querySelectorAll('.sm-report-preview-backdrop, .sm-report-preview-modal').forEach(el => el.remove());
    
    const backdrop = document.createElement('div');
    backdrop.className = 'sm-report-preview-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'sm-report-preview-modal';
    
    modal.innerHTML = `
        <div class="sm-report-preview-header" style="background: linear-gradient(135deg, #1d6f42 0%, #217346 100%);">
            <span class="sm-report-preview-title">
                <i class="fa fa-file-excel-o me-2"></i>
                ${reportName || 'Excel Report Preview'}
            </span>
            <div class="sm-report-preview-actions">
                <select class="form-select form-select-sm me-2 sm-sheet-selector" style="width: auto; display: none;">
                </select>
                <button class="btn btn-outline-light btn-sm me-2 sm-download-btn" title="Download Excel">
                    <i class="fa fa-download me-1"></i> Download
                </button>
                <button class="btn btn-light btn-sm sm-close-btn" title="Close (ESC)">
                    <i class="fa fa-times"></i>
                </button>
            </div>
        </div>
        <div class="sm-report-preview-body">
            <div class="sm-report-loading">
                <i class="fa fa-spinner fa-spin fa-3x"></i>
                <p>Loading Excel preview...</p>
            </div>
            <div class="sm-excel-container" style="display: none; overflow: auto; padding: 15px; background: #f5f5f5;"></div>
        </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    const loading = modal.querySelector('.sm-report-loading');
    const excelContainer = modal.querySelector('.sm-excel-container');
    const sheetSelector = modal.querySelector('.sm-sheet-selector');
    
    // Close modal handler
    const closeModal = () => {
        backdrop.remove();
        modal.remove();
        document.removeEventListener('keydown', escHandler);
    };
    
    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', escHandler);
    
    backdrop.addEventListener('click', closeModal);
    modal.querySelector('.sm-close-btn').addEventListener('click', closeModal);
    
    // Download handler
    modal.querySelector('.sm-download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = (reportName || 'report') + '.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Load SheetJS
    const sheetJSReady = await loadSheetJS();
    
    if (!sheetJSReady) {
        loading.innerHTML = `
            <i class="fa fa-exclamation-triangle fa-3x text-warning"></i>
            <p>Could not load Excel preview library</p>
            <button class="btn btn-success mt-2 sm-download-fallback">
                <i class="fa fa-download me-1"></i> Download Excel File
            </button>
        `;
        modal.querySelector('.sm-download-fallback')?.addEventListener('click', () => {
            window.location.href = downloadUrl;
        });
        return { closeModal };
    }
    
    try {
        // Fetch the Excel file
        const response = await fetch(reportUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse with SheetJS
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        
        // Function to render a sheet
        const renderSheet = (sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const html = window.XLSX.utils.sheet_to_html(worksheet, { 
                id: 'sm-excel-table',
                editable: false 
            });
            
            // Style the table
            excelContainer.innerHTML = `
                <style>
                    #sm-excel-table {
                        border-collapse: collapse;
                        width: 100%;
                        background: white;
                        font-size: 13px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    #sm-excel-table th, #sm-excel-table td {
                        border: 1px solid #dee2e6;
                        padding: 8px 12px;
                        text-align: left;
                        white-space: nowrap;
                    }
                    #sm-excel-table th {
                        background: #217346;
                        color: white;
                        font-weight: 600;
                        position: sticky;
                        top: 0;
                    }
                    #sm-excel-table tr:nth-child(even) {
                        background: #f8f9fa;
                    }
                    #sm-excel-table tr:hover {
                        background: #e8f5e9;
                    }
                </style>
                ${html}
            `;
        };
        
        // Setup sheet selector if multiple sheets
        if (workbook.SheetNames.length > 1) {
            sheetSelector.style.display = 'inline-block';
            workbook.SheetNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                sheetSelector.appendChild(option);
            });
            
            sheetSelector.addEventListener('change', (e) => {
                renderSheet(e.target.value);
            });
        }
        
        // Render first sheet
        renderSheet(workbook.SheetNames[0]);
        
        loading.style.display = 'none';
        excelContainer.style.display = 'block';
        
    } catch (error) {
        console.error('[SM Preview] Excel preview error:', error);
        loading.innerHTML = `
            <i class="fa fa-exclamation-triangle fa-3x text-warning"></i>
            <p>Could not preview Excel file</p>
            <p class="text-muted small">${error.message || 'Unknown error'}</p>
            <button class="btn btn-success mt-2 sm-download-fallback">
                <i class="fa fa-download me-1"></i> Download Excel File
            </button>
        `;
        modal.querySelector('.sm-download-fallback')?.addEventListener('click', () => {
            window.location.href = downloadUrl;
        });
    }
    
    return { closeModal };
}

// ============================================================================
// Register Report Handlers
// ============================================================================

// Handler function for PDF report preview
async function smPreviewPdfReportHandler(action, options, env) {
    // Only intercept qweb-pdf reports
    if (action.report_type !== "qweb-pdf") {
        return false;
    }
    
    // Get report data
    const reportName = action.report_name;
    const context = action.context || {};
    const activeIds = context.active_ids || (context.active_id ? [context.active_id] : []);
    
    if (!activeIds.length) {
        return false;
    }
    
    // Build preview URL
    const previewUrl = `/report/pdf/${reportName}/${activeIds.join(',')}`;
    const downloadUrl = previewUrl;
    
    // Extract display name
    let displayName = action.name || action.display_name || reportName;
    displayName = displayName.replace(/_/g, ' ').replace(/\./g, ' - ');
    displayName = displayName + ' (PDF)';
    
    // Show preview modal
    showReportPreviewModal(previewUrl, displayName, downloadUrl);
    
    return true;
}

// Handler function for Excel report preview
async function smPreviewExcelReportHandler(action, options, env) {
    // Only intercept qweb-xlsx reports
    if (action.report_type !== "qweb-xlsx" && action.report_type !== "xlsx") {
        return false;
    }
    
    // Get report data
    const reportName = action.report_name;
    const context = action.context || {};
    const activeIds = context.active_ids || (context.active_id ? [context.active_id] : []);
    
    if (!activeIds.length) {
        return false;
    }
    
    // Build URL - for xlsx reports
    const reportUrl = `/report/xlsx/${reportName}/${activeIds.join(',')}`;
    const downloadUrl = reportUrl;
    
    // Extract display name
    let displayName = action.name || action.display_name || reportName;
    displayName = displayName.replace(/_/g, ' ').replace(/\./g, ' - ');
    displayName = displayName + ' (Excel)';
    
    // Show Excel preview modal
    await showExcelPreviewModal(reportUrl, displayName, downloadUrl);
    
    return true;
}

// Try to add handlers to registry for ir.actions.report
try {
    const reportHandlersRegistry = registry.category("ir.actions.report handlers");
    
    // Add PDF preview handler
    reportHandlersRegistry.add("sm_preview_pdf_report", smPreviewPdfReportHandler, { sequence: 10 });
    
    // Add Excel preview handler
    reportHandlersRegistry.add("sm_preview_excel_report", smPreviewExcelReportHandler, { sequence: 10 });
    
    console.log('[SM Preview] Report preview handlers registered successfully (PDF + Excel)');
} catch (e) {
    console.warn('[SM Preview] Could not register report handlers:', e.message);
}

// ============================================================================
// Intercept ir.actions.act_url for wizard Excel/PDF downloads
// ============================================================================

// Utility function to check if URL is previewable and show preview
async function checkAndPreviewDownload(url) {
    if (!url || !url.includes('/web/content/')) {
        return false;
    }
    
    // Only intercept download URLs
    if (!url.includes('download=true')) {
        return false;
    }
    
    try {
        // Do a HEAD request to check content type
        const headResponse = await fetch(url.replace('download=true', 'download=false'), { 
            method: 'HEAD',
            credentials: 'same-origin'
        });
        
        const contentType = headResponse.headers.get('content-type') || '';
        const contentDisposition = headResponse.headers.get('content-disposition') || '';
        
        // Extract filename
        let filename = 'download';
        const filenameMatch = contentDisposition.match(/filename[*]?=['"]?([^'";]+)['"]?/i);
        if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1].replace(/\+/g, ' '));
        }
        
        console.log('[SM Preview] Checking download:', { url, contentType, filename });
        
        // Check if it's Excel
        const isExcel = contentType.includes('spreadsheet') || 
                       contentType.includes('excel') ||
                       contentType.includes('openxmlformats-officedocument.spreadsheetml') ||
                       contentType.includes('vnd.ms-excel') ||
                       filename.toLowerCase().endsWith('.xlsx') ||
                       filename.toLowerCase().endsWith('.xls');
        
        // Check if it's PDF
        const isPdf = contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf');
        
        if (isExcel) {
            console.log('[SM Preview] Excel detected, showing preview');
            const previewUrl = url.replace('download=true', 'download=false');
            await showExcelPreviewModal(previewUrl, filename, url);
            return true;
        }
        
        if (isPdf) {
            console.log('[SM Preview] PDF detected, showing preview');
            const previewUrl = url.replace('download=true', 'download=false');
            showReportPreviewModal(previewUrl, filename, url);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.warn('[SM Preview] Error checking file type:', error);
        return false;
    }
}

console.log('[SM Preview] Report preview module loaded');

// ============================================================================
// Client Action: sm_excel_preview
// This handles the preview action from Python wizard mixin
// ============================================================================

async function smExcelPreviewAction(env, action) {
    const params = action.params || {};
    const previewUrl = params.preview_url;
    const downloadUrl = params.download_url;
    const filename = params.filename || 'Excel Report';
    
    console.log('[SM Preview] Client action triggered:', params);
    
    if (!previewUrl) {
        console.error('[SM Preview] No preview URL provided');
        return;
    }
    
    // Show Excel preview modal
    await showExcelPreviewModal(previewUrl, filename, downloadUrl);
}

// Register client action
registry.category("actions").add("sm_excel_preview", smExcelPreviewAction);

console.log('[SM Preview] Client action sm_excel_preview registered');

// Export for potential use elsewhere
export { showReportPreviewModal, showExcelPreviewModal, checkAndPreviewDownload };
