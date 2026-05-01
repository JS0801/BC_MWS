/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
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
        'recmachcustrecord_bc_te_dailylog',
        'recmachcustrecord_bc_eq_dailylog',
        'recmachcustrecord_bc_ue_dailylog'
    ];

    var EXTRA_BUTTON_IDS = ['attach'];
    // ---------------------------------------------------------------------

    // Existing Classic Center logic - unchanged
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

    // Existing Classic Center logic - unchanged
    function injectStyle() {
        var existing = document.getElementById('hide-bc-dailylog-style');
        if (existing) return;

        var style = document.createElement('style');
        style.id = 'hide-bc-dailylog-style';
        style.textContent = buildCssRules();

        (document.head || document.documentElement).appendChild(style);

        console.log(TAG, 'Classic CSS rules injected');
    }

    // Existing Classic Center logic - unchanged
    function hideDataCells() {
        var totals = {
            headersFound: 0,
            cellsHiddenThisPass: 0
        };

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

    // New Employee Center CSS
    function buildEmployeeCenterCssRules() {
        var selectors = [];

        SUBLISTS.forEach(function (s) {
            // New button wrapper and button
            selectors.push('#tr_newrec' + s);
            selectors.push('#newrec' + s);
            selectors.push('[id="tr_newrec' + s + '"]');
            selectors.push('[id="newrec' + s + '"]');
            selectors.push('[name="newrec' + s + '"]');

            // Edit / Remove headers
            selectors.push('[data-nsps-id="columnheader_' + s + '_Custom_EDIT_raw"]');
            selectors.push('[data-nsps-id="columnheader_' + s + '_REMOVE_raw"]');
        });

        // Attach wrapper and button
        selectors.push('td[data-button-id="attach"]');
        selectors.push('#tbl_attach');
        selectors.push('#tr_attach');
        selectors.push('#attach');
        selectors.push('[name="attach"]');

        return selectors.join(',\\n') + ' { display: none !important; visibility: hidden !important; pointer-events: none !important; }';
    }

    // New Employee Center CSS injection
    function injectEmployeeCenterStyle() {
        var existing = document.getElementById('hide-bc-dailylog-employee-center-style');
        if (existing) return;

        var style = document.createElement('style');
        style.id = 'hide-bc-dailylog-employee-center-style';
        style.textContent = buildEmployeeCenterCssRules();

        (document.head || document.documentElement).appendChild(style);

        console.log(TAG, 'Employee Center CSS rules injected');
    }

    // New Employee Center logic
    function hideEmployeeCenterActions() {
        var totals = {
            newButtonsHidden: 0,
            attachHidden: 0,
            headersFound: 0,
            cellsHiddenThisPass: 0
        };

        function forceHide(el) {
            if (!el) return false;

            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');

            return true;
        }

        function hideColumnByHeader(header) {
            if (!header) return;

            totals.headersFound++;

            var colIndex = header.cellIndex;
            var table = header.closest('table');

            forceHide(header);

            if (!table || colIndex < 0) return;

            table.querySelectorAll('tr').forEach(function (tr) {
                var cell = tr.cells && tr.cells[colIndex];

                if (cell) {
                    forceHide(cell);
                    totals.cellsHiddenThisPass++;
                }
            });
        }

        SUBLISTS.forEach(function (s) {

            // Hide Employee Center New button wrapper
            var newWrapper = document.getElementById('tr_newrec' + s);
            if (forceHide(newWrapper)) {
                totals.newButtonsHidden++;
            }

            // Hide Employee Center New button
            var newBtn = document.getElementById('newrec' + s);
            if (forceHide(newBtn)) {
                totals.newButtonsHidden++;
            }

            // Extra fallback by name
            var newBtnByName = document.querySelector('[name="newrec' + s + '"]');
            if (forceHide(newBtnByName)) {
                totals.newButtonsHidden++;
            }

            // Hide Edit column
            var editHeader = document.querySelector(
                '[data-nsps-id="columnheader_' + s + '_Custom_EDIT_raw"]'
            );
            hideColumnByHeader(editHeader);

            // Hide Remove column
            var removeHeader = document.querySelector(
                '[data-nsps-id="columnheader_' + s + '_REMOVE_raw"]'
            );
            hideColumnByHeader(removeHeader);
        });

        // Hide Attach wrapper td
        var attachTd = document.querySelector('td[data-button-id="attach"]');
        if (forceHide(attachTd)) {
            totals.attachHidden++;
        }

        // Hide Attach table wrapper
        var attachTable = document.getElementById('tbl_attach');
        if (forceHide(attachTable)) {
            totals.attachHidden++;
        }

        // Hide Attach div wrapper
        var attachWrapper = document.getElementById('tr_attach');
        if (forceHide(attachWrapper)) {
            totals.attachHidden++;
        }

        // Hide Attach button
        var attachBtn = document.getElementById('attach');
        if (forceHide(attachBtn)) {
            totals.attachHidden++;
        }

        // Extra fallback by name
        var attachByName = document.querySelector('[name="attach"]');
        if (forceHide(attachByName)) {
            totals.attachHidden++;
        }

        return totals;
    }

    function applyAll(reason) {
        // Existing Classic Center logic
        injectStyle();
        var classicResult = hideDataCells();

        // New Employee Center logic
        injectEmployeeCenterStyle();
        var employeeResult = hideEmployeeCenterActions();

        if (
            classicResult.cellsHiddenThisPass > 0 ||
            employeeResult.newButtonsHidden > 0 ||
            employeeResult.attachHidden > 0 ||
            employeeResult.cellsHiddenThisPass > 0
        ) {
            console.log(TAG, 'apply (' + reason + ')', {
                classicCenter: classicResult,
                employeeCenter: employeeResult
            });
        }

        return {
            classicCenter: classicResult,
            employeeCenter: employeeResult
        };
    }

    // First run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            applyAll('DOMContentLoaded');
        });
    } else {
        applyAll('immediate');
    }

    // MutationObserver
    var debounceTimer = null;

    var observer = new MutationObserver(function () {
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

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log(TAG, 'MutationObserver started');
    }

    startObserver();

    // Initial retries
    var tries = 0;
    var maxTries = 30;

    var iv = setInterval(function () {
        tries++;
        applyAll('retry-' + tries);

        if (tries >= maxTries) {
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

    return {
        beforeLoad: beforeLoad
    };
});