/* ExcelJS exports for the four formatted system views. */
(function () {
    const MAROON = 'FF800000';
    const CHARCOAL = 'FF333333';
    const WHITE = 'FFFFFFFF';
    const LIGHT_GREY = 'FFD3D3D3';
    const BLACK_GREY = 'FF808080';
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    function ensureExcelJS() {
        if (typeof ExcelJS === 'undefined') {
            if (typeof showBanner === 'function') showBanner('Excel export library is still loading. Please try again.', 'error');
            return false;
        }
        return true;
    }

    function safeFilename(value) {
        return String(value || 'Export').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_|_$/g, '') || 'Export';
    }

    function selectedContext() {
        const schoolYear = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || 'Academic Year';
        const semester = document.getElementById('semester-selector')?.value || 'All';
        const semesterLabel = semester === '1' ? 'First Semester'
            : semester === '2' ? 'Second Semester'
                : semester === '3' || semester === 'Summer' ? 'Summer Term'
                    : semester === 'All' ? 'All Semesters' : String(semester);
        return { schoolYear, semester, semesterLabel };
    }

    function filteredLoads(predicate) {
        return (State.db.loads || []).filter(predicate);
    }

    function facultyWorkloadCategory(faculty) {
        const employmentType = String(faculty?.employmentType || '').trim().toLowerCase();
        const classification = String(faculty?.classification || '').trim().toLowerCase();
        const designation = String(faculty?.baseDesignation || '').trim().toLowerCase();
        if (employmentType.includes('part') || classification === 'part-time') return 'part-time';
        if (employmentType !== 'regular') return null;
        return /instructor|lecturer|professor/.test(designation) ? 'regular' : 'designee';
    }

    function isRegularLoad(load) {
        return String(load?.loadType || '').trim().toLowerCase() === 'regular load';
    }

    function isMatchingSemester(load, semester) {
        if (!semester || semester === 'All') return true;
        const selected = String(semester);
        const current = String(load.semester || '1');
        if (selected === current) return true;
        const labels = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer' };
        return labels[selected] === String(load.semester || '');
    }

    function parseMinutes(value) {
        if (typeof parseTimeStr === 'function') return parseTimeStr(value);
        const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (!match) return 0;
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const meridiem = (match[3] || '').toUpperCase();
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        return hour * 60 + minute;
    }

    function formatTimeRange(time) {
        const start = String(time || '').split(' - ')[0].trim();
        const startMinutes = parseMinutes(start);
        const endMinutes = startMinutes + 30;
        const format = value => {
            const hour24 = Math.floor(value / 60) % 24;
            const minute = String(value % 60).padStart(2, '0');
            const suffix = hour24 >= 12 ? 'PM' : 'AM';
            const hour12 = hour24 % 12 || 12;
            return `${hour12}:${minute} ${suffix}`;
        };
        return `${format(startMinutes)} - ${format(endMinutes)}`;
    }

    function normalizedStart(time) {
        return parseMinutes(String(time || '').split(' - ')[0].trim());
    }

    function subjectParts(subject) {
        const value = String(subject || '').trim();
        const parenthesized = value.match(/^([^()]+?)\s*\((.+)\)$/);
        if (parenthesized) return { code: parenthesized[1].trim(), title: parenthesized[2].trim() };
        
        const separator = value.match(/^(.+?)\s+-\s+(.+)$/);
        if (separator) return { code: separator[1].trim(), title: separator[2].trim() };
        
        // Match standard subject codes like "GEED 005", "PATHFIT 1", "IT 101" followed by a space and the title
        const spaceSeparated = value.match(/^([A-Z]+\s*\d+[A-Z]*)\s+(.+)$/i);
        if (spaceSeparated) return { code: spaceSeparated[1].trim(), title: spaceSeparated[2].trim() };
        
        return { code: value, title: value };
    }

    function professorLastName(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : '';
    }

    function baseWorksheet(workbook, name) {
        const worksheet = workbook.addWorksheet(name);
        worksheet.properties.showGridLines = true;
        worksheet.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            horizontalCentered: true,
            margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        };
        return worksheet;
    }

    function applyTitle(cell, fill = true, size = 14) {
        cell.font = { name: 'Segoe UI', size, bold: true, color: { argb: fill ? WHITE : 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAROON } };
    }

    function applyHeader(row, startColumn, endColumn) {
        for (let column = startColumn; column <= endColumn; column += 1) {
            const cell = row.getCell(column);
            cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: WHITE } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHARCOAL } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder(LIGHT_GREY);
        }
    }

    function thinBorder(color = LIGHT_GREY) {
        return {
            top: { style: 'thin', color: { argb: color } },
            left: { style: 'thin', color: { argb: color } },
            bottom: { style: 'thin', color: { argb: color } },
            right: { style: 'thin', color: { argb: color } }
        };
    }

    function mediumBorder(color = BLACK_GREY) {
        return {
            top: { style: 'medium', color: { argb: color } },
            left: { style: 'medium', color: { argb: color } },
            bottom: { style: 'medium', color: { argb: color } },
            right: { style: 'medium', color: { argb: color } }
        };
    }

    function applyBoldScheduleBorders(worksheet, startRow, startColumn, endColumn, unborderedRows = []) {
        const excludedRows = new Set(unborderedRows);
        for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
            for (let column = startColumn; column <= endColumn; column += 1) {
                worksheet.getCell(rowNumber, column).border = excludedRows.has(rowNumber) ? {} : mediumBorder();
            }
        }
    }

    function signatureBorderExclusions(signatureRow, rowsBefore = 1) {
        const rows = [];
        for (let rowNumber = signatureRow - rowsBefore; rowNumber <= signatureRow + 3; rowNumber += 1) {
            rows.push(rowNumber);
        }
        return rows;
    }

    function styleScheduleCells(worksheet, startRow, endRow, startColumn, endColumn) {
        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
            const row = worksheet.getRow(rowNumber);
            row.height = 30;
            for (let column = startColumn; column <= endColumn; column += 1) {
                const cell = row.getCell(column);
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = thinBorder();
            }
        }
    }

    function programCellColors(program, loadType, load) {
        const isBridging = load && getSubjectBridgingStatus(load.program || State.activeProgram, load.sub);
        if (isBridging) {
            return { fill: 'FFFFEDD5', font: 'FF9A3412' }; // Orange background for bridging
        }
        const key = String(program || '').toUpperCase();
        if (key.includes('BSHM') || key.includes('HOSPITALITY')) return { fill: 'FFFFE4E6', font: 'FF7F1D1D' };
        if (key.includes('BSIT') || key.includes('INFORMATION TECH')) return { fill: 'FFE0F2FE', font: 'FF075985' };
        if (key.includes('BSOA') || key.includes('OFFICE ADMIN')) return { fill: 'FFEDE9FE', font: 'FF5B21B6' };
        if (key.includes('BSCPE') || key.includes('COMPUTER ENG')) return { fill: 'FFD1FAE5', font: 'FF065F46' };

        const type = String(loadType || '').toLowerCase();
        if (type.includes('regular')) return { fill: 'FFD1FAE5', font: 'FF065F46' };
        if (type.includes('part')) return { fill: 'FFDBEAFE', font: 'FF1E40AF' };
        if (type.includes('temporary') || type.includes('substitute')) return { fill: 'FFFEF3C7', font: 'FF92400E' };
        return { fill: 'FFF1F5F9', font: 'FF1E293B' };
    }

    function lectureLabLabel(load) {
        let lecture = load.lec_units ?? load.lecUnits ?? load.lectureUnits ?? load.lec ?? load.lecture;
        let laboratory = load.lab_units ?? load.labUnits ?? load.laboratoryUnits ?? load.lab ?? load.laboratory;
        if (lecture == null && laboratory == null) {
            const programs = load.program ? [State.db.programs?.[load.program]] : Object.values(State.db.programs || {});
            const subject = programs
                .flatMap(program => Object.values(program?.subjects || {}).flatMap(semesters => Object.values(semesters || {}).flat()))
                .find(item => item?.name === load.sub);
            if (subject) {
                lecture = subject.lec_units ?? subject.lec ?? subject.lectureHours ?? subject.units;
                laboratory = subject.lab_units ?? subject.lab ?? subject.labHours ?? 0;
            }
        }
        if (lecture == null && laboratory == null) return 'N/A';
        return `${lecture ?? 0}/${laboratory ?? 0}`;
    }

    function semesterLabel(value) {
        const labels = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', '1st Semester': '1st Semester', '2nd Semester': '2nd Semester', 'Summer Term': 'Summer' };
        return labels[String(value || '')] || String(value || 'N/A');
    }

    function roomBuildingName(load) {
        const roomRecord = (State.db.rooms || []).find(room => typeof room === 'object'
            && room.name === load.room
            && (!load.building || room.building === load.building));
        const building = String(load.building || roomRecord?.building || '').trim();
        const normalized = building.toLowerCase();
        if (normalized.includes('main') || normalized.includes('old')) return 'Old Building';
        if (normalized.includes('new')) return 'New Building';
        return building || 'Unknown Building';
    }

    function loadTypeColor(loadType) {
        const value = String(loadType || '').toLowerCase();
        if (value.includes('regular')) return 'FF047857';
        if (value.includes('part')) return 'FF0369A1';
        return 'FFB45309';
    }

    function componentTypeColor(componentType) {
        if (componentType === 'Lab') return 'FFB45309';
        if (componentType === 'Lec/Lab') return 'FF7C3AED';
        return 'FF0369A1';
    }

    function scheduleCellRichText(load, type) {
        const subject = subjectParts(load.sub);
        let subjectName = subject.title === subject.code ? subject.code : `${subject.code} - ${subject.title}`;
        
        const isBridging = typeof getSubjectBridgingStatus === 'function'
            ? getSubjectBridgingStatus(load.program || State.activeProgram, load.sub)
            : false;
        if (isBridging) {
            subjectName = `[ BRIDGING ] ${subjectName}`;
        }

        const compHours = Number(load.units) || 0;
        const compType = load.component_type || 'Lec';
        const bldgRoomText = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${roomBuildingName(load)} - ${load.room || 'N/A'}`;
        const loadType = load.loadType || 'Regular Load';

        const lines = [{ text: subjectName, font: { bold: true, size: 10, color: { argb: isBridging ? 'FF9A3412' : 'FF000000' } } }];

        if (type === 'faculty') {
            lines.push({
                text: `Load Type: ${loadType}`,
                font: { bold: true, color: { argb: loadTypeColor(loadType) } }
            });
            lines.push({ text: `Section: ${load.sec || 'N/A'}` });
            lines.push({
                prefix: `Hours: ${compHours} hours - `,
                componentType: compType,
                suffix: '',
                font: { bold: true, color: { argb: componentTypeColor(compType) } }
            });
            lines.push({ text: bldgRoomText });
            lines.push({ text: `Time: ${load.time || 'N/A'}`, font: { bold: true, size: 10 } });
        } else {
            lines.push({ text: `Professor: ${load.prof || 'TBA'}` });
            lines.push({
                text: `Type: ${isBridging ? 'Bridging' : 'Regular'}`,
                font: { bold: true, color: { argb: isBridging ? 'FF9A3412' : 'FF64748B' } }
            });
            lines.push({
                text: `Load Type: ${loadType}`,
                font: { bold: true, color: { argb: loadTypeColor(loadType) } }
            });
            lines.push({ text: `Section: ${load.sec || 'N/A'}` });
            lines.push({
                prefix: `Hours: ${compHours} hours - `,
                componentType: compType,
                suffix: '',
                font: { bold: true, color: { argb: componentTypeColor(compType) } }
            });
            lines.push({ text: bldgRoomText });
            lines.push({ text: `Time: ${load.time || 'N/A'}`, font: { bold: true, size: 10 } });
        }

        const richText = [];
        lines.forEach((line, index) => {
            if (line.prefix) {
                richText.push({ text: line.prefix });
                richText.push({ text: line.componentType, font: line.font });
                if (line.suffix) richText.push({ text: line.suffix });
            } else {
                richText.push({ text: line.text, ...(line.font ? { font: line.font } : {}) });
            }
            if (index < lines.length - 1) richText.push({ text: '\n' });
        });
        return richText;
    }

    function scheduleRows(worksheet, loads, firstDataRow, firstDataColumn, type) {
        const starts = Array.isArray(TimeStarts) && TimeStarts.length ? TimeStarts : [];
        const occupied = new Set();
        const bySlot = new Map();
        loads.forEach(load => {
            const day = String(load.day || '').trim().toLowerCase();
            const start = normalizedStart(load.time);
            if (!day || !Number.isFinite(start)) return;
            bySlot.set(`${day}|${start}`, load);
        });

        starts.forEach((time, index) => {
            const rowNumber = firstDataRow + index;
            const row = worksheet.getRow(rowNumber);
            row.getCell(firstDataColumn).value = formatTimeRange(time);
            row.getCell(firstDataColumn).font = { name: 'Segoe UI', size: 10, bold: true };
            row.getCell(firstDataColumn).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            DAYS.forEach((day, dayIndex) => {
                const column = firstDataColumn + 1 + dayIndex;
                const key = `${day.toLowerCase()}|${normalizedStart(time)}`;
                if (occupied.has(key)) return;
                const load = bySlot.get(key);
                if (!load) {
                    row.getCell(column).value = '';
                    return;
                }

                const scheduleCell = row.getCell(column);
                scheduleCell.value = { richText: scheduleCellRichText(load, type) };
                const colors = programCellColors(load.program, load.loadType, load);
                scheduleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.fill } };
                scheduleCell.font = { name: 'Segoe UI', size: 9, color: { argb: colors.font } };
                const span = Math.max(1, Number(load.units || 1) * 2);
                if (span > 1) {
                    const endRow = Math.min(firstDataRow + starts.length - 1, rowNumber + span - 1);
                    worksheet.mergeCells(rowNumber, column, endRow, column);
                    for (let offset = 1; offset <= endRow - rowNumber; offset += 1) {
                        const nextStart = starts[index + offset];
                        if (nextStart) occupied.add(`${day.toLowerCase()}|${normalizedStart(nextStart)}`);
                    }
                }
            });
        });

        styleScheduleCells(worksheet, firstDataRow, firstDataRow + starts.length - 1, firstDataColumn, firstDataColumn + 7);
        return starts.length;
    }

    async function resolveSignatories() {
        if (typeof apiFetch === 'function') {
            try {
                const settings = await apiFetch('/api/settings');
                if (settings) {
                    window.systemSettings = { ...(window.systemSettings || {}), ...settings };
                    if (settings.signatory_prepared_by) localStorage.setItem('signatory_prepared_by', settings.signatory_prepared_by);
                    if (settings.signatory_noted_by) localStorage.setItem('signatory_noted_by', settings.signatory_noted_by);
                }
            } catch (_) {}
        }
    }

    function getSignatoryNames() {
        const prep = (window.systemSettings && window.systemSettings.signatory_prepared_by)
            || (typeof localStorage !== 'undefined' && localStorage.getItem('signatory_prepared_by'))
            || 'Jefferson F. Serrano';
        const noted = (window.systemSettings && window.systemSettings.signatory_noted_by)
            || (typeof localStorage !== 'undefined' && localStorage.getItem('signatory_noted_by'))
            || 'Prof. Jaime P. Gutierrez Jr.';
        return {
            preparedBy: prep,
            notedBy: noted
        };
    }

    function appendSignatureBlock(worksheet, signatureRow, firstDataColumn) {
        const midpoint = firstDataColumn + 3;
        worksheet.mergeCells(signatureRow, firstDataColumn, signatureRow, midpoint);
        worksheet.mergeCells(signatureRow, midpoint + 1, signatureRow, firstDataColumn + 7);
        worksheet.mergeCells(signatureRow + 2, firstDataColumn, signatureRow + 2, midpoint);
        worksheet.mergeCells(signatureRow + 2, midpoint + 1, signatureRow + 2, firstDataColumn + 7);
        worksheet.mergeCells(signatureRow + 3, firstDataColumn, signatureRow + 3, midpoint);
        worksheet.mergeCells(signatureRow + 3, midpoint + 1, signatureRow + 3, firstDataColumn + 7);
        worksheet.getCell(signatureRow, firstDataColumn).value = 'Prepared By:';
        worksheet.getCell(signatureRow, midpoint + 1).value = 'Noted By:';
        const sigs = getSignatoryNames();
        worksheet.getCell(signatureRow + 2, firstDataColumn).value = sigs.preparedBy;
        worksheet.getCell(signatureRow + 2, midpoint + 1).value = sigs.notedBy;
        worksheet.getCell(signatureRow + 3, firstDataColumn).value = 'Head, Academic Programs';
        worksheet.getCell(signatureRow + 3, midpoint + 1).value = 'Campus Director';
        [signatureRow, signatureRow + 2, signatureRow + 3].forEach(rowNumber => {
            worksheet.getRow(rowNumber).height = rowNumber === signatureRow ? 22 : 18;
            [firstDataColumn, midpoint + 1].forEach(column => {
                const cell = worksheet.getCell(rowNumber, column);
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (rowNumber === signatureRow + 2) cell.font = { name: 'Segoe UI', size: 10, bold: true };
                else cell.font = { name: 'Segoe UI', size: 9 };
            });
        });
        return [signatureRow, signatureRow + 2, signatureRow + 3];
    }

    function appendFacultySummary(worksheet, loads, firstDataRow, slotCount, firstDataColumn, facultyCategory) {
        const dayTotals = new Map(DAYS.map(day => [day.toLowerCase(), 0]));
        const categoryTotals = { regular: 0, pt: 0, ts: 0 };
        let grandTotal = 0;

        loads.forEach(load => {
            const units = Number(load.units) || 0;
            grandTotal += units;
            const dayKey = String(load.day || '').trim().toLowerCase();
            if (dayTotals.has(dayKey)) dayTotals.set(dayKey, dayTotals.get(dayKey) + units);
            const loadType = String(load.loadType || '').toLowerCase();
            if (loadType.includes('regular')) categoryTotals.regular += units;
            else if (loadType.includes('part')) categoryTotals.pt += units;
            else if (loadType.includes('temporary') || loadType.includes('substitute')) categoryTotals.ts += units;
        });

        const lastScheduleRow = firstDataRow + slotCount - 1;
        const dailyTotalRowNumber = lastScheduleRow + 1;
        const dailyTotalRow = worksheet.getRow(dailyTotalRowNumber);
        dailyTotalRow.getCell(firstDataColumn).value = 'Total';
        DAYS.forEach((day, index) => {
            dailyTotalRow.getCell(firstDataColumn + index + 1).value = dayTotals.get(day.toLowerCase());
        });
        dailyTotalRow.height = 20;

        const grandTotalRowNumber = dailyTotalRowNumber + 1;
        const grandTotalRow = worksheet.getRow(grandTotalRowNumber);
        grandTotalRow.getCell(firstDataColumn).value = 'Grand Total';
        worksheet.mergeCells(grandTotalRowNumber, firstDataColumn + 1, grandTotalRowNumber, firstDataColumn + 7);
        grandTotalRow.getCell(firstDataColumn + 1).value = grandTotal;
        grandTotalRow.height = 20;

        [dailyTotalRow, grandTotalRow].forEach(row => {
            for (let column = firstDataColumn; column <= firstDataColumn + 7; column += 1) {
                const cell = row.getCell(column);
                cell.font = { name: 'Segoe UI', size: 10, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                cell.border = thinBorder(BLACK_GREY);
            }
        });

        const summaryStartRow = grandTotalRowNumber + 2;
        const summaryRows = [
            ...(facultyCategory === 'part-time' ? [] : [['Regular', categoryTotals.regular, 'FFD1FAE5', 'FF065F46']]),
            ['PT', categoryTotals.pt, 'FFDBEAFE', 'FF1E40AF'],
            ['TS', categoryTotals.ts, 'FFFEF3C7', 'FF92400E'],
            ['Total', categoryTotals.regular + categoryTotals.pt + categoryTotals.ts, 'FFFFFF00', 'FF000000']
        ];
        summaryRows.forEach(([label, value, fill, color], index) => {
            const rowNumber = summaryStartRow + index;
            const row = worksheet.getRow(rowNumber);
            row.height = 18;
            [label, value].forEach((entry, columnIndex) => {
                const cell = row.getCell(firstDataColumn + columnIndex);
                cell.value = entry;
                cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: color } };
                cell.alignment = { horizontal: columnIndex === 0 ? 'left' : 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
                cell.border = thinBorder(BLACK_GREY);
            });
        });

        const signatureRow = summaryStartRow + summaryRows.length + 2;
        appendSignatureBlock(worksheet, signatureRow, firstDataColumn);
        return signatureRow;
    }

    function saveWorkbook(workbook, filename) {
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            const downloadUrl = URL.createObjectURL(blob);
            link.href = downloadUrl;
            link.download = `${safeFilename(filename)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            if (typeof showBanner === 'function') showBanner('Excel report exported successfully.', 'success');
        }).catch(error => {
            console.error('Excel export failed:', error);
            if (typeof showBanner === 'function') showBanner('Excel export failed. Please try again.', 'error');
        });
    }

    function exportScheduleWorkbook(title, subtitle, loads, type, filename, columnOffset, facultyCategory = null) {
        if (!ensureExcelJS()) return;
        if (!loads.length) return showBanner('No schedule data found for the selected filters.', 'error');
        const workbook = new ExcelJS.Workbook();
        addScheduleWorksheet(workbook, title, subtitle, loads, type, type === 'faculty' ? 'Workload' : type === 'room' ? 'Room Schedule' : 'Section Timetable', columnOffset, facultyCategory);
        saveWorkbook(workbook, filename);
    }

    function addScheduleWorksheet(workbook, title, subtitle, loads, type, sheetName, columnOffset = 1, facultyCategory = null) {
        const worksheet = baseWorksheet(workbook, sheetName);
        const offset = columnOffset;
        const endColumn = offset + 7;
        worksheet.getColumn(offset).width = 16;
        for (let column = offset + 1; column <= endColumn; column += 1) worksheet.getColumn(column).width = 25;
        worksheet.mergeCells(1 + (type === 'faculty' ? 0 : 1), offset, 1 + (type === 'faculty' ? 0 : 1), endColumn);
        worksheet.mergeCells(2 + (type === 'faculty' ? 0 : 1), offset, 2 + (type === 'faculty' ? 0 : 1), endColumn);
        const titleRow = type === 'faculty' ? 1 : 2;
        const subtitleRow = type === 'faculty' ? 2 : 3;
        worksheet.getCell(titleRow, offset).value = title;
        worksheet.getCell(subtitleRow, offset).value = subtitle;
        worksheet.getRow(titleRow).height = 28;
        worksheet.getRow(subtitleRow).height = 22;
        applyTitle(worksheet.getCell(titleRow, offset));
        worksheet.getCell(subtitleRow, offset).font = { name: 'Segoe UI', size: 11, bold: true };
        worksheet.getCell(subtitleRow, offset).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const headerRowNumber = type === 'faculty' ? 4 : 5;
        const headerRow = worksheet.getRow(headerRowNumber);
        ['TIME', ...DAYS.map(day => day.toUpperCase())].forEach((label, index) => { headerRow.getCell(offset + index).value = label; });
        applyHeader(headerRow, offset, endColumn);
        const slotCount = scheduleRows(worksheet, loads, headerRowNumber + 1, offset, type);
        if (type === 'faculty') {
            const signatureRow = appendFacultySummary(worksheet, loads, headerRowNumber + 1, slotCount, offset, facultyCategory);
            applyBoldScheduleBorders(worksheet, titleRow, offset, endColumn, signatureBorderExclusions(signatureRow, 2));
        }
        else if (type === 'section' || type === 'room') {
            const signatureRow = headerRowNumber + slotCount + 2;
            appendSignatureBlock(worksheet, signatureRow, offset);
            applyBoldScheduleBorders(worksheet, titleRow, offset, endColumn, signatureBorderExclusions(signatureRow));
        }
        return worksheet;
    }

    async function buildFacultyWorkloadWorkbookBuffer(profName) {
        if (!ensureExcelJS()) return null;
        await resolveSignatories();
        const context = selectedContext();
        const program = document.getElementById('workload-program-filter')?.value || 'All';
        const faculty = facultyRegistry.find(entry => entry.name === profName);
        const category = facultyWorkloadCategory(faculty);
        const loads = filteredLoads(load => load.prof === profName
            && load.sy === context.schoolYear
            && (program === 'All' || load.program === program)
            && isMatchingSemester(load, context.semester)
            && !(category === 'part-time' && isRegularLoad(load)));
        if (!loads.length) return null;
        const facultyLabel = String(profName).toUpperCase();
        const workbook = new ExcelJS.Workbook();
        addScheduleWorksheet(workbook, `PROF. (${facultyLabel}) SCHEDULE`, `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`, loads, 'faculty', 'Workload', 1, category);
        const buffer = await workbook.xlsx.writeBuffer();
        // Convert array buffer to base64
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async function exportFacultyWorkload(profName) {
        await resolveSignatories();
        const context = selectedContext();
        const program = document.getElementById('workload-program-filter')?.value || 'All';
        const faculty = facultyRegistry.find(entry => entry.name === profName);
        const category = facultyWorkloadCategory(faculty);
        const loads = filteredLoads(load => load.prof === profName
            && load.sy === context.schoolYear
            && (program === 'All' || load.program === program)
            && isMatchingSemester(load, context.semester)
            && !(category === 'part-time' && isRegularLoad(load)));
        const facultyLabel = String(profName).toUpperCase();
        exportScheduleWorkbook(`PROF. (${facultyLabel}) SCHEDULE`, `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`, loads, 'faculty', `Faculty_Workload_${profName}_${context.schoolYear}`, 1, category);
    }

    async function exportFacultyWorkloadReport() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const context = selectedContext();
        const program = document.getElementById('workload-program-filter')?.value || 'All';
        const loads = filteredLoads(load => load.sy === context.schoolYear
            && (program === 'All' || load.program === program)
            && isMatchingSemester(load, context.semester));
        const groupedLoads = new Map();
        loads.forEach(load => {
            const facultyName = String(load.prof || 'Unknown Faculty').trim();
            const faculty = facultyRegistry.find(entry => entry.name === facultyName);
            const category = facultyWorkloadCategory(faculty);
            if (category === 'part-time' && isRegularLoad(load)) return;
            if (!groupedLoads.has(facultyName)) groupedLoads.set(facultyName, { category, loads: [] });
            groupedLoads.get(facultyName).loads.push(load);
        });

        const workbook = new ExcelJS.Workbook();
        const subtitle = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`;
        if (groupedLoads.size === 0) {
            const worksheet = addScheduleWorksheet(workbook, 'FACULTY WORKLOAD REPORT', subtitle, [], 'faculty', 'No_Data');
            worksheet.mergeCells(3, 1, 3, 8);
            worksheet.getCell(3, 1).value = 'No workload data available for this current selection.';
            worksheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };
            saveWorkbook(workbook, `Faculty_Workload_Report_${context.schoolYear}`);
            return;
        }

        const usedSheetNames = new Set();
        Array.from(groupedLoads.entries())
            .sort(([first], [second]) => first.localeCompare(second))
            .forEach(([facultyName, facultyData]) => {
                const title = `PROF. (${facultyName.toUpperCase()}) SCHEDULE`;
                const baseSheetName = facultyName.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Faculty';
                let sheetName = baseSheetName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName.toLowerCase())) {
                    const ending = ` (${suffix})`;
                    sheetName = `${baseSheetName.slice(0, 31 - ending.length)}${ending}`;
                    suffix += 1;
                }
                usedSheetNames.add(sheetName.toLowerCase());
                addScheduleWorksheet(workbook, title, subtitle, facultyData.loads, 'faculty', sheetName, 1, facultyData.category);
            });

        saveWorkbook(workbook, `Faculty_Workload_Report_${context.schoolYear}`);
    }

    async function exportFacultyWorkloadCategory(category) {
        if (!ensureExcelJS()) return;
        if (!['designee', 'regular', 'part-time'].includes(category)) return;
        await resolveSignatories();

        const context = selectedContext();
        const program = document.getElementById('workload-program-filter')?.value || 'All';
        const facultyMembers = Array.isArray(facultyRegistry)
            ? facultyRegistry.filter(faculty => facultyWorkloadCategory(faculty) === category)
            : [];
        const facultyNames = new Set(facultyMembers.map(faculty => faculty.name));
        const loads = filteredLoads(load => facultyNames.has(load.prof)
            && load.sy === context.schoolYear
            && (program === 'All' || load.program === program)
            && isMatchingSemester(load, context.semester)
            && !(category === 'part-time' && isRegularLoad(load)));

        const groupedLoads = new Map();
        loads.forEach(load => {
            const facultyName = String(load.prof || 'Unknown Faculty').trim();
            if (!groupedLoads.has(facultyName)) groupedLoads.set(facultyName, []);
            groupedLoads.get(facultyName).push(load);
        });
        if (groupedLoads.size === 0) {
            const labels = { designee: 'designee', regular: 'regular', 'part-time': 'part-time' };
            return showBanner(`No ${labels[category]} faculty workload data found for the selected filters.`, 'error');
        }

        const workbook = new ExcelJS.Workbook();
        const subtitle = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`;
        const usedSheetNames = new Set();
        Array.from(groupedLoads.entries())
            .sort(([first], [second]) => first.localeCompare(second))
            .forEach(([facultyName, facultyLoads]) => {
                const baseName = facultyName.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Faculty';
                let sheetName = baseName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName.toLowerCase())) {
                    const ending = ` (${suffix})`;
                    sheetName = `${baseName.slice(0, 31 - ending.length)}${ending}`;
                    suffix += 1;
                }
                usedSheetNames.add(sheetName.toLowerCase());
                addScheduleWorksheet(workbook, `PROF. (${facultyName.toUpperCase()}) SCHEDULE`, subtitle, facultyLoads, 'faculty', sheetName, 1, category);
            });

        const categoryFilename = category === 'part-time' ? 'Part_Time' : category[0].toUpperCase() + category.slice(1);
        saveWorkbook(workbook, `${categoryFilename}_Faculty_Workloads_${context.schoolYear}`);
    }

    async function exportFacultyWorkloadSummarySheet() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const context = selectedContext();

        const allFaculty = Array.isArray(facultyRegistry) ? facultyRegistry : [];
        if (!allFaculty.length) {
            return showBanner('No faculty profiles found to export.', 'error');
        }

        const workbook = new ExcelJS.Workbook();
        const sheetTitle = 'Faculty Workload & Rates';
        const worksheet = workbook.addWorksheet(sheetTitle, {
            pageSetup: {
                orientation: 'landscape',
                paperSize: 9, // A4
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            },
            views: [{ showGridLines: true }]
        });

        // 7 Columns
        const columnWidths = [8, 38, 22, 18, 18, 22, 22];
        columnWidths.forEach((w, i) => {
            worksheet.getColumn(i + 1).width = w;
        });

        const MAROON = 'FF7F0000';
        const WHITE = 'FFFFFFFF';
        const LIGHT_GRAY = 'FFF8FAFC';
        const BORDER_COLOR = 'FFE2E8F0';

        function summaryBorder(color = BORDER_COLOR) {
            return {
                top: { style: 'thin', color: { argb: color } },
                left: { style: 'thin', color: { argb: color } },
                bottom: { style: 'thin', color: { argb: color } },
                right: { style: 'thin', color: { argb: color } }
            };
        }

        // Header Block
        // Row 1: Institutional title
        worksheet.mergeCells(1, 1, 1, 7);
        const r1 = worksheet.getCell(1, 1);
        r1.value = 'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES';
        r1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
        r1.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 20;

        // Row 2: Campus
        worksheet.mergeCells(2, 1, 2, 7);
        const r2 = worksheet.getCell(2, 1);
        r2.value = 'PARAÑAQUE CITY CAMPUS';
        r2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
        r2.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 18;

        // Row 3: Report Title
        worksheet.mergeCells(3, 1, 3, 7);
        const r3 = worksheet.getCell(3, 1);
        r3.value = 'FACULTY WORKLOAD & RATE SUMMARY REPORT';
        r3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: MAROON } };
        r3.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(3).height = 24;

        // Row 4: Subtitle (Semester & Academic Year)
        worksheet.mergeCells(4, 1, 4, 7);
        const r4 = worksheet.getCell(4, 1);
        r4.value = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear} • ALL FACULTY`;
        r4.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
        r4.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(4).height = 18;

        // Row 5: Blank separator
        worksheet.getRow(5).height = 8;

        // Row 6: Table Headers
        const headers = [
            'NO.',
            'PROFESSOR NAME',
            'REGULAR LOAD\n(UNITS)',
            'PT LOAD\n(UNITS)',
            'TS LOAD\n(UNITS)',
            'TOTAL LOADS\n(UNITS)',
            'RATE / DAY\n(PHP)'
        ];

        const headerRow = worksheet.getRow(6);
        headerRow.height = 32;
        headers.forEach((label, idx) => {
            const cell = headerRow.getCell(idx + 1);
            cell.value = label;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAROON } };
            cell.border = summaryBorder('FF4C0000');
        });

        // Helper to categorize faculty
        function classifyFaculty(f) {
            const classification = String(f?.classification || '').toLowerCase();
            const employment = String(f?.employmentType || '').toLowerCase();
            const designation = String(f?.baseDesignation || '').toLowerCase();

            if (classification.includes('designee') || designation.includes('director') || designation.includes('head') || designation.includes('chair')) {
                return 'designee';
            }
            if (classification.includes('part') || employment.includes('part')) {
                return 'part-time';
            }
            return 'regular';
        }

        // Partition faculty into 3 groups
        const designeeList = allFaculty.filter(f => classifyFaculty(f) === 'designee')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const regularList = allFaculty.filter(f => classifyFaculty(f) === 'regular')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const partTimeList = allFaculty.filter(f => classifyFaculty(f) === 'part-time')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const sections = [
            {
                key: 'designee',
                title: 'DESIGNEE FACULTY',
                bgColor: 'FF1E293B',
                hasRegular: true,
                list: designeeList
            },
            {
                key: 'regular',
                title: 'REGULAR FACULTY',
                bgColor: 'FF800000',
                hasRegular: true,
                list: regularList
            },
            {
                key: 'part-time',
                title: 'PART TIME FACULTY',
                bgColor: 'FF334155',
                hasRegular: false,
                list: partTimeList
            }
        ];

        let currentRowNumber = 7;
        let globalIndex = 0;

        // Grand totals accumulators
        let grandRegular = 0;
        let grandPt = 0;
        let grandTs = 0;
        let grandTotal = 0;
        let grandRateDay = 0;
        let grandCount = 0;

        sections.forEach(section => {
            // Section Header Banner
            const bannerRow = worksheet.getRow(currentRowNumber);
            bannerRow.height = 24;
            worksheet.mergeCells(currentRowNumber, 1, currentRowNumber, 7);
            const bannerCell = bannerRow.getCell(1);
            bannerCell.value = section.title;
            bannerCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
            bannerCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            for (let c = 1; c <= 7; c++) {
                const cell = bannerRow.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: section.bgColor } };
                cell.border = summaryBorder('FF0F172A');
            }
            currentRowNumber++;

            if (!section.list.length) {
                const emptyRow = worksheet.getRow(currentRowNumber);
                emptyRow.height = 20;
                worksheet.mergeCells(currentRowNumber, 1, currentRowNumber, 7);
                const emptyCell = emptyRow.getCell(1);
                emptyCell.value = 'No faculty members found under this classification';
                emptyCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
                emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
                for (let c = 1; c <= 7; c++) {
                    const cell = emptyRow.getCell(c);
                    cell.border = summaryBorder();
                }
                currentRowNumber++;
                return;
            }

            let secRegular = 0;
            let secPt = 0;
            let secTs = 0;
            let secTotal = 0;
            let secRateDay = 0;

            section.list.forEach((faculty, secIndex) => {
                globalIndex++;
                const row = worksheet.getRow(currentRowNumber);
                row.height = 22;

                const loads = filteredLoads(load =>
                    load.prof === faculty.name &&
                    load.sy === context.schoolYear &&
                    isMatchingSemester(load, context.semester)
                );

                let regUnits = 0;
                let ptUnits = 0;
                let tsUnits = 0;
                let totalUnits = 0;

                loads.forEach(load => {
                    const u = Number(load.units) || 0;
                    totalUnits += u;
                    const lt = String(load.loadType || '').toLowerCase();
                    if (lt.includes('regular')) {
                        regUnits += u;
                    } else if (lt.includes('part')) {
                        ptUnits += u;
                    } else if (lt.includes('temporary') || lt.includes('substitute')) {
                        tsUnits += u;
                    } else {
                        regUnits += u;
                    }
                });

                const rateDay = Number(faculty.ratePerDay) || 0;

                if (section.hasRegular) {
                    secRegular += regUnits;
                    grandRegular += regUnits;
                }
                secPt += ptUnits;
                secTs += tsUnits;
                secTotal += totalUnits;
                secRateDay += rateDay;

                grandPt += ptUnits;
                grandTs += tsUnits;
                grandTotal += totalUnits;
                grandRateDay += rateDay;
                grandCount++;

                const isEven = secIndex % 2 === 1;
                const rowBg = isEven ? LIGHT_GRAY : WHITE;

                // Col 1: NO.
                const c1 = row.getCell(1);
                c1.value = globalIndex;
                c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };
                c1.alignment = { horizontal: 'center', vertical: 'middle' };

                // Col 2: PROFESSOR NAME
                const c2 = row.getCell(2);
                c2.value = String(faculty.name || '').toUpperCase();
                c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                c2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

                // Col 3: REGULAR LOAD (UNITS)
                // Designee and Regular have regular load; Part-time does not
                const c3 = row.getCell(3);
                if (section.hasRegular) {
                    c3.value = regUnits;
                    c3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };
                    c3.alignment = { horizontal: 'center', vertical: 'middle' };
                    if (regUnits > 0) {
                        c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                    }
                } else {
                    c3.value = '-';
                    c3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
                    c3.alignment = { horizontal: 'center', vertical: 'middle' };
                }

                // Col 4: PT LOAD (UNITS)
                const c4 = row.getCell(4);
                c4.value = ptUnits;
                c4.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
                c4.alignment = { horizontal: 'center', vertical: 'middle' };
                if (ptUnits > 0) {
                    c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
                }

                // Col 5: TS LOAD (UNITS)
                const c5 = row.getCell(5);
                c5.value = tsUnits;
                c5.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
                c5.alignment = { horizontal: 'center', vertical: 'middle' };
                if (tsUnits > 0) {
                    c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                }

                // Col 6: TOTAL LOADS (UNITS)
                const c6 = row.getCell(6);
                c6.value = totalUnits;
                c6.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
                c6.alignment = { horizontal: 'center', vertical: 'middle' };
                if (totalUnits > 0) {
                    c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                }

                // Col 7: RATE / DAY
                const c7 = row.getCell(7);
                c7.value = rateDay;
                c7.numFmt = '"₱"#,##0.00;[Red]("-₱"#,##0.00);"-"';
                c7.font = { name: 'Calibri', size: 10, bold: rateDay > 0, color: { argb: rateDay > 0 ? 'FF065F46' : 'FF94A3B8' } };
                c7.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

                for (let c = 1; c <= 7; c++) {
                    const cell = row.getCell(c);
                    cell.border = summaryBorder();
                    if (!cell.fill) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                    }
                }
                currentRowNumber++;
            });

            // Section Subtotal Row
            const subtotalRow = worksheet.getRow(currentRowNumber);
            subtotalRow.height = 22;
            worksheet.mergeCells(currentRowNumber, 1, currentRowNumber, 2);
            const subLabel = subtotalRow.getCell(1);
            subLabel.value = `SUBTOTAL (${section.title.replace(/[^A-Z\s]/g, '').trim()})`;
            subLabel.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF334155' } };
            subLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

            // Subtotal Regular
            const sr3 = subtotalRow.getCell(3);
            if (section.hasRegular) {
                sr3.value = secRegular;
                sr3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };
            } else {
                sr3.value = '-';
                sr3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
            }
            sr3.alignment = { horizontal: 'center', vertical: 'middle' };

            // Subtotal PT
            const sr4 = subtotalRow.getCell(4);
            sr4.value = secPt;
            sr4.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
            sr4.alignment = { horizontal: 'center', vertical: 'middle' };

            // Subtotal TS
            const sr5 = subtotalRow.getCell(5);
            sr5.value = secTs;
            sr5.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
            sr5.alignment = { horizontal: 'center', vertical: 'middle' };

            // Subtotal Total
            const sr6 = subtotalRow.getCell(6);
            sr6.value = secTotal;
            sr6.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
            sr6.alignment = { horizontal: 'center', vertical: 'middle' };

            // Subtotal Rate / Day
            const sr7 = subtotalRow.getCell(7);
            sr7.value = secRateDay;
            sr7.numFmt = '"₱"#,##0.00;[Red]("-₱"#,##0.00);"-"';
            sr7.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };
            sr7.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

            for (let c = 1; c <= 7; c++) {
                const cell = subtotalRow.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: BORDER_COLOR } },
                    right: { style: 'thin', color: { argb: BORDER_COLOR } }
                };
            }
            currentRowNumber++;
        });

        // Grand Summary / Overall Totals Row
        const totalRow = worksheet.getRow(currentRowNumber);
        totalRow.height = 26;
        worksheet.mergeCells(currentRowNumber, 1, currentRowNumber, 2);
        const grandLabel = totalRow.getCell(1);
        grandLabel.value = 'OVERALL TOTALS / GRAND SUMMARY';
        grandLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        grandLabel.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col 3: Grand Regular
        const gr3 = totalRow.getCell(3);
        gr3.value = grandRegular;
        gr3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF065F46' } };
        gr3.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col 4: Grand PT
        const gr4 = totalRow.getCell(4);
        gr4.value = grandPt;
        gr4.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
        gr4.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col 5: Grand TS
        const gr5 = totalRow.getCell(5);
        gr5.value = grandTs;
        gr5.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF92400E' } };
        gr5.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col 6: Grand Total Loads
        const gr6 = totalRow.getCell(6);
        gr6.value = grandTotal;
        gr6.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        gr6.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col 7: Grand Total Rate / Day
        const gr7 = totalRow.getCell(7);
        gr7.value = grandRateDay;
        gr7.numFmt = '"₱"#,##0.00;[Red]("-₱"#,##0.00);"-"';
        gr7.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF065F46' } };
        gr7.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

        const doubleBottomBorder = {
            top: { style: 'medium', color: { argb: 'FF1E293B' } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'double', color: { argb: 'FF1E293B' } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };

        for (let c = 1; c <= 7; c++) {
            const cell = totalRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            cell.border = doubleBottomBorder;
        }

        // Official Signatory Block
        const sigStartRow = currentRowNumber + 3;
        const sigs = getSignatoryNames();

        // Prepared by
        worksheet.mergeCells(sigStartRow, 1, sigStartRow, 3);
        worksheet.getCell(sigStartRow, 1).value = 'Prepared by:';
        worksheet.getCell(sigStartRow, 1).font = { name: 'Calibri', size: 9, italic: true };

        worksheet.mergeCells(sigStartRow + 2, 1, sigStartRow + 2, 3);
        const prepName = worksheet.getCell(sigStartRow + 2, 1);
        prepName.value = sigs.preparedBy;
        prepName.font = { name: 'Calibri', size: 10, bold: true, underline: true };
        prepName.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells(sigStartRow + 3, 1, sigStartRow + 3, 3);
        const prepTitle = worksheet.getCell(sigStartRow + 3, 1);
        prepTitle.value = 'Head, Academic Programs';
        prepTitle.font = { name: 'Calibri', size: 9 };
        prepTitle.alignment = { horizontal: 'center', vertical: 'middle' };

        // Noted by
        worksheet.mergeCells(sigStartRow, 5, sigStartRow, 7);
        worksheet.getCell(sigStartRow, 5).value = 'Noted by:';
        worksheet.getCell(sigStartRow, 5).font = { name: 'Calibri', size: 9, italic: true };

        worksheet.mergeCells(sigStartRow + 2, 5, sigStartRow + 2, 7);
        const noteName = worksheet.getCell(sigStartRow + 2, 5);
        noteName.value = sigs.notedBy;
        noteName.font = { name: 'Calibri', size: 10, bold: true, underline: true };
        noteName.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells(sigStartRow + 3, 5, sigStartRow + 3, 7);
        const noteTitle = worksheet.getCell(sigStartRow + 3, 5);
        noteTitle.value = 'Campus Director';
        noteTitle.font = { name: 'Calibri', size: 9 };
        noteTitle.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.getRow(sigStartRow).height = 20;
        worksheet.getRow(sigStartRow + 1).height = 14;
        worksheet.getRow(sigStartRow + 2).height = 20;
        worksheet.getRow(sigStartRow + 3).height = 18;

        // Save
        const fileName = `Faculty_Workload_and_Rates_Summary_${safeFilename(context.schoolYear)}_${new Date().toISOString().split('T')[0]}`;
        saveWorkbook(workbook, fileName);
        showBanner('Faculty workload & rates summary report (one sheet) exported successfully.', 'success');
    }

    function renderFacultyRosterProgramOptions() {
        const container = document.getElementById('faculty-roster-program-options');
        if (!container) return;

        container.replaceChildren();

        // Try to read live from State.db.programs; fall back to known list
        const liveKeys = Object.keys(State.db?.programs || {}).sort();
        const fallbackKeys = ['Information Technology', 'Hospitality Management', 'Computer Engineering', 'Office Administration', 'General Education'];
        
        let programKeys = liveKeys.length > 0 ? liveKeys : fallbackKeys;
        
        // Ensure General Education is included if we want it to show up manually for faculty
        if (liveKeys.length > 0 && !liveKeys.find(k => k.toLowerCase() === 'general education')) {
             programKeys.push('General Education');
        }

        programKeys.forEach(name => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'block w-full text-left pl-7 pr-4 py-2 text-xs hover:bg-slate-100 text-slate-700 font-medium leading-snug';
            button.textContent = name;
            button.title = `Export Faculty Profile for ${name}`;
            button.addEventListener('click', () => window.exportFacultyProfileExcel(name));
            container.appendChild(button);
        });
    }

    // Re-render faculty roster options lazily when the dropdown is hovered
    function attachRosterDropdownRefresh() {
        const dropdownArea = document.getElementById('faculty-roster-program-options')?.closest('.group');
        if (dropdownArea) {
            dropdownArea.addEventListener('mouseenter', renderFacultyRosterProgramOptions);
        }
    }

    function renderProgramCurriculumOptions() {
        const container = document.getElementById('program-curriculum-options');
        if (!container) return;

        container.replaceChildren();

        // Try to read live from State.db.programs; fall back to known list
        const liveKeys = Object.keys(State.db?.programs || {}).sort();
        const fallbackKeys = ['Information Technology', 'Hospitality Management', 'Computer Engineering', 'Office Administration'];
        const programKeys = liveKeys.length > 0 ? liveKeys : fallbackKeys;

        programKeys.forEach(name => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'block w-full text-left pl-7 pr-4 py-2 text-xs hover:bg-slate-100 text-slate-700 font-medium leading-snug';
            button.textContent = name;
            button.title = `Export Course Curriculum for ${name}`;
            button.addEventListener('click', () => window.exportProgramCurriculum(name));
            container.appendChild(button);
        });
    }

    // Re-render curriculum options lazily when the dropdown is hovered
    function attachCurriculumDropdownRefresh() {
        const exportBtn = document.querySelector('[onclick], .group');
        const dropdownArea = document.getElementById('program-curriculum-options')?.closest('.group');
        if (dropdownArea) {
            dropdownArea.addEventListener('mouseenter', renderProgramCurriculumOptions);
        }
    }

    async function exportRoomSchedule() {
        await resolveSignatories();
        const room = document.getElementById('view-room-select')?.value;
        const building = document.getElementById('view-building-select')?.value || 'All';
        if (!room) return showBanner('Select room.', 'error');
        const context = selectedContext();
        const loads = filteredLoads(load => load.room === room && load.sy === context.schoolYear && (building === 'All' || load.building === building) && isMatchingSemester(load, context.semester));
        const roomBuilding = loads[0] ? roomBuildingName(loads[0]) : building;
        exportScheduleWorkbook(`${room} SCHEDULE`, `${context.semesterLabel}, AY ${context.schoolYear} - ${roomBuilding}`, loads, 'room', `Room_Schedule_${room}_${context.schoolYear}`, 2);
    }

    async function exportAllRoomSchedules() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const context = selectedContext();
        const buildingFilter = document.getElementById('view-building-select')?.value || 'All';
        const loads = filteredLoads(load => load.sy === context.schoolYear
            && (buildingFilter === 'All' || roomBuildingName(load) === (buildingFilter === 'Main Building' ? 'Old Building' : buildingFilter))
            && isMatchingSemester(load, context.semester));
        if (!loads.length) return showBanner('No room timetable data found for the selected filters.', 'error');

        const groupedSchedules = new Map();
        loads.forEach(load => {
            const room = String(load.room || 'Unknown Room').trim();
            const building = roomBuildingName(load);
            const key = JSON.stringify([building, room]);
            if (!groupedSchedules.has(key)) groupedSchedules.set(key, { building, room, loads: [] });
            groupedSchedules.get(key).loads.push(load);
        });

        const workbook = new ExcelJS.Workbook();
        const usedSheetNames = new Set();
        Array.from(groupedSchedules.values())
            .sort((first, second) => first.building.localeCompare(second.building) || first.room.localeCompare(second.room))
            .forEach(({ building, room, loads: roomLoads }) => {
                const baseName = `${building} - ${room}`.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Room';
                let sheetName = baseName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName.toLowerCase())) {
                    const ending = ` (${suffix})`;
                    sheetName = `${baseName.slice(0, 31 - ending.length)}${ending}`;
                    suffix += 1;
                }
                usedSheetNames.add(sheetName.toLowerCase());

                const title = `${room} SCHEDULE`;
                const subtitle = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear} - ${building.toUpperCase()}`;
                addScheduleWorksheet(workbook, title, subtitle, roomLoads, 'room', sheetName, 2);
            });

        saveWorkbook(workbook, `All_Room_Schedules_${context.schoolYear}`);
    }

    async function exportProgramSchedule() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const program = document.getElementById('load-program-selector')?.value;
        if (!program) return showBanner('Please select a program.', 'error');
        const context = selectedContext();
        const loads = filteredLoads(load => load.program === program && load.sy === context.schoolYear && isMatchingSemester(load, context.semester));
        if (!loads.length) return showBanner(`No faculty loading data found for ${program}.`, 'error');
        
        exportScheduleWorkbook(`${program.toUpperCase()} - FACULTY SCHEDULE`, `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`, loads, 'program', `Program_Schedule_${program}_${context.schoolYear}`, 1);
    }

    async function exportAllProgramSchedules() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const context = selectedContext();
        const loads = filteredLoads(load => load.sy === context.schoolYear && isMatchingSemester(load, context.semester));
        if (!loads.length) return showBanner('No faculty loading data found for the selected filters.', 'error');

        const groupedSchedules = new Map();
        loads.forEach(load => {
            const program = String(load.program || 'Unknown Program').trim();
            if (!groupedSchedules.has(program)) groupedSchedules.set(program, []);
            groupedSchedules.get(program).push(load);
        });

        const workbook = new ExcelJS.Workbook();
        const subtitle = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`;
        const usedSheetNames = new Set();
        
        Array.from(groupedSchedules.entries())
            .sort(([first], [second]) => first.localeCompare(second))
            .forEach(([program, programLoads]) => {
                const baseName = program.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Program';
                let sheetName = baseName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName.toLowerCase())) {
                    const ending = ` (${suffix})`;
                    sheetName = `${baseName.slice(0, 31 - ending.length)}${ending}`;
                    suffix += 1;
                }
                usedSheetNames.add(sheetName.toLowerCase());
                const title = `${program.toUpperCase()} - FACULTY SCHEDULE`;
                addScheduleWorksheet(workbook, title, subtitle, programLoads, 'program', sheetName, 1);
            });

        saveWorkbook(workbook, `All_Program_Schedules_${context.schoolYear}`);
    }

    async function exportSectionTimetable(targetSection = null) {
        await resolveSignatories();
        const section = targetSection || document.getElementById('view-section-select')?.value;
        if (!section) return showBanner('Please select a section.', 'error');
        const context = selectedContext();
        const loads = filteredLoads(load => load.sec === section && load.sy === context.schoolYear && isMatchingSemester(load, context.semester));
        exportScheduleWorkbook(`${section} TIMETABLE`, `${context.semesterLabel}, AY ${context.schoolYear}`, loads, 'section', `Section_Timetable_${section}_${context.schoolYear}`, 2);
    }

    async function buildSectionTimetableWorkbookBuffer(targetSection = null) {
        if (!ensureExcelJS()) return null;
        await resolveSignatories();
        const section = targetSection || document.getElementById('view-section-select')?.value;
        if (!section) return null;
        const context = selectedContext();
        const loads = filteredLoads(load => load.sec === section && load.sy === context.schoolYear && isMatchingSemester(load, context.semester));
        if (!loads.length) return null;

        const workbook = new ExcelJS.Workbook();
        addScheduleWorksheet(workbook, `${section} TIMETABLE`, `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear}`, loads, 'section', 'Timetable', 2);
        const buffer = await workbook.xlsx.writeBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async function exportAllSectionTimetables() {
        if (!ensureExcelJS()) return;
        await resolveSignatories();
        const context = selectedContext();
        const loads = filteredLoads(load => load.sy === context.schoolYear && isMatchingSemester(load, context.semester));
        if (!loads.length) return showBanner('No section timetable data found for the selected filters.', 'error');

        const groupedSchedules = new Map();
        loads.forEach(load => {
            const program = String(load.program || 'Unknown Program').trim();
            const section = String(load.sec || 'Unknown Section').trim();
            const key = JSON.stringify([program, section]);
            if (!groupedSchedules.has(key)) groupedSchedules.set(key, { program, section, loads: [] });
            groupedSchedules.get(key).loads.push(load);
        });

        const workbook = new ExcelJS.Workbook();
        const usedSheetNames = new Set();
        Array.from(groupedSchedules.values())
            .sort((first, second) => first.program.localeCompare(second.program) || first.section.localeCompare(second.section))
            .forEach(({ program, section, loads: sectionLoads }) => {
                const baseName = `${program} - ${section}`.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Section';
                let sheetName = baseName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName.toLowerCase())) {
                    const ending = ` (${suffix})`;
                    sheetName = `${baseName.slice(0, 31 - ending.length)}${ending}`;
                    suffix += 1;
                }
                usedSheetNames.add(sheetName.toLowerCase());

                const title = `${section} TIMETABLE`;
                const subtitle = `${context.semesterLabel.toUpperCase()} AY ${context.schoolYear} - ${program.toUpperCase()}`;
                addScheduleWorksheet(workbook, title, subtitle, sectionLoads, 'section', sheetName, 2);
            });

        saveWorkbook(workbook, `All_Section_Timetables_${context.schoolYear}`);
    }

    function buildFacultyProfileSheet(workbook, facultyList, departmentLabel, sheetName) {
        const worksheet = baseWorksheet(workbook, sheetName.slice(0, 31) || 'Faculty Profile');

        // Column widths: NO | NAME/Rank | Baccalaureate | Masters | Doctorate | Post-Bacc | License | Specialization | Nat. Cert | Nature of Appt | Faculty Email | First Semester (AY) | Second Semester (AY)
        [6, 26, 28, 28, 18, 22, 16, 22, 22, 22, 28, 32, 32].forEach((w, i) => { worksheet.getColumn(i + 1).width = w; });

        const DARK_BLUE = 'FF1F3864';
        const LIGHT_BLUE_BG = 'FFD6E4F7';
        const TITLE_BG = 'FFFFFFFF';
        const RED_NAME = 'FFCC0000';
        const HEADER_BG = 'FFD9D9D9';

        function fpBoldBorder() {
            return {
                top: { style: 'medium', color: { argb: '44000000' } },
                left: { style: 'medium', color: { argb: '44000000' } },
                bottom: { style: 'medium', color: { argb: '44000000' } },
                right: { style: 'medium', color: { argb: '44000000' } }
            };
        }

        function fpThinBorder() {
            return {
                top: { style: 'thin', color: { argb: '44000000' } },
                left: { style: 'thin', color: { argb: '44000000' } },
                bottom: { style: 'thin', color: { argb: '44000000' } },
                right: { style: 'thin', color: { argb: '44000000' } }
            };
        }

        // ===== ROW 1: TEACHING PERSONNEL PROFILE =====
        worksheet.mergeCells(1, 1, 1, 13);
        const r1 = worksheet.getCell(1, 1);
        r1.value = 'TEACHING PERSONNEL PROFILE';
        r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: CURRICULUM_BLACK } };
        r1.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 24;

        // ===== ROW 2: DEPARTMENT =====
        worksheet.mergeCells(2, 1, 2, 13);
        const r2 = worksheet.getCell(2, 1);
        r2.value = departmentLabel.toUpperCase();
        r2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: CURRICULUM_BLACK } };
        r2.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 20;

        // ===== ROW 3-4: MERGED HEADERS =====
        // NO.
        worksheet.mergeCells(3, 1, 4, 1);
        // NAME
        worksheet.mergeCells(3, 2, 4, 2);
        // EDUCATIONAL ATTAINMENT (spans Bacc, Masters, Doctorate, Post-Bacc)
        worksheet.mergeCells(3, 3, 3, 6);
        // LICENSE NO.
        worksheet.mergeCells(3, 7, 4, 7);
        // SPECIALIZATION
        worksheet.mergeCells(3, 8, 4, 8);
        // NATIONAL CERTIFICATE
        worksheet.mergeCells(3, 9, 4, 9);
        // NATURE OF APPOINTMENT
        worksheet.mergeCells(3, 10, 4, 10);
        // FACULTY EMAIL (pup.edu.ph)
        worksheet.mergeCells(3, 11, 4, 11);
        // SUBJECT LOADED (spans Col 12 and Col 13)
        worksheet.mergeCells(3, 12, 3, 13);

        const context = selectedContext();
        const activeSY = (context.schoolYear && context.schoolYear !== 'Academic Year' && context.schoolYear !== 'All School Years')
            ? context.schoolYear
            : (State.activeSchoolYear || State.db?.schoolYears?.[0] || '');
        const syLabel = activeSY ? (String(activeSY).startsWith('AY') ? String(activeSY) : `AY ${activeSY}`) : 'AY';

        const headerLabels = {
            '3,1': 'NO.', '3,2': 'NAME\nDesignation / Academic Rank',
            '3,3': 'EDUCATIONAL ATTAINMENT',
            '3,7': 'LICENSE NO.', '3,8': 'SPECIALIZATION',
            '3,9': 'NATIONAL CERTIFICATE', '3,10': 'NATURE OF APPOINTMENT',
            '3,11': 'FACULTY EMAIL\n(pup.edu.ph)',
            '3,12': 'SUBJECT LOADED',
            '4,3': 'Baccalaureate', '4,4': 'Masters', '4,5': 'Doctorate', '4,6': 'Post-Baccalaureate',
            '4,12': 'First Semester\n(' + syLabel + ')',
            '4,13': 'Second Semester\n(' + syLabel + ')'
        };

        for (let c = 1; c <= 13; c++) {
            [3, 4].forEach(r => {
                const cell = worksheet.getCell(r, c);
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CURRICULUM_BLACK } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
                cell.border = fpBoldBorder();
            });
        }

        Object.entries(headerLabels).forEach(([key, label]) => {
            const [r, c] = key.split(',').map(Number);
            worksheet.getCell(r, c).value = label;
        });

        [3, 4].forEach(r => {
            worksheet.getRow(r).height = 30;
        });

        // ===== DATA ROWS =====
        facultyList.forEach((faculty, index) => {
            const rowNum = 5 + index;
            const row = worksheet.getRow(rowNum);

            const education = faculty.educationalAttainment || {};
            const name = String(faculty.name || '').toUpperCase();
            const rank = faculty.baseDesignation || faculty.classificationRank || faculty.classification || '';

            // Col 1: NO. (red background)
            const noCell = row.getCell(1);
            noCell.value = index + 1;
            noCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
            noCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };
            noCell.alignment = { horizontal: 'center', vertical: 'middle' };
            noCell.border = fpThinBorder();

            // Col 2: NAME + Rank (rich text)
            const nameCell = row.getCell(2);
            nameCell.value = {
                richText: [
                    { text: name, font: { name: 'Calibri', size: 10, bold: true, color: { argb: RED_NAME } } },
                    { text: rank ? `\n${rank}` : '', font: { name: 'Calibri', size: 9, italic: true, color: { argb: CURRICULUM_BLACK } } }
                ]
            };
            nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            nameCell.border = fpThinBorder();

            // Col 3-6: Educational Attainment (rich text: degree bold, institution italic below)
            ['baccalaureate', 'masters', 'doctorate', 'postBaccalaureate'].forEach((key, i) => {
                const cell = row.getCell(3 + i);
                const raw = String(education[key] || '').trim();
                if (!raw || raw.toLowerCase() === 'n/a') {
                    cell.value = 'N/A';
                    cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '88000000' } };
                } else {
                    const lines = raw.split(/\n/);
                    if (lines.length > 1) {
                        cell.value = {
                            richText: [
                                { text: lines[0].toUpperCase(), font: { name: 'Calibri', size: 9, bold: true, color: { argb: CURRICULUM_BLACK } } },
                                { text: '\n' + lines.slice(1).join('\n').toUpperCase(), font: { name: 'Calibri', size: 8, italic: false, color: { argb: CURRICULUM_BLACK } } }
                            ]
                        };
                    } else {
                        cell.value = { richText: [{ text: raw.toUpperCase(), font: { name: 'Calibri', size: 9, bold: true, color: { argb: CURRICULUM_BLACK } } }] };
                    }
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = fpThinBorder();
            });

            // Col 7-10: License, Specialization, National Cert, Nature of Appointment
            [
                faculty.licenseNumber || 'N/A',
                faculty.specialization || 'N/A',
                faculty.nationalCertificate || 'N/A',
                faculty.natureOfAppointment || 'N/A'
            ].forEach((val, i) => {
                const cell = row.getCell(7 + i);
                cell.value = String(val).toUpperCase();
                cell.font = { name: 'Calibri', size: 9, bold: i === 1, color: { argb: CURRICULUM_BLACK } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = fpThinBorder();
            });

            // Col 11: Faculty Email (pup.edu.ph)
            const emailCell = row.getCell(11);
            const emailVal = String(faculty.email || '').trim();
            emailCell.value = emailVal ? emailVal.toLowerCase() : 'N/A';
            emailCell.font = { name: 'Calibri', size: 9, italic: !emailVal, color: { argb: emailVal ? 'FF1E40AF' : '88000000' } };
            emailCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            emailCell.border = fpThinBorder();

            // Col 12 & 13: Subject Loaded (First Semester & Second Semester, Deduplicated)
            const profNameClean = String(faculty.name || '').trim().toLowerCase();
            let profLoads = (State.db?.loads || []).filter(l =>
                String(l.prof || '').trim().toLowerCase() === profNameClean &&
                (!activeSY || l.sy === activeSY)
            );
            if (profLoads.length === 0) {
                profLoads = (State.db?.loads || []).filter(l => String(l.prof || '').trim().toLowerCase() === profNameClean);
            }

            const firstSemSubs = [];
            const secondSemSubs = [];

            profLoads.forEach(l => {
                const subName = String(l.sub || l.subject || '').trim();
                if (!subName) return;
                const semRaw = String(l.semester || '1').trim().toLowerCase();
                if (semRaw === '2' || semRaw.includes('2nd') || semRaw.includes('second')) {
                    if (!secondSemSubs.some(s => s.toLowerCase() === subName.toLowerCase())) {
                        secondSemSubs.push(subName);
                    }
                } else if (semRaw === '3' || semRaw.includes('summer')) {
                    const subWithTag = `${subName} (Summer)`;
                    if (!secondSemSubs.some(s => s.toLowerCase() === subWithTag.toLowerCase())) {
                        secondSemSubs.push(subWithTag);
                    }
                } else {
                    if (!firstSemSubs.some(s => s.toLowerCase() === subName.toLowerCase())) {
                        firstSemSubs.push(subName);
                    }
                }
            });

            // Col 12: First Semester
            const sem1Cell = row.getCell(12);
            if (firstSemSubs.length > 0) {
                sem1Cell.value = firstSemSubs.map(s => `• ${s}`).join('\n');
                sem1Cell.font = { name: 'Calibri', size: 9, bold: false, color: { argb: CURRICULUM_BLACK } };
                sem1Cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
            } else {
                sem1Cell.value = 'None';
                sem1Cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '88000000' } };
                sem1Cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            sem1Cell.border = fpThinBorder();

            // Col 13: Second Semester
            const sem2Cell = row.getCell(13);
            if (secondSemSubs.length > 0) {
                sem2Cell.value = secondSemSubs.map(s => `• ${s}`).join('\n');
                sem2Cell.font = { name: 'Calibri', size: 9, bold: false, color: { argb: CURRICULUM_BLACK } };
                sem2Cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
            } else {
                sem2Cell.value = 'None';
                sem2Cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '88000000' } };
                sem2Cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            sem2Cell.border = fpThinBorder();

            const semLines = Math.max(firstSemSubs.length, secondSemSubs.length, 1);
            const eduMaxLines = Math.max(
                ...['baccalaureate', 'masters', 'doctorate', 'postBaccalaureate'].map(k => String(education[k] || '').split(/\n/).length),
                1
            );
            const maxLines = Math.max(semLines, eduMaxLines, 2);
            row.height = Math.max(50, maxLines * 16 + 12);
        });
    }

    function exportFacultyProfileExcel(programFilter) {
        if (!ensureExcelJS()) return;
        const allFaculty = Array.isArray(facultyRegistry) ? facultyRegistry : [];
        if (!allFaculty.length) return showBanner('No faculty profiles found.', 'error');

        const selectedId = document.getElementById('faculty-profile-select')?.value;
        if (!programFilter && selectedId) {
            const faculty = allFaculty.find(f => f.id === selectedId);
            if (faculty) {
                const workbook = new ExcelJS.Workbook();
                buildFacultyProfileSheet(workbook, [faculty], `${faculty.program || 'General'} Department`, (faculty.name || 'Faculty').slice(0, 31));
                saveWorkbook(workbook, `Faculty_Profile_${safeFilename(faculty.name)}_${new Date().toISOString().split('T')[0]}`);
                return;
            }
        }

        const isAll = !programFilter || String(programFilter).toLowerCase() === 'all';
        const workbook = new ExcelJS.Workbook();

        if (isAll) {
            // One sheet per program
            const byProgram = {};
            allFaculty.forEach(f => {
                const prog = f.program || 'General';
                if (!byProgram[prog]) byProgram[prog] = [];
                byProgram[prog].push(f);
            });
            const programNames = Object.keys(byProgram).sort();
            if (programNames.length === 0) return showBanner('No faculty data found.', 'error');
            programNames.forEach(prog => {
                const list = byProgram[prog].slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                buildFacultyProfileSheet(workbook, list, `${prog} Department`, prog);
            });
            saveWorkbook(workbook, `Faculty_Profile_All_Programs_${new Date().toISOString().split('T')[0]}`);
        } else {
            const list = allFaculty
                .filter(f => (f.program || '').toLowerCase() === String(programFilter).toLowerCase())
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            if (!list.length) return showBanner(`No faculty found for ${programFilter}.`, 'error');
            buildFacultyProfileSheet(workbook, list, `${programFilter} Department`, programFilter.slice(0, 31));
            saveWorkbook(workbook, `Faculty_Profile_${safeFilename(programFilter)}_${new Date().toISOString().split('T')[0]}`);
        }
    }


    // ========== COURSE CURRICULUM EXPORT ==========
    // Maps program keys (as stored in State.db.programs) to their full academic titles for the Excel header
    const PROGRAM_FULL_NAMES = {
        // Short codes (legacy support)
        'BSHM': 'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT',
        'BSIT': 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
        'BSOA': 'BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION',
        'BSCPE': 'BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
        // Full name keys (actual State.db.programs keys)
        'INFORMATION TECHNOLOGY': 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
        'HOSPITALITY MANAGEMENT': 'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT',
        'COMPUTER ENGINEERING': 'BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
        'OFFICE ADMINISTRATION': 'BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION',
        'GENERAL EDUCATION': 'GENERAL EDUCATION PROGRAM'
    };

    function programFullName(shortName) {
        const key = String(shortName || '').toUpperCase().trim();
        // Return from map, or return the key itself if it's already a full name
        return PROGRAM_FULL_NAMES[key] || String(shortName || '').toUpperCase().trim();
    }

    const CURRICULUM_RED = 'FFC00000';
    const CURRICULUM_YELLOW = 'FFFFFF00';
    const CURRICULUM_GREEN = 'FF008000';
    const CURRICULUM_ORANGE = 'FFFFEDD5';
    const CURRICULUM_ORANGE_FONT = 'FF9A3412';
    const CURRICULUM_BLACK = 'FF000000';

    function curriculumBoldBorder() {
        return {
            top: { style: 'medium', color: { argb: CURRICULUM_BLACK } },
            left: { style: 'medium', color: { argb: CURRICULUM_BLACK } },
            bottom: { style: 'medium', color: { argb: CURRICULUM_BLACK } },
            right: { style: 'medium', color: { argb: CURRICULUM_BLACK } }
        };
    }

    function curriculumThinBorder() {
        return {
            top: { style: 'thin', color: { argb: CURRICULUM_BLACK } },
            left: { style: 'thin', color: { argb: CURRICULUM_BLACK } },
            bottom: { style: 'thin', color: { argb: CURRICULUM_BLACK } },
            right: { style: 'thin', color: { argb: CURRICULUM_BLACK } }
        };
    }

    function buildCurriculumSheet(workbook, programName, isBridgingSheet = false) {
        const program = State.db.programs?.[programName];
        if (!program || !program.subjects) return null;

        // Check if there are any subjects of this type before creating the sheet
        let subjectCount = 0;
        Object.keys(program.subjects).forEach(yearKey => {
            Object.keys(program.subjects[yearKey]).forEach(semKey => {
                program.subjects[yearKey][semKey].forEach(subject => {
                    const isBridging = typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(programName, subject.name);
                    if (isBridgingSheet ? isBridging : !isBridging) subjectCount++;
                });
            });
        });
        if (subjectCount === 0) return null; // Do not create empty sheets

        let sheetName = String(programName).replace(/[\\/*?:\[\]]/g, ' ').trim().slice(0, 18) || 'Curriculum';
        if (isBridgingSheet) sheetName += ' - Bridging';
        const worksheet = baseWorksheet(workbook, sheetName);

        // Column widths: Subject Code | Description | Lec | Lab | Section | Room No. | Professor | Day | Time
        worksheet['!cols'] = [
            { wch: 16 }, { wch: 50 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 22 }
        ];
        const colWidths = [16, 50, 8, 8, 14, 14, 22, 14, 22];
        colWidths.forEach((w, i) => { worksheet.getColumn(i + 1).width = w; });

        const context = selectedContext();
        let currentRow = 1;

        // ===== TITLE ROW (Red background, white bold text) =====
        worksheet.mergeCells(currentRow, 1, currentRow, 9);
        const titleCell = worksheet.getCell(currentRow, 1);
        titleCell.value = `${programFullName(programName)}(PARAÑAQUE CAMPUS)`;
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: WHITE } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CURRICULUM_RED } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        titleCell.border = curriculumBoldBorder();
        worksheet.getRow(currentRow).height = 35;
        currentRow++;

        // Iterate semesters
        const semesterOrder = ['1st Semester', '2nd Semester', 'Summer'];
        const yearOrder = Object.keys(program.subjects).sort();

        const semesterKeys = new Set();
        yearOrder.forEach(yearKey => {
            Object.keys(program.subjects[yearKey] || {}).forEach(semKey => semesterKeys.add(semKey));
        });

        semesterOrder.forEach(semLabel => {
            // Check if any year has this semester
            const matchingSemKey = Array.from(semesterKeys).find(k =>
                k === semLabel || k === semLabel.replace(' Semester', '') ||
                (semLabel === '1st Semester' && (k === '1' || k === '1st Semester')) ||
                (semLabel === '2nd Semester' && (k === '2' || k === '2nd Semester')) ||
                (semLabel === 'Summer' && (k === '3' || k === 'Summer'))
            );
            if (!matchingSemKey) return;

            // Check if any year actually has subjects for this semester
            const hasSubjects = yearOrder.some(yearKey =>
                program.subjects[yearKey]?.[matchingSemKey]?.length > 0
            );
            if (!hasSubjects) return;

            // ===== SEMESTER HEADER (bold, no background) =====
            worksheet.mergeCells(currentRow, 1, currentRow, 9);
            const semCell = worksheet.getCell(currentRow, 1);
            semCell.value = semLabel;
            semCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: CURRICULUM_BLACK } };
            semCell.alignment = { horizontal: 'left', vertical: 'middle' };
            worksheet.getRow(currentRow).height = 25;
            currentRow++;

            yearOrder.forEach(yearKey => {
                const subjects = program.subjects[yearKey]?.[matchingSemKey];
                if (!subjects || subjects.length === 0) return;

                // Filter subjects based on sheet type
                const filteredSubjects = subjects.filter(subject => {
                    const isBridging = typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(programName, subject.name);
                    return isBridgingSheet ? isBridging : !isBridging;
                });

                if (filteredSubjects.length === 0) return;

                // ===== YEAR LEVEL HEADER (Yellow background) =====
                worksheet.mergeCells(currentRow, 1, currentRow, 9);
                const yearCell = worksheet.getCell(currentRow, 1);
                yearCell.value = yearKey;
                yearCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: CURRICULUM_BLACK } };
                yearCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CURRICULUM_YELLOW } };
                yearCell.alignment = { horizontal: 'left', vertical: 'middle' };
                yearCell.border = curriculumBoldBorder();
                worksheet.getRow(currentRow).height = 22;
                currentRow++;

                // ===== COLUMN HEADERS (Green background, white bold text) =====
                const headers = ['Subject\nCode', 'Description', 'Lec', 'Lab', 'Section', 'Room No.', 'Professor', 'Day', 'Time'];
                const headerRow = worksheet.getRow(currentRow);
                headerRow.height = 30;
                headers.forEach((header, index) => {
                    const cell = headerRow.getCell(index + 1);
                    cell.value = header;
                    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: WHITE } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CURRICULUM_GREEN } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = curriculumBoldBorder();
                });
                currentRow++;

                // Get all sections for this program
                const sections = program.sections || [];

                // Extract year level number (e.g. "First Year" -> 1)
                const yearMatch = yearKey.match(/first|1st/i) ? 1 :
                                  yearKey.match(/second|2nd/i) ? 2 :
                                  yearKey.match(/third|3rd/i) ? 3 :
                                  yearKey.match(/fourth|4th/i) ? 4 :
                                  yearKey.match(/fifth|5th/i) ? 5 : 0;
                
                // Find sections belonging to this year level (e.g. BSHM 1-1, BSHM 1-2)
                let yearSections = sections.filter(sec => sec.match(new RegExp(`(?:^|\\s|-)${yearMatch}-\\d+\\b`)));
                if (yearSections.length === 0) yearSections = [''];

                // ===== SECTION BLOCKS =====
                yearSections.forEach((sectionName, index) => {
                    filteredSubjects.forEach(subject => {
                        const subjectName = subject.name || '';
                        const parts = subjectParts(subjectName);
                        const hours = typeof getSubjectHourParts === 'function' ? getSubjectHourParts(subject) : { lec: Number(subject.units) || 0, lab: 0 };
                        const isBridging = isBridgingSheet;

                        // Find load assigned to this section
                        const load = (State.db.loads || []).find(l =>
                            l.sub === subjectName &&
                            l.program === programName &&
                            l.sy === context.schoolYear &&
                            isMatchingSemester(l, context.semester) &&
                            (!sectionName || l.sec === sectionName)
                        );

                        const row = worksheet.getRow(currentRow);
                        row.height = 20;

                        // Fill in values
                        row.getCell(1).value = parts.code;
                        row.getCell(2).value = isBridging ? `[BRIDGING] ${parts.title === parts.code ? subjectName : parts.title}` : (parts.title === parts.code ? subjectName : parts.title);
                        row.getCell(3).value = hours.lec;
                        row.getCell(4).value = hours.lab;
                        row.getCell(5).value = sectionName || '';
                        row.getCell(6).value = load ? load.room || '' : '';
                        row.getCell(7).value = load ? load.prof || '' : '';
                        row.getCell(8).value = load ? load.day || '' : '';
                        row.getCell(9).value = load ? load.time || '' : '';

                        // Style cells
                        for (let col = 1; col <= 9; col++) {
                            const cell = row.getCell(col);
                            cell.font = { name: 'Segoe UI', size: 10, color: { argb: isBridging ? CURRICULUM_ORANGE_FONT : CURRICULUM_BLACK }, bold: col <= 2 };
                            cell.alignment = { horizontal: col <= 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
                            cell.border = curriculumThinBorder();

                            if (isBridging) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CURRICULUM_ORANGE } };
                            }
                        }

                        // Center Lec/Lab numbers
                        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

                        currentRow++;
                    });
                    
                    // Add spacer between section blocks of the same year
                    if (index < yearSections.length - 1 && yearSections[0] !== '') {
                        currentRow++; 
                    }
                });

                // Spacer row between year levels
                currentRow++;
            });
        });

        // Auto-fit columns based on text length to prevent broken names/wrapping
        for (let col = 1; col <= 9; col++) {
            let maxLength = col === 2 ? 30 : 12; // Default minimum widths
            
            for (let row = 1; row <= currentRow; row++) {
                const cell = worksheet.getCell(row, col);
                
                // Skip the first row (Title) entirely for width calculation to prevent Col 1 from becoming massive
                if (row === 1) continue;
                
                // Skip merged header rows (Semester/Year) which only have a value in Col 1
                if (col === 1 && worksheet.getCell(row, 2).value === null) continue;

                if (cell.value) {
                    const text = String(cell.value);
                    if (text.length > maxLength) {
                        maxLength = text.length;
                    }
                }
            }
            // Apply the max length with some padding, capped at 75 to prevent ridiculously wide columns
            worksheet.getColumn(col).width = Math.min(maxLength + 3, 75);
        }

        return worksheet;
    }

    function exportProgramCurriculum(programName) {
        if (!ensureExcelJS()) return;
        const selected = String(programName || State.activeProgram || '').trim();
        const isAll = selected.toLowerCase() === 'all';

        const workbook = new ExcelJS.Workbook();
        const allProgramKeys = Object.keys(State.db.programs || {});

        if (isAll) {
            if (allProgramKeys.length === 0) return showBanner('No programs found.', 'error');
            allProgramKeys.sort().forEach(name => {
                buildCurriculumSheet(workbook, name, false);
                buildCurriculumSheet(workbook, name, true);
            });
            saveWorkbook(workbook, `Course_Curriculum_All_Programs_${new Date().toISOString().split('T')[0]}`);
        } else {
            // Case-insensitive key resolution
            const resolvedKey = allProgramKeys.find(k => k.toLowerCase() === selected.toLowerCase()) || selected;
            if (!State.db.programs?.[resolvedKey]) {
                return showBanner(`Program "${selected}" not found. Available: ${allProgramKeys.join(', ') || 'none'}`, 'error');
            }
            buildCurriculumSheet(workbook, resolvedKey, false);
            buildCurriculumSheet(workbook, resolvedKey, true);
            saveWorkbook(workbook, `Course_Curriculum_${safeFilename(resolvedKey)}_${new Date().toISOString().split('T')[0]}`);
        }
    }

    window.exportFacultyWorkload = exportFacultyWorkload;
    window.buildFacultyWorkloadWorkbookBuffer = buildFacultyWorkloadWorkbookBuffer;
    window.exportProgramSchedule = exportProgramSchedule;
    window.exportAllProgramSchedules = exportAllProgramSchedules;
    window.exportFacultyWorkloadReport = exportFacultyWorkloadReport;
    window.exportFacultyWorkloadCategory = exportFacultyWorkloadCategory;
    window.exportRoomSchedule = exportRoomSchedule;
    window.exportAllRoomSchedules = exportAllRoomSchedules;
    window.exportSectionTimetable = exportSectionTimetable;
    window.buildSectionTimetableWorkbookBuffer = buildSectionTimetableWorkbookBuffer;
    window.exportAllSectionTimetables = exportAllSectionTimetables;
    window.exportFacultyProfileExcel = exportFacultyProfileExcel;
    window.exportProgramCurriculum = exportProgramCurriculum;
    window.exportFacultyWorkloadSummarySheet = exportFacultyWorkloadSummarySheet;

    function renderExportProgramMenus() {
        renderFacultyRosterProgramOptions();
        renderProgramCurriculumOptions();
        attachCurriculumDropdownRefresh();
        attachRosterDropdownRefresh();
    }

    document.addEventListener('DOMContentLoaded', renderExportProgramMenus);
    window.addEventListener('appStateLoaded', renderExportProgramMenus);
    window.addEventListener('programsUpdated', () => {
        renderProgramCurriculumOptions();
        renderFacultyRosterProgramOptions();
    });
})();
