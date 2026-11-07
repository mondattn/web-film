(function (window, document) {
    'use strict';
    if (window.NguoncPublicPagination) return;
    window.NguoncPublicPagination = { version: '20260923.316' };

    var rootSelector = '[data-nc-public-pagination]';
    var maxSafeInteger = 9007199254740991;

    function closest(target, selector) {
        return target && typeof target.closest === 'function' ? target.closest(selector) : null;
    }

    function pageNumber(raw) {
        if (!/^[0-9]+$/.test(raw)) return null;
        var value = Number(raw);
        return isFinite(value) && Math.floor(value) === value && value >= 1 && value <= maxSafeInteger ? value : null;
    }

    function clearError(input) {
        input.setCustomValidity('');
        input.removeAttribute('aria-invalid');
    }

    function navigate(url, root) {
        if (!root || root._ncPagePending) return;
        // Hn_Framework is a global lexical binding, not a window property.
        if (typeof Hn_Framework !== 'undefined' && typeof Hn_Framework.ajax_load === 'function') {
            root._ncPagePending = true;
            root.setAttribute('aria-busy', 'true');
            var requestUrl = typeof Hn_Framework.convert_url === 'function' ? Hn_Framework.convert_url(url) : url;
            var input = root.querySelector('.nc-page-input');
            var wasReadOnly = input ? input.readOnly : false;
            if (input) input.readOnly = true;
            var goButton = root.querySelector('.nc-page-go');
            var wasGoDisabled = goButton ? goButton.disabled : false;
            if (goButton) goButton.disabled = true;
            var arrows = root.querySelectorAll('a.nc-page-arrow');
            Array.prototype.forEach.call(arrows, function (arrow) { arrow.setAttribute('aria-disabled', 'true'); });
            var events = window.jQuery ? window.jQuery(document) : null;
            var release = function () {
                root._ncPagePending = false;
                root.removeAttribute('aria-busy');
                if (input) input.readOnly = wasReadOnly;
                if (goButton) goButton.disabled = wasGoDisabled;
                Array.prototype.forEach.call(arrows, function (arrow) { arrow.removeAttribute('aria-disabled'); });
                if (events) events.off('ajaxComplete.ncPublicPagination', onComplete);
            };
            var onComplete = function (event, xhr, settings) {
                if (!settings || !settings.url) return;
                try {
                    if (new URL(settings.url, window.location.href).href === new URL(requestUrl, window.location.href).href) release();
                } catch (_) { /* An unrelated malformed URL must not interrupt other requests. */ }
            };
            // Hn's callback runs on success; ajaxComplete also unlocks after a
            // failed request so the current list remains usable for a retry.
            if (events) events.on('ajaxComplete.ncPublicPagination', onComplete);
            try {
                Hn_Framework.ajax_load(requestUrl, '', 'GET', '', true, release, {navigation: true});
            } catch (_) {
                release();
                window.location.assign(url);
            }
        } else {
            window.location.assign(url);
        }
    }

    function submitPage(form) {
        var input = form.querySelector('.nc-page-input');
        if (!input || input.disabled) return;
        var page = pageNumber(input.value);
        var total = pageNumber(input.getAttribute('data-total-pages'));
        if (page === null || total === null || page > total) {
            input.setAttribute('aria-invalid', 'true');
            input.setCustomValidity('Nhập số trang từ 1 đến ' + (total || 0) + '.');
            input.reportValidity();
            return;
        }
        clearError(input);
        input.value = String(page);
        if (page === pageNumber(input.getAttribute('data-current-page'))) return;

        var target = new URL(form.getAttribute('action'), window.location.href);
        var pageName = form.getAttribute('data-page-name') || 'page';
        target.search = '';
        // Use rendered hidden fields rather than the current address: after an
        // AJAX replacement the form contains the filters for the displayed list.
        Array.prototype.forEach.call(form.elements, function (field) {
            if (field.type !== 'hidden' || field.disabled || !field.name ||
                field.name === pageName || field.name === 'page' || field.name === 'load' || field.name === 'back') return;
            target.searchParams.append(field.name, field.value);
        });
        target.searchParams.set(pageName, String(page));
        navigate(target.href, closest(form, rootSelector));
    }

    document.addEventListener('click', function (event) {
        var link = closest(event.target, 'a.nc-page-arrow');
        if (!link || !closest(link, rootSelector) || event.defaultPrevented ||
            event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        var href = link.getAttribute('href');
        if (!href) return;
        event.preventDefault();
        navigate(href, closest(link, rootSelector));
    });

    document.addEventListener('submit', function (event) {
        var form = closest(event.target, 'form.nc-page-pill');
        if (!form || !closest(form, rootSelector)) return;
        event.preventDefault();
        submitPage(form);
    });

    document.addEventListener('keydown', function (event) {
        var input = closest(event.target, '.nc-page-input');
        if (!input || !closest(input, rootSelector) || input.disabled || event.isComposing) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            input.value = input.getAttribute('data-current-page');
            clearError(input);
        } else if (event.key === 'Enter') {
            // Prevent the browser's implicit submit from sending a second request.
            event.preventDefault();
            submitPage(input.form);
        }
    });

    document.addEventListener('input', function (event) {
        var input = closest(event.target, '.nc-page-input');
        if (input && closest(input, rootSelector)) clearError(input);
    });
})(window, document);
