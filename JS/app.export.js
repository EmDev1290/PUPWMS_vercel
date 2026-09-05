/**
 * app.export.js - PUP PQ Workload Export Module
 * Uses SheetJS (xlsx) loaded via CDN
 */

function generateExportFilename(program, sy, semester) {
    const semLabel = semester === '2' ? '2ndSem' : semester === '3' ? 'Summer' : '1stSem';
    const ayLabel = (sy || 'AY').replace(/A\.Y\.\s*/, 'AY').replace(/\s/g, '');
    const progLabel = program === 'All Programs' ? 'All_Programs' : (program || 'Program').replace(/\s+/g, '_');
    return progLabel + '_Schedule_' + ayLabel + '_' + semLabel + '.xlsx';
}

function semesterLabelStr(semVal) {
    if (semVal === '2') return '2nd Semester';
    if (semVal === '3') return 'Summer Term';
    return '1st Semester';
}

function exportSchedule(mode, filters) {
    if (typeof XLSX === 'undefined') {
        showBanner('Export library not loaded. Please refresh the page.', 'error');
        return;
    }
    const sy = (filters && filters.sy) || (document.getElementById('sy-selector') ? document.getElementById('sy-selector').value : '') || (State.db.schoolYears && State.db.schoolYears[0]) || '';
    const semVal = (filters && filters.semester) || '1';
    var programsToExport = [];
    if (mode === 'all') {
        programsToExport = Object.keys(State.db.programs || {});
        if (!programsToExport.length) { showBanner('No programs found.', 'error'); return; }
    } else {
        programsToExport = [State.activeProgram];
        if (!State.activeProgram) { showBanner('No active program selected.', 'error'); return; }
    }
    var wb = XLSX.utils.book_new();
    programsToExport.forEach(function(prog) {
        var loads = (State.db.loads || []).filter(function(l) { return l.program === prog && l.sy === sy; });
        var wsData = [
            [prog + ' — Faculty Schedule'],
            ['Academic Year: ' + sy + '   |   Semester: ' + semesterLabelStr(semVal)],
            [],
            ['#','Professor','Subject','Units','Load Type','Section','Room','Building','Day','Time']
        ];
        loads.forEach(function(l, i) {
            wsData.push([i+1, l.prof||'', l.sub||'', l.units||0, l.loadType||'Regular Load', l.sec||'', l.room||'', l.building||'', l.day||'', l.time||'']);
        });
        var facultyMap = {};
        loads.forEach(function(l) {
            if (!facultyMap[l.prof]) facultyMap[l.prof] = {total:0, regular:0, partTime:0, substitute:0};
            facultyMap[l.prof].total += l.units || 0;
            if (l.loadType === 'Regular Load') facultyMap[l.prof].regular += l.units || 0;
            else if (l.loadType === 'Part-Time Load') facultyMap[l.prof].partTime += l.units || 0;
            else facultyMap[l.prof].substitute += l.units || 0;
        });
        wsData.push([], ['Faculty Load Summary'], ['Professor','Regular','Part-Time','Substitute','Total']);
        Object.keys(facultyMap).forEach(function(name) {
            var t = facultyMap[name];
            wsData.push([name, t.regular, t.partTime, t.substitute, t.total]);
        });
        var ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{wch:5},{wch:30},{wch:40},{wch:8},{wch:22},{wch:12},{wch:18},{wch:18},{wch:12},{wch:22}];
        ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}}];
        var sheetName = prog.substring(0,30).replace(/[\\\/\?\*\[\]:]/g,'_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    var filename = generateExportFilename(mode === 'all' ? 'All Programs' : State.activeProgram, sy, semVal);
    XLSX.writeFile(wb, filename);
    showBanner('Exported: ' + filename, 'success');
}
