// Page-specific initialization for the login page.
document.addEventListener('DOMContentLoaded', function () {
    if (typeof renderLoginLockState === 'function') {
        renderLoginLockState();
    }
});
