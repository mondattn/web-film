/*
 * Header + drawer di động + theme + thanh tiến trình cuộn.
 * Hành vi viết lại từ main.js / redesign.js của bản gốc (jQuery → DOM thuần):
 *  - click nút "Thể loại / Quốc gia / Năm" bật/tắt submenu, click ra ngoài thì đóng, Esc đóng
 *  - nút theme mở menu Sáng/Tối, lưu localStorage['theme'], mặc định tối
 *  - drawer di động (<1280px) có focus trap + Esc
 *  - thanh tiến trình cuộn + body.nc-has-scrolled (đổi viền header)
 */
import { MENU, type MenuItem } from './menu';
import { icons } from './icons';
import { escapeHtml, navigate } from './router';

const SEARCH_PLACEHOLDER = 'Tìm kiếm tên phim, tên gốc...';

function searchForm(): string {
    return `<form class="nc-search-form" method="GET" action="/tim-kiem" role="search">
        ${icons.search}
        <input type="search" value="" class="nc-search-input" aria-label="Tìm kiếm phim" name="keyword" required placeholder="${SEARCH_PLACEHOLDER}" autocomplete="off">
    </form>`;
}

function desktopItem(item: MenuItem, index: number): string {
    if (!item.children) {
        return `<li class="nc-primary-nav__item"><a class="nc-primary-nav__link" href="${item.href}">${escapeHtml(item.label)}</a></li>`;
    }
    const id = `nc-desktop-submenu-${index}`;
    return `<li class="nc-primary-nav__item">
        <button class="has_sub_menu nc-primary-nav__trigger" type="button" aria-expanded="false" aria-controls="${id}">
            <span>${escapeHtml(item.label)}</span>${icons.chevronDown}
        </button>
        <div class="sub-menu nc-submenu" id="${id}"><ul class="nc-submenu__list">
            ${item.children.map((c) => `<li><a class="nc-submenu__link menu_item" href="${c.href}">${escapeHtml(c.label)}</a></li>`).join('')}
        </ul></div>
    </li>`;
}

function mobileItem(item: MenuItem, index: number): string {
    if (!item.children) {
        return `<li class="nc-mobile-nav__item"><a class="nc-mobile-nav__link menu_item" href="${item.href}">${escapeHtml(item.label)}</a></li>`;
    }
    const id = `nc-mobile-submenu-${index}`;
    return `<li class="nc-mobile-nav__item">
        <button class="has_sub_menu_mobile nc-mobile-nav__trigger" type="button" aria-expanded="false" aria-controls="${id}">
            <span>${escapeHtml(item.label)}</span>${icons.chevronDown}
        </button>
        <ul class="sub_menu_mobile nc-mobile-submenu" id="${id}">
            ${item.children.map((c) => `<li><a class="nc-mobile-submenu__link menu_item" href="${c.href}">${escapeHtml(c.label)}</a></li>`).join('')}
        </ul>
    </li>`;
}

export function renderHeader(): void {
    const header = document.getElementById('site-header')!;
    header.innerHTML = `<div class="nc-header-shell">
        <a href="/" class="nc-brand" aria-label="WEB FILM - Trang chủ">
            <span class="nc-brand__mark">Web<span class="nc-brand__mark-alt">Film</span></span>
        </a>
        <div class="nc-header-search">${searchForm()}</div>
        <div class="nc-desktop-nav">
            <nav class="nc-primary-nav" id="menu-header" aria-label="Điều hướng chính">
                <ul class="nc-primary-nav__list">${MENU.map(desktopItem).join('')}</ul>
            </nav>
        </div>
        <div class="nc-header-actions">
            <div class="nc-mobile-search-wrap">
                <button type="button" class="nc-icon-button nc-search-toggle open-search" aria-label="Mở tìm kiếm" aria-controls="nc-mobile-search" aria-expanded="false">${icons.searchOutline}</button>
                <div class="form-search nc-mobile-search-panel" id="nc-mobile-search">${searchForm()}</div>
            </div>
            <div class="nc-theme-control">
                <button class="nc-icon-button open_theme" type="button" aria-label="Chọn giao diện sáng hoặc tối" aria-controls="nc-theme-menu" aria-expanded="false">${icons.sun}${icons.moon}</button>
                <ul class="option_theme nc-theme-menu" id="nc-theme-menu" aria-label="Giao diện">
                    <li><button type="button" class="theme nc-theme-option" data-theme="light" aria-pressed="false">${icons.sunSmall}Sáng</button></li>
                    <li><button type="button" class="theme nc-theme-option" data-theme="dark" aria-pressed="true">${icons.moonSmall}Tối</button></li>
                </ul>
            </div>
            <button type="button" id="open-menu" class="nc-icon-button nc-menu-toggle" aria-label="Mở menu điều hướng" aria-controls="menu_header_mobile" aria-expanded="false">${icons.menu}</button>
        </div>
    </div>`;

    const drawer = document.getElementById('menu_header_mobile')!;
    drawer.innerHTML = `<ul class="nc-mobile-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="nc-mobile-menu-title">
        <li class="nc-mobile-drawer__header">
            <span class="nc-mobile-drawer__title" id="nc-mobile-menu-title">Menu</span>
            <button type="button" class="nc-icon-button close_menu_mb" aria-label="Đóng menu">${icons.close}</button>
        </li>
        ${MENU.map(mobileItem).join('')}
        <li class="nc-mobile-drawer__footer">
            <span class="nc-mobile-theme-label">Giao diện</span>
            <div class="nc-mobile-theme-options">
                <button type="button" class="theme nc-theme-option" data-theme="light" aria-pressed="false">Sáng</button>
                <button type="button" class="theme nc-theme-option" data-theme="dark" aria-pressed="true">Tối</button>
            </div>
        </li>
    </ul>`;

    bindHeader(header, drawer);
}

function setExpanded(button: Element | null, expanded: boolean): void {
    button?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function syncTheme(): void {
    const isDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll<HTMLElement>('.theme[data-theme]').forEach((button) => {
        button.setAttribute('aria-pressed', String((button.dataset.theme === 'dark') === isDark));
    });
}

export function applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    try { localStorage.setItem('theme', theme); } catch (_) { /* storage bị chặn vẫn đổi theme được */ }
    syncTheme();
}

function bindHeader(header: HTMLElement, drawer: HTMLElement): void {
    const menuButton = header.querySelector<HTMLButtonElement>('#open-menu');
    const panel = drawer.querySelector<HTMLElement>('.nc-mobile-drawer__panel');
    let lastOpener: HTMLElement | null = null;

    const syncDesktop = () => header.querySelectorAll('.has_sub_menu').forEach((b) => {
        setExpanded(b, !!b.nextElementSibling?.classList.contains('active'));
    });
    const syncMobile = () => drawer.querySelectorAll('.has_sub_menu_mobile').forEach((b) => {
        setExpanded(b, !!b.nextElementSibling?.classList.contains('active'));
    });
    const syncPopup = (buttonSel: string, panelSel: string) => header.querySelectorAll(buttonSel).forEach((b) => {
        setExpanded(b, !!b.parentElement?.querySelector(panelSel)?.classList.contains('active'));
    });
    const syncAll = () => { syncDesktop(); syncMobile(); syncTheme(); syncPopup('.open_theme', '.option_theme'); syncPopup('.open-search', '.form-search'); };

    function openDrawer(opener: HTMLElement | null): void {
        lastOpener = opener ?? menuButton;
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('nc-menu-open');
        setExpanded(menuButton, true);
        requestAnimationFrame(() => drawer.querySelector<HTMLElement>('.close_menu_mb')?.focus());
    }
    function closeDrawer(restoreFocus: boolean): void {
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nc-menu-open');
        setExpanded(menuButton, false);
        if (restoreFocus && lastOpener?.isConnected) lastOpener.focus();
    }
    function closePopups(): void {
        document.querySelectorAll('.sub-menu.active, .option_theme.active, .form-search.active').forEach((p) => p.classList.remove('active'));
        syncAll();
    }

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        const trigger = target.closest<HTMLElement>('.has_sub_menu');
        if (trigger && header.contains(trigger)) {
            const sub = trigger.nextElementSibling;
            header.querySelectorAll('.sub-menu').forEach((p) => { if (p !== sub) p.classList.remove('active'); });
            sub?.classList.toggle('active');
        } else if (!target.closest('#menu-header')) {
            header.querySelectorAll('#menu-header .sub-menu').forEach((p) => p.classList.remove('active'));
        }

        const mobileTrigger = target.closest<HTMLElement>('.has_sub_menu_mobile');
        if (mobileTrigger) {
            const sub = mobileTrigger.nextElementSibling;
            drawer.querySelectorAll('.sub_menu_mobile').forEach((p) => { if (p !== sub) p.classList.remove('active'); });
            sub?.classList.toggle('active');
        }

        const themeButton = target.closest<HTMLElement>('.open_theme');
        if (themeButton) themeButton.nextElementSibling?.classList.toggle('active');
        else header.querySelectorAll('ul.option_theme').forEach((p) => p.classList.remove('active'));

        const themeOption = target.closest<HTMLElement>('.theme[data-theme]');
        if (themeOption) applyTheme(themeOption.dataset.theme === 'light' ? 'light' : 'dark');

        const searchToggle = target.closest<HTMLElement>('.open-search');
        if (searchToggle) {
            const form = searchToggle.nextElementSibling;
            form?.classList.toggle('active');
            if (form?.classList.contains('active')) form.querySelector<HTMLInputElement>('input')?.focus();
        } else if (!target.closest('.form-search')) {
            header.querySelectorAll('.form-search').forEach((p) => p.classList.remove('active'));
        }

        if (target.closest('#open-menu')) { event.stopPropagation(); openDrawer(target.closest('#open-menu')); return; }
        if (target.closest('.close_menu_mb')) { event.preventDefault(); closeDrawer(true); return; }
        if (target === drawer) { closeDrawer(true); return; }
        if (target.closest('#menu_header_mobile .menu_item')) closeDrawer(false);

        requestAnimationFrame(syncAll);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (drawer.classList.contains('active')) { event.preventDefault(); closeDrawer(true); return; }
            closePopups();
        }
        if (event.key === 'Tab' && drawer.classList.contains('active') && panel) {
            const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter((el) => el.getClientRects().length > 0);
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });

    window.addEventListener('resize', () => { if (window.innerWidth >= 1280) closeDrawer(false); });

    // Tìm kiếm: bản gốc dùng form-ajax → /tim-kiem?keyword=…; clone điều hướng nội bộ.
    header.querySelectorAll<HTMLFormElement>('.nc-search-form').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const keyword = (form.elements.namedItem('keyword') as HTMLInputElement).value.trim();
            if (keyword) navigate(`/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
        });
    });

    syncAll();
    installScrollProgress();
}

function installScrollProgress(): void {
    const bar = document.querySelector<HTMLElement>('.nc-scroll-progress > span');
    if (!bar) return;
    let frame = 0;
    const update = () => {
        frame = 0;
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const progress = maximum > 0 ? Math.min(1, Math.max(0, window.pageYOffset / maximum)) : 0;
        bar.style.transform = `scaleX(${progress.toFixed(5)})`;
        document.body.classList.toggle('nc-has-scrolled', window.pageYOffset > 12);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
}
