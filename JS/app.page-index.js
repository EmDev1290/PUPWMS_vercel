// Page-specific initialization for the login page.
document.addEventListener('DOMContentLoaded', function () {
    const forgotPasswordButton = document.getElementById('forgot-password-button');
    if (forgotPasswordButton && typeof openForgotPasswordModal === 'function') {
        forgotPasswordButton.addEventListener('click', openForgotPasswordModal);
    }
    if (typeof renderLoginLockState === 'function') {
        renderLoginLockState();
    }

    initSlideshow();

    // Allow pressing Enter key on either username or password
    ['login-user', 'login-pass'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (typeof attemptLogin === 'function') {
                        attemptLogin();
                    }
                }
            });
        }
    });
});

function initSlideshow() {
    const slides = document.querySelectorAll('.slideshow-slide');
    if (!slides || slides.length <= 1) return;

    let currentIndex = 0;
    const slideDuration = 4500; // Change photo every 4.5 seconds

    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, slideDuration);
}
