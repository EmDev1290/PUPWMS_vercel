document.addEventListener('DOMContentLoaded', function () {
    const renderAnalyticsPage = () => {
        if (typeof renderDashboard === 'function') {
            renderDashboard();
        } else if (typeof renderDashboardAnalyticsCharts === 'function') {
            renderDashboardAnalyticsCharts();
        }
    };

    if (window.State && window.State.isLoaded) {
        renderAnalyticsPage();
    } else {
        document.addEventListener('appStateLoaded', renderAnalyticsPage, { once: true });
    }

    document.addEventListener('academicYearChanged', renderAnalyticsPage);
});
