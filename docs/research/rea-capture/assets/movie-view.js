(function (window, document) {
    'use strict';
    if (window.NguoncPublicMovieView) return;
    window.NguoncPublicMovieView = { version: '20260923.316' };

    var storageKey = 'nguonc:public:movie-view';
    var attribute = 'data-nc-movie-view';
    var buttonSelector = '.nc-view-switch button[data-nc-view-choice]';
    var selected = 'list';
    var started = false;
    var scheduled = false;

    function valid(value) {
        return value === 'list' || value === 'grid';
    }

    function closest(target, selector) {
        // Some browsers report a text node for a click on a button label.
        if (target && target.nodeType === 3) target = target.parentElement;
        return target && typeof target.closest === 'function' ? target.closest(selector) : null;
    }

    function syncButtons() {
        var buttons = document.querySelectorAll(buttonSelector);
        Array.prototype.forEach.call(buttons, function (button) {
            var pressed = button.getAttribute('data-nc-view-choice') === selected ? 'true' : 'false';
            if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
        });
    }

    function apply(value) {
        selected = valid(value) ? value : 'list';
        if (document.documentElement.getAttribute(attribute) !== selected) {
            document.documentElement.setAttribute(attribute, selected);
        }
        syncButtons();
    }

    function scheduleSync() {
        if (scheduled) return;
        scheduled = true;
        var run = function () {
            scheduled = false;
            syncButtons();
        };
        if (window.requestAnimationFrame) window.requestAnimationFrame(run);
        else window.setTimeout(run, 0);
    }

    function addedSwitch(node) {
        if (!node || node.nodeType !== 1) return false;
        return !!(closest(node, '.nc-view-switch') || node.querySelector('.nc-view-switch'));
    }

    function start() {
        if (started) return;
        started = true;
        var initial = document.documentElement.getAttribute(attribute);
        try {
            initial = window.localStorage.getItem(storageKey);
        } catch (_) { /* Keep the head bootstrap state when storage is blocked. */ }
        apply(initial);

        document.addEventListener('click', function (event) {
            var button = closest(event.target, 'button[data-nc-view-choice]');
            if (!button || !closest(button, '.nc-view-switch') || button.disabled || event.defaultPrevented ||
                (typeof event.button === 'number' && event.button !== 0)) return;
            var value = button.getAttribute('data-nc-view-choice');
            if (!valid(value)) return;
            event.preventDefault();
            var changed = selected !== value;
            apply(value);
            if (changed) {
                try { window.localStorage.setItem(storageKey, value); }
                catch (_) { /* The in-memory selection still works for AJAX navigation. */ }
            }
        });

        var content = document.getElementById('content');
        if (content && window.MutationObserver) {
            // Hn_Framework replaces the contents of #content, not the element.
            // The html attribute keeps the layout; only new buttons need syncing.
            var observer = new window.MutationObserver(function (records) {
                for (var i = 0; i < records.length; i++) {
                    var nodes = records[i].addedNodes;
                    for (var j = 0; j < nodes.length; j++) {
                        if (addedSwitch(nodes[j])) {
                            scheduleSync();
                            return;
                        }
                    }
                }
            });
            observer.observe(content, { childList: true, subtree: true });
        } else if (window.jQuery) {
            // Older browsers already use jQuery for the site's AJAX navigation.
            window.jQuery(document).on('ajaxComplete.ncPublicMovieView', scheduleSync);
        }

        window.addEventListener('storage', function (event) {
            if (event.key !== storageKey && event.key !== null) return;
            try {
                if (event.storageArea && event.storageArea !== window.localStorage) return;
            } catch (_) { return; }
            apply(event.key === null ? 'list' : event.newValue);
        });
        window.addEventListener('pageshow', syncButtons);
        document.documentElement.setAttribute('data-nc-movie-view-ready', 'true');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})(window, document);
