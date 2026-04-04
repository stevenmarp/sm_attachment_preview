/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { BinaryField } from "@web/views/fields/binary/binary_field";
import { Many2ManyBinaryField } from "@web/views/fields/many2many_binary/many2many_binary_field";
import { onMounted, onPatched } from "@odoo/owl";
import { showExcelPreviewModal } from "./report_preview";

/**
 * SM Preview Attachment - Preview Button for Binary Fields
 * Version 2.0.0
 * 
 * Adds a Preview button next to Binary fields and Many2Many attachment fields.
 * Note: Chatter preview is already built-in in Odoo 18 Enterprise.
 * 
 * Supports: Images, PDF, Office documents (via external viewers)
 */

// Preview types configuration
const PREVIEW_EXTENSIONS = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'],
    pdf: ['pdf'],
    video: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
    text: ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'log'],
    word: ['doc', 'docx', 'odt', 'rtf'],
    excel: ['xls', 'xlsx', 'ods'],
    powerpoint: ['ppt', 'pptx', 'odp'],
};

function getFileExtension(filename) {
    if (!filename) return '';
    return filename.split('.').pop().toLowerCase();
}

function getPreviewType(filename, mimetype) {
    const ext = getFileExtension(filename);
    
    for (const [type, extensions] of Object.entries(PREVIEW_EXTENSIONS)) {
        if (extensions.includes(ext)) {
            return type;
        }
    }
    
    if (mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype === 'application/pdf') return 'pdf';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('text/')) return 'text';
        if (mimetype.includes('word') || mimetype.includes('document')) return 'word';
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'excel';
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'powerpoint';
    }
    
    return 'other';
}

function canPreview(filename, mimetype) {
    return getPreviewType(filename, mimetype) !== 'other';
}

function isOfficeDoc(previewType) {
    return ['word', 'excel', 'powerpoint'].includes(previewType);
}

function getOfficeOnlineUrl(fileUrl) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function getGoogleDocsUrl(fileUrl) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

// Create and show preview modal
function showPreviewModal(previewType, contentUrl, fileName, downloadUrl, isOffice) {
    // Remove existing modals
    document.querySelectorAll('.sm-preview-modal-backdrop, .sm-preview-modal').forEach(el => el.remove());
    
    const backdrop = document.createElement('div');
    backdrop.className = 'sm-preview-modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'sm-preview-modal';
    
    // For Office docs on localhost, show a message that external preview isn't available
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let modalContent = '';
    
    if (isOffice && isLocalhost) {
        // Office docs on localhost - show download option directly
        const iconClass = previewType === 'word' ? 'fa-file-word-o text-primary' :
                         previewType === 'excel' ? 'fa-file-excel-o text-success' :
                         'fa-file-powerpoint-o text-danger';
        
        modalContent = `
            <div class="sm-preview-modal-header">
                <span class="sm-preview-modal-title">${fileName || 'Preview'}</span>
                <div class="sm-preview-modal-actions">
                    <button class="btn btn-primary btn-sm me-2 sm-download-btn">
                        <i class="fa fa-download me-1"></i> Download
                    </button>
                    <button class="btn btn-secondary btn-sm sm-close-btn">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="sm-preview-modal-body d-flex align-items-center justify-content-center">
                <div class="text-center p-5">
                    <i class="fa ${iconClass} fa-5x mb-3"></i>
                    <h4>${fileName || 'Document'}</h4>
                    <p class="text-muted mb-3">
                        Office document preview requires a public URL.<br/>
                        On localhost, please download the file to view it.
                    </p>
                    <button class="btn btn-primary btn-lg sm-download-btn-main">
                        <i class="fa fa-download me-2"></i> Download File
                    </button>
                    <div class="mt-3">
                        <small class="text-muted">
                            <i class="fa fa-info-circle me-1"></i>
                            Tip: Upload to a server with public URL for online preview
                        </small>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Normal preview (images, PDF, videos) or Office docs with public URL
        const googleBtn = isOffice ? `
            <button class="btn btn-outline-secondary btn-sm me-2 sm-google-btn" title="Try Google Docs">
                <i class="fa fa-google me-1"></i> Google Docs
            </button>
        ` : '';
        
        // Use <img> for image types (more reliable than iframe)
        let bodyContent = '';
        if (previewType === 'image') {
            bodyContent = `
                <div class="sm-preview-loading">
                    <i class="fa fa-spinner fa-spin fa-3x"></i>
                    <p>Loading preview...</p>
                </div>
                <div class="sm-preview-image-viewer">
                    <img src="${contentUrl}" alt="${fileName || 'Preview'}" />
                </div>
            `;
        } else if (previewType === 'video') {
            bodyContent = `
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;">
                    <video controls autoplay style="max-width:100%;max-height:100%;">
                        <source src="${contentUrl}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else if (previewType === 'audio') {
            bodyContent = `
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    <audio controls autoplay>
                        <source src="${contentUrl}">
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            `;
        } else {
            // PDF, text, auto, etc. — use iframe
            bodyContent = `
                <div class="sm-preview-loading">
                    <i class="fa fa-spinner fa-spin fa-3x"></i>
                    <p>Loading preview...</p>
                </div>
                <iframe src="${contentUrl}" class="sm-preview-iframe" frameborder="0" allowfullscreen="true"></iframe>
            `;
        }
        
        modalContent = `
            <div class="sm-preview-modal-header">
                <span class="sm-preview-modal-title">${fileName || 'Preview'}</span>
                <div class="sm-preview-modal-actions">
                    ${googleBtn}
                    <button class="btn btn-primary btn-sm me-2 sm-download-btn">
                        <i class="fa fa-download me-1"></i> Download
                    </button>
                    <button class="btn btn-secondary btn-sm sm-close-btn">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="sm-preview-modal-body">
                ${bodyContent}
            </div>
        `;
    }
    
    modal.innerHTML = modalContent;
    
    // Close modal handler
    const closeModal = () => {
        backdrop.remove();
    };
    
    backdrop.addEventListener('click', (ev) => {
        // Only close when clicking the backdrop itself, not the modal content
        if (ev.target === backdrop) closeModal();
    });
    modal.querySelector('.sm-close-btn').addEventListener('click', closeModal);
    
    // ESC key to close
    const escHandler = (ev) => {
        if (ev.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Download handler
    modal.querySelector('.sm-download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Main download button for localhost Office docs
    const mainDownloadBtn = modal.querySelector('.sm-download-btn-main');
    if (mainDownloadBtn) {
        mainDownloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    
    // Google Docs fallback
    const googleEl = modal.querySelector('.sm-google-btn');
    if (googleEl) {
        googleEl.addEventListener('click', () => {
            const iframe = modal.querySelector('.sm-preview-iframe');
            const loading = modal.querySelector('.sm-preview-loading');
            loading.style.display = 'flex';
            const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : window.location.origin + downloadUrl;
            iframe.src = getGoogleDocsUrl(fullUrl);
        });
    }
    
    // Iframe events (only if iframe exists)
    const iframe = modal.querySelector('.sm-preview-iframe');
    const loading = modal.querySelector('.sm-preview-loading');
    
    if (iframe && loading) {
        iframe.addEventListener('load', () => {
            loading.style.display = 'none';
        });
        
        iframe.addEventListener('error', () => {
            loading.innerHTML = `
                <i class="fa fa-exclamation-triangle fa-3x text-warning"></i>
                <p>Unable to load preview</p>
                <button class="btn btn-primary mt-2 sm-download-fallback">
                    <i class="fa fa-download me-1"></i> Download Instead
                </button>
            `;
            const fallbackBtn = modal.querySelector('.sm-download-fallback');
            if (fallbackBtn) {
                fallbackBtn.addEventListener('click', () => {
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = fileName || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            }
        });
    }
    
    // Image load events
    const img = modal.querySelector('.sm-preview-image-viewer img');
    if (img && loading) {
        img.addEventListener('load', () => {
            loading.style.display = 'none';
        });
        img.addEventListener('error', () => {
            loading.innerHTML = `
                <i class="fa fa-exclamation-triangle fa-3x text-warning"></i>
                <p>Unable to load image</p>
                <button class="btn btn-primary mt-2 sm-download-fallback">
                    <i class="fa fa-download me-1"></i> Download Instead
                </button>
            `;
            const fallbackBtn = modal.querySelector('.sm-download-fallback');
            if (fallbackBtn) {
                fallbackBtn.addEventListener('click', () => {
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = fileName || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            }
        });
    }
    
    document.body.appendChild(backdrop);
    backdrop.appendChild(modal);
}

// ============================================================================
// Patch BinaryField - Add Preview Button
// ============================================================================
patch(BinaryField.prototype, {
    setup() {
        super.setup(...arguments);

        onMounted(() => this._smEnsurePreviewButton());
        onPatched(() => this._smEnsurePreviewButton());
    },

    /**
     * Traverse OWL2 bdom tree to find the first real DOM element.
     */
    _smFindRootEl() {
        const bdom = this.__owl__?.bdom;
        if (!bdom) return null;
        return this._smWalkBdom(bdom);
    },

    _smWalkBdom(node) {
        if (!node) return null;
        if (node.el && node.el.nodeType === 1) return node.el;
        if (node.el && node.el.nodeType === 3 && node.el.parentElement) return node.el.parentElement;
        const childResult = this._smWalkBdom(node.child);
        if (childResult) return childResult;
        if (node.children) {
            for (const c of node.children) {
                const result = this._smWalkBdom(c);
                if (result) return result;
            }
        }
        if (node.component?.__owl__?.bdom) {
            return this._smWalkBdom(node.component.__owl__.bdom);
        }
        return null;
    },

    /**
     * Fallback: Dynamically inject preview button via DOM when the XML template
     * extension doesn't apply (e.g. widgets using t-inherit-mode="primary"
     * like work_permit_upload).
     */
    _smEnsurePreviewButton() {
        const rootEl = this._smFindRootEl();
        if (!rootEl) return;

        const container = rootEl.closest?.('.o_field_widget') || rootEl.parentElement;
        if (!container) return;

        // Remove previously JS-injected buttons
        container.querySelectorAll('.o_preview_file_button_js').forEach(b => b.remove());

        // If XML patch already added a button, nothing to do
        if (container.querySelector('.o_preview_file_button:not(.o_preview_file_button_js)')) return;

        if (!this.smCanPreview) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-link btn-sm lh-1 fa fa-eye o_preview_file_button o_preview_file_button_js text-primary';
        btn.title = 'Preview';
        btn.type = 'button';
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.smOpenPreview(ev);
        });

        // Place after download button
        const downloadBtn = container.querySelector('.o_download_file_button');
        if (downloadBtn) { downloadBtn.after(btn); return; }

        // Place before form URI (readonly mode)
        const formUri = container.querySelector('.o_form_uri');
        if (formUri) { formUri.before(btn); return; }

        // Place before pencil/edit button (edit mode, dirty record)
        const editBtn = container.querySelector('.o_select_file_button');
        if (editBtn) { editBtn.before(btn); return; }

        // Place before trash/clear button
        const clearBtn = container.querySelector('.o_clear_file_button');
        if (clearBtn) { clearBtn.before(btn); return; }
    },

    get smCanPreview() {
        const hasData = this.props.record.data[this.props.name];
        const hasResId = this.props.record.resId;
        const isDirty = this.props.record.dirty;
        // Always show preview when there's data + saved record, even without known extension
        return !!(hasData && hasResId && !isDirty);
    },

    get smPreviewType() {
        return getPreviewType(this.fileName);
    },

    get smIsOfficeDoc() {
        return isOfficeDoc(this.smPreviewType);
    },

    get smPreviewUrl() {
        const { record, name } = this.props;
        if (record.resId) {
            return `/web/content?model=${record.resModel}&id=${record.resId}&field=${name}&download=false`;
        }
        return '';
    },

    get smDownloadUrl() {
        const { record, name } = this.props;
        if (record.resId) {
            return `/web/content?model=${record.resModel}&id=${record.resId}&field=${name}&download=true`;
        }
        return '';
    },

    smOpenPreview(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        
        let previewType = this.smPreviewType;
        let contentUrl = this.smPreviewUrl;
        const downloadUrl = this.smDownloadUrl;
        const fileName = this.fileName;
        const isOffice = this.smIsOfficeDoc;
        
        // Excel files — use SheetJS client-side rendering
        if (previewType === 'excel' || isOffice) {
            if (previewType === 'excel') {
                showExcelPreviewModal(contentUrl, fileName, downloadUrl);
                return;
            }
            const baseUrl = window.location.origin;
            const fileUrl = `${baseUrl}${downloadUrl}`;
            contentUrl = getOfficeOnlineUrl(fileUrl);
            showPreviewModal(previewType, contentUrl, fileName, downloadUrl, true);
            return;
        }
        
        // For unknown file types, detect content-type first
        if (previewType === 'other') {
            fetch(contentUrl, { method: 'HEAD' }).then(resp => {
                const mime = resp.headers.get('Content-Type') || '';
                const detectedType = getPreviewType(fileName, mime);
                
                if (detectedType === 'other') {
                    // Still unknown — try iframe, browser might handle it
                    showPreviewModal('auto', contentUrl, fileName, downloadUrl, false);
                } else if (detectedType === 'excel') {
                    // Excel — use SheetJS client-side rendering
                    showExcelPreviewModal(contentUrl, fileName, downloadUrl);
                } else if (isOfficeDoc(detectedType)) {
                    const baseUrl = window.location.origin;
                    const fileUrl = `${baseUrl}${downloadUrl}`;
                    showPreviewModal(detectedType, getOfficeOnlineUrl(fileUrl), fileName, downloadUrl, true);
                } else {
                    showPreviewModal(detectedType, contentUrl, fileName, downloadUrl, false);
                }
            }).catch(() => {
                // Fallback: just try iframe
                showPreviewModal('auto', contentUrl, fileName, downloadUrl, false);
            });
            return;
        }
        
        showPreviewModal(
            previewType,
            contentUrl,
            fileName,
            downloadUrl,
            false
        );
    },
});

// ============================================================================
// Patch Many2ManyBinaryField - Add Preview Button for Attachment Fields
// ============================================================================
patch(Many2ManyBinaryField.prototype, {
    
    // Check if a file can be previewed
    smCanPreviewFile(file) {
        if (!file || !file.name) return false;
        return canPreview(file.name, file.mimetype);
    },
    
    // Get preview type for a file
    smGetPreviewType(file) {
        return getPreviewType(file.name, file.mimetype);
    },
    
    // Open preview for an attachment
    smOpenAttachmentPreview(ev, file) {
        ev.preventDefault();
        ev.stopPropagation();
        
        const previewType = this.smGetPreviewType(file);
        const isOffice = isOfficeDoc(previewType);
        
        const downloadUrl = `/web/content/${file.id}?download=true`;
        let contentUrl = `/web/content/${file.id}?download=false`;
        
        // Excel — use SheetJS client-side rendering
        if (previewType === 'excel') {
            showExcelPreviewModal(contentUrl, file.name, downloadUrl);
            return;
        }
        
        if (isOffice) {
            const baseUrl = window.location.origin;
            const fileUrl = `${baseUrl}${downloadUrl}`;
            contentUrl = getOfficeOnlineUrl(fileUrl);
        }
        
        showPreviewModal(
            previewType,
            contentUrl,
            file.name,
            downloadUrl,
            isOffice
        );
    },
});

// Export utilities
export { getPreviewType, canPreview, isOfficeDoc, PREVIEW_EXTENSIONS, showPreviewModal };
