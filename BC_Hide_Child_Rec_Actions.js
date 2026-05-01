/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * For each configured sublist, hides:
 *   - The "New ..." button at the top of the sublist
 *   - The Edit column (header + every data cell)
 *   - The Remove column (header + every data cell)
 *
 * Also hides the standalone "Attach" button.
 *
 * To add another sublist, just add its sublist id (e.g. "recmachcustrecord_xxx")
 * to the SUBLISTS array in the inline script below.
 *
 * Logging:
 *   - Server: N/log entries in the Script Execution Log
 *   - Client: console.* messages prefixed with [HideBCDailyLog] in browser DevTools
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/log'], (serverWidget, runtime, log) => {

    const TAG = 'HideBCDailyLog';

    const beforeLoad = (context) => {
        log.debug({
            title: TAG + ' beforeLoad entered',
            details: {
                eventType: context.type,
                executionContext: runtime.executionContext,
                recordType: context.newRecord && context.newRecord.type,
                recordId: context.newRecord && context.newRecord.id
            }
        });

        if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
            log.debug(TAG, 'Skipping: not a UI context (' + runtime.executionContext + ')');
            return;
        }

        const form = context.form;

        const html = `
<script>
(function () {
    var TAG = '[HideBCDailyLog]';
    console.log(TAG, 'inline script loaded at', new Date().toISOString(), 'readyState=', document.readyState);

    // Add new sublist ids here to extend coverage.
    var SUBLISTS = [
        'recmachcustrecord_bc_te_dailylog',  // Time Entry
        'recmachcustrecord_bc_eq_dailylog',  // Equipment
        'recmachcustrecord_bc_ue_dailylog'   // Unit Entry
    ];

    // Standalone buttons not tied to a specific sublist's "newrec..." pattern.
    var EXTRA_BUTTON_IDS = ['attach'];

    // Build derived target lists from config.
    function newButtonId(sublistId)  { return 'newrec' + sublistId; }
    function editHeaderNsps(sublistId)   { return 'columnheader_' + sublistId + '_Custom_EDIT_raw'; }
    function removeHeaderNsps(sublistId) { return 'columnheader_' + sublistId + '_REMOVE_raw'; }

    function hideButton(id) {
        var el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
            el.style.display = 'none';
            console.log(TAG, 'hid button #' + id);
        }
        return !!el;
    }

    function hideColumnByHeaderNspsId(nspsId) {
        var header = document.querySelector('[data-nsps-id="' + nspsId + '"]');
        if (!header) {
            return { nspsId: nspsId, headerFound: false, tableFound: false, colIndex: -1, cellsHidden: 0, totalCells: 0 };
        }

        var colIndex = header.cellIndex; // native DOM column index
        var table = header.closest('table');
        if (!table || colIndex < 0) {
            return { nspsId: nspsId, headerFound: true, tableFound: !!table, colIndex: colIndex, cellsHidden: 0, totalCells: 0 };
        }

        if (header.style.display !== 'none') {
            header.style.display = 'none';
            console.log(TAG, 'hid header', nspsId, '(col index ' + colIndex + ')');
        }

        var hidden = 0;
        var total = 0;
        table.querySelectorAll('tr').forEach(function (tr) {
            var cell = tr.cells && tr.cells[colIndex];
            if (cell && cell !== header) {
                total++;
                if (cell.style.display !== 'none') {
                    cell.style.display = 'none';
                    hidden++;
                }
            }
        });

        return { nspsId: nspsId, headerFound: true, tableFound: true, colIndex: colIndex, cellsHidden: hidden, totalCells: total };
    }

    function pass(reason) {
        var buttons = {};
        SUBLISTS.forEach(function (s) { buttons[newButtonId(s)] = hideButton(newButtonId(s)); });
        EXTRA_BUTTON_IDS.forEach(function (id) { buttons[id] = hideButton(id); });

        var columns = [];
        SUBLISTS.forEach(function (s) {
            columns.push(hideColumnByHeaderNspsId(editHeaderNsps(s)));
            columns.push(hideColumnByHeaderNspsId(removeHeaderNsps(s)));
        });

        var summary = { reason: reason, buttons: buttons, columns: columns };
        console.log(TAG, 'pass complete', summary);
        return summary;
    }

    function allDone(s) {
        var buttonsOk = Object.keys(s.buttons).every(function (k) { return s.buttons[k]; });
        var columnsOk = s.columns.every(function (c) { return c.headerFound && c.tableFound; });
        return buttonsOk && columnsOk;
    }

    // Initial pass
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { pass('DOMContentLoaded'); });
    } else {
        pass('immediate');
    }

    // Retry passes - sublists often render after first paint
    var tries = 0;
    var maxTries = 16;
    var iv = setInterval(function () {
        tries++;
        var s = pass('retry-' + tries);
        if (allDone(s)) {
            console.log(TAG, 'all targets located, stopping retries after', tries, 'tries');
            clearInterval(iv);
        } else if (tries >= maxTries) {
            console.warn(TAG, 'gave up after', tries, 'tries. Final state:', s);
            clearInterval(iv);
        }
    }, 250);
})();
</script>
        `;

        const inline = form.addField({
            id: 'custpage_hide_bc_dailylog_ui',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
        });
        inline.defaultValue = html;

        log.debug(TAG, 'inline HTML field injected');
    };

    return { beforeLoad };
});