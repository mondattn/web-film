/* Hiệu ứng hiện dần khi vào viewport (redesign.js › Phase UI-8), rút gọn cho trang phim. */

const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const supported = typeof Element !== 'undefined' && !!Element.prototype.animate && 'IntersectionObserver' in window;
const staticMotion = reduced || !supported;
document.documentElement.classList.add(staticMotion ? 'nc-motion-static' : 'nc-motion-enabled');

const observer = staticMotion ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer!.unobserve(entry.target);
        play(entry.target as HTMLElement);
    });
}, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });

type Kind = 'section' | 'card' | 'row';

function frames(kind: Kind, distance: number): Keyframe[] {
    if (kind === 'card') return [{ opacity: 0, transform: `translate3d(0, ${distance}px, 0) scale(0.975)` }, { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }];
    if (kind === 'row') return [{ opacity: 0.18 }, { opacity: 1 }];
    return [{ opacity: 0, transform: `translate3d(0, ${distance}px, 0)` }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }];
}

function play(element: HTMLElement): void {
    const delay = Number(element.dataset.ncMotionDelay ?? 0);
    const kind = (element.dataset.ncMotionKind ?? 'section') as Kind;
    const compact = window.innerWidth < 768;
    element.animate(frames(kind, compact ? 9 : 15), { duration: compact ? 460 : 620, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
}

/** Nhóm mục tiêu + bước delay như redesign.js (Phase UI-8). */
const GROUPS: Array<{ selector: string; kind: Kind; step: number; cap: number }> = [
    { selector: '.nc-home-hero__content > *', kind: 'section', step: 64, cap: 256 },
    { selector: '.nc-stat-card', kind: 'card', step: 54, cap: 216 },
    { selector: '.nc-section-heading, .nc-page-heading, .nc-filter-card', kind: 'section', step: 35, cap: 140 },
    { selector: '.nc-movie-table tbody tr', kind: 'row', step: 24, cap: 240 },
    { selector: '.nc-pagination-shell, .nc-film-hero, .nc-detail-card', kind: 'card', step: 34, cap: 170 },
];

/** Đăng ký hiệu ứng hiện dần cho các phần tử trong scope. */
export function revealCards(scope: HTMLElement): void {
    GROUPS.forEach((group) => {
        scope.querySelectorAll<HTMLElement>(group.selector).forEach((element, index) => {
            if (element.dataset.ncMotionBound === 'true') return;
            element.dataset.ncMotionBound = 'true';
            element.dataset.ncMotionKind = group.kind;
            element.dataset.ncMotionDelay = String(Math.min(index * group.step, group.cap));
            observer?.observe(element);
        });
    });
}
