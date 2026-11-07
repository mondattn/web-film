(function (window, document) {
    'use strict';
    if (window.NguoncFilmPlayer) return;

    var instance = null;
    function dispose() {
        if (instance) instance.dispose();
        instance = null;
    }
    function init() {
        var page = document.querySelector('.nc-film-page[data-episode-url]');
        if (instance && instance.page === page) return;
        dispose();
        instance = page ? createPlayer(page) : null;
    }
    window.NguoncFilmPlayer = { init: init, dispose: dispose, version: '20261008.1' };

    function createPlayer(page) {
        var root = page.querySelector('#nc-film-player');
        var sourceCard = page.querySelector('#data_link');
        if (!root || !sourceCard) return null;
        var frame = page.querySelector('#nc-player-frame');
        var loading = page.querySelector('#nc-player-loading');
        var stage = page.querySelector('.nc-player-stage');
        var currentLabel = page.querySelector('#nc-player-current');
        var externalLink = page.querySelector('#nc-player-external');
        var watchNow = page.querySelector('#nc-watch-now');
        var appleOpen = page.querySelector('#nc-player-apple-open');
        var appleFallback = page.querySelector('#nc-player-apple-fallback');
        var groups = page.querySelector('#nc-player-episode-groups');
        var search = page.querySelector('#nc-player-episode-search');
        var queryInput = page.querySelector('#nc-player-episode-query');
        var clearSearch = page.querySelector('#nc-player-episode-search-clear');
        var searchStatus = page.querySelector('#nc-player-episode-search-status');
        var output = page.querySelector('#area_embed');
        var copyButton = page.querySelector('#nc-copy-embed');
        var copyStatus = page.querySelector('#nc-copy-status');
        var filmName = root.getAttribute('data-film-name') || '';
        var filmSlug = root.getAttribute('data-film-slug') || '';
        var storageKey = filmSlug ? 'nguonc:player-progress:v1:' + encodeURIComponent(filmSlug) : null;
        var servers = null;
        var disposed = false;
        var listeners = [];
        var pending = null;
        var failed = false;
        var requestController = null;
        var requestTimer = null;
        var requestId = 0;
        var activeServer = 0;
        var activeEpisode = 0;
        var activeSource = null;
        var sourceServer = 0;
        var sourceDescending = false;
        var renderedServer = null;
        var episodeEntries = [];
        var lastValidQuery = '';
        var playerActive = false;
        var navigationTimer = null;
        var loadTimer = null;
        var navigationId = 0;
        var renderTimer = null;
        var renderId = 0;
        var renderComplete = true;

        function alive() { return !disposed && page.isConnected !== false; }
        function on(element, event, handler) {
            if (!element) return;
            element.addEventListener(event, handler);
            listeners.push(function () { element.removeEventListener(event, handler); });
        }
        function url(value) {
            if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
            try {
                var parsed = new URL(value);
                return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
            } catch (_) { return null; }
        }
        function button(text, className, attribute, value) {
            var node = document.createElement('button');
            node.type = 'button';
            node.className = className;
            node.textContent = text;
            node.setAttribute(attribute, String(value));
            return node;
        }
        function status(message, retry) {
            page.querySelectorAll('[data-episode-status]').forEach(function (node) {
                node.textContent = message;
                node.hidden = !message;
            });
            page.querySelectorAll('[data-episode-retry]').forEach(function (node) { node.hidden = !retry; });
        }
        function loadingPlayer(show) {
            root.classList.toggle('is-player-loading', show);
            if (loading) loading.hidden = !show;
        }
        function stopPlayer() {
            window.clearTimeout(navigationTimer);
            window.clearTimeout(loadTimer);
            navigationId++;
            playerActive = false;
            loadingPlayer(false);
            if (loading) loading.classList.remove('is-delayed');
            if (appleFallback) appleFallback.hidden = true;
            // A fresh iframe also invalidates load callbacks from the previous episode.
            var replacement = frame.cloneNode(false);
            replacement.removeAttribute('src');
            frame.replaceWith(replacement);
            frame = replacement;
        }
        function startPlayer(delay) {
            if (!alive() || !root.open || !activeSource || playerActive) return;
            playerActive = true;
            stage.hidden = false;
            if (appleFallback) appleFallback.hidden = true;
            root.setAttribute('data-player-mode', 'embedded');
            loadingPlayer(true);
            if (loading) loading.classList.remove('is-delayed');
            var selectedUrl = activeSource;
            var selectedNavigation = ++navigationId;
            window.clearTimeout(navigationTimer);
            window.clearTimeout(loadTimer);
            function navigate() {
                navigationTimer = null;
                if (!alive() || selectedNavigation !== navigationId || activeSource !== selectedUrl) return;
                if (!root.open) { playerActive = false; return; }
                var next = frame.cloneNode(false);
                next.removeAttribute('src');
                next.hidden = false;
                next.addEventListener('load', function () {
                    if (!alive() || frame !== next || selectedNavigation !== navigationId) return;
                    window.clearTimeout(loadTimer);
                    if (loading) loading.classList.remove('is-delayed');
                    if (appleFallback) appleFallback.hidden = true;
                    loadingPlayer(false);
                });
                next.src = selectedUrl;
                frame.replaceWith(next);
                frame = next;
                loadTimer = window.setTimeout(function () {
                    if (!alive() || !root.open || selectedNavigation !== navigationId
                        || !root.classList.contains('is-player-loading')) return;
                    if (loading) loading.classList.add('is-delayed');
                    // Only iframe navigation is observable here, not cross-origin video readiness.
                    if (appleFallback) appleFallback.hidden = false;
                }, 12000);
            }
            if (typeof delay === 'number' && delay > 0) navigationTimer = window.setTimeout(navigate, delay);
            else navigate();
        }
        function cancelRendering() {
            window.clearTimeout(renderTimer);
            renderTimer = null;
            renderId++;
            if (!renderComplete) renderedServer = null;
            groups.setAttribute('aria-busy', 'false');
        }
        function normalizeNumber(value) { return value.replace(/^0+(?=[0-9])/, ''); }
        function filterEpisodes() {
            if (!queryInput) return;
            if (!/^[0-9]*$/.test(queryInput.value)) queryInput.value = lastValidQuery;
            lastValidQuery = queryInput.value;
            clearSearch.hidden = !lastValidQuery;
            var wanted = normalizeNumber(lastValidQuery);
            var visible = 0;
            episodeEntries.forEach(function (entry) {
                var matches = !lastValidQuery || entry.numbers.indexOf(wanted) !== -1;
                entry.button.hidden = !matches;
                if (matches) visible++;
            });
            searchStatus.textContent = !renderComplete ? 'Đang hiển thị danh sách tập…'
                : !visible ? 'Không tìm thấy tập phù hợp trên máy chủ này.'
                : lastValidQuery ? visible + ' / ' + episodeEntries.length + ' tập phù hợp.'
                    : episodeEntries.length + ' tập trên máy chủ đang chọn.';
        }
        function renderPlayer() {
            if (!root.open || !servers || !servers[activeServer]) return;
            if (renderedServer !== activeServer) {
                cancelRendering();
                var server = servers[activeServer];
                var serverIndex = activeServer;
                var id = renderId;
                var panel = document.createElement('div');
                panel.className = 'nc-player-episodes';
                panel.setAttribute('data-player-panel', String(activeServer));
                var label = document.createElement('div');
                label.className = 'nc-player-episodes__label';
                label.textContent = 'Chọn tập · ' + server.name;
                panel.appendChild(label);
                var grid = document.createElement('div');
                grid.className = 'nc-player-episodes__grid';
                grid.setAttribute('role', 'group');
                grid.setAttribute('aria-label', 'Danh sách tập ' + server.name);
                episodeEntries = [];
                panel.appendChild(grid);
                groups.textContent = '';
                groups.appendChild(panel);
                renderedServer = activeServer;
                renderComplete = false;
                groups.setAttribute('aria-busy', 'true');
                var cursor = 0;
                function appendBatch() {
                    renderTimer = null;
                    if (!alive() || !root.open || id !== renderId || activeServer !== serverIndex) return;
                    var fragment = document.createDocumentFragment();
                    var end = Math.min(cursor + 80, server.list.length);
                    for (; cursor < end; cursor++) {
                        var episode = server.list[cursor];
                        var node = button(episode.name, 'nc-player-episode', 'data-player-episode', cursor);
                        node.setAttribute('data-player-server', String(serverIndex));
                        var selected = cursor === activeEpisode;
                        node.setAttribute('aria-pressed', selected ? 'true' : 'false');
                        node.classList.toggle('is-active', selected);
                        fragment.appendChild(node);
                        episodeEntries.push({button: node, numbers: (episode.name.match(/[0-9]+/g) || []).map(normalizeNumber)});
                    }
                    grid.appendChild(fragment);
                    renderComplete = cursor === server.list.length;
                    groups.setAttribute('aria-busy', renderComplete ? 'false' : 'true');
                    filterEpisodes();
                    if (!renderComplete) renderTimer = window.setTimeout(appendBatch, 0);
                }
                appendBatch();
            }
            root.querySelectorAll('[data-player-server]').forEach(function (node) {
                var selected = Number(node.getAttribute('data-player-server')) === activeServer;
                if (node.hasAttribute('data-player-episode')) {
                    selected = selected && Number(node.getAttribute('data-player-episode')) === activeEpisode;
                    node.setAttribute('aria-pressed', selected ? 'true' : 'false');
                } else node.setAttribute('aria-selected', selected ? 'true' : 'false');
                node.classList.toggle('is-active', selected);
            });
            search.hidden = !servers.some(function (server) { return server.list.length > 1; });
            filterEpisodes();
        }
        function saveSelection(server, episode) {
            if (!storageKey) return;
            try {
                window.localStorage.setItem(storageKey, JSON.stringify({version: 1, server: activeServer,
                    episode: activeEpisode, serverName: server.name, episodeName: episode.name,
                    episodeSlug: episode.slug, savedAt: Date.now()}));
            } catch (_) { /* Playback works when storage is blocked. */ }
        }
        function savedSelection() {
            if (!storageKey) return null;
            try {
                var raw = window.localStorage.getItem(storageKey);
                if (!raw || raw.length > 512) return null;
                var saved = JSON.parse(raw);
                if (!saved || typeof saved !== 'object') return null;
                var server = servers.findIndex(function (item) { return item.name === saved.serverName; });
                if (server < 0 && Number.isInteger(saved.server) && saved.server >= 0 && servers[saved.server]) server = saved.server;
                if (server < 0) return null;
                var list = servers[server].list;
                var episode = saved.episodeSlug ? list.findIndex(function (item) { return item.slug === saved.episodeSlug; }) : -1;
                if (episode < 0) episode = list.findIndex(function (item) { return item.name === saved.episodeName; });
                if (episode < 0 && Number.isInteger(saved.episode) && saved.episode >= 0 && list[saved.episode]) episode = saved.episode;
                return episode < 0 ? null : {server: server, episode: episode};
            } catch (_) { return null; }
        }
        function selectEpisode(serverIndex, episodeIndex, fromUser) {
            var server = servers && servers[serverIndex];
            var episode = server && server.list[episodeIndex];
            var source = episode && url(episode.embed);
            if (!source) return;
            if (activeSource !== source) stopPlayer();
            activeServer = serverIndex;
            activeEpisode = episodeIndex;
            activeSource = source;
            currentLabel.textContent = server.name + ' · Tập ' + episode.name;
            externalLink.href = source;
            externalLink.hidden = false;
            if (appleOpen) appleOpen.href = source;
            frame.title = 'Xem ' + filmName + ' - Tập ' + episode.name;
            saveSelection(server, episode);
            startPlayer(fromUser ? 180 : 0);
            renderPlayer();
        }
        function renderSources() {
            if (!sourceCard.open || !servers || !servers[sourceServer]) return;
            var separator = page.querySelector('#format_seperation').value || '|';
            var prefix = page.querySelector('#format_start').value;
            var suffix = page.querySelector('#format_end').value;
            var selectedFormat = page.querySelector('.type_show:checked');
            var format = selectedFormat ? selectedFormat.value : '1';
            var list = servers[sourceServer].list.slice();
            if (sourceDescending) list.reverse();
            output.value = list.map(function (episode) {
                var text = episode.embed;
                if (format === '1') text = episode.name + separator + text;
                if (format === '2') text = episode.name + separator + episode.slug + separator + text;
                return prefix + text + suffix;
            }).join('\n');
            page.querySelectorAll('[data-source-server]').forEach(function (node) {
                var selected = Number(node.getAttribute('data-source-server')) === sourceServer;
                node.classList.toggle('is-active', selected);
                node.setAttribute('aria-selected', selected ? 'true' : 'false');
            });
        }
        function installData(data) {
            if (!data || !Array.isArray(data.servers)) throw new Error('Invalid episode response');
            servers = data.servers.filter(function (server) { return server && Array.isArray(server.list); }).map(function (server) {
                return {name: String(server.name || ''), list: server.list.filter(function (episode) {
                    return episode && url(episode.embed);
                }).map(function (episode) { return {name: String(episode.name || ''), slug: String(episode.slug || ''), embed: episode.embed}; })};
            }).filter(function (server) { return server.list.length; });
            var playerTabs = page.querySelector('#nc-player-servers');
            var sourceTabs = page.querySelector('#nc-source-servers');
            playerTabs.textContent = '';
            sourceTabs.textContent = '';
            servers.forEach(function (server, index) {
                var playerTab = button(server.name, 'nc-player-server', 'data-player-server', index);
                var sourceTab = button(server.name, 'nc-source-server', 'data-source-server', index);
                playerTab.setAttribute('role', 'tab');
                sourceTab.setAttribute('role', 'tab');
                playerTabs.appendChild(playerTab);
                sourceTabs.appendChild(sourceTab);
            });
            playerTabs.hidden = sourceTabs.hidden = servers.length < 2;
            page.querySelector('.nc-source-format').disabled = !servers.length;
            copyButton.disabled = !servers.length;
            if (!servers.length) {
                status('Link phim đang được cập nhật. Vui lòng quay lại sau.', false);
                currentLabel.textContent = 'Link phim đang được cập nhật';
                return;
            }
            status('', false);
            var saved = savedSelection();
            selectEpisode(saved ? saved.server : 0, saved ? saved.episode : 0);
            renderSources();
        }
        function ensureData() {
            if (servers !== null) return Promise.resolve(true);
            if (pending) return pending;
            if (failed) return Promise.resolve(false);
            if (!alive()) return Promise.resolve(false);
            status('Đang tải danh sách tập…', false);
            var thisRequest = ++requestId;
            requestController = window.AbortController ? new window.AbortController() : null;
            var options = {credentials: 'same-origin', headers: {'Accept': 'application/json'}};
            if (requestController) options.signal = requestController.signal;
            var request;
            try {
                var endpoint = new URL(page.getAttribute('data-episode-url'), window.location.href);
                if (endpoint.origin !== window.location.origin) throw new Error('Invalid episode endpoint');
                request = window.fetch(endpoint.href, options);
            } catch (error) { request = Promise.reject(error); }
            var timeout = new Promise(function (_, reject) {
                requestTimer = window.setTimeout(function () {
                    if (requestController) requestController.abort();
                    reject(new Error('Episode request timed out'));
                }, 20000);
            });
            request = Promise.resolve(request).then(function (response) {
                if (!response.ok) throw new Error('Episode request failed');
                return response.json();
            });
            pending = Promise.race([request, timeout]).then(function (data) {
                if (!alive() || thisRequest !== requestId) return false;
                installData(data);
                return true;
            }).catch(function () {
                if (alive() && thisRequest === requestId) {
                    servers = null;
                    failed = true;
                    status('Chưa tải được danh sách tập. Vui lòng thử lại.', true);
                }
                return false;
            }).then(function (success) {
                if (thisRequest === requestId) {
                    window.clearTimeout(requestTimer);
                    requestTimer = null;
                    requestController = null;
                    pending = null;
                }
                return success;
            });
            return pending;
        }
        function present() {
            ensureData().then(function (success) {
                if (!success || !alive()) return;
                startPlayer();
                renderPlayer();
                renderSources();
            });
        }
        function disclosure() {
            if (watchNow) watchNow.setAttribute('aria-expanded', root.open ? 'true' : 'false');
            if (root.open) present();
            else { stopPlayer(); cancelRendering(); }
        }
        on(root, 'toggle', disclosure);
        on(sourceCard, 'toggle', function () { if (sourceCard.open) present(); });
        function plainClick(event) {
            return !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
                && (typeof event.button !== 'number' || event.button === 0);
        }
        on(watchNow, 'click', function (event) {
            if (!plainClick(event)) return;
            root.open = true;
            disclosure();
        });
        on(page.querySelector('#nc-get-sources'), 'click', function (event) {
            if (!plainClick(event)) return;
            sourceCard.open = true;
            present();
        });
        on(page, 'click', function (event) {
            var target = event.target.nodeType === 3 ? event.target.parentElement : event.target;
            var node = target && target.closest('button');
            if (!node || !page.contains(node)) return;
            if (node.hasAttribute('data-episode-retry')) { failed = false; present(); }
            if (node.hasAttribute('data-player-server')) selectEpisode(Number(node.getAttribute('data-player-server')),
                Number(node.getAttribute('data-player-episode') || 0), true);
            if (node.hasAttribute('data-source-server')) {
                sourceServer = Number(node.getAttribute('data-source-server'));
                renderSources();
            }
        });
        on(queryInput, 'input', filterEpisodes);
        on(queryInput, 'paste', function (event) {
            if (event.clipboardData && !/^[0-9]*$/.test(event.clipboardData.getData('text'))) event.preventDefault();
        });
        on(queryInput, 'keydown', function (event) {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            queryInput.value = '';
            filterEpisodes();
        });
        on(clearSearch, 'click', function () { queryInput.value = ''; filterEpisodes(); queryInput.focus(); });
        page.querySelectorAll('.type_show, .format_link').forEach(function (field) {
            on(field, 'input', renderSources);
            on(field, 'change', renderSources);
        });
        on(page.querySelector('#sort'), 'click', function (event) {
            sourceDescending = !sourceDescending;
            event.currentTarget.setAttribute('aria-pressed', sourceDescending ? 'true' : 'false');
            event.currentTarget.textContent = sourceDescending ? 'Thứ tự giảm dần' : 'Thứ tự tăng dần';
            renderSources();
        });
        on(copyButton, 'click', function () {
            if (!output.value) return;
            var copied;
            try {
                if (window.navigator.clipboard && window.isSecureContext) copied = window.navigator.clipboard.writeText(output.value);
                else {
                    output.focus(); output.select();
                    copied = document.execCommand('copy') ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
                }
            } catch (error) { copied = Promise.reject(error); }
            Promise.resolve(copied).then(function () {
                if (alive()) copyStatus.textContent = 'Đã sao chép.';
            }).catch(function () {
                if (alive()) copyStatus.textContent = 'Không thể sao chép tự động. Hãy chọn và sao chép thủ công.';
            });
        });
        on(page.querySelector('#nc-player-apple-try'), 'click', function () {
            if (!alive() || !root.open || !activeSource) return;
            stopPlayer();
            startPlayer();
        });
        if (root.open || sourceCard.open) present();
        return {page: page, dispose: function () {
            disposed = true;
            requestId++;
            window.clearTimeout(requestTimer);
            if (requestController) requestController.abort();
            cancelRendering();
            stopPlayer();
            listeners.forEach(function (remove) { remove(); });
        }};
    }

    function start() {
        init();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    window.addEventListener('pageshow', init);
    window.addEventListener('pagehide', dispose);
})(window, document);
