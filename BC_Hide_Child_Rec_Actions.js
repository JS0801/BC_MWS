/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * For each configured sublist, hides:
 *   - The "New ..." button at the top of the sublist
 *   - The Edit column (header + every data cell)
 *   - The Remove column (header + every data cell)
 * Also hides the standalone "Attach" button.
 *
 * Survives tab switches / sublist re-renders via:
 *   - CSS rules injected into <head> (apply to any matching element forever)
 *   - A MutationObserver that re-hides data cells whenever DOM changes
 *
 * To add another sublist, append its sublist id to the SUBLISTS array.
 *
 * Logging:
 *   - Server: N/log entries in the Script Execution Log
 *   - Client: console.* messages prefixed with [HideBCDailyLog]
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

    // --- Configuration ---------------------------------------------------
    var SUBLISTS = [
        'recmachcustrecord_bc_te_dailylog',  // Time Entry
        'recmachcustrecord_bc_eq_dailylog',  // Equipment
        'recmachcustrecord_bc_ue_dailylog'   // Unit Entry
    ];
    var EXTRA_BUTTON_IDS = ['attach'];
    // ---------------------------------------------------------------------

    // Build CSS selectors that survive tab re-renders.
    // Buttons and column headers have stable IDs / data-nsps-id, so CSS handles them.
    function buildCssRules() {
        var selectors = [];
        SUBLISTS.forEach(function (s) {
            selectors.push('#newrec' + s);
            selectors.push('[data-nsps-id="columnheader_' + s + '_Custom_EDIT_raw"]');
            selectors.push('[data-nsps-id="columnheader_' + s + '_REMOVE_raw"]');
        });
        EXTRA_BUTTON_IDS.forEach(function (id) {
            selectors.push('#' + id);
        });
        return selectors.join(',\\n') + ' { display: none !important; }';
    }

    function injectStyle() {
        var existing = document.getElementById('hide-bc-dailylog-style');
        if (existing) return;
        var style = document.createElement('style');
        style.id = 'hide-bc-dailylog-style';
        style.textContent = buildCssRules();
        (document.head || document.documentElement).appendChild(style);
        console.log(TAG, 'CSS rules injected');
    }

    // Data cells in the sublist rows have no stable selector — we have to find
    // them by header cellIndex and hide them in JS.
    function hideDataCells() {
        var totals = { headersFound: 0, cellsHiddenThisPass: 0 };
        SUBLISTS.forEach(function (s) {
            ['Custom_EDIT_raw', 'REMOVE_raw'].forEach(function (suffix) {
                var nspsId = 'columnheader_' + s + '_' + suffix;
                var header = document.querySelector('[data-nsps-id="' + nspsId + '"]');
                if (!header) return;
                totals.headersFound++;
                var colIndex = header.cellIndex;
                var table = header.closest('table');
                if (!table || colIndex < 0) return;
                table.querySelectorAll('tr').forEach(function (tr) {
                    var cell = tr.cells && tr.cells[colIndex];
                    if (cell && cell !== header && cell.style.display !== 'none') {
                        cell.style.display = 'none';
                        totals.cellsHiddenThisPass++;
                    }
                });
            });
        });
        return totals;
    }

    function applyAll(reason) {
        injectStyle();
        var t = hideDataCells();
        if (t.cellsHiddenThisPass > 0) {
            console.log(TAG, 'apply (' + reason + ')', t);
        }
        return t;
    }

    // First run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyAll('DOMContentLoaded'); });
    } else {
        applyAll('immediate');
    }

    // MutationObserver — re-hide data cells whenever the DOM changes
    // (tab switches, inline-edit row inserts, sublist refreshes, etc.).
    // Debounced so we don't run on every keystroke.
    var debounceTimer = null;
    var observer = new MutationObserver(function (mutations) {
        if (debounceTimer) return;
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            applyAll('mutation');
        }, 50);
    });

    function startObserver() {
        if (!document.body) {
            setTimeout(startObserver, 50);
            return;
        }
        observer.observe(document.body, { childList: true, subtree: true });
        console.log(TAG, 'MutationObserver started');
    }
    startObserver();

    // Initial retries while the page builds out (in case observer misses the
    // very first paint or the body wasn't ready yet).
    var tries = 0;
    var maxTries = 20;
    var iv = setInterval(function () {
        tries++;
        applyAll('retry-' + tries);
        if (tries >= maxTries) clearInterval(iv);
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