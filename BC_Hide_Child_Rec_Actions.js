/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/log'], (serverWidget, runtime, log) => {

    const TAG = 'HideBCDailyLog';

    const beforeLoad = (context) => {
        try {
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
                log.debug(TAG, 'Skipping: not UI context');
                return;
            }

            const form = context.form;

            const html = `
<script>
(function () {
    var TAG = '[HideBCDailyLog]';
    console.log(TAG, 'script loaded', new Date().toISOString());

    var SUBLISTS = [
        'recmachcustrecord_bc_te_dailylog',
        'recmachcustrecord_bc_eq_dailylog',
        'recmachcustrecord_bc_ue_dailylog'
    ];

    var EXTRA_BUTTON_IDS = ['attach'];

    function hideElement(el) {
        if (!el) return false;

        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';

        return true;
    }

    function safeText(el) {
        if (!el) return '';
        return (el.innerText || el.textContent || el.value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    function containsSublistId(el, sublistId) {
        if (!el) return false;

        var cur = el;
        var count = 0;

        while (cur && count < 12) {
            var id = cur.id || '';
            var nsps = cur.getAttribute && (
                cur.getAttribute('data-nsps-id') ||
                cur.getAttribute('name') ||
                cur.getAttribute('data-name') ||
                ''
            );

            if (id.indexOf(sublistId) !== -1 || nsps.indexOf(sublistId) !== -1) {
                return true;
            }

            cur = cur.parentNode;
            count++;
        }

        return false;
    }

    function hideNewButtons() {
        var hidden = 0;

        for (var i = 0; i < SUBLISTS.length; i++) {
            var s = SUBLISTS[i];

            var selectors = [
                '#newrec' + s,
                '#new' + s,
                '[id="newrec' + s + '"]',
                '[id*="newrec' + s + '"]',
                '[id*="' + s + '"][id*="new"]',
                '[data-nsps-id*="' + s + '"][data-nsps-id*="new"]'
            ];

            for (var x = 0; x < selectors.length; x++) {
                var els = document.querySelectorAll(selectors[x]);
                for (var e = 0; e < els.length; e++) {
                    if (hideElement(els[e])) hidden++;
                }
            }

            var btns = document.querySelectorAll('input, button, a');
            for (var b = 0; b < btns.length; b++) {
                var txt = safeText(btns[b]);

                if (
                    containsSublistId(btns[b], s) &&
                    (
                        txt === 'new' ||
                        txt.indexOf('new ') === 0 ||
                        txt.indexOf('add') === 0
                    )
                ) {
                    if (hideElement(btns[b])) hidden++;
                }
            }
        }

        return hidden;
    }

    function hideAttachButton() {
        var hidden = 0;

        for (var i = 0; i < EXTRA_BUTTON_IDS.length; i++) {
            var byId = document.getElementById(EXTRA_BUTTON_IDS[i]);
            if (hideElement(byId)) hidden++;
        }

        var els = document.querySelectorAll('input, button, a');
        for (var x = 0; x < els.length; x++) {
            var txt = safeText(els[x]);

            if (txt === 'attach') {
                if (hideElement(els[x])) hidden++;
            }
        }

        return hidden;
    }

    function findHeaderByNsps(sublistId, columnKey) {
        var possibleIds = [];

        if (columnKey === 'edit') {
            possibleIds = [
                'columnheader_' + sublistId + '_Custom_EDIT_raw',
                'columnheader_' + sublistId + '_EDIT_raw',
                'columnheader_' + sublistId + '_EDIT',
                'columnheader_' + sublistId + '_Custom_EDIT'
            ];
        }

        if (columnKey === 'remove') {
            possibleIds = [
                'columnheader_' + sublistId + '_REMOVE_raw',
                'columnheader_' + sublistId + '_REMOVE'
            ];
        }

        for (var i = 0; i < possibleIds.length; i++) {
            var header = document.querySelector('[data-nsps-id="' + possibleIds[i] + '"]');
            if (header) return header;
        }

        return null;
    }

    function hideColumnByHeader(header) {
        if (!header) return 0;

        var colIndex = header.cellIndex;
        var table = header.closest ? header.closest('table') : null;

        if (!table || colIndex < 0) return 0;

        var hidden = 0;
        var rows = table.querySelectorAll('tr');

        for (var r = 0; r < rows.length; r++) {
            var cell = rows[r].cells && rows[r].cells[colIndex];

            if (cell) {
                if (hideElement(cell)) hidden++;
            }
        }

        return hidden;
    }

    function hideColumnsByNsps() {
        var hidden = 0;

        for (var i = 0; i < SUBLISTS.length; i++) {
            var s = SUBLISTS[i];

            hidden += hideColumnByHeader(findHeaderByNsps(s, 'edit'));
            hidden += hideColumnByHeader(findHeaderByNsps(s, 'remove'));
        }

        return hidden;
    }

    function hideColumnsByTextFallback() {
        var hidden = 0;
        var headers = document.querySelectorAll('th, td');

        for (var i = 0; i < headers.length; i++) {
            var txt = safeText(headers[i]);

            if (txt !== 'edit' && txt !== 'remove') {
                continue;
            }

            for (var s = 0; s < SUBLISTS.length; s++) {
                if (containsSublistId(headers[i], SUBLISTS[s])) {
                    hidden += hideColumnByHeader(headers[i]);
                    break;
                }
            }
        }

        return hidden;
    }

    function injectCss() {
        if (document.getElementById('hide-bc-dailylog-style')) {
            return;
        }

        var css = '';

        for (var i = 0; i < SUBLISTS.length; i++) {
            var s = SUBLISTS[i];

            css += '#newrec' + s + ' { display:none !important; }\\n';
            css += '#new' + s + ' { display:none !important; }\\n';
            css += '[id*="newrec' + s + '"] { display:none !important; }\\n';
            css += '[data-nsps-id="columnheader_' + s + '_Custom_EDIT_raw"] { display:none !important; }\\n';
            css += '[data-nsps-id="columnheader_' + s + '_EDIT_raw"] { display:none !important; }\\n';
            css += '[data-nsps-id="columnheader_' + s + '_REMOVE_raw"] { display:none !important; }\\n';
        }

        css += '#attach { display:none !important; }\\n';

        var style = document.createElement('style');
        style.id = 'hide-bc-dailylog-style';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));

        (document.head || document.documentElement).appendChild(style);
    }

    function applyAll(reason) {
        injectCss();

        var result = {
            reason: reason,
            newButtonsHidden: hideNewButtons(),
            attachHidden: hideAttachButton(),
            nspsColumnsHidden: hideColumnsByNsps(),
            fallbackColumnsHidden: hideColumnsByTextFallback()
        };

        if (
            result.newButtonsHidden > 0 ||
            result.attachHidden > 0 ||
            result.nspsColumnsHidden > 0 ||
            result.fallbackColumnsHidden > 0
        ) {
            console.log(TAG, 'applied', result);
        }

        return result;
    }

    function start() {
        applyAll('start');

        var tries = 0;
        var maxTries = 40;

        var interval = setInterval(function () {
            tries++;
            applyAll('retry-' + tries);

            if (tries >= maxTries) {
                clearInterval(interval);
            }
        }, 250);

        var observerTimer = null;

        var observer = new MutationObserver(function () {
            if (observerTimer) return;

            observerTimer = setTimeout(function () {
                observerTimer = null;
                applyAll('mutation');
            }, 100);
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log(TAG, 'MutationObserver started');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

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

        } catch (e) {
            log.error(TAG + ' beforeLoad error', e);
        }
    };

    return {
        beforeLoad: beforeLoad
    };
});