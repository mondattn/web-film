function empty(string) {
    if (string == null || string == undefined || string == NaN || string == "")
        return true;
    return false;
}
(Hn_Framework.reset_page = () => {
    Hn_Framework.lazy_video(),
    Hn_Framework.lazy_img(),
        $(".select-load").each(function () {
            $.ajax({
                url: Hn_Framework.url + '/public/json/' + $(this).data('json') + '.json',
                dataType: "json",
                success: (data) => {
                    Hn_Framework.render_select_load($(this), data)
                },
                error: (xhr) => {
                    if (Hn_Framework.settings.dev) console.log(xhr);
                    $(this).html("<option>Load data error</option>");
                },
            });
        });
}),
    (Hn_Framework.lazy_img = () => {
        var imgs = [].slice.call(document.querySelectorAll("img.lazy"));
        if ("IntersectionObserver" in window) {
            let invisibleObserver = new IntersectionObserver(function (
                entries,
                observer
            ) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        let img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove("lazy");
                        invisibleObserver.unobserve(img);
                    }
                });
            });
            imgs.forEach(function (item) {
                invisibleObserver.observe(item);
            });
        } else {
            imgs.forEach(function (item) {
                item.src = item.dataset.src;
                item.classList.remove("lazy");
            });
        }
    }),
    (Hn_Framework.lazy_video = () => {
        var videos = [].slice.call(document.querySelectorAll("video.lazy"));
        if ("IntersectionObserver" in window) {
            let invisibleObserver = new IntersectionObserver(function (
                entries,
                observer
            ) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        let video = entry.target;
                        video.src = video.dataset.src;
                        video.classList.remove("lazy");
                        invisibleObserver.unobserve(video);
                    }
                });
            });
            videos.forEach(function (item) {
                invisibleObserver.observe(item);
            });
        } else {
            videos.forEach(function (item) {
                item.src = item.dataset.src;
                item.classList.remove("lazy");
            });
        }
    }),
    (Hn_Framework.reset_load = () => {
        $(".select-load.new").each(function () {
            $.ajax({
                url: Hn_Framework.url + "/public/json/" + $(this).data("json") + ".json",
                dataType: "json",
                success: (data) => {
                    Hn_Framework.render_select_load($(this), data)
                },
                error: (xhr) => {
                    if (Hn_Framework.settings.dev) console.log(xhr);
                    $(this).html("<option>Load data error</option>");
                },
            });
        });
    }),
    Hn_Framework.render_select_load = (ele, data) => {
        ele.html("");
        if(!Array.isArray(data)) data = Object.keys(data).map(key => data[key]);
        ele.append(
            `<option value="">- Select -</option>`
        );
        data.forEach((element) => {
            ele.append(
                `<option value="${element.value}">${element.name}</option>`
            );
        });
        ele.val(ele.data("value"));
        ele.removeClass("new");
        // if ($(this).data("sl2")) $(this).select2();
    }
    (Hn_Framework.setCookie = (name, value, second) => {
        var d = new Date();
        d.setTime(d.getTime() + second * 1000);
        var expires = "expires=" + d.toUTCString();
        document.cookie = name + "=" + value + "; " + expires + ";path=/";
    }),
    (Hn_Framework.getCookie = (cname) => {
        var name = cname + "=";
        var ca = document.cookie.split(";");
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == " ") {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return false;
    }),
    (Hn_Framework.loading = () => {
        clearTimeout(Hn_Framework._loadingHideTimer);
        $('body').addClass('loading');
        $('#nprogress').css('opacity', 1);
        $('#nprogress .bar').css('transform', 'translate3d(-80%, 0px, 0px)');
    }),
    (Hn_Framework.convert_url = (url, query = "load=1") => {
        var target = Hn_Framework.public_url(url);
        if (!target) return "";
        new URLSearchParams(query).forEach(function (value, name) {
            target.searchParams.set(name, value);
        });
        return target.href;
    }),
    (Hn_Framework.public_url = (url) => {
        if (typeof url !== "string" || !url.trim()) return null;
        try {
            var target = new URL(url, window.location.href);
            if ((target.protocol !== "https:" && target.protocol !== "http:") ||
                target.origin !== window.location.origin || target.username || target.password) return null;
            return target;
        } catch (_) { return null; }
    }),
    (Hn_Framework.is_plain_click = (event, element) => {
        if (event.defaultPrevented || (event.isDefaultPrevented && event.isDefaultPrevented()) ||
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
            (event.button !== undefined && event.button !== 0)) return false;
        var target = element && element.getAttribute ? element.getAttribute("target") : "";
        return !(target && target.toLowerCase() !== "_self") &&
            !(element && element.hasAttribute && element.hasAttribute("download"));
    }),
    (Hn_Framework.remove_load = () => {
        $('body').removeClass('loading');
        $('#nprogress .bar').css('transform', 'translate3d(-0%, 0px, 0px)');
        clearTimeout(Hn_Framework._loadingHideTimer);
        Hn_Framework._loadingHideTimer = setTimeout(function(){
            $('#nprogress').css('opacity', 0);
        }, 1000);
    }),
    (Hn_Framework.ajax_load = (() => {
        var navigationGeneration = 0;
        var activeNavigation = null;
        var pendingLoads = 0;
        return (
            url,
            data = "",
            type = "GET",
            convert = "",
            load = true,
            complete_ = "",
            options = {}
        ) => {
            var requestUrl = Hn_Framework.convert_url(url);
            if (!requestUrl) return false;
            type = String(type || "GET").toUpperCase();
            var navigation = type === "GET" && options && options.navigation === true;
            var generation = navigation ? ++navigationGeneration : 0;
            var finished = false;
            var showLoad = !empty(load) && load !== false;
            var loadTimer = null;
            function isCurrent() { return !navigation || generation === navigationGeneration; }
            function finish(result) {
                if (finished) return;
                finished = true;
                if (Hn_Framework.dev && result) console.log(result.responseJSON);
                clearTimeout(loadTimer);
                if (navigation && isCurrent()) activeNavigation = null;
                if (showLoad && --pendingLoads === 0) Hn_Framework.remove_load();
            }
            // Register the new load before aborting the old one: its complete handler
            // must not hide the progress indicator while this request is pending.
            if (showLoad) {
                pendingLoads++;
                clearTimeout(Hn_Framework._loadingHideTimer);
                loadTimer = setTimeout(function () {
                    if (!finished && isCurrent()) Hn_Framework.loading();
                }, 400);
            }
            if (navigation && activeNavigation) {
                var previous = activeNavigation;
                activeNavigation = null;
                previous.abort();
            }
            var request;
            try {
                if (typeof convert === "function") convert();
                if (type === "POST" && empty(data)) data = { _token: Hn_Framework._token };
                request = $.ajax({
                    url: requestUrl,
                    headers: { _token: Hn_Framework._token },
                    method: type,
                    data: data,
                    dataType: "json",
                    error: function (xhr, textStatus) {
                        if (!isCurrent() || textStatus === "abort") return;
                        if (Hn_Framework.settings.dev) console.log(xhr);
                        if (xhr.status === 419) {
                            cuteAlert({
                                type: "info",
                                title: "ERROR",
                                img: "img/warning.svg",
                                message:
                                    "Xác thực lỗi, trang sẽ tự động làm mới!",
                                buttonText: "CONFIRM",
                                closeStyle: "circle",
                            }).then(() => {
                                if (isCurrent()) location.reload();
                            });
                            setTimeout(() => {
                                if (isCurrent()) location.reload();
                            }, 1000);
                        } else {
                            cuteToast({
                                type: "error",
                                message:
                                    "Đã có lỗi xảy ra, bạn có thể làm mới lại trang và thử lại!",
                                timer: 3000,
                            });
                        }
                    },
                    success: function (result) {
                        if (!isCurrent()) return;
                        Hn_Framework.up_ajax_result(result, isCurrent);
                        if (isCurrent() && typeof complete_ === "function") {
                            complete_(result);
                        }
                    },
                    complete: finish,
                });
            } catch (error) {
                finish();
                throw error;
            }
            if (navigation && isCurrent() && !finished) activeNavigation = request;
            return false;
        };
    })()),
    (Hn_Framework.update_public_metadata = (metadata) => {
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !document.head) return;
        function setMeta(attribute, name, value) {
            if (typeof value !== "string") return;
            var selector = 'meta[' + attribute + '="' + name + '"]';
            var nodes = document.head.querySelectorAll(selector);
            if (!nodes.length) {
                var node = document.createElement("meta");
                node.setAttribute(attribute, name);
                document.head.appendChild(node);
                nodes = [node];
            }
            Array.prototype.forEach.call(nodes, function (node) { node.setAttribute("content", value); });
        }
        function httpUrl(value, sameOrigin) {
            if (typeof value !== "string" || !value) return "";
            try {
                var target = new URL(value, window.location.href);
                return (target.protocol === "http:" || target.protocol === "https:") &&
                    !target.username && !target.password && (!sameOrigin || target.origin === window.location.origin) ? target.href : "";
            } catch (_) { return ""; }
        }
        if (typeof metadata.title === "string") {
            document.title = metadata.title;
            setMeta("name", "apple-mobile-web-app-title", metadata.title);
            setMeta("property", "og:image:alt", metadata.title);
        }
        setMeta("name", "description", metadata.description);
        if (typeof metadata.canonical === "string") {
            var canonical = httpUrl(metadata.canonical, true);
            ["canonical", "shortlink"].forEach(function (rel) {
                var node = document.head.querySelector('link[rel="' + rel + '"]');
                if (!node) {
                    node = document.createElement("link");
                    node.setAttribute("rel", rel);
                    document.head.appendChild(node);
                }
                if (canonical) node.setAttribute("href", canonical);
                else node.removeAttribute("href");
            });
        }
        var og = metadata.og && typeof metadata.og === "object" ? metadata.og : {};
        ["title", "description", "url", "image", "type"].forEach(function (name) {
            if (typeof og[name] !== "string") return;
            setMeta("property", "og:" + name, name === "url" || name === "image" ? httpUrl(og[name], name === "url") : og[name]);
        });
        if (typeof og.image === "string") {
            var image = httpUrl(og.image, false);
            setMeta("property", "og:image:secure_url", image.indexOf("https:") === 0 ? image : "");
        }
        // Each navigation payload is a full snapshot. Dimensions/update time
        // from an earlier homepage must not describe the next film's image.
        ["og:image:width", "og:image:height", "og:updated_time"].forEach(function (name) {
            Array.prototype.forEach.call(document.head.querySelectorAll('meta[property="' + name + '"]'), function (node) { node.remove(); });
        });
        var twitter = metadata.twitter && typeof metadata.twitter === "object" ? metadata.twitter : {};
        ["card", "title", "description", "image"].forEach(function (name) {
            if (typeof twitter[name] !== "string") return;
            setMeta("name", "twitter:" + name, name === "image" ? httpUrl(twitter[name], false) : twitter[name]);
        });
        // These classes belong to the application's generated page schema.
        // Unmarked site-owner codeHead scripts are deliberately left intact.
        Array.prototype.forEach.call(document.head.querySelectorAll(
            'script[type="application/ld+json"].seo, script[type="application/ld+json"].seo_generate, script[data-nc-public-schema]'
        ), function (node) { node.remove(); });
        if (metadata.schema && typeof metadata.schema === "object") {
            var schemaText;
            try { schemaText = JSON.stringify(metadata.schema); } catch (_) { return; }
            if (typeof schemaText === "string") {
                var schemaNode = document.createElement("script");
                schemaNode.type = "application/ld+json";
                schemaNode.setAttribute("data-nc-public-schema", "1");
                schemaNode.textContent = schemaText;
                document.head.appendChild(schemaNode);
            }
        }
    }),
    (Hn_Framework.up_ajax_result = (data, isCurrent = () => true) => {
        try {
            if (!isCurrent()) return;
            if (!data || typeof data !== "object") return;
            var link = data.link || {};
            if (!empty(link.url)) {
                // console.log(data.link.url);
                if (!empty(link.time)) {
                    setTimeout(() => {
                        if (!isCurrent()) return;
                        if (link.ajax) Hn_Framework.ajax_load(link.url, "", "GET", "", true, "", { navigation: true });
                        else window.location = link.url;
                    }, link.time);
                } else {
                    if (link.ajax) Hn_Framework.ajax_load(link.url, "", "GET", "", true, "", { navigation: true });
                    else window.location = link.url;
                }
            }
            if (!isCurrent()) return;
            if (!empty(data.alert) && !empty(data.message)) {
                if (data.message == "success" || data.message == "warning")
                    cuteToast({
                        type: data.message,
                        message: data.alert,
                        timer: 3000,
                    });
                else {
                    var title = "NOTE";
                    if (data.message == "error") title = "ERROR";
                    cuteAlert({
                        type: data.message,
                        title: title,
                        img: "img/" + data.message + ".svg",
                        message: data.alert,
                        buttonText: "CONFIRM",
                        closeStyle: "circle",
                    });
                }
            }

            if (data.message != "error") {
                if (!empty(data.view_delete)) {
                    data.view_delete.forEach((element) => {
                        $(element).fadeOut(100, function () {
                            $(element).slideUp(100, function () {
                                $(element).remove();
                            });
                        });
                    });
                }
                if (!empty(data.view_up)) {
                    var changeUrl = "";
                    data.view_up.forEach((element) => {
                        if (!Array.isArray(element)) return;
                        // Text and metadata are separate from server-rendered HTML.
                        if (element[0] === "title") {
                            if (typeof element[1] === "string") document.title = element[1];
                            return;
                        }
                        if (element[0] === "metadata") {
                            Hn_Framework.update_public_metadata(element[1]);
                            return;
                        }
                        if (element[0] === "script" || element[0] === "script_footer") return;
                        if (!empty(element[2])) {
                            if ($(element[0]).length) {
                                if (element[2] == "before")
                                    $(element[0]).before(element[1]);
                                else if (element[2] == "after")
                                    $(element[0]).after(element[1]);
                                else if (element[2] == "append")
                                    $(element[0]).append(element[1]);
                                else if (element[2] == "prepend")
                                    $(element[0]).prepend(element[1]);
                                else if (element[2] == "attr")
                                    $(element[0]).attr(element[3], element[1]);
                                else if (element[2] == "modal") {
                                    $(element[0]).modal(element[1]);
                                    $(element[0] + " .modal-body").animate(
                                        { scrollTop: 0 },
                                        200
                                    );
                                } else if (
                                    $(element[0]).html().trim() !=
                                    element[1].trim()
                                ) {
                                    element[1] += "";
                                    $(element[0]).html(element[1]);
                                    Hn_Framework.show_element(element[0]);
                                }
                            }
                        } else {
                            if (element[0] == "url")
                                changeUrl = element[1];
                            else {
                                element[1] += "";
                                if (
                                    $(element[0]).length &&
                                    $(element[0]).html().trim() !=
                                        element[1].trim()
                                ) {
                                    $(element[0]).html(element[1]);
                                    Hn_Framework.show_element(element[0]);
                                }
                            }
                        }
                    });
                    if (!empty(changeUrl)) {
                        if (changeUrl != window.location.href) {
                            Hn_Framework.change_my_url(changeUrl, {
                                html: changeUrl,
                                title: $("title").text(),
                            });
                        }
                        Hn_Framework.reset_page();
                    }
                    Hn_Framework.reset_load();
                    // The only public script_footer was a film-player bootstrap.
                    // Keep server-rendered content insertion (including its existing
                    // inline bootstraps), but never eval response script strings.
                    if (window.NguoncPublicAssets && typeof window.NguoncPublicAssets.init === "function") {
                        window.NguoncPublicAssets.init();
                    } else if (window.NguoncFilmPlayer && typeof window.NguoncFilmPlayer.init === "function") {
                        window.NguoncFilmPlayer.init();
                    }
                }
            }
            if (!empty(data.back_to_top)) {
                Hn_Framework.scrollTo(data.back_to_top);
            }
        } catch (e) {
            if (Hn_Framework.settings.dev) {
                console.log(e);
                console.log(data);
            }
            cuteToast({
                type: "error",
                message: "Đã xảy ra lỗi javascript, vui lòng làm mới trang và thử lại!",
                timer: 5000,
            });
        }
    }),
    (Hn_Framework.show_element = (element) => {
        // $(element).removeAttr("style");
        // $(element).css({ opacity: 0 });
        // $(element).animate({ opacity: 1 }, 300);
    }),
    (Hn_Framework.change_my_url = (url) => {
        var target = Hn_Framework.public_url(url);
        if (target) history.pushState({ title: document.title, url: target.href }, "", target.href);
    }),
    (Hn_Framework.form_ajax = (ele) => {
        var url_ = Hn_Framework.convert_url(ele.attr("action"));
        var method = ele.attr("method");
        var navigation = String(method || "GET").toUpperCase() === "GET";
        var data = ele.serialize();
        var check = true;
        var top = 0;
        ele.find(".required").each(function () {
            if (empty($(this).val())) {
                $(this).addClass("is-invalid");
                check = false;
                if (top == 0) top = $(this).offset().top;
            }
        });

        if (check) {
            if (!navigation && data === ele.attr("data")) {
                cuteToast({
                    type: "warning",
                    message: "Thông tin yêu cầu không có sự thay đổi!",
                    timer: 4000,
                });
                return false;
            }
            var load_complete = function (result) {
                if (!navigation && result.message == "success") {
                    ele.attr("data", data);
                }
            };
            Hn_Framework.ajax_load(url_, data, method, "", true, load_complete, {
                navigation: navigation
            });
        } else {
            document.querySelector('body').scrollTo({
                top: top - Hn_Framework.settings.top,
                behavior: "smooth",
            });
            cuteToast({
                type: "error",
                message: "Vui lòng chọn hoặc nhập đầy đủ các trường bắt buộc!",
                timer: 4000,
            });
        }
    }),
    (Hn_Framework.scrollTo = (ele) => {
        if (!$(ele).length) return;
        var top = $(ele).offset().top - Hn_Framework.settings.top;
        document.querySelector('html').scrollTo({
            top: top,
            behavior: "smooth",
        });
    });
