document.addEventListener('DOMContentLoaded', function () {
    if (window.State && window.State.isLoaded) {
        renderFacultyStatusPage();
    } else {
        document.addEventListener('appStateLoaded', renderFacultyStatusPage);
    }
});
