document.addEventListener('DOMContentLoaded', function () {
    if (window.State && window.State.isLoaded) {
        renderDashboard();
    } else {
        document.addEventListener('appStateLoaded', renderDashboard);
    }

    document.addEventListener('academicYearChanged', renderDashboard);
});


