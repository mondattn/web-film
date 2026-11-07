/* Dữ liệu cho bộ lọc (form #form-filter của bản gốc). Mỗi select = một chiều của API list. */
import { MENU, type MenuLink } from './menu';
import type { ListKind } from './api';

export interface FilterDimension { key: string; label: string; all: string; kind: ListKind; options: MenuLink[] }

const children = (label: string): MenuLink[] => MENU.find((m) => m.label === label)?.children ?? [];

export const FORMATS: MenuLink[] = [
    { label: 'Phim bộ', href: '/danh-sach/phim-bo' },
    { label: 'Phim lẻ', href: '/danh-sach/phim-le' },
    { label: 'TV shows', href: '/danh-sach/tv-shows' },
    { label: 'Phim AI', href: '/danh-sach/phim-ai' },
];

/** Năm: bản gốc liệt kê 1928–2027 (không theo thứ tự); clone sắp giảm dần. */
export const YEARS: MenuLink[] = Array.from({ length: 2027 - 1928 + 1 }, (_, i) => 2027 - i)
    .map((y) => ({ label: String(y), href: `/nam-phat-hanh/${y}` }));

export const LANGUAGES: MenuLink[] = [
    { label: 'Vietsub', href: '/ngon-ngu/vietsub' },
    { label: 'Thuyết minh', href: '/ngon-ngu/thuyet-minh' },
    { label: 'Lồng tiếng', href: '/ngon-ngu/long-tieng' },
];

export const FILTER_DIMENSIONS: FilterDimension[] = [
    { key: 'format', label: 'Định dạng', all: 'Tất cả Định dạng', kind: 'danh-sach', options: FORMATS },
    { key: 'genre', label: 'Thể loại', all: 'Tất cả Thể loại', kind: 'the-loai', options: children('Thể loại') },
    { key: 'year', label: 'Năm', all: 'Tất cả Năm', kind: 'nam-phat-hanh', options: YEARS },
    // Bản gốc có ~230 quốc gia; clone chỉ có 20 nước trong menu (DEVIATION).
    { key: 'country', label: 'Quốc gia', all: 'Tất cả Quốc gia', kind: 'quoc-gia', options: children('Quốc gia') },
    { key: 'language', label: 'Ngôn ngữ', all: 'Tất cả Ngôn ngữ', kind: 'ngon-ngu', options: LANGUAGES },
];
