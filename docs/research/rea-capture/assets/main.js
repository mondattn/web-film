history.replaceState(
    { url: window.location.href, title: document.title },
    "",
    window.location.href
);
window.onpopstate = (e) => {
    var url = e.state && e.state.url ? e.state.url : window.location.href;
    if (Hn_Framework.public_url(url)) {
        Hn_Framework.ajax_load(
            Hn_Framework.convert_url(url, "load=1&back=1"),
            "",
            "GET",
            "",
            true,
            () => {
                Hn_Framework.reset_page();
            },
            { navigation: true }
        );
    }
};
$(document).on("click", 'a:not([role="tab"])', function (e) {
    if (!Hn_Framework.is_plain_click(e, this)) return;
    var href = $(this).attr("href");
    var target = Hn_Framework.public_url(href);
    if (!target || href.indexOf("#") === -1 || target.pathname !== window.location.pathname ||
        target.search !== window.location.search) return;
    var element;
    try { element = target.hash ? document.getElementById(decodeURIComponent(target.hash.slice(1))) : document.querySelector("header"); }
    catch (_) { return; }
    if (!element) return;
    e.preventDefault();
    Hn_Framework.scrollTo(element);
});
$(document).on("click", ".ajax-load", function (e) {
    if (!Hn_Framework.is_plain_click(e, this)) return;
    if (
        !empty($(this).attr("href")) &&
        $(this).attr("href").indexOf("#") !== -1
    )
        return;
    let url_ = $(this).attr("href");
    if (empty(url_)) url_ = $(this).attr("data-url");
    var url_load = Hn_Framework.convert_url(url_);
    if (!url_load) return;
    var method = !empty($(this).data("method"))
        ? $(this).data("method")
        : "GET";
    if (!empty($(this).data("alert"))) {
        cuteAlert({
            type: "question",
            title: "WARNING",
            message: $(this).data("alert"),
            confirmText: "CONFIRM",
            cancelText: "CANCEL",
        }).then((confirmed) => {
            if (confirmed) {
                Hn_Framework.ajax_load(url_load, "", method, "", true, "", { navigation: String(method).toUpperCase() === "GET" });
            }
        });
    } else Hn_Framework.ajax_load(url_load, "", method, "", true, "", { navigation: String(method).toUpperCase() === "GET" });
    if ($(this).hasClass("sidebar")) {
        $("#sidebar-menu").find("a.sidebar").removeClass("active");
        $(this).addClass("active");
    }
    if($(this).hasClass('menu_item')) {$('#menu_header_mobile').removeClass('active');$(this).parents('.sub-menu').removeClass('active');}
    e.preventDefault();
});

$(document).on("keyup", ".required", function () {
    if (empty($(this).val())) $(this).addClass("is-invalid");
    else $(this).removeClass("is-invalid");
});
$(document).on("change", ".required", function () {
    if (empty($(this).val())) $(this).addClass("is-invalid");
    else $(this).removeClass("is-invalid");
});
$(document).on("submit", ".form-ajax", function (e) {
    e.preventDefault();
    
    Hn_Framework.form_ajax($(this));
});
$('.has_sub_menu').on('click', function() {
    $(this).next('.sub-menu').addClass('current');
    $(this).parents('#menu-header').find('.sub-menu:not(.current)').removeClass('active');
    $(this).next('.sub-menu').toggleClass('active');
    $(this).next('.sub-menu').removeClass('current');
})
$('.has_sub_menu_mobile').on('click', function() {
    $(this).next('.sub_menu_mobile').addClass('current');
    $(this).parents('#menu_header_mobile').find('.sub_menu_mobile:not(.current)').removeClass('active');
    $(this).next('.sub_menu_mobile').toggleClass('active');
    $(this).next('.sub_menu_mobile').removeClass('current');
})
document.addEventListener("click", function(e) {
    var menuHeader = document.getElementById('menu-header');
    if (menuHeader && !menuHeader.contains(e.target)) $('#menu-header .sub-menu').removeClass("active");
    $('ul.option_theme').removeClass('active');
    var searchForm = document.querySelector('.form-search');
    if (searchForm && !searchForm.contains(e.target)) $('.form-search').removeClass('active');
});
var menuMobile = document.getElementById('menu_header_mobile');
if (menuMobile) {
    menuMobile.addEventListener("click", function(e) {
        var menuUl = document.querySelector('#menu_header_mobile>ul');
        if (menuUl && !menuUl.contains(e.target)) {
            $('#menu_header_mobile').removeClass("active");
        }
    });
	}
$('#open-menu').on('click', function(e) {
    e.stopPropagation();
    $('#menu_header_mobile').addClass('active');
})
$(".open_theme").on('click', function(e) {
    e.stopPropagation();
    $(this).next('ul.option_theme').toggleClass('active');
})
$('.theme').on('click', function() {
    if ($(this).data('theme') === 'dark') {
        $('html').addClass('dark');
        $('html').removeClass('light');
        localStorage.setItem('theme', 'dark');
    } else {
        $('html').removeClass('dark');
        $('html').addClass('light');
        localStorage.setItem('theme', 'light');
    }
})
$(document).on("click", "ul.pagination a", function (e) {
    if (!Hn_Framework.is_plain_click(e, this)) return;
    if (
        !empty($(this).attr("href")) &&
        $(this).attr("href").indexOf("#") !== -1
    )
        return;
    let url_ = $(this).attr("href");
    if (empty(url_)) url_ = $(this).attr("data-url");
    var url_load = Hn_Framework.convert_url(url_);
    if (!url_load) return;
    e.preventDefault();
    Hn_Framework.ajax_load(url_load, "", "GET", "", true, "", { navigation: true });
});
$('.open-search').on('click', function(e){
    e.stopPropagation();
    $(this).next('.form-search').toggleClass('active');
})
$(document).on('click', '.open_filter', function(){
    $('.select_filter').toggleClass('hidden');
    $(this).find('svg').toggleClass('transform rotate-180');
})
$(document).on('click', '.scroll', function(e){
    e.preventDefault();
    Hn_Framework.scrollTo($(this).data('scroll'));
})
$(document).on('click', '.card-collapse .toggle-content', function(){
    $(this).find('svg').toggleClass('transform rotate-180');
    $(this).next('.card-collapse-content').slideToggle(300);
})
Hn_Framework.reset_page();
