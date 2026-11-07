/*
 * Trình phát + "Lấy nguồn embed" — viết lại từ hành vi film-player.js của bản gốc.
 * Khác bản gốc: danh sách tập đã có sẵn từ /api/film/{slug} (không fetch /phim/<slug>/episodes).
 *
 * Hành vi giữ nguyên:
 *  - Hai <details>: mở cái nào cũng "present" (nạp tập, render tab máy chủ, chọn tập đã lưu hoặc tập 1)
 *  - Đổi tập → thay iframe mới (bỏ callback load của tập cũ), hiện lớp "Đang tải", sau 12 s chưa load → fallback Apple
 *  - Lưu máy chủ/tập đang xem vào localStorage['nguonc:player-progress:v1:<slug>']
 *  - Tìm tập nhanh chỉ nhận số; lọc theo số xuất hiện trong tên tập; Esc xoá
 *  - Nguồn embed: 3 định dạng, phân cách/ký tự đầu/cuối, đảo thứ tự, sao chép
 */

export interface Episode { name: string; slug: string; embed: string }
export interface Server { name: string; list: Episode[] }

const LOAD_TIMEOUT_MS = 12000;
const RENDER_BATCH = 80;

function safeUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch (_) { return null; }
}

function makeButton(text: string, className: string, attribute: string, value: string | number): HTMLButtonElement {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.textContent = text;
    node.setAttribute(attribute, String(value));
    return node;
}

const normalizeNumber = (value: string) => value.replace(/^0+(?=[0-9])/, '');

/** Gắn hành vi vào `.nc-film-page`; trả về hàm dispose. */
export function createPlayer(page: HTMLElement, rawServers: Server[]): () => void {
    const q = <T extends Element>(sel: string) => page.querySelector<T>(sel);
    const root = q<HTMLDetailsElement>('#nc-film-player')!;
    const sourceCard = q<HTMLDetailsElement>('#data_link')!;
    let frame = q<HTMLIFrameElement>('#nc-player-frame')!;
    const loading = q<HTMLElement>('#nc-player-loading')!;
    const stage = q<HTMLElement>('.nc-player-stage')!;
    const currentLabel = q<HTMLElement>('#nc-player-current')!;
    const externalLink = q<HTMLAnchorElement>('#nc-player-external')!;
    const watchNow = q<HTMLAnchorElement>('#nc-watch-now')!;
    const appleOpen = q<HTMLAnchorElement>('#nc-player-apple-open')!;
    const appleFallback = q<HTMLElement>('#nc-player-apple-fallback')!;
    const groups = q<HTMLElement>('#nc-player-episode-groups')!;
    const search = q<HTMLElement>('#nc-player-episode-search')!;
    const queryInput = q<HTMLInputElement>('#nc-player-episode-query')!;
    const clearSearch = q<HTMLButtonElement>('#nc-player-episode-search-clear')!;
    const searchStatus = q<HTMLElement>('#nc-player-episode-search-status')!;
    const output = q<HTMLTextAreaElement>('#area_embed')!;
    const copyButton = q<HTMLButtonElement>('#nc-copy-embed')!;
    const copyStatus = q<HTMLElement>('#nc-copy-status')!;
    const playerTabs = q<HTMLElement>('#nc-player-servers')!;
    const sourceTabs = q<HTMLElement>('#nc-source-servers')!;
    const formatFieldset = q<HTMLFieldSetElement>('.nc-source-format')!;

    const filmName = root.dataset.filmName ?? '';
    const filmSlug = root.dataset.filmSlug ?? '';
    const storageKey = filmSlug ? `nguonc:player-progress:v1:${encodeURIComponent(filmSlug)}` : null;

    const servers: Server[] = rawServers
        .map((s) => ({ name: s.name, list: s.list.filter((e) => safeUrl(e.embed)) }))
        .filter((s) => s.list.length);

    let disposed = false;
    const listeners: Array<() => void> = [];
    let installed = false;
    let activeServer = 0;
    let activeEpisode = 0;
    let activeSource: string | null = null;
    let sourceServer = 0;
    let sourceDescending = false;
    let renderedServer: number | null = null;
    let episodeEntries: Array<{ button: HTMLButtonElement; numbers: string[] }> = [];
    let lastValidQuery = '';
    let playerActive = false;
    let navigationTimer = 0;
    let loadTimer = 0;
    let navigationId = 0;
    let renderTimer = 0;
    let renderId = 0;
    let renderComplete = true;

    const alive = () => !disposed && page.isConnected;
    function on<K extends keyof HTMLElementEventMap>(el: HTMLElement | null, type: K, handler: (ev: HTMLElementEventMap[K]) => void): void {
        if (!el) return;
        el.addEventListener(type, handler as EventListener);
        listeners.push(() => el.removeEventListener(type, handler as EventListener));
    }

    function status(message: string, retry: boolean): void {
        page.querySelectorAll<HTMLElement>('[data-episode-status]').forEach((n) => { n.textContent = message; n.hidden = !message; });
        page.querySelectorAll<HTMLElement>('[data-episode-retry]').forEach((n) => { n.hidden = !retry; });
    }
    function loadingPlayer(show: boolean): void {
        root.classList.toggle('is-player-loading', show);
        loading.hidden = !show;
    }
    function freshFrame(): HTMLIFrameElement {
        const next = frame.cloneNode(false) as HTMLIFrameElement;
        next.removeAttribute('src');
        frame.replaceWith(next);
        frame = next;
        return next;
    }
    function stopPlayer(): void {
        clearTimeout(navigationTimer);
        clearTimeout(loadTimer);
        navigationId++;
        playerActive = false;
        loadingPlayer(false);
        loading.classList.remove('is-delayed');
        appleFallback.hidden = true;
        freshFrame();
    }
    function startPlayer(delay = 0): void {
        if (!alive() || !root.open || !activeSource || playerActive) return;
        playerActive = true;
        stage.hidden = false;
        appleFallback.hidden = true;
        root.setAttribute('data-player-mode', 'embedded');
        loadingPlayer(true);
        loading.classList.remove('is-delayed');
        const selectedUrl = activeSource;
        const selectedNavigation = ++navigationId;
        clearTimeout(navigationTimer);
        clearTimeout(loadTimer);
        const navigate = () => {
            navigationTimer = 0;
            if (!alive() || selectedNavigation !== navigationId || activeSource !== selectedUrl) return;
            if (!root.open) { playerActive = false; return; }
            const next = freshFrame();
            next.hidden = false;
            next.addEventListener('load', () => {
                if (!alive() || frame !== next || selectedNavigation !== navigationId) return;
                clearTimeout(loadTimer);
                loading.classList.remove('is-delayed');
                appleFallback.hidden = true;
                loadingPlayer(false);
            });
            next.src = selectedUrl;
            loadTimer = window.setTimeout(() => {
                if (!alive() || !root.open || selectedNavigation !== navigationId || !root.classList.contains('is-player-loading')) return;
                loading.classList.add('is-delayed');
                appleFallback.hidden = false; // chỉ quan sát được iframe load, không biết video có chạy không
            }, LOAD_TIMEOUT_MS);
        };
        if (delay > 0) navigationTimer = window.setTimeout(navigate, delay);
        else navigate();
    }

    function cancelRendering(): void {
        clearTimeout(renderTimer);
        renderTimer = 0;
        renderId++;
        if (!renderComplete) renderedServer = null;
        groups.setAttribute('aria-busy', 'false');
    }
    function filterEpisodes(): void {
        if (!/^[0-9]*$/.test(queryInput.value)) queryInput.value = lastValidQuery;
        lastValidQuery = queryInput.value;
        clearSearch.hidden = !lastValidQuery;
        const wanted = normalizeNumber(lastValidQuery);
        let visible = 0;
        episodeEntries.forEach((entry) => {
            const matches = !lastValidQuery || entry.numbers.includes(wanted);
            entry.button.hidden = !matches;
            if (matches) visible++;
        });
        searchStatus.textContent = !renderComplete ? 'Đang hiển thị danh sách tập…'
            : !visible ? 'Không tìm thấy tập phù hợp trên máy chủ này.'
            : lastValidQuery ? `${visible} / ${episodeEntries.length} tập phù hợp.`
            : `${episodeEntries.length} tập trên máy chủ đang chọn.`;
    }
    function renderPlayer(): void {
        if (!root.open || !servers[activeServer]) return;
        if (renderedServer !== activeServer) {
            cancelRendering();
            const server = servers[activeServer];
            const serverIndex = activeServer;
            const id = renderId;
            const panel = document.createElement('div');
            panel.className = 'nc-player-episodes';
            panel.setAttribute('data-player-panel', String(activeServer));
            const label = document.createElement('div');
            label.className = 'nc-player-episodes__label';
            label.textContent = `Chọn tập · ${server.name}`;
            const grid = document.createElement('div');
            grid.className = 'nc-player-episodes__grid';
            grid.setAttribute('role', 'group');
            grid.setAttribute('aria-label', `Danh sách tập ${server.name}`);
            panel.append(label, grid);
            episodeEntries = [];
            groups.replaceChildren(panel);
            renderedServer = activeServer;
            renderComplete = false;
            groups.setAttribute('aria-busy', 'true');
            let cursor = 0;
            const appendBatch = () => {
                renderTimer = 0;
                if (!alive() || !root.open || id !== renderId || activeServer !== serverIndex) return;
                const fragment = document.createDocumentFragment();
                const end = Math.min(cursor + RENDER_BATCH, server.list.length);
                for (; cursor < end; cursor++) {
                    const episode = server.list[cursor];
                    const node = makeButton(episode.name, 'nc-player-episode', 'data-player-episode', cursor);
                    node.setAttribute('data-player-server', String(serverIndex));
                    const selected = cursor === activeEpisode;
                    node.setAttribute('aria-pressed', selected ? 'true' : 'false');
                    node.classList.toggle('is-active', selected);
                    fragment.appendChild(node);
                    episodeEntries.push({ button: node, numbers: (episode.name.match(/[0-9]+/g) ?? []).map(normalizeNumber) });
                }
                grid.appendChild(fragment);
                renderComplete = cursor === server.list.length;
                groups.setAttribute('aria-busy', renderComplete ? 'false' : 'true');
                filterEpisodes();
                if (!renderComplete) renderTimer = window.setTimeout(appendBatch, 0);
            };
            appendBatch();
        }
        root.querySelectorAll<HTMLElement>('[data-player-server]').forEach((node) => {
            let selected = Number(node.getAttribute('data-player-server')) === activeServer;
            if (node.hasAttribute('data-player-episode')) {
                selected = selected && Number(node.getAttribute('data-player-episode')) === activeEpisode;
                node.setAttribute('aria-pressed', selected ? 'true' : 'false');
            } else node.setAttribute('aria-selected', selected ? 'true' : 'false');
            node.classList.toggle('is-active', selected);
        });
        search.hidden = !servers.some((s) => s.list.length > 1);
        filterEpisodes();
    }

    function saveSelection(server: Server, episode: Episode): void {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ version: 1, server: activeServer, episode: activeEpisode,
                serverName: server.name, episodeName: episode.name, episodeSlug: episode.slug, savedAt: Date.now() }));
        } catch (_) { /* storage bị chặn vẫn xem được */ }
    }
    function savedSelection(): { server: number; episode: number } | null {
        if (!storageKey) return null;
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw || raw.length > 512) return null;
            const saved = JSON.parse(raw) as { server?: number; episode?: number; serverName?: string; episodeName?: string; episodeSlug?: string };
            let server = servers.findIndex((s) => s.name === saved.serverName);
            if (server < 0 && Number.isInteger(saved.server) && servers[saved.server!]) server = saved.server!;
            if (server < 0) return null;
            const list = servers[server].list;
            let episode = saved.episodeSlug ? list.findIndex((e) => e.slug === saved.episodeSlug) : -1;
            if (episode < 0) episode = list.findIndex((e) => e.name === saved.episodeName);
            if (episode < 0 && Number.isInteger(saved.episode) && list[saved.episode!]) episode = saved.episode!;
            return episode < 0 ? null : { server, episode };
        } catch (_) { return null; }
    }

    function selectEpisode(serverIndex: number, episodeIndex: number, fromUser = false): void {
        const server = servers[serverIndex];
        const episode = server?.list[episodeIndex];
        const source = episode && safeUrl(episode.embed);
        if (!source) return;
        if (activeSource !== source) stopPlayer();
        activeServer = serverIndex;
        activeEpisode = episodeIndex;
        activeSource = source;
        currentLabel.textContent = `${server.name} · Tập ${episode.name}`;
        externalLink.href = source;
        externalLink.hidden = false;
        appleOpen.href = source;
        frame.title = `Xem ${filmName} - Tập ${episode.name}`;
        saveSelection(server, episode);
        startPlayer(fromUser ? 180 : 0);
        renderPlayer();
    }

    function renderSources(): void {
        if (!sourceCard.open || !servers[sourceServer]) return;
        const separator = q<HTMLInputElement>('#format_seperation')!.value || '|';
        const prefix = q<HTMLInputElement>('#format_start')!.value;
        const suffix = q<HTMLInputElement>('#format_end')!.value;
        const format = q<HTMLInputElement>('.type_show:checked')?.value ?? '1';
        const list = servers[sourceServer].list.slice();
        if (sourceDescending) list.reverse();
        output.value = list.map((episode) => {
            let text = episode.embed;
            if (format === '1') text = `${episode.name}${separator}${text}`;
            if (format === '2') text = `${episode.name}${separator}${episode.slug}${separator}${text}`;
            return `${prefix}${text}${suffix}`;
        }).join('\n');
        page.querySelectorAll<HTMLElement>('[data-source-server]').forEach((node) => {
            const selected = Number(node.getAttribute('data-source-server')) === sourceServer;
            node.classList.toggle('is-active', selected);
            node.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
    }

    function install(): void {
        if (installed) return;
        installed = true;
        playerTabs.replaceChildren();
        sourceTabs.replaceChildren();
        servers.forEach((server, index) => {
            const playerTab = makeButton(server.name, 'nc-player-server', 'data-player-server', index);
            const sourceTab = makeButton(server.name, 'nc-source-server', 'data-source-server', index);
            playerTab.setAttribute('role', 'tab');
            sourceTab.setAttribute('role', 'tab');
            playerTabs.appendChild(playerTab);
            sourceTabs.appendChild(sourceTab);
        });
        playerTabs.hidden = sourceTabs.hidden = servers.length < 2;
        formatFieldset.disabled = !servers.length;
        copyButton.disabled = !servers.length;
        if (!servers.length) {
            status('Link phim đang được cập nhật. Vui lòng quay lại sau.', false);
            currentLabel.textContent = 'Link phim đang được cập nhật';
            return;
        }
        status('', false);
        const saved = savedSelection();
        selectEpisode(saved ? saved.server : 0, saved ? saved.episode : 0);
        renderSources();
    }
    function present(): void {
        if (!alive()) return;
        install();
        if (!servers.length) return;
        startPlayer();
        renderPlayer();
        renderSources();
    }
    function disclosure(): void {
        watchNow.setAttribute('aria-expanded', root.open ? 'true' : 'false');
        if (root.open) present();
        else { stopPlayer(); cancelRendering(); }
    }
    const plainClick = (e: MouseEvent) => !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0;

    on(root, 'toggle', disclosure);
    on(sourceCard, 'toggle', () => { if (sourceCard.open) present(); });
    on(watchNow, 'click', (event) => { if (!plainClick(event)) return; root.open = true; disclosure(); });
    on(q<HTMLElement>('#nc-get-sources'), 'click', (event) => { if (!plainClick(event)) return; sourceCard.open = true; present(); });
    on(page, 'click', (event) => {
        const node = (event.target as HTMLElement).closest('button');
        if (!node || !page.contains(node)) return;
        if (node.hasAttribute('data-episode-retry')) present();
        if (node.hasAttribute('data-player-server')) selectEpisode(Number(node.getAttribute('data-player-server')), Number(node.getAttribute('data-player-episode') ?? 0), true);
        if (node.hasAttribute('data-source-server')) { sourceServer = Number(node.getAttribute('data-source-server')); renderSources(); }
    });
    on(queryInput, 'input', filterEpisodes);
    on(queryInput, 'paste', (event) => { if (event.clipboardData && !/^[0-9]*$/.test(event.clipboardData.getData('text'))) event.preventDefault(); });
    on(queryInput, 'keydown', (event) => { if (event.key !== 'Escape') return; event.preventDefault(); queryInput.value = ''; filterEpisodes(); });
    on(clearSearch, 'click', () => { queryInput.value = ''; filterEpisodes(); queryInput.focus(); });
    page.querySelectorAll<HTMLElement>('.type_show, .format_link').forEach((field) => { on(field, 'input', renderSources); on(field, 'change', renderSources); });
    on(q<HTMLButtonElement>('#sort'), 'click', (event) => {
        sourceDescending = !sourceDescending;
        const button = event.currentTarget as HTMLButtonElement;
        button.setAttribute('aria-pressed', sourceDescending ? 'true' : 'false');
        button.textContent = sourceDescending ? 'Thứ tự giảm dần' : 'Thứ tự tăng dần';
        renderSources();
    });
    on(copyButton, 'click', () => {
        if (!output.value) return;
        let copied: Promise<void>;
        try {
            if (navigator.clipboard && window.isSecureContext) copied = navigator.clipboard.writeText(output.value);
            else { output.focus(); output.select(); copied = document.execCommand('copy') ? Promise.resolve() : Promise.reject(new Error('Copy failed')); }
        } catch (error) { copied = Promise.reject(error); }
        copied.then(() => { if (alive()) copyStatus.textContent = 'Đã sao chép.'; })
            .catch(() => { if (alive()) copyStatus.textContent = 'Không thể sao chép tự động. Hãy chọn và sao chép thủ công.'; });
    });
    on(q<HTMLButtonElement>('#nc-player-apple-try'), 'click', () => { if (!alive() || !root.open || !activeSource) return; stopPlayer(); startPlayer(); });

    // Mở sẵn khi URL có #nc-film-player / #data_link (bản gốc: details open → present ngay).
    if (location.hash === '#nc-film-player') root.open = true;
    if (location.hash === '#data_link') sourceCard.open = true;
    if (root.open || sourceCard.open) present();

    return () => {
        disposed = true;
        cancelRendering();
        stopPlayer();
        listeners.forEach((remove) => remove());
    };
}
