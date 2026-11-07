(function (window, document) {
    'use strict';
    if (window.NguoncPublicAssets) { window.NguoncPublicAssets.init(); return; }
    var pending = null;
    var mounted = null;
    var started = false;
    var scheduled = false;
    var contentObserver = null;
    var themeObserver = null;
    var failedAsset = null;
    var gridSizes = '(min-width:1312px) 200px, (min-width:1200px) calc((100vw - 112px) / 6), (min-width:768px) calc((100vw - 80px) / 4), (min-width:540px) calc((100vw - 36px) / 3), calc((100vw - 26px) / 2)';

    function artwork() {
        var dark = document.documentElement.classList.contains('dark');
        document.querySelectorAll('img[data-nc-theme-image]').forEach(function (image) {
            if ((image.getAttribute('data-nc-theme-image') === 'dark') !== dark) return;
            var src = image.getAttribute('data-src');
            if (src && image.getAttribute('src') !== src) image.setAttribute('src', src);
        });
        var grid = document.documentElement.getAttribute('data-nc-movie-view') === 'grid';
        var sizes = grid ? gridSizes : '(max-width:767px) 50px, 52px';
        document.querySelectorAll('img[data-film-responsive="catalogue"]').forEach(function (image) {
            if (image.getAttribute('sizes') !== sizes) image.setAttribute('sizes', sizes);
            var picture = image.closest('picture');
            var source = picture && picture.querySelector('source[type="image/webp"]');
            if (source && source.getAttribute('sizes') !== sizes) source.setAttribute('sizes', sizes);
        });
    }

    function readyPlayer() { return window.NguoncFilmPlayer && typeof window.NguoncFilmPlayer.init === 'function'; }
    function loadFailed(script, asset) {
        pending = null;
        failedAsset = asset;
        script.remove();
        var current = document.querySelector('.nc-film-page[data-episode-url]');
        if (current) current.querySelectorAll('[data-episode-status]').forEach(function (node) {
            node.textContent = 'Chưa tải được trình phát. Bấm Xem ngay để thử lại.';
            node.hidden = false;
        });
    }
    function player() {
        var page = document.querySelector('.nc-film-page[data-episode-url]');
        if (mounted && mounted !== page && window.NguoncFilmPlayer && window.NguoncFilmPlayer.dispose) {
            window.NguoncFilmPlayer.dispose();
            mounted = null;
        }
        if (!page) return;
        if (readyPlayer()) {
            window.NguoncFilmPlayer.init();
            mounted = page;
            return;
        }
        if (pending) return;
        var asset = page.getAttribute('data-player-script');
        if (!asset) return;
        try {
            var parsed = new URL(asset, window.location.href);
            if (parsed.origin !== window.location.origin || !/\/js\/site\/film-player\.js$/.test(parsed.pathname)) return;
            asset = parsed.href;
        } catch (_) { return; }
        if (failedAsset === asset) return;
        var script = document.createElement('script');
        script.src = asset;
        script.defer = true;
        pending = script;
        script.onload = function () {
            pending = null;
            if (!readyPlayer()) { loadFailed(script, asset); return; }
            failedAsset = null;
            player();
        };
        script.onerror = function () { loadFailed(script, asset); };
        document.head.appendChild(script);
    }

    function init() { artwork(); player(); }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        var run = function () { scheduled = false; init(); };
        if (window.requestAnimationFrame) window.requestAnimationFrame(run);
        else window.setTimeout(run, 0);
    }
    function start() {
        if (started) return;
        started = true;
        init();
        var content = document.getElementById('content');
        if (content && window.MutationObserver) {
            // AJAX replaces direct children of #content. Episode-button batches
            // never trigger this observer or scan the entire document again.
            contentObserver = new window.MutationObserver(init);
            contentObserver.observe(content, {childList: true});
            themeObserver = new window.MutationObserver(schedule);
            themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-nc-movie-view']});
        } else if (window.jQuery) window.jQuery(document).on('ajaxComplete.ncPublicAssets', init);
        document.addEventListener('click', function (event) {
            var target = event.target && event.target.closest ? event.target.closest('#nc-watch-now, #nc-get-sources, #nc-film-player summary, #data_link summary') : null;
            if (!target || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
                || (typeof event.button === 'number' && event.button !== 0)) return;
            var targetWindow = target.getAttribute('target');
            if ((targetWindow && targetWindow !== '_self') || target.getAttribute('download') !== null) return;
            // The site's hash-link handler can already preventDefault before
            // this listener. Preserve the first watch/source intent while the
            // cached module is still loading; summary toggles stay native.
            var page = document.querySelector('.nc-film-page[data-episode-url]');
            if (page && (!readyPlayer() || mounted !== page)) {
                var id = target.id || target.getAttribute('id');
                var details = id === 'nc-watch-now' ? page.querySelector('#nc-film-player')
                    : id === 'nc-get-sources' ? page.querySelector('#data_link') : null;
                if (details) details.open = true;
            }
            failedAsset = null;
            player();
        });
    }
    window.NguoncPublicAssets = {init: init, version: '20261008.1'};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    window.addEventListener('pageshow', init);
    window.addEventListener('pagehide', function () {
        if (window.NguoncFilmPlayer && window.NguoncFilmPlayer.dispose) window.NguoncFilmPlayer.dispose();
        mounted = null;
    });
})(window, document);
