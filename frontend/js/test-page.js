
try {
    console.log('Testing initAutoCollectPage...');
    if (typeof initAutoCollectPage === 'function') {
        initAutoCollectPage();
        console.log('initAutoCollectPage() called successfully.');
    } else {
        console.error('initAutoCollectPage is not defined.');
    }
} catch (e) {
    console.error('Error during initAutoCollectPage a-test:', e);
}

try {
    console.log('Testing initDatabaseViewsPage...');
    if (typeof initDatabaseViewsPage === 'function') {
        initDatabaseViewsPage();
        console.log('initDatabaseViewsPage() called successfully.');
    } else {
        console.error('initDatabaseViewsPage is not defined.');
    }
} catch (e) {
    console.error('Error during initDatabaseViewsPage test:', e);
}
