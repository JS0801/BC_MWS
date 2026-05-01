/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Hides on the parent record:
 *   - "New BlueCollar Daily Log Time Entry" button
 *   - "Attach" button (on the recmachcustrecord_bc_te_dailylog sublist)
 *   - The Edit column (header + every data cell) on that sublist
 *   - The Remove column (header + every data cell) on that sublist
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
<style>
    /* Buttons */
    #newrecrecmachcustrecord_bc_te_dailylog,
    #attach {
        display: none !important;
    }
</style>
<script>
(function () {
    var TAG = '[HideBCDailyLog]';
    console.log(TAG, 'inline script loaded at', new Date().toISOString(), 'readyState=', document.readyState);

    var COLUMNS_TO_HIDE = [
        'columnheader_recmachcustrecord_bc_te_dailylog_Custom_EDIT_raw',
        'columnheader_recmachcustrecord_bc_te_dailylog_REMOVE_raw'
    ];

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

        var colIndex = header.cellIndex; // native DOM index of this <td> in its <tr>
        var table = header.closest('table');
        if (!table || colIndex < 0) {
            return { nspsId: nspsId, headerFound: true, tableFound: !!table, colIndex: colIndex, cellsHidden: 0, totalCells: 0 };
        }

        // Hide the header itself
        if (header.style.display !== 'none') {
            header.style.display = 'none';
            console.log(TAG, 'hid header', nspsId, '(col index ' + colIndex + ')');
        }

        // Hide every cell at the same column index in all rows of THIS table
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
        var summary = {
            reason: reason,
            buttons: {
                'newrecrecmachcustrecord_bc_te_dailylog': hideButton('newrecrecmachcustrecord_bc_te_dailylog'),
                'attach': hideButton('attach')
            },
            columns: COLUMNS_TO_HIDE.map(hideColumnByHeaderNspsId)
        };
        console.log(TAG, 'pass complete', summary);
        return summary;
    }

    // Initial pass
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { pass('DOMContentLoaded'); });
    } else {
        pass('immediate');
    }

    // Retry passes - sublist often renders after first paint, and rows can be
    // added/refreshed via inline edit
    var tries = 0;
    var maxTries = 12;
    var iv = setInterval(function () {
        tries++;
        var s = pass('retry-' + tries);
        var allColumnsHandled = s.columns.every(function (c) { return c.headerFound && c.tableFound; });
        var bothButtons = s.buttons.newrecrecmachcustrecord_bc_te_dailylog && s.buttons.attach;
        if (allColumnsHandled && bothButtons) {
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