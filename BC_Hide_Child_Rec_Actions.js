/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Hide child record actions for Classic Center and Employee Center.
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

    // Existing Classic Center logic
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

    // Existing Classic Center logic
    function injectStyle() {
        var existing = document.getElementById('hide-bc-dailylog-style');
        if (existing) return;

        var style = document.createElement('style');
        style.id = 'hide-bc-dailylog-style';
        style.textContent = buildCssRules();

        (document.head || document.documentElement).appendChild(style);

        console.log(TAG, 'CSS rules injected');
    }

    // Existing Classic Center logic
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

    // New Employee Center logic
    function hideEmployeeCenterActions() {
        var totals = {
            employeeNewButtonsHidden: 0,
            employeeAttachHidden: 0,
            employeeHeadersFound: 0,
            employeeCellsHiddenThisPass: 0
        };

        function hideElement(el) {
            if (!el) return false;

            if (el.style.display !== 'none') {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.pointerEvents = 'none';
                return true;
            }

            return false;
        }

        function hideColumnByHeader(header) {
            if (!header) return;

            totals.employeeHeadersFound++;

            var colIndex = header.cellIndex;
            var table = header.closest('table');

            if (!table || colIndex < 0) return;

            table.querySelectorAll('tr').forEach(function (tr) {
                var cell = tr.cells && tr.cells[colIndex];

                if (cell && cell.style.display !== 'none') {
                    cell.style.display = 'none';
                    totals.employeeCellsHiddenThisPass++;
                }
            });
        }

        SUBLISTS.forEach(function (s) {

            // Employee Center New button
            // Example: newrecrecmachcustrecord_bc_te_dailylog
            var newBtn = document.getElementById('newrec' + s);

            if (hideElement(newBtn)) {
                totals.employeeNewButtonsHidden++;
            }

            // Employee Center fallback by name
            var newBtnByName = document.querySelector('[name="newrec' + s + '"]');

            if (hideElement(newBtnByName)) {
                totals.employeeNewButtonsHidden++;
            }

            // Employee Center fallback by data-nsps-label
            var newBtnByLabel = document.querySelector('[data-nsps-label^="New"][id="newrec' + s + '"]');

            if (hideElement(newBtnByLabel)) {
                totals.employeeNewButtonsHidden++;
            }

            // Employee Center Edit header
            var editHeader = document.querySelector(
                '[data-nsps-id="columnheader_' + s + '_Custom_EDIT_raw"]'
            );

            hideColumnByHeader(editHeader);

            // Employee Center Remove header
            var removeHeader = document.querySelector(
                '[data-nsps-id="columnheader_' + s + '_REMOVE_raw"]'
            );

            hideColumnByHeader(removeHeader);
        });

        // Employee Center Attach wrapper
        var attachWrapper = document.getElementById('tr_attach');

        if (hideElement(attachWrapper)) {
            totals.employeeAttachHidden++;
        }

        // Employee Center Attach button direct
        var attachBtn = document.getElementById('attach');

        if (hideElement(attachBtn)) {
            totals.employeeAttachHidden++;
        }

        // Employee Center Attach button fallback by name
        var attachByName = document.querySelector('[name="attach"]');

        if (hideElement(attachByName)) {
            totals.employeeAttachHidden++;
        }

        return totals;
    }

    // Combined apply function
    function applyAll(reason) {
        injectStyle();

        // Existing Classic Center logic
        var t = hideDataCells();

        // New Employee Center logic
        var emp = hideEmployeeCenterActions();

        if (
            t.cellsHiddenThisPass > 0 ||
            emp.employeeNewButtonsHidden > 0 ||
            emp.employeeAttachHidden > 0 ||
            emp.employeeCellsHiddenThisPass > 0
        ) {
            console.log(TAG, 'apply (' + reason + ')', {
                classicCenter: t,
                employeeCenter: emp
            });
        }

        return {
            classicCenter: t,
            employeeCenter: emp
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

    // MutationObserver — re-hide data cells whenever DOM changes
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

    // Initial retries while page builds out
    var tries = 0;
    var maxTries = 20;

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