document.addEventListener('DOMContentLoaded', function () {
    function init() {
        populateFacultyProfileDropdown();
        displaySelectedFacultyProfile();
    }
    if (window.State && window.State.isLoaded) {
        init();
    } else {
        document.addEventListener('appStateLoaded', init);
    }
});
