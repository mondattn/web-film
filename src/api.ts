/*
 * API công khai của Nguồn C (https://phim.nguonc.com/api).
 * Chỉ dùng GET /api/film/{slug} cho trang chi tiết; endpoint có header
 * `access-control-allow-origin: *` nên gọi thẳng từ browser được (đã kiểm tra bằng REA 2026-11-07).
 */

export const API_BASE = 'https://phim.nguonc.com/api';
export const SITE_BASE = 'https://phim.nguonc.com';

export interface ApiCategoryItem { id: string; name: string }
export interface ApiCategoryGroup {
    group: { id: string; name: string };
    list: ApiCategoryItem[];
}
export interface ApiEpisode { name: string; slug: string; embed: string }
export interface ApiServer { server_name: string; items: ApiEpisode[] }

export interface ApiMovie {
    id: string;
    name: string;
    original_name: string;
    slug: string;
    year: number | string | null;
    description: string;
    total_episodes: number | string | null;
    current_episode: string;
    time: string;
    quality: string;
    language: string;
    director: string;
    casts: string;
    category: Record<string, ApiCategoryGroup>;
    tmdb?: { id: number; type: string; season: number | null; url: string } | null;
    imdb?: { id: string; url: string } | null;
    thumb_url: string;
    thumb_url_webp?: string;
    poster_url: string;
    poster_url_webp?: string;
    created: string;
    modified: string;
    episodes: ApiServer[];
}

export interface ApiFilmResponse { status: string; message?: string; movie?: ApiMovie }

/** Phim trong danh sách: như ApiMovie nhưng KHÔNG có `category`/`episodes` (API public không trả). */
export type ApiListItem = Omit<ApiMovie, 'category' | 'episodes'> & { id?: string };
export interface ApiPaginate { current_page: number; total_page: number; total_items: number; items_per_page: number }
export interface ApiListResponse {
    status: string;
    message?: string;
    paginate: ApiPaginate;
    cat?: { name: string; title: string; slug: string } | null;
    items: ApiListItem[];
}

/** Các kiểu danh sách của API (GET /api/films/…). */
export type ListKind = 'phim-moi-cap-nhat' | 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh' | 'ngon-ngu' | 'search';

export class ApiError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
}

export async function fetchFilm(slug: string, signal?: AbortSignal): Promise<ApiMovie> {
    const response = await fetch(`${API_BASE}/film/${encodeURIComponent(slug)}`, {
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!response.ok) throw new ApiError(`API trả về HTTP ${response.status}`, response.status);
    const data = (await response.json()) as ApiFilmResponse;
    if (data.status !== 'success' || !data.movie) throw new ApiError(data.message || 'Không tìm thấy phim', 404);
    return data.movie;
}

export async function fetchList(kind: ListKind, slug: string, page: number, signal?: AbortSignal): Promise<ApiListResponse> {
    const params = new URLSearchParams();
    params.set('page', String(Math.max(1, page)));
    let path: string;
    if (kind === 'phim-moi-cap-nhat') path = '/films/phim-moi-cap-nhat';
    else if (kind === 'search') { path = '/films/search'; params.set('keyword', slug); }
    else path = `/films/${kind}/${encodeURIComponent(slug)}`;
    const response = await fetch(`${API_BASE}${path}?${params}`, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new ApiError(`API trả về HTTP ${response.status}`, response.status);
    const data = (await response.json()) as ApiListResponse;
    if (data.status !== 'success' || !Array.isArray(data.items)) throw new ApiError(data.message || 'Không có dữ liệu', 404);
    return data;
}

/* ---- Tiện ích đọc category ---------------------------------------------------- */

/** Tên nhóm trong `category` → đường dẫn tương ứng trên site gốc. */
const GROUP_ROUTE: Record<string, string> = {
    'Định dạng': 'danh-sach',
    'Thể loại': 'the-loai',
    'Năm': 'nam-phat-hanh',
    'Quốc gia': 'quoc-gia',
};

export interface Tag { name: string; href: string }

export function slugify(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Lấy danh sách tag của một nhóm ("Thể loại", "Quốc gia", …) kèm link nội bộ. */
export function categoryTags(movie: ApiMovie, groupName: string): Tag[] {
    const route = GROUP_ROUTE[groupName] ?? slugify(groupName);
    for (const group of Object.values(movie.category ?? {})) {
        if (group?.group?.name !== groupName) continue;
        return (group.list ?? []).map((item) => ({ name: item.name, href: `/${route}/${slugify(item.name)}` }));
    }
    return [];
}
