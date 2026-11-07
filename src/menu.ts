/* Menu header — chép từ HTML bản gốc (2026-11-07). Slug giữ đúng của site gốc. */

export interface MenuLink { label: string; href: string }
export interface MenuItem { label: string; href?: string; children?: MenuLink[] }

const genres: MenuLink[] = [
    ['Hành Động', 'hanh-dong'], ['Phiêu Lưu', 'phieu-luu'], ['Hoạt Hình', 'hoat-hinh'], ['Hài', 'phim-hai'],
    ['Hình Sự', 'hinh-su'], ['Tài Liệu', 'tai-lieu'], ['Chính Kịch', 'chinh-kich'], ['Gia Đình', 'gia-dinh'],
    ['Giả Tưởng', 'gia-tuong'], ['Lịch Sử', 'lich-su'], ['Kinh Dị', 'kinh-di'], ['Nhạc', 'phim-nhac'],
    ['Bí Ẩn', 'bi-an'], ['Lãng Mạn', 'lang-man'], ['Khoa Học Viễn Tưởng', 'khoa-hoc-vien-tuong'], ['Gây Cấn', 'gay-can'],
    ['Chiến Tranh', 'chien-tranh'], ['Tâm Lý', 'tam-ly'], ['Tình Cảm', 'tinh-cam'], ['Cổ Trang', 'co-trang'],
    ['Miền Tây', 'mien-tay'], ['Phim 18+', 'phim-18'],
].map(([label, slug]) => ({ label, href: `/the-loai/${slug}` }));

const countries: MenuLink[] = [
    ['Nhật Bản', 'nhat-ban'], ['Trung Quốc', 'trung-quoc'], ['Mỹ', 'my'], ['Hàn Quốc', 'han-quoc'], ['Anh', 'anh'],
    ['Hồng Kông', 'hong-kong'], ['Pháp', 'phap'], ['Ca-na-đa', 'canada'], ['Thái Lan', 'thai-lan'], ['Đức', 'duc'],
    ['Ấn Độ', 'an-do'], ['Tây Ban Nha', 'tay-ban-nha'], ['Việt Nam', 'viet-nam'], ['Italy', 'italy'], ['Úc', 'uc'],
    ['Đài Loan', 'dai-loan'], ['Phi-líp-pin', 'philippines'], ['Bỉ', 'bi'], ['Nga', 'nga'], ['Bra-xin', 'brazil'],
].map(([label, slug]) => ({ label, href: `/quoc-gia/${slug}` }));

const years: MenuLink[] = Array.from({ length: 12 }, (_, i) => 2026 - i)
    .map((y) => ({ label: String(y), href: `/nam-phat-hanh/${y}` }));

export const MENU: MenuItem[] = [
    { label: 'TV shows', href: '/danh-sach/tv-shows' },
    { label: 'Phim lẻ', href: '/danh-sach/phim-le' },
    { label: 'Phim bộ', href: '/danh-sach/phim-bo' },
    { label: 'Phim AI', href: '/danh-sach/phim-ai' },
    { label: 'Thể loại', children: genres },
    { label: 'Quốc gia', children: countries },
    { label: 'Năm', children: years },
];
