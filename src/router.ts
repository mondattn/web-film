/* Router SPA tối giản: pushState + chặn click link nội bộ (bản gốc dùng ajax-load của Hn_Framework). */

export type PageRenderer = (ctx: RouteContext) => void | Promise<void>;
export interface RouteContext { path: string; params: Record<string, string>; query: URLSearchParams; outlet: HTMLElement; signal: AbortSignal }

interface Route { pattern: RegExp; keys: string[]; render: PageRenderer }

const routes: Route[] = [];
let current: AbortController | null = null;

export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** route('/phim/:slug', render) */
export function route(pattern: string, render: PageRenderer): void {
    const keys: string[] = [];
    const source = pattern.replace(/\//g, '\\/').replace(/:([a-zA-Z]+)/g, (_, key: string) => { keys.push(key); return '([^/]+)'; });
    routes.push({ pattern: new RegExp(`^${source}\\/?$`), keys, render });
}

export function navigate(path: string, replace = false): void {
    if (replace) history.replaceState({ path }, '', path);
    else history.pushState({ path }, '', path);
    void dispatch();
}

export async function dispatch(): Promise<void> {
    current?.abort();
    current = new AbortController();
    const outlet = document.getElementById('content')!;
    const path = location.pathname;
    const query = new URLSearchParams(location.search);
    for (const r of routes) {
        const match = r.pattern.exec(path);
        if (!match) continue;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match[i + 1]); });
        await r.render({ path, params, query, outlet, signal: current.signal });
        return;
    }
    outlet.innerHTML = `<div class="nc-stub"><h1>Không tìm thấy trang</h1><p><code>${escapeHtml(path)}</code></p><p><a class="nc-button nc-button--secondary" href="/">Về trang chủ</a></p></div>`;
}

function isPlainClick(event: MouseEvent): boolean {
    return !event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

export function startRouter(): void {
    document.addEventListener('click', (event) => {
        if (!isPlainClick(event)) return;
        const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
        if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
        const url = new URL(anchor.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search && url.hash) {
            // link #anchor trong trang: cuộn mượt tới phần tử (như main.js của bản gốc)
            const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (el) { event.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(history.state, '', url.hash); }
            return;
        }
        event.preventDefault();
        navigate(url.pathname + url.search + url.hash);
        window.scrollTo({ top: 0 });
    });
    window.addEventListener('popstate', () => { void dispatch(); });
    void dispatch();
}
