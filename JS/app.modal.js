// MODIFIED IN JS/app.modal.js: CENTERED MODAL CONTEXT ROOT
function ensureModalRoot() {
    if (document.getElementById('global-modal-root')) return;
    const root = document.createElement('div');
    root.id = 'global-modal-root';
    // Added 'flex justify-center items-center' to perfectly center the modal on both axes
    root.className = 'fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/40 p-4 transition-all duration-300';
    root.innerHTML = `<div id="global-modal-panel" class="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden transform transition-all duration-300 scale-95 opacity-0"></div>`;
    document.body.appendChild(root);
}

function openModal({ title, body, submitLabel = 'Save', cancelLabel = 'Cancel', onSubmit, onCancel }) {
    ensureModalRoot();
    const root = document.getElementById('global-modal-root');
    const panel = document.getElementById('global-modal-panel');
    if (!root || !panel) return;
    
    panel.innerHTML = `
        <div class="border-b border-slate-200 p-5 flex items-center justify-between">
            <div>
                <h3 class="text-xl font-bold text-slate-900">${title}</h3>
            </div>
            <button id="global-modal-close" class="text-slate-400 hover:text-slate-900" type="button"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[calc(85vh-170px)]">${body}</div>
        <div class="flex items-center justify-between border-t border-slate-200 p-5">
            <button id="global-modal-cancel" class="px-4 py-2 rounded-2xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-100" type="button">${cancelLabel}</button>
            ${(submitLabel && submitLabel !== 'null') ? `<button id="global-modal-submit" class="px-4 py-2 rounded-2xl bg-[#7f0000] text-white text-sm font-bold hover:bg-[#660000]" type="button">${submitLabel}</button>` : '<div></div>'}
        </div>
    `;
    
    // Smooth transitions toggle block
    root.classList.remove('hidden');
    root.classList.add('flex');
    
    // Delay entry animation classes by a tiny micro-tick to avoid collision triggers
    setTimeout(() => {
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
    }, 10);

    document.getElementById('global-modal-close').onclick = closeModal;
    document.getElementById('global-modal-cancel').onclick = () => {
        if (onCancel) onCancel();
        else closeModal();
    };
    const submitBtn = document.getElementById('global-modal-submit');
    if (submitBtn) {
        submitBtn.onclick = () => {
            onSubmit?.();
        };
    }
    document.addEventListener('keydown', handleModalKeydown);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Clean transition toggle wrapper for closing
function closeModal() {
    const root = document.getElementById('global-modal-root');
    const panel = document.getElementById('global-modal-panel');
    if (!root || !panel) return;
    
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        root.classList.remove('flex');
        root.classList.add('hidden');
        panel.innerHTML = '';
    }, 150);
    
    document.removeEventListener('keydown', handleModalKeydown);
}