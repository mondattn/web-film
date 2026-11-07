/*
 * Trang chủ, trang danh sách (/danh-sach|the-loai|quoc-gia|nam-phat-hanh|ngon-ngu/:slug) và tìm kiếm (/tim-kiem).
 * Markup theo capture REA 2026-11-08 của phim.nguonc.com (/, /danh-sach/phim-bo, /the-loai/hinh-su?page=2, /tim-kiem?keyword=bac+si).
 *
 * DEVIATION so với bản gốc (do API public không trả):
 *  - Mỗi trang 10 phim (API items_per_page) thay vì 24.
 *  - Không có "Định dạng" & "Quốc gia" theo từng phim → cột Định dạng suy từ số tập / tên danh sách, cột Quốc gia thay bằng Ngôn ngữ.
 *  - Bộ lọc chỉ lọc được 1 chiều mỗi lần (mỗi select = một endpoint), không có Sắp xếp.
 */
import { ApiError, fetchList, SITE_BASE, type ApiListItem, type ApiListResponse, type ListKind } from '../api';
import { FILTER_DIMENSIONS } from '../filters';
import { formatDateVN, formatNumber, statusClass, vnDateKey } from '../format';
import { icons } from '../icons';
import { escapeHtml as h, navigate, type RouteContext } from '../router';
import { revealCards } from '../motion';

/* ---------- Bảng phim ---------- */

/** ASSUMPTION: API không có định dạng theo phim → 1 tập = Phim lẻ, nhiều tập = Phim bộ; trang /danh-sach dùng tên danh sách. */
function formatLabel(item: ApiListItem, fallback?: string): string {
    if (fallback) return fallback;
    const total = Number(item.total_episodes);
    if (Number.isFinite(total) && total > 0) return total > 1 ? 'Phim bộ' : 'Phim lẻ';
    return /full/i.test(item.current_episode ?? '') ? 'Phim lẻ' : 'Phim bộ';
}

function languageTags(language: string | null | undefined): string {
    const parts = (language ?? '').split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
    return (parts.length ? parts : ['—']).map((p) => `<span class="nc-tag">${h(p)}</span>`).join('');
}

function providerCell(label: string, url: string | undefined | null): string {
    if (!url) return `<td class="nc-movie-provider" data-label="${label}"><span class="nc-empty-value" aria-label="Không có ${label}">—</span></td>`;
    const brand = label === 'TMDB' ? 'tmdb' : 'imdb';
    return `<td class="nc-movie-provider" data-label="${label}">
        <a href="${h(url)}" class="nc-film-external-link" target="_blank" rel="noopener noreferrer" aria-label="Xem thông tin phim trên ${label} (mở tab mới)">
            <strong class="nc-film-external-brand nc-film-external-brand--${brand}">${label}</strong>
        </a></td>`;
}

function movieRow(item: ApiListItem, index: number, formatName?: string): string {
    const title = `${item.name}${item.original_name ? ` - ${item.original_name}` : ''}`;
    const sizes = '(max-width:767px) 50px, 52px';
    const webp = item.thumb_url_webp ? `<source type="image/webp" srcset="${h(item.thumb_url_webp)}" sizes="${sizes}">` : '';
    const status = item.current_episode ?? '';
    return `<tr data-nc-motion-delay="${Math.min(index * 24, 240)}">
        <td class="nc-movie-primary" data-label="Tên phim">
            <a class="nc-movie-identity" title="${h(title)}" href="/phim/${encodeURIComponent(item.slug)}">
                <span class="nc-movie-poster"><picture style="display:contents">${webp}<img src="${h(item.thumb_url)}" alt="${h(title)}" loading="${index < 6 ? 'eager' : 'lazy'}" width="52" height="72" decoding="async" sizes="${sizes}"></picture></span>
                <span class="nc-movie-copy"><strong>${h(item.name)}</strong><span class="nc-movie-original">${h(item.original_name)}</span></span>
            </a>
        </td>
        <td class="nc-movie-status" data-label="Tình trạng"><span class="nc-status-badge nc-film-status ${statusClass(status)}" title="${h(status)}">${h(status)}</span></td>
        <td data-label="Định dạng"><div class="nc-tag-list"><span class="nc-tag">${h(formatLabel(item, formatName))}</span></div></td>
        <td data-label="Năm"><div class="nc-tag-list"><span class="nc-tag">${h(item.year ?? '')}</span></div></td>
        <td data-label="Ngôn ngữ"><div class="nc-tag-list nc-language-tags">${languageTags(item.language)}</div></td>
        ${providerCell('TMDB', item.tmdb?.url)}
        ${providerCell('IMDb', item.imdb?.url)}
        <td class="nc-updated-cell" data-label="Cập nhật"><time datetime="${h(item.modified ?? '')}">${formatDateVN(item.modified)}</time></td>
    </tr>`;
}

function emptyRow(message: string): string {
    return `<tr class="nc-movie-empty-row"><td class="nc-table-empty" colspan="8">
        <span class="nc-table-empty__icon" aria-hidden="true">${icons.statFilm}</span>
        <strong>Không có phim nào</strong><span>${h(message)}</span></td></tr>`;
}

export function movieTable(items: ApiListItem[], formatName?: string, emptyMessage = 'Danh sách này chưa có phim.'): string {
    return `<div class="nc-movie-list"><div class="nc-table-shell">
        <table class="nc-movie-table">
            <caption class="nc-sr-only">Danh sách phim và thông tin cập nhật</caption>
            <thead><tr>
                <th scope="col">Tên phim</th><th scope="col">Tình trạng</th><th scope="col">Định dạng</th><th scope="col">Năm</th>
                <th scope="col">Ngôn ngữ</th>
                <th scope="col" class="nc-movie-provider-col">TMDB</th>
                <th scope="col" class="nc-movie-provider-col nc-movie-provider-col--imdb">IMDb</th>
                <th scope="col">Ngày cập nhật</th>
            </tr></thead>
            <tbody>${items.length ? items.map((it, i) => movieRow(it, i, formatName)).join('') : emptyRow(emptyMessage)}</tbody>
        </table>
    </div>`;
}

/* ---------- Phân trang ---------- */

/** Cửa sổ trang như quan sát: trang 1 → 1 2 3 4 … N; trang 2 → 1 2 3 4 … N; giữa → 1 … c-1 c c+1 … N (ASSUMPTION cho trang giữa). */
function pageWindow(current: number, total: number): Array<number | '…'> {
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total]);
    if (current <= 3) for (let p = 1; p <= 4; p++) pages.add(p);
    else if (current >= total - 2) for (let p = total - 3; p <= total; p++) pages.add(p);
    else for (let p = current - 1; p <= current + 1; p++) pages.add(p);
    const sorted = [...pages].sort((a, b) => a - b);
    const out: Array<number | '…'> = [];
    sorted.forEach((p, i) => { if (i && p - sorted[i - 1] > 1) out.push('…'); out.push(p); });
    return out;
}

export function pagination(paginate: ApiListResponse['paginate'], hrefFor: (page: number) => string): string {
    const current = Number(paginate.current_page) || 1;
    const total = Math.max(1, Number(paginate.total_page) || 1);
    const link = (page: number, label: string, extra = '') => `<a class="nc-page-button nc-page-arrow" href="${hrefFor(page)}" ${extra} aria-label="Trang ${page}">${label}</a>`;
    const items = pageWindow(current, total).map((p) => p === '…'
        ? '<span class="nc-page-ellipsis" aria-hidden="true">…</span>'
        : p === current ? `<span class="nc-page-button" aria-current="page" aria-label="Trang ${p}">${p}</span>` : link(p, String(p)));
    const prev = current > 1 ? link(current - 1, 'Trước', 'rel="prev"') : '<span class="nc-page-button" aria-disabled="true">Trước</span>';
    const next = current < total ? link(current + 1, 'Sau', 'rel="next"') : '<span class="nc-page-button" aria-disabled="true">Sau</span>';
    return `<div class="nc-pagination-shell">
        <p class="nc-pagination-summary">Tổng <strong>${formatNumber(Number(paginate.total_items) || 0)}</strong> kết quả</p>
        <nav class="nc-page-control" aria-label="Phân trang danh sách phim">${prev}${items.join('')}${next}</nav>
    </div>`;
}

/* ---------- Bộ lọc & thanh chuyển kiểu xem ---------- */

export function viewSwitch(): string {
    return `<div class="nc-view-switch" role="group" aria-label="Kiểu hiển thị danh sách phim">
        <button type="button" data-nc-view-choice="list" aria-pressed="true" title="Hiển thị dạng danh sách">${icons.viewList}<span>Danh sách</span></button>
        <button type="button" data-nc-view-choice="grid" aria-pressed="false" title="Hiển thị dạng lưới">${icons.viewGrid}<span>Dạng lưới</span></button>
    </div>`;
}

function filterCard(kind: ListKind | null, slug: string): string {
    const fields = FILTER_DIMENSIONS.map((dim) => {
        const options = dim.options.map((o) => {
            const selected = dim.kind === kind && o.href.endsWith(`/${slug}`) ? ' selected' : '';
            return `<option value="${h(o.href)}"${selected}>${h(o.label)}</option>`;
        }).join('');
        return `<label class="nc-field"><span>${dim.label}</span><select name="${dim.key}" data-filter-kind="${dim.kind}"><option value="">${dim.all}</option>${options}</select></label>`;
    }).join('');
    return `<form id="form-filter" class="nc-filter-card" method="GET">
        <button type="button" class="open_filter nc-filter-toggle" aria-controls="nc-catalog-filter-fields" aria-expanded="false">
            <span>${icons.filter}Lọc phim</span>${icons.filterChevron}
        </button>
        <div class="select_filter hidden nc-filter-fields" id="nc-catalog-filter-fields">
            <label class="nc-field"><span>Sắp xếp</span><select name="sort_field" disabled title="API công khai không hỗ trợ sắp xếp"><option value="new">Phim mới nhất</option></select></label>
            ${fields}
            <button type="submit" id="btn-movie-filter" class="nc-button nc-button--primary nc-filter-submit">Áp dụng bộ lọc</button>
        </div>
    </form>`;
}

function bindFilter(scope: HTMLElement): void {
    const form = scope.querySelector<HTMLFormElement>('#form-filter');
    if (!form) return;
    const fields = form.querySelector<HTMLElement>('.nc-filter-fields')!;
    const toggle = form.querySelector<HTMLButtonElement>('.open_filter')!;
    let lastChanged: HTMLSelectElement | null = null;
    toggle.addEventListener('click', () => {
        fields.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', fields.classList.contains('hidden') ? 'false' : 'true');
    });
    form.querySelectorAll<HTMLSelectElement>('select[data-filter-kind]').forEach((select) => {
        select.addEventListener('change', () => { lastChanged = select; });
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        // Mỗi select tương ứng một endpoint riêng của API → áp dụng select vừa đổi gần nhất (hoặc select đầu tiên có giá trị).
        const chosen = lastChanged?.value ? lastChanged
            : Array.from(form.querySelectorAll<HTMLSelectElement>('select[data-filter-kind]')).find((s) => s.value) ?? null;
        if (chosen?.value) navigate(chosen.value);
    });
}

/* ---------- Khung trang ---------- */

function crumbs(entries: Array<[string, string]>, last: string): string {
    const items = entries.map(([name, href]) => `<li class="nc-breadcrumb__item"><a title="${h(name)}" href="${href}"><span>${h(name)}</span></a>${icons.crumbSep}</li>`).join('');
    return `<nav class="nc-breadcrumb" aria-label="Đường dẫn trang">
        <a href="/" class="nc-breadcrumb__home" aria-label="Trang chủ">${icons.home}</a>
        <ol class="nc-breadcrumb__list">${items}<li class="nc-breadcrumb__item"><span>${h(last)}</span></li></ol>
    </nav>`;
}

function loadingMarkup(label: string): string {
    return `<div class="nc-page-status"><span class="nc-player-spinner" aria-hidden="true"></span><strong>Đang tải ${h(label)}…</strong></div>`;
}
function errorMarkup(error: unknown, retryHref: string): string {
    const message = error instanceof ApiError ? error.message : 'Không gọi được API Nguồn C. Kiểm tra kết nối mạng rồi thử lại.';
    return `<div class="nc-page-status"><strong>Không tải được danh sách</strong><span>${h(message)}</span>
        <span><a class="nc-button nc-button--secondary" href="${retryHref}">Thử lại</a></span></div>`;
}

interface CatalogSpec {
    kind: ListKind;
    slug: string;
    page: number;
    eyebrow: string;
    title: (data: ApiListResponse) => string;
    crumbs: (data: ApiListResponse) => Array<[string, string]>;
    lastCrumb: (data: ApiListResponse) => string;
    hrefFor: (page: number) => string;
    formatName?: (data: ApiListResponse) => string | undefined;
    filterKind: ListKind | null;
}

async function renderCatalog(ctx: RouteContext, spec: CatalogSpec): Promise<void> {
    const { outlet, signal } = ctx;
    outlet.innerHTML = loadingMarkup('danh sách phim');
    let data: ApiListResponse;
    try { data = await fetchList(spec.kind, spec.slug, spec.page, signal); }
    catch (error) { if (!signal.aborted) outlet.innerHTML = errorMarkup(error, spec.hrefFor(spec.page)); return; }
    if (signal.aborted) return;

    const title = spec.title(data);
    document.title = `${title} - Trang ${data.paginate.current_page} · WEB FILM`;
    outlet.innerHTML = `<div class="nc-page nc-catalog-page">
        ${crumbs(spec.crumbs(data), spec.lastCrumb(data))}
        <div class="nc-container">
            <header class="nc-page-heading"><div><span class="nc-eyebrow">${spec.eyebrow}</span><h1>${h(title)}</h1></div>
                <span class="nc-result-count">${formatNumber(Number(data.paginate.total_items) || 0)} kết quả</span></header>
            ${filterCard(spec.filterKind, spec.slug)}
            <div class="nc-catalog-viewbar">${viewSwitch()}</div>
            ${movieTable(data.items, spec.formatName?.(data))}
            ${pagination(data.paginate, spec.hrefFor)}
        </div>
    </div>`;
    bindFilter(outlet);
    revealCards(outlet);
}

const pageOf = (query: URLSearchParams) => Math.max(1, Number(query.get('page')) || 1);
function withPage(base: string, page: number, extra = ''): string {
    const query = [extra, page > 1 ? `page=${page}` : ''].filter(Boolean).join('&');
    return query ? `${base}?${query}` : base;
}

const CATALOG_LABEL: Record<Exclude<ListKind, 'phim-moi-cap-nhat' | 'search'>, { crumb: string; title: (name: string) => string }> = {
    'danh-sach': { crumb: 'Danh sách', title: (n) => n },
    'the-loai': { crumb: 'Thể loại', title: (n) => `Phim ${n}` },
    'quoc-gia': { crumb: 'Quốc gia', title: (n) => `Phim ${n}` },
    'nam-phat-hanh': { crumb: 'Năm phát hành', title: (n) => `Phim năm ${n}` },
    'ngon-ngu': { crumb: 'Ngôn ngữ', title: (n) => `Phim ${n}` },
};

/** /danh-sach/:slug, /the-loai/:slug, /quoc-gia/:slug, /nam-phat-hanh/:slug, /ngon-ngu/:slug */
export function catalogPage(kind: keyof typeof CATALOG_LABEL) {
    return (ctx: RouteContext) => {
        const slug = ctx.params.slug;
        const page = pageOf(ctx.query);
        const base = `/${kind}/${encodeURIComponent(slug)}`;
        const label = CATALOG_LABEL[kind];
        const name = (data: ApiListResponse) => data.cat?.title || data.cat?.name || slug;
        return renderCatalog(ctx, {
            kind, slug, page, filterKind: kind,
            eyebrow: 'Thư viện phim',
            title: (data) => label.title(name(data)),
            crumbs: (data) => [['Trang chủ', '/'], [label.crumb, '/danh-sach-phim'], [name(data), base]],
            lastCrumb: () => `Trang ${page}`,
            hrefFor: (p) => withPage(base, p),
            formatName: (data) => (kind === 'danh-sach' ? (data.cat?.name || undefined) : undefined),
        });
    };
}

/** /danh-sach-phim — toàn bộ phim mới cập nhật (nút "Xem tất cả" / "Xem danh sách phim" của bản gốc). */
export function allFilmsPage(ctx: RouteContext): Promise<void> {
    const page = pageOf(ctx.query);
    return renderCatalog(ctx, {
        kind: 'phim-moi-cap-nhat', slug: '', page, filterKind: null,
        eyebrow: 'Thư viện phim',
        title: () => 'Danh sách phim',
        crumbs: () => [['Trang chủ', '/'], ['Danh sách phim', '/danh-sach-phim']],
        lastCrumb: () => `Trang ${page}`,
        hrefFor: (p) => withPage('/danh-sach-phim', p),
    });
}

/** /tim-kiem?keyword=… */
export function searchPage(ctx: RouteContext): Promise<void> {
    const keyword = (ctx.query.get('keyword') ?? '').trim();
    const page = pageOf(ctx.query);
    if (!keyword) {
        ctx.outlet.innerHTML = `<div class="nc-stub"><h1>Tìm kiếm</h1><p>Nhập tên phim hoặc tên gốc vào ô tìm kiếm ở đầu trang.</p></div>`;
        document.title = 'Tìm kiếm · WEB FILM';
        return Promise.resolve();
    }
    const extra = `keyword=${encodeURIComponent(keyword)}`;
    return renderCatalog(ctx, {
        kind: 'search', slug: keyword, page, filterKind: null,
        eyebrow: 'Kết quả tìm kiếm',
        title: () => `Kết quả tìm kiếm từ khóa: "${keyword}"`,
        crumbs: () => [['Trang chủ', '/'], [`Tìm kiếm: "${keyword}"`, `/tim-kiem?${extra}`]],
        lastCrumb: () => `Trang ${page}`,
        hrefFor: (p) => withPage('/tim-kiem', p, extra),
    });
}

/* ---------- Trang chủ ---------- */

function statCard(kind: 'orange' | 'blue' | 'cyan' | 'violet', icon: string, value: string, label: string, href?: string): string {
    const inner = `<span class="nc-stat-card__icon" aria-hidden="true">${icon}</span><div><strong>${h(value)}</strong><span>${h(label)}</span></div>`;
    return href
        ? `<a class="nc-stat-card nc-stat-card--${kind}" href="${h(href)}" target="_blank" rel="noopener noreferrer" title="${h(label)}">${inner}</a>`
        : `<article class="nc-stat-card nc-stat-card--${kind}">${inner}</article>`;
}

export async function homePage({ outlet, signal }: RouteContext): Promise<void> {
    document.title = 'WEB FILM - Dữ liệu phim từ API Nguồn C';
    const hero = `<section class="nc-home-hero nc-container" aria-labelledby="nc-home-title">
        <div class="nc-home-hero__content">
            <span class="nc-eyebrow">Nguồn dữ liệu phim dành cho nhà phát triển</span>
            <h1 class="nc-home-title" id="nc-home-title">API dữ liệu phim nhanh, ổn định và dễ tích hợp</h1>
            <p class="nc-home-lead">Bản dựng lại giao diện Nguồn C bằng Vite + TypeScript. Toàn bộ dữ liệu phim, ảnh và nguồn phát được đọc trực tiếp từ API công khai của phim.nguonc.com; trang này không lưu trữ nội dung nào.</p>
            <div class="nc-home-actions">
                <a class="nc-button nc-button--primary" href="/danh-sach-phim">Xem danh sách phim${icons.arrowRight}</a>
                <a class="nc-button nc-button--secondary" href="${SITE_BASE}/api" target="_blank" rel="noopener noreferrer">Tài liệu API</a>
            </div>
        </div>
    </section>`;
    outlet.innerHTML = `<div class="nc-page nc-home-page">${hero}<div id="nc-home-rest">${loadingMarkup('phim mới cập nhật')}</div></div>`;
    const rest = outlet.querySelector<HTMLElement>('#nc-home-rest')!;

    let data: ApiListResponse;
    try { data = await fetchList('phim-moi-cap-nhat', '', 1, signal); }
    catch (error) { if (!signal.aborted) rest.innerHTML = errorMarkup(error, '/'); return; }
    if (signal.aborted) return;

    // ASSUMPTION: "Phim cập nhật hôm nay" = số phim trong trang 1 có `modified` rơi vào hôm nay (giờ VN); API không có số tổng.
    const today = vnDateKey(new Date());
    const updatedToday = data.items.filter((it) => it.modified && vnDateKey(it.modified) === today).length;
    const todayLabel = updatedToday >= data.items.length && data.items.length ? `${updatedToday}+` : String(updatedToday);

    rest.innerHTML = `
        <section class="nc-container nc-stats" aria-label="Tổng quan dữ liệu">
            ${statCard('orange', icons.statFilm, todayLabel, 'Phim cập nhật hôm nay')}
            ${statCard('blue', icons.statVideo, formatNumber(Number(data.paginate.total_items) || 0), 'Tổng số phim')}
            ${statCard('cyan', icons.statSend, 'Nguồn C', 'phim.nguonc.com', SITE_BASE)}
            ${statCard('violet', icons.statCode, 'API phim', 'Dành cho nhà phát triển', `${SITE_BASE}/api`)}
        </section>
        <section class="nc-container nc-movie-section" aria-labelledby="nc-latest-title">
            <div class="nc-section-heading">
                <div><span class="nc-eyebrow">Cập nhật mới nhất</span><h2 id="nc-latest-title">Danh sách phim</h2></div>
                <div class="nc-movie-heading-actions nc-movie-heading-actions--grouped">
                    ${viewSwitch()}
                    <a class="nc-view-all-link" href="/danh-sach-phim">${icons.viewAll}<span>Xem tất cả</span></a>
                </div>
            </div>
            ${movieTable(data.items)}
            ${pagination(data.paginate, (p) => withPage('/danh-sach-phim', p))}
        </section>`;
    revealCards(outlet);
}
