/* Định dạng hiển thị dùng chung cho trang phim và danh sách. */

/** Trạng thái phát hành → class màu nhãn. ASSUMPTION: bản gốc quan sát "Tập N" → ongoing, "FULL"/"Hoàn tất (…)" → complete. */
export function statusClass(current: string): string {
    const c = (current ?? '').trim().toLowerCase();
    if (!c) return 'nc-film-status--neutral';
    if (/hoàn tất|full|trọn bộ|completed/.test(c)) return 'nc-film-status--complete';
    if (/^tập|^t\d|tập \d/.test(c)) return 'nc-film-status--ongoing';
    return 'nc-film-status--neutral';
}

const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});

/** "2026-11-07T16:30:45.000000Z" → "23:30:45 07/11/2026" (giờ Việt Nam, như cột Ngày cập nhật của bản gốc). */
export function formatDateVN(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const parts = Object.fromEntries(VN_DATE.formatToParts(date).map((p) => [p.type, p.value]));
    return `${parts.hour}:${parts.minute}:${parts.second} ${parts.day}/${parts.month}/${parts.year}`;
}

/** Khoá ngày theo giờ Việt Nam (yyyy-mm-dd) để đếm "phim cập nhật hôm nay". */
export function vnDateKey(input: Date | string): string {
    const date = typeof input === 'string' ? new Date(input) : input;
    const parts = Object.fromEntries(VN_DATE.formatToParts(date).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export const formatNumber = (n: number): string => new Intl.NumberFormat('en-US').format(n);
