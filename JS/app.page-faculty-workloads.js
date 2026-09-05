document.addEventListener('DOMContentLoaded', function () {
    function init() {
        renderSYDropdown();
        updateFacultyWorkloadDropdown();
        renderFacultyCalendar();
    }
    if (window.State && window.State.isLoaded) {
        init();
    } else {
        document.addEventListener('appStateLoaded', init);
    }
});
