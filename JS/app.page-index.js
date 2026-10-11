// Page-specific initialization for the login page.
document.addEventListener('DOMContentLoaded', function () {
    const forgotPasswordButton = document.getElementById('forgot-password-button');
    if (forgotPasswordButton && typeof openForgotPasswordModal === 'function') {
        forgotPasswordButton.addEventListener('click', openForgotPasswordModal);
    }
    if (typeof renderLoginLockState === 'function') {
        renderLoginLockState();
    }
});
