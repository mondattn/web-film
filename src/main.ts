import './styles/base.css';
import './styles/nguonc-redesign.css';
import './styles/overrides.css';

import { renderHeader } from './header';
import { route, startRouter } from './router';
import { renderFilmPage } from './pages/film';
import { allFilmsPage, catalogPage, homePage, searchPage } from './pages/catalog';
import { startMovieView } from './view';

route('/', homePage);
route('/phim/:slug', renderFilmPage);
route('/danh-sach-phim', allFilmsPage);
route('/danh-sach/:slug', catalogPage('danh-sach'));
route('/the-loai/:slug', catalogPage('the-loai'));
route('/quoc-gia/:slug', catalogPage('quoc-gia'));
route('/nam-phat-hanh/:slug', catalogPage('nam-phat-hanh'));
route('/ngon-ngu/:slug', catalogPage('ngon-ngu'));
route('/tim-kiem', searchPage);

renderHeader();
startMovieView();
startRouter();
