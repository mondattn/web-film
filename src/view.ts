/* Chuyển kiểu xem Danh sách / Dạng lưới (movie-view.js của bản gốc): thuộc tính html[data-nc-movie-view] + localStorage. */
const STORAGE_KEY = 'nguonc:public:movie-view';
const ATTR = 'data-nc-movie-view';
type View = 'list' | 'grid';

let selected: View = 'list';
const valid = (v: unknown): v is View => v === 'list' || v === 'grid';

function syncButtons(): void {
    document.querySelectorAll<HTMLButtonElement>('.nc-view-switch button[data-nc-view-choice]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.ncViewChoice === selected ? 'true' : 'false');
    });
}
function apply(value: unknown): void {
    selected = valid(value) ? value : 'list';
    document.documentElement.setAttribute(ATTR, selected);
    syncButtons();
}

export function startMovieView(): void {
    let initial: unknown = document.documentElement.getAttribute(ATTR);
    try { initial = localStorage.getItem(STORAGE_KEY) ?? initial; } catch (_) { /* giữ trạng thái bootstrap */ }
    apply(initial);
    document.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.nc-view-switch button[data-nc-view-choice]');
        if (!button || button.disabled || event.button !== 0) return;
        event.preventDefault();
        const value = button.dataset.ncViewChoice;
        if (!valid(value) || value === selected) { apply(value); return; }
        apply(value);
        try { localStorage.setItem(STORAGE_KEY, value); } catch (_) { /* vẫn đổi được trong phiên */ }
    });
    window.addEventListener('storage', (event) => { if (event.key === null || event.key === STORAGE_KEY) apply(event.key === null ? 'list' : event.newValue); });
    // Nút chuyển kiểu được render lại mỗi lần đổi trang → đồng bộ aria-pressed sau khi outlet thay đổi.
    new MutationObserver(() => syncButtons()).observe(document.getElementById('content')!, { childList: true, subtree: true });
    document.documentElement.setAttribute('data-nc-movie-view-ready', 'true');
}
