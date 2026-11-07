(function () {
    'use strict';

    var drawer = document.getElementById('menu_header_mobile');
    var drawerPanel = drawer ? drawer.querySelector('.nc-mobile-drawer__panel') : null;
    var menuButton = document.getElementById('open-menu');
    var lastDrawerOpener = null;

    function visibleFocusable(container) {
        if (!container) return [];
        return Array.prototype.filter.call(
            container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
            function (element) {
                return element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden';
            }
        );
    }

    function setExpanded(button, expanded) {
        if (button) button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function syncDesktopMenus() {
        document.querySelectorAll('.has_sub_menu').forEach(function (button) {
            var panel = button.nextElementSibling;
            setExpanded(button, !!(panel && panel.classList.contains('active')));
        });
    }

    function syncMobileSubmenus() {
        document.querySelectorAll('.has_sub_menu_mobile').forEach(function (button) {
            var panel = button.nextElementSibling;
            setExpanded(button, !!(panel && panel.classList.contains('active')));
        });
    }

    function syncThemeState() {
        var isDark = document.documentElement.classList.contains('dark');
        document.querySelectorAll('.theme[data-theme]').forEach(function (button) {
            button.setAttribute('aria-pressed', String((button.getAttribute('data-theme') === 'dark') === isDark));
        });
    }

    function syncPopupState(buttonSelector, panelSelector) {
        document.querySelectorAll(buttonSelector).forEach(function (button) {
            var panel = button.parentElement ? button.parentElement.querySelector(panelSelector) : null;
            setExpanded(button, !!(panel && panel.classList.contains('active')));
        });
    }

    function syncFilterState() {
        document.querySelectorAll('.open_filter[aria-controls]').forEach(function (button) {
            var panel = document.getElementById(button.getAttribute('aria-controls'));
            setExpanded(button, !!(panel && !panel.classList.contains('hidden')));
        });
    }

    function openDrawer(opener) {
        if (!drawer) return;
        lastDrawerOpener = opener || menuButton || document.activeElement;
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('nc-menu-open');
        setExpanded(menuButton, true);
        window.requestAnimationFrame(function () {
            var closeButton = drawer.querySelector('.close_menu_mb');
            if (closeButton) closeButton.focus();
        });
    }

    function closeDrawer(restoreFocus) {
        if (!drawer) return;
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nc-menu-open');
        setExpanded(menuButton, false);
        if (restoreFocus && lastDrawerOpener && document.contains(lastDrawerOpener)) {
            lastDrawerOpener.focus();
        }
    }

    function closeTransientPopups() {
        document.querySelectorAll('.sub-menu.active, .option_theme.active, .form-search.active').forEach(function (panel) {
            panel.classList.remove('active');
        });
        syncDesktopMenus();
        syncPopupState('.open_theme', '.option_theme');
        syncPopupState('.open-search', '.form-search');
    }

    document.querySelectorAll('.open-search').forEach(function (button) {
        button.addEventListener('click', function () {
            var panel = button.parentElement ? button.parentElement.querySelector('.form-search.active') : null;
            var input = panel ? panel.querySelector('input[type="search"], input[name="keyword"]') : null;
            if (input) input.focus();
        });
    });

    document.addEventListener('click', function (event) {
        var target = event.target;

        if (target.closest('#open-menu')) {
            openDrawer(target.closest('#open-menu'));
            return;
        }

        if (target.closest('.close_menu_mb')) {
            event.preventDefault();
            closeDrawer(true);
            return;
        }

        if (drawer && target === drawer) {
            closeDrawer(true);
            return;
        }

        if (target.closest('#menu_header_mobile .menu_item')) {
            closeDrawer(false);
        }

        window.requestAnimationFrame(function () {
            var searchButton = target.closest('.open-search');
            syncDesktopMenus();
            syncMobileSubmenus();
            syncThemeState();
            syncPopupState('.open_theme', '.option_theme');
            syncPopupState('.open-search', '.form-search');
            syncFilterState();
            if (searchButton) {
                var searchPanel = searchButton.parentElement ? searchButton.parentElement.querySelector('.form-search.active') : null;
                var searchInput = searchPanel ? searchPanel.querySelector('input[type="search"], input[name="keyword"]') : null;
                if (searchInput) searchInput.focus();
            }
        });
    }, true);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (drawer && drawer.classList.contains('active')) {
                event.preventDefault();
                closeDrawer(true);
                return;
            }
            closeTransientPopups();
        }

        if (event.key === 'Tab' && drawer && drawer.classList.contains('active') && drawerPanel) {
            var focusable = visibleFocusable(drawerPanel);
            if (!focusable.length) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth >= 1280) closeDrawer(false);
    });

    if (drawer) drawer.setAttribute('aria-hidden', drawer.classList.contains('active') ? 'false' : 'true');
    setExpanded(menuButton, false);
    syncDesktopMenus();
    syncMobileSubmenus();
    syncThemeState();
    syncPopupState('.open_theme', '.option_theme');
    syncPopupState('.open-search', '.form-search');
    syncFilterState();
})();

/* Phase UI-8: zero-dependency viewport motion with AJAX-safe initialization. */
(function () {
    'use strict';

    var pageRoot = document.getElementById('content');
    if (!pageRoot) return;

    var html = document.documentElement;
    var body = document.body;
    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var saveData = !!(connection && connection.saveData);
    var supportsMotion = typeof Element !== 'undefined' && Element.prototype.animate && 'IntersectionObserver' in window;
    var staticMotion = reducedMotion.matches || saveData || !supportsMotion;
    var deviceMemory = Number(navigator.deviceMemory || 4);
    var processorCount = Number(navigator.hardwareConcurrency || 4);
    var liteMotion = !staticMotion && (deviceMemory < 2 || processorCount <= 2);
    var revealObserver = null;

    html.classList.add(staticMotion ? 'nc-motion-static' : 'nc-motion-enabled');
    if (liteMotion) html.classList.add('nc-motion-lite');

    function eachNode(nodes, callback) {
        Array.prototype.forEach.call(nodes, callback);
    }

    function revealFrames(kind, compact) {
        var distance = compact ? 9 : 15;
        if (kind === 'side') {
            return [
                { opacity: 0, transform: 'translate3d(' + distance + 'px, 0, 0) scale(0.985)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
            ];
        }
        if (kind === 'card') {
            return [
                { opacity: 0, transform: 'translate3d(0, ' + distance + 'px, 0) scale(0.975)' },
                { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
            ];
        }
        if (kind === 'row') {
            return [
                { opacity: 0.18 },
                { opacity: 1 }
            ];
        }
        return [
            { opacity: 0, transform: 'translate3d(0, ' + distance + 'px, 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ];
    }

    function startCounter(card, delay) {
        var valueElement = card.querySelector('strong');
        if (!valueElement || valueElement.getAttribute('data-nc-counted') === 'true') return;

        var finalText = valueElement.textContent.trim();
        if (!/^[\d.,\s]+$/.test(finalText)) return;
        var digits = finalText.replace(/[^\d]/g, '');
        var finalValue = parseInt(digits, 10);
        if (!digits || !isFinite(finalValue) || finalValue <= 0 || finalValue > 1000000000) return;

        valueElement.setAttribute('data-nc-counted', 'true');
        window.setTimeout(function () {
            if (!document.documentElement.contains(valueElement)) return;
            var start = performance.now();
            var duration = window.innerWidth < 768 ? 560 : 720;
            var useThousands = finalText.indexOf(',') !== -1;

            function draw(now) {
                if (!document.documentElement.contains(valueElement) || document.hidden) {
                    valueElement.textContent = finalText;
                    return;
                }
                var progress = Math.min(1, (now - start) / duration);
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.round(finalValue * eased);
                valueElement.textContent = useThousands ? current.toLocaleString('en-US') : String(current);
                if (progress < 1) {
                    window.requestAnimationFrame(draw);
                } else {
                    valueElement.textContent = finalText;
                }
            }

            valueElement.textContent = '0';
            window.requestAnimationFrame(draw);
        }, Math.max(0, delay));
    }

    function playReveal(element) {
        var kind = element.getAttribute('data-nc-motion-kind') || 'section';
        var delay = parseInt(element.getAttribute('data-nc-motion-delay') || '0', 10);
        var compact = window.innerWidth < 768;
        element.animate(revealFrames(kind, compact), {
            duration: compact ? 460 : 620,
            delay: delay,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards'
        });
        if (element.classList.contains('nc-stat-card')) startCounter(element, delay);
    }

    if (!staticMotion) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                revealObserver.unobserve(entry.target);
                entry.target.removeAttribute('data-nc-motion-pending');
                if (!pageRoot.contains(entry.target)) return;
                playReveal(entry.target);
            });
        }, {
            root: null,
            rootMargin: '0px 0px -7% 0px',
            threshold: 0.06
        });
    }

    function targetsIn(scope, selector) {
        var targets = Array.prototype.slice.call(scope.querySelectorAll(selector));
        if (scope.nodeType === 1 && scope.matches(selector)) targets.unshift(scope);
        return targets;
    }

    function registerRevealTargets(scope) {
        var groups = [
            { selector: '.nc-home-hero__content > *', kind: 'section', step: 64, cap: 256 },
            { selector: '.nc-home-hero__status', kind: 'side', step: 0, cap: 0 },
            { selector: '.nc-stat-card', kind: 'card', step: 54, cap: 216 },
            { selector: '.nc-section-heading, .nc-page-heading, .nc-filter-card', kind: 'section', step: 35, cap: 140 },
            { selector: '.nc-movie-table tbody tr', kind: 'row', step: 24, cap: 240 },
            { selector: '.nc-pagination-shell, .nc-film-hero, .nc-detail-card', kind: 'card', step: 34, cap: 170 }
        ];

        groups.forEach(function (group) {
            eachNode(targetsIn(scope, group.selector), function (element, index) {
                if (element.getAttribute('data-nc-motion-bound') === 'true') return;
                element.setAttribute('data-nc-motion-bound', 'true');
                element.setAttribute('data-nc-motion-kind', group.kind);
                element.setAttribute('data-nc-motion-delay', String(Math.min(index * group.step, group.cap)));
                if (revealObserver) {
                    element.setAttribute('data-nc-motion-pending', 'true');
                    revealObserver.observe(element);
                }
            });
        });
    }

    function registerHeroSpotlights(scope) {
        if (staticMotion || liteMotion || !finePointer.matches) return;

        eachNode(targetsIn(scope, '.nc-home-hero'), function (hero) {
            if (hero.getAttribute('data-nc-spotlight-bound') === 'true') return;
            hero.setAttribute('data-nc-spotlight-bound', 'true');
            var pointer = null;
            var frame = 0;

            hero.addEventListener('pointermove', function (event) {
                pointer = event;
                if (frame) return;
                frame = window.requestAnimationFrame(function () {
                    frame = 0;
                    if (!pointer || !document.documentElement.contains(hero)) return;
                    var rect = hero.getBoundingClientRect();
                    if (!rect.width || !rect.height) return;
                    var x = Math.max(0, Math.min(100, ((pointer.clientX - rect.left) / rect.width) * 100));
                    var y = Math.max(0, Math.min(100, ((pointer.clientY - rect.top) / rect.height) * 100));
                    hero.style.setProperty('--nc-spot-x', x.toFixed(2) + '%');
                    hero.style.setProperty('--nc-spot-y', y.toFixed(2) + '%');
                });
            }, { passive: true });

            hero.addEventListener('pointerleave', function () {
                pointer = null;
                hero.style.setProperty('--nc-spot-x', '78%');
                hero.style.setProperty('--nc-spot-y', '18%');
            }, { passive: true });
        });
    }

    function initializeInsertedContent(scope) {
        registerRevealTargets(scope);
        registerHeroSpotlights(scope);
    }

    function installScrollProgress() {
        var meter = document.querySelector('.nc-scroll-progress');
        if (!meter) {
            meter = document.createElement('div');
            meter.className = 'nc-scroll-progress';
            meter.setAttribute('aria-hidden', 'true');
            meter.innerHTML = '<span></span>';
            body.insertBefore(meter, body.firstChild);
        }
        var bar = meter.firstElementChild;
        var frame = 0;

        function update() {
            frame = 0;
            var maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            var progress = maximum > 0 ? Math.min(1, Math.max(0, window.pageYOffset / maximum)) : 0;
            bar.style.transform = 'scaleX(' + progress.toFixed(5) + ')';
            body.classList.toggle('nc-has-scrolled', window.pageYOffset > 12);
        }

        function schedule() {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        }

        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        schedule();
    }

    initializeInsertedContent(pageRoot);
    installScrollProgress();

    if ('MutationObserver' in window) {
        var mutationFrame = 0;
        var pendingScopes = [];
        function forgetRemovedTargets(scope) {
            if (!revealObserver || scope.nodeType !== 1) return;
            eachNode(targetsIn(scope, '[data-nc-motion-pending="true"]'), function (element) {
                // Moving a node within #content should retain its observation.
                if (pageRoot.contains(element)) return;
                revealObserver.unobserve(element);
                element.removeAttribute('data-nc-motion-pending');
                element.removeAttribute('data-nc-motion-bound');
            });
        }
        var contentObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                eachNode(mutation.removedNodes, forgetRemovedTargets);
                eachNode(mutation.addedNodes, function (node) {
                    if (node.nodeType === 1) pendingScopes.push(node);
                });
            });
            if (!pendingScopes.length || mutationFrame) return;
            mutationFrame = window.requestAnimationFrame(function () {
                mutationFrame = 0;
                var scopes = [];
                pendingScopes.forEach(function (node) {
                    if (!pageRoot.contains(node) || scopes.some(function (scope) { return scope.contains(node); })) return;
                    scopes = scopes.filter(function (scope) { return !node.contains(scope); });
                    scopes.push(node);
                });
                pendingScopes = [];
                scopes.forEach(initializeInsertedContent);
            });
        });
        contentObserver.observe(pageRoot, { childList: true, subtree: true });
    }
})();
/* Phase UI-8.7: AJAX-safe Vietnam calendar-day update marker. */
(function () {
    'use strict';

    var pageRoot = document.getElementById('content');
    if (!pageRoot) return;

    var vietnamOffsetMilliseconds = 7 * 60 * 60 * 1000;
    var refreshTimer = 0;
    var mutationFrame = 0;

    function vietnamDateKey(milliseconds) {
        var date = new Date(milliseconds + vietnamOffsetMilliseconds);
        var year = String(date.getUTCFullYear());
        var month = String(date.getUTCMonth() + 1).padStart(2, '0');
        var day = String(date.getUTCDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function displayedDateKey(timeElement) {
        var match = timeElement.textContent.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
        return match ? match[3] + '-' + match[2] + '-' + match[1] : '';
    }

    function refreshTodayMarkers(scope) {
        var today = vietnamDateKey(Date.now());
        var timeElements = Array.prototype.slice.call(scope.querySelectorAll('.nc-updated-cell time'));
        if (scope.nodeType === 1 && scope.matches('.nc-updated-cell time')) timeElements.unshift(scope);
        timeElements.forEach(function (timeElement) {
            var isToday = displayedDateKey(timeElement) === today;
            timeElement.classList.toggle('nc-update-today', isToday);
            if (isToday) {
                timeElement.setAttribute('data-nc-today', 'true');
                timeElement.setAttribute('aria-label', 'Cập nhật hôm nay: ' + timeElement.textContent.trim());
            } else if (timeElement.getAttribute('data-nc-today') === 'true') {
                timeElement.removeAttribute('data-nc-today');
                timeElement.removeAttribute('aria-label');
            }
        });
    }

    function millisecondsUntilVietnamMidnight() {
        var shiftedNow = Date.now() + vietnamOffsetMilliseconds;
        var vietnamNow = new Date(shiftedNow);
        var nextMidnight = Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate() + 1);
        return Math.max(1000, nextMidnight - shiftedNow + 1200);
    }

    function scheduleMidnightRefresh() {
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(function () {
            refreshTodayMarkers(pageRoot);
            scheduleMidnightRefresh();
        }, millisecondsUntilVietnamMidnight());
    }

    refreshTodayMarkers(pageRoot);
    scheduleMidnightRefresh();

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        refreshTodayMarkers(pageRoot);
        scheduleMidnightRefresh();
    });

    if ('MutationObserver' in window) {
        var pendingScopes = [];
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(mutation.addedNodes, function (node) {
                    if (node.nodeType === 1) pendingScopes.push(node);
                });
            });
            if (!pendingScopes.length || mutationFrame) return;
            mutationFrame = window.requestAnimationFrame(function () {
                mutationFrame = 0;
                var scopes = [];
                pendingScopes.forEach(function (node) {
                    if (!pageRoot.contains(node) || scopes.some(function (scope) { return scope.contains(node); })) return;
                    scopes = scopes.filter(function (scope) { return !node.contains(scope); });
                    scopes.push(node);
                });
                pendingScopes = [];
                scopes.forEach(refreshTodayMarkers);
            });
        });
        observer.observe(pageRoot, { childList: true, subtree: true });
    }
})();
