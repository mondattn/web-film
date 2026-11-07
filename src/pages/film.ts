/*
 * Trang chi tiết phim /phim/:slug — dựng lại theo markup của phim.nguonc.com/phim/<slug>
 * (capture REA 2026-11-07), dữ liệu từ GET /api/film/{slug}.
 */
import { ApiError, categoryTags, fetchFilm, SITE_BASE, type ApiMovie, type Tag } from '../api';
import { icons } from '../icons';
import { createPlayer, type Server } from '../player';
import { escapeHtml as h, type RouteContext } from '../router';
import { revealCards } from '../motion';
import { statusClass } from '../format';

function crumb(name: string, href: string, last = false): string {
    return `<li class="nc-breadcrumb__item">
        <a title="${h(name)}" href="${href}"><span>${h(name)}</span></a>${last ? '' : icons.crumbSep}
    </li>`;
}

function tagLinks(tags: Tag[]): string {
    return tags.map((t) => `<a href="${t.href}">${h(t.name)}</a>`).join('');
}

function factRow(label: string, value: string): string {
    return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`;
}
function factLinks(label: string, tags: Tag[]): string {
    if (!tags.length) return '';
    return `<div><dt>${h(label)}</dt><dd class="nc-film-fact-links">${tagLinks(tags)}</dd></div>`;
}

function posterMarkup(movie: ApiMovie): string {
    const alt = `${movie.name} - ${movie.original_name}`;
    const sizes = '(max-width:639px) 180px, (max-width:899px) 210px, 180px';
    const webp = movie.thumb_url_webp ? `<source type="image/webp" srcset="${h(movie.thumb_url_webp)}" sizes="${sizes}">` : '';
    return `<picture style="display:contents">${webp}<img src="${h(movie.thumb_url)}" alt="${h(alt)}" fetchpriority="high" width="300" height="420" decoding="async" sizes="${sizes}"></picture>`;
}

export function filmMarkup(movie: ApiMovie): string {
    const format = categoryTags(movie, 'Định dạng');
    const genres = categoryTags(movie, 'Thể loại');
    const years = categoryTags(movie, 'Năm');
    const countries = categoryTags(movie, 'Quốc gia');
    const crumbs = [...format, ...genres, ...years, ...countries];
    const apiUrl = `${SITE_BASE}/api/film/${encodeURIComponent(movie.slug)}`;
    const externals = [
        movie.tmdb?.url ? `<a href="${h(movie.tmdb.url)}" class="nc-film-external-link" target="_blank" rel="noopener noreferrer" aria-label="Xem thông tin phim trên TMDB (mở tab mới)"><strong class="nc-film-external-brand nc-film-external-brand--tmdb">TMDB</strong></a>` : '',
        movie.imdb?.url ? `<a href="${h(movie.imdb.url)}" class="nc-film-external-link" target="_blank" rel="noopener noreferrer" aria-label="Xem thông tin phim trên IMDb (mở tab mới)"><strong class="nc-film-external-brand nc-film-external-brand--imdb">IMDb</strong></a>` : '',
    ].join('');

    return `<div class="nc-page nc-film-page" data-film-slug="${h(movie.slug)}">
    <nav class="nc-breadcrumb" aria-label="Đường dẫn trang">
        <a href="/" class="nc-breadcrumb__home" aria-label="Trang chủ">${icons.home}</a>
        <ol class="nc-breadcrumb__list">
            ${crumb('Trang chủ', '/')}
            ${crumbs.map((c) => crumb(c.name, c.href)).join('')}
            ${crumb(movie.name, `/phim/${encodeURIComponent(movie.slug)}`, true)}
        </ol>
    </nav>

    <div class="nc-container nc-film-layout">
        <article class="nc-film-hero" aria-labelledby="nc-film-title">
            <div class="nc-film-poster">${posterMarkup(movie)}</div>

            <div class="nc-film-summary">
                <div class="nc-film-kickers">
                    ${movie.quality ? `<span>${h(movie.quality)}</span>` : ''}
                    ${movie.language ? `<span>${h(movie.language)}</span>` : ''}
                    ${movie.current_episode ? `<span class="nc-film-kickers__status nc-film-status ${statusClass(movie.current_episode)}" title="${h(movie.current_episode)}">${h(movie.current_episode)}</span>` : ''}
                </div>
                <h1 id="nc-film-title">${h(movie.name)}</h1>
                ${movie.original_name ? `<p class="nc-film-original-title">${h(movie.original_name)}</p>` : ''}
                ${externals ? `<div class="nc-film-external-links" aria-label="Thông tin TMDB và IMDb">${externals}</div>` : ''}
                ${movie.description ? `<p class="nc-film-description">${h(movie.description)}</p>` : ''}

                <div class="nc-film-actions">
                    <a class="nc-button nc-button--primary" id="nc-watch-now" href="#nc-film-player" aria-controls="nc-film-player" aria-expanded="false">${icons.play}Xem ngay</a>
                    <a class="nc-button nc-button--secondary" id="nc-get-sources" href="#data_link">Lấy nguồn embed</a>
                    <a class="nc-button nc-button--secondary" target="_blank" rel="noopener noreferrer" href="${apiUrl}">Mở API phim</a>
                </div>

                <dl class="nc-film-facts">
                    ${factRow('Số tập', String(movie.total_episodes ?? ''))}
                    ${factRow('Thời lượng', movie.time ?? '')}
                    ${factRow('Đạo diễn', movie.director ?? '')}
                    ${factRow('Diễn viên', movie.casts ?? '')}
                    ${factLinks('Danh sách', format)}
                    ${factLinks('Thể loại', genres)}
                    ${factLinks('Năm phát hành', years)}
                    ${factLinks('Quốc gia', countries)}
                </dl>
            </div>
        </article>

        <details class="nc-detail-card nc-source-card" id="data_link">
            <summary>
                <span>
                    <span class="nc-eyebrow">Dành cho nhà phát triển</span>
                    <strong>Lấy danh sách nguồn embed</strong>
                    <small>Định dạng và sao chép link theo máy chủ.</small>
                </span>
                ${icons.chevronThin}
            </summary>
            <div class="nc-source-content">
                <p class="nc-episode-status" data-episode-status role="status" aria-live="polite">Mở để tải danh sách tập.</p>
                <button type="button" class="nc-button nc-button--secondary" data-episode-retry hidden>Thử lại</button>
                <div class="nc-source-servers" id="nc-source-servers" role="tablist" aria-label="Chọn máy chủ để lấy nguồn" hidden></div>

                <fieldset class="nc-source-format" disabled>
                    <legend>Định dạng hiển thị</legend>
                    <label><input id="showType1" class="type_show" type="radio" name="typeShow" checked value="1"> Tập|Link</label>
                    <label><input id="showType2" class="type_show" type="radio" name="typeShow" value="2"> Tập|Slug|Link</label>
                    <label><input id="showType3" class="type_show" type="radio" name="typeShow" value="3"> Chỉ link</label>
                </fieldset>

                <div class="nc-source-fields">
                    <label class="nc-field"><span>Phân cách</span><input class="format_link" type="text" id="format_seperation" placeholder="Mặc định: |"></label>
                    <label class="nc-field"><span>Ký tự đầu</span><input class="format_link" type="text" id="format_start" placeholder="Ví dụ: ["></label>
                    <label class="nc-field"><span>Ký tự cuối</span><input class="format_link" type="text" id="format_end" placeholder="Ví dụ: ]"></label>
                    <button type="button" id="sort" class="nc-button nc-button--secondary sort_data" aria-label="Đổi thứ tự tập" aria-pressed="false">Đảo thứ tự</button>
                </div>

                <label class="nc-source-output" for="area_embed">Nguồn embed đã định dạng</label>
                <textarea id="area_embed" rows="10" readonly></textarea>
                <div class="nc-source-actions">
                    <button type="button" class="nc-button nc-button--primary" id="nc-copy-embed" disabled>Sao chép nguồn</button>
                    <span id="nc-copy-status" role="status" aria-live="polite"></span>
                </div>
            </div>
        </details>

        <details class="nc-detail-card nc-player-card" id="nc-film-player" data-film-name="${h(movie.name)}" data-film-slug="${h(movie.slug)}" aria-labelledby="nc-player-heading">
            <summary class="nc-detail-heading nc-player-heading">
                <div>
                    <span class="nc-eyebrow">Trình phát trực tiếp</span>
                    <h2 id="nc-player-heading">Xem ${h(movie.name)}</h2>
                    <p id="nc-player-current">Mở để tải danh sách tập.</p>
                </div>
                ${icons.playerChevron}
            </summary>

            <div class="nc-player-content">
                <p class="nc-episode-status" data-episode-status role="status" aria-live="polite">Mở để tải danh sách tập.</p>
                <button type="button" class="nc-button nc-button--secondary" data-episode-retry hidden>Thử lại</button>
                <div class="nc-player-actions">
                    <a class="nc-button nc-button--secondary nc-player-external" id="nc-player-external" hidden target="_blank" rel="noopener noreferrer">Mở trong tab mới${icons.external}</a>
                </div>
                <div class="nc-player-stage" hidden>
                    <iframe id="nc-player-frame" title="Xem ${h(movie.name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="origin"></iframe>
                    <div class="nc-player-loading" id="nc-player-loading" aria-live="polite">
                        <span class="nc-player-spinner" aria-hidden="true"></span>
                        <strong>Đang tải trình phát…</strong>
                        <span>Nếu video không mở, hãy dùng nút “Mở trong tab mới”.</span>
                    </div>
                    <div class="nc-player-apple-fallback" id="nc-player-apple-fallback" aria-labelledby="nc-player-apple-title" hidden>
                        <span class="nc-player-apple-icon" aria-hidden="true">${icons.playerApple}</span>
                        <strong id="nc-player-apple-title">Trình phát tải lâu hơn dự kiến</strong>
                        <p>Bạn có thể thử tải lại hoặc mở trình phát trong tab mới. Trang phim này vẫn được giữ lại.</p>
                        <div class="nc-player-apple-actions">
                            <a class="nc-button nc-button--primary" id="nc-player-apple-open" target="_blank" rel="noopener noreferrer">Mở trong tab mới${icons.external}</a>
                            <button class="nc-button nc-button--secondary" id="nc-player-apple-try" type="button">Thử tải lại</button>
                        </div>
                    </div>
                </div>

                <div class="nc-player-servers" id="nc-player-servers" role="tablist" aria-label="Chọn máy chủ" hidden></div>

                <div class="nc-player-episode-search" id="nc-player-episode-search" hidden>
                    <label for="nc-player-episode-query">Tìm tập nhanh</label>
                    <div class="nc-player-episode-search__controls">
                        <input type="text" inputmode="numeric" pattern="[0-9]*" enterkeyhint="search" id="nc-player-episode-query" placeholder="Nhập số tập" maxlength="100" autocomplete="off" spellcheck="false" aria-controls="nc-player-episode-groups" aria-describedby="nc-player-episode-search-status">
                        <button type="button" id="nc-player-episode-search-clear" aria-label="Xóa tìm kiếm tập" hidden>Xóa</button>
                    </div>
                    <p id="nc-player-episode-search-status" role="status" aria-live="polite" aria-atomic="true"></p>
                </div>

                <div class="nc-player-episode-groups" id="nc-player-episode-groups"></div>
            </div>
        </details>
    </div>
</div>`;
}

function statusMarkup(kind: 'loading' | 'error', slug: string, message = ''): string {
    if (kind === 'loading') {
        return `<div class="nc-page-status"><span class="nc-player-spinner" aria-hidden="true"></span><strong>Đang tải thông tin phim…</strong><span><code>${h(slug)}</code></span></div>`;
    }
    return `<div class="nc-page-status"><strong>Không tải được phim</strong><span>${h(message)}</span>
        <span><a class="nc-button nc-button--secondary" href="/phim/${h(slug)}">Thử lại</a></span></div>`;
}

export function toServers(movie: ApiMovie): Server[] {
    return (movie.episodes ?? [])
        .filter((s) => s && Array.isArray(s.items))
        .map((s) => ({ name: String(s.server_name ?? ''), list: s.items.map((e) => ({ name: String(e.name ?? ''), slug: String(e.slug ?? ''), embed: e.embed })) }));
}

let disposePlayer: (() => void) | null = null;

export async function renderFilmPage({ params, outlet, signal }: RouteContext): Promise<void> {
    disposePlayer?.();
    disposePlayer = null;
    const slug = params.slug;
    outlet.innerHTML = statusMarkup('loading', slug);
    document.title = 'Đang tải… · WEB FILM';

    let movie: ApiMovie;
    try {
        movie = await fetchFilm(slug, signal);
    } catch (error) {
        if (signal.aborted) return;
        const message = error instanceof ApiError ? error.message : 'Không gọi được API Nguồn C. Kiểm tra kết nối mạng rồi thử lại.';
        outlet.innerHTML = statusMarkup('error', slug, message);
        document.title = 'Không tải được phim · WEB FILM';
        return;
    }
    if (signal.aborted) return;

    document.title = `${movie.name} - ${movie.original_name}`;
    outlet.innerHTML = filmMarkup(movie);
    const page = outlet.querySelector<HTMLElement>('.nc-film-page')!;
    disposePlayer = createPlayer(page, toServers(movie));
    revealCards(page);
}
