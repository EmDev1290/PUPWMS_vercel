document.addEventListener('DOMContentLoaded', function () {
    function init() {
        renderSYDropdown();
        renderTimetable();
    }
    if (window.State && window.State.isLoaded) {
        init();
    } else {
        document.addEventListener('appStateLoaded', init);
    }
});
