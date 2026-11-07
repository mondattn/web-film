# web-film

Dựng lại giao diện Nguồn C (`https://phim.nguonc.com`) bằng **Vite + TypeScript thuần**, dữ liệu lấy trực tiếp từ API công khai `https://phim.nguonc.com/api`.

Bản tham chiếu capture bằng REA (DOM, CSS, JS, network, screenshot 1440×2600):
- 2026-11-07: `/phim/bac-si-x` (đóng / mở trình phát / mở nguồn embed), `/api`, `/api/film/bac-si-x`.
- 2026-11-08: `/`, `/danh-sach/phim-bo`, `/the-loai/hinh-su?page=2`, `/tim-kiem?keyword=bac+si`, 4 endpoint list của API.

## Chạy

```bash
npm install
npm run dev        # http://127.0.0.1:5176/phim/bac-si-x
npm run build      # dist/
npm run typecheck
```

| Route | Trang | API |
|---|---|---|
| `/` | Trang chủ: hero + 4 thẻ thống kê + 10 phim mới cập nhật | `/api/films/phim-moi-cap-nhat?page=1` |
| `/danh-sach-phim?page=` | Toàn bộ phim mới cập nhật, có phân trang | `/api/films/phim-moi-cap-nhat?page=` |
| `/danh-sach/:slug` | Phim bộ / Phim lẻ / TV shows / Phim AI | `/api/films/danh-sach/{slug}?page=` |
| `/the-loai/:slug`, `/quoc-gia/:slug`, `/nam-phat-hanh/:slug`, `/ngon-ngu/:slug` | Theo thể loại / quốc gia / năm / ngôn ngữ | `/api/films/<kind>/{slug}?page=` |
| `/tim-kiem?keyword=&page=` | Kết quả tìm kiếm | `/api/films/search?keyword=&page=` |
| `/phim/:slug` | Chi tiết phim + trình phát + nguồn embed | `/api/film/{slug}` |

## Cấu trúc

```
index.html                 shell (script chống nháy theme, header/main/footer/drawer rỗng)
src/main.ts                nạp CSS, đăng ký route, render header
src/router.ts              router pushState + chặn link nội bộ + cuộn tới #anchor
src/api.ts                 kiểu dữ liệu + fetchFilm(slug) + tiện ích đọc category → tag/link
src/menu.ts                dữ liệu menu header (thể loại / quốc gia / năm, slug như site gốc)
src/icons.ts               SVG inline của bản gốc
src/header.ts              header + drawer di động + theme + thanh tiến trình cuộn
src/pages/film.ts          markup trang phim từ ApiMovie (breadcrumb, hero, facts, 2 card)
src/pages/catalog.ts       trang chủ, danh sách, tìm kiếm: bảng phim, phân trang, bộ lọc, thẻ thống kê
src/filters.ts             dữ liệu bộ lọc (định dạng / thể loại / năm / quốc gia / ngôn ngữ → route)
src/view.ts                chuyển Danh sách ↔ Dạng lưới (html[data-nc-movie-view] + localStorage)
src/format.ts              nhãn trạng thái, ngày giờ VN, số
src/player.ts              trình phát + nguồn embed (port từ film-player.js của bản gốc)
src/motion.ts              reveal card khi vào viewport (Phase UI-8 của bản gốc, rút gọn)
src/styles/base.css        reset kiểu Tailwind preflight + vài rule index.css + phần riêng của clone
src/styles/nguonc-redesign.css   redesign.css của bản gốc, GIỮ NGUYÊN (design reference, 82 KB)
src/styles/overrides.css   public-overrides.css (phần trang phim dùng)
docs/research/nguonc/      HTML gốc, JSON API, poster thumb (fixture cho QA offline)
qa/shot.mjs                chụp trang phim bằng Playwright (offline, stub API/poster) để so với ảnh REA
qa/shot-lists.mjs          chụp trang chủ / danh sách / tìm kiếm + kiểm tra grid, bộ lọc, click dòng
```

## API Nguồn C (từ `GET /api`)

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/film/{slug}` | Chi tiết phim + tập (dùng cho trang này). Có `access-control-allow-origin: *`. |
| GET | `/api/films/phim-moi-cap-nhat?page=` | Phim mới cập nhật |
| GET | `/api/films/danh-sach/{slug}?page=` | Theo danh mục (phim-bo, phim-le, tv-shows, phim-ai) |
| GET | `/api/films/the-loai/{slug}?page=` | Theo thể loại |
| GET | `/api/films/quoc-gia/{slug}?page=` | Theo quốc gia |
| GET | `/api/films/nam-phat-hanh/{slug}?page=` | Theo năm |
| GET | `/api/films/ngon-ngu/{slug}?page=` | Theo ngôn ngữ (vietsub, …) |
| GET | `/api/films/search?keyword=&page=` | Tìm kiếm |

Bản gốc là trang server-render (jQuery); danh sách tập được tải riêng từ `/phim/<slug>/episodes` (same-origin, không có CORS). Clone lấy luôn `movie.episodes[].server_name/items` từ `/api/film/{slug}` — cùng dữ liệu.

## Khác với bản gốc (DEVIATION / ASSUMPTION)

**Trang chủ / danh sách / tìm kiếm** (API list không trả đủ dữ liệu như trang server-render):
- Mỗi trang **10 phim** (`items_per_page` của API) thay vì 24 → số trang khác bản gốc (1.435 vs 598 cho Phim bộ).
- Item của API không có định dạng và quốc gia → cột **Định dạng** suy từ số tập (1 tập = Phim lẻ, nhiều tập = Phim bộ; trang `/danh-sach/*` dùng tên danh sách), cột **Quốc gia** thay bằng **Ngôn ngữ** (Vietsub / Thuyết Minh / Lồng Tiếng tách thành tag).
- Bộ lọc: mỗi select tương ứng một endpoint riêng nên chỉ lọc được **một chiều mỗi lần** (áp dụng select vừa đổi gần nhất); **Sắp xếp** bị vô hiệu; danh sách Quốc gia chỉ có 20 nước trong menu (bản gốc ~230); Năm 1928–2027.
- "Phim cập nhật hôm nay" = số phim trong trang 1 có `modified` rơi vào hôm nay (giờ VN), hiện `10+` nếu cả trang; bản gốc tính phía server.
- Thẻ "Cộng đồng" (Telegram) đổi thành link tới phim.nguonc.com; "Tài liệu API" → `/api` của site gốc.
- Thứ tự kết quả tìm kiếm của API khác trang gốc (API: `bac-si-house-phan-3` đứng đầu; site: `bac-si-x`).
- Cửa sổ phân trang ở trang giữa (`1 … c-1 c c+1 … N`) là ASSUMPTION, chỉ quan sát được trang 1 và 2.

**Trang chi tiết phim**:

- **Logo**: bản gốc dùng ảnh PNG "NGUONC" đỏ; clone dùng wordmark chữ "WEB FILM" (cùng chiều rộng 150 px để layout header không đổi).
- **Nền trang**: ảnh `bg-dark.png` (quầng sáng góc trên phải, 90 rem) không lấy được qua REA (vượt ngân sách 64 KB body) → vẽ lại bằng `radial-gradient` trong `.nc-backdrop`.
- **Font**: giữ nguyên stack `Inter, ui-sans-serif, system-ui, …` của bản gốc (bản gốc không nạp Inter, nên trên Mac cả hai đều render bằng SF Pro). Không nạp Google Fonts (Open Sans/Dosis) vì trang phim không dùng tới.
- **Màu nhãn trạng thái** (`nc-film-status--ongoing/complete/neutral`): bản gốc chỉ quan sát được "Tập 10" → ongoing; luật "Hoàn tất/Full/Trọn bộ → complete, còn lại neutral" là ASSUMPTION.
- **Link thể loại/quốc gia trong hero**: slug sinh từ tên (`slugify`) — vài slug của site gốc khác tên (Hài → `phim-hai`, Nhạc → `phim-nhac`, Ca-na-đa → `canada`…); menu header dùng slug thật, link trong facts có thể lệch với các trường hợp này.
- **Không có**: Cloudflare RUM, JSON-LD, nprogress/ajax-load của Hn_Framework, trang `/api-document`.
- Hành vi trình phát, tìm tập, định dạng nguồn embed, lưu tập đang xem (`localStorage nguonc:player-progress:v1:<slug>`), fallback 12 s "Trình phát tải lâu hơn dự kiến", theme (`localStorage theme`, mặc định tối): giữ đúng như film-player.js / main.js của bản gốc.

## QA

```bash
npx vite preview --port 4173 &
node qa/shot.mjs http://127.0.0.1:4173 qa/shots                      # trạng thái đóng
node qa/shot.mjs http://127.0.0.1:4173 qa/shots --open-player --open-sources
node qa/shot-lists.mjs http://127.0.0.1:4173 qa/shots
```

Kết quả (viewport 1440×2600, so với ảnh REA của bản gốc):
- 2026-11-07 trang phim: viền hero ở y=145, cột 80/105/284 trùng; card nguồn embed / trình phát / lưới tập trùng vị trí; khác biệt còn lại là font (Linux vs macOS) và wordmark.
- 2026-11-08 trang chủ / danh sách: hero, 4 thẻ thống kê, heading, bộ lọc 6 ô, thanh chuyển kiểu xem, bảng (dòng 97 px) trùng vị trí; grid view, bộ lọc → route, click dòng → trang phim OK.
