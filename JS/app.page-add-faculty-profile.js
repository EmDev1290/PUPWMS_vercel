document.addEventListener('DOMContentLoaded', function () {
    const initializePage = () => {
        updateClassificationRankSelect();
        if (typeof populateNewFacultyPreferredDropdowns === 'function') {
            populateNewFacultyPreferredDropdowns();
        }
    };

    if (window.State && window.State.isLoaded) {
        initializePage();
    } else {
        document.addEventListener('appStateLoaded', initializePage);
    }
});
