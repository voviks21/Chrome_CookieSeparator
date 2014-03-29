
(function() {
    var Cookie = function() {
        this.name = '';
        this.vale = '';
        this.domain = '';
        this.path = '';
        this.session = false;
        this.expirationDate = null;
        this._Set_Cookie = '';
    };

    $.extend(Cookie, {
        /*
         * @param {type} domain the url's domain
         * @param {String} Set_Cookie  the response header of Set-Cookie
         * @returns {Cookie}
         */
        parseCookie: function(domain, Set_Cookie) {
            var c = new Cookie();
            var first = true;
            $.each(Set_Cookie.split(';'), function(idx, item) {
                item = $.trim(item);
                try {
                    var match = item.match(/^([^=]*)=([\s\S]*)$/);
                    var k = match[1].toLowerCase();
                    var v = match[2];
                } catch (e) {
                    window.console.log(item + " " + e);
                    return;
                }
                if (first) {
                    first = false;
                    c.name = k;
                    c.value = v;
                } else {
                    c[k] = v;
                }
            });
            if (!c.domain) {
                c.domain = domain;
            }
            if (!c.path) {
                c.path = '/';
            }
            c._Set_Cookie = Set_Cookie;
            return c;
        }
    });

    var utils = {
        getUrlDomain: function(url) {
            return  url.match(/^([^:]+):\/\/([^/]+)([\s\S]*\/)[^/]*$/)[2];
        },
        getUrlPath: function(url) {
            var path = url.match(/^([^:]+):\/\/([^/]+)([\s\S]*\/)([^/]*)$/)[3];
            return path.replace(/^([\s\S]+)\/$/, '$1');
        },
        /*
         *
         * @param {String} domain eg: "www.google.com"
         * @returns {Array} domain="www.google.com" will return  ["com","google","www"]
         */
        getDomainParts: function(domain) {
            var domains = [];
            $.each(domain.split('.'), function(idx, item) {
                item = $.trim(item);
                if (item) {
                    domains.push(item);
                }
            });
            return domains.reverse();
        },
        /**
         * @param {String} path  eg: "/"  "/book" ...
         * @returns {Array}  eg: path='/book' return ["/","book"]
         */
        getPathParts: function(path) {
            // trim the last '/'
            path = path.replace(/^([\s\S]+)\/$/, '$1');
            var parts;
            if (path == '/') {
                parts = [path];
            } else {
                parts = path.split('/');
                parts[0] = '/';
            }
            return parts;
        }
    };

    var cookieSeparator = {
        /*
         * saved all tabs's cookies
         *
         * example of _tabsCookies object:
         *   11 (tab's id): Object
         *       com (domain's parts): Object
         *           facebook: Object  (.facebook.com)
         *               __domainCookies: Object (domainCookies)
         *                   / (path's parts): Object
         *                       __cookies: Object (pathCookies)
         *                           reg_ext_ref (cookie's name): Cookie
         *                           reg_fb_gate: Cookie
         *               www:Object  (.www.facebook.com)
         *                  __domainCookies: Object
         */
        _tabsCookies: {},
        _getCookies: function(tabId, domain, path) {
            var tabCookies = (this._tabsCookies[tabId] = this._tabsCookies[tabId] || {});
            return this._getDomainCookies(tabCookies, domain, path);
        },
        _saveCookie: function(tabId, fromDomain, cookie) {
            if (!this._cookieDomainSecurityCheck(fromDomain, cookie.domain)) {
                return;
            }
            var tabCookies = (this._tabsCookies[tabId] = this._tabsCookies[tabId] || {});
            this._saveDomainCookie(tabCookies, cookie);
        },
        _cookieDomainSecurityCheck: function(fromDomain, targetDomain) {
            var targetDomainParts = utils.getDomainParts(targetDomain),
                    fromDomainParts = utils.getDomainParts(fromDomain);
            // the domain of a cookie could not be "","com","me","cn"...
            if (targetDomainParts.length < 2) {
                return false;
            }
            // the domain of a cookie must be a subdomain of the url's domain
            for (var i = 0; i < targetDomainParts.length; i++) {
                if (!fromDomainParts[i] || fromDomainParts[i] != targetDomainParts[i]) {
                    return false;
                }
            }
            return true;
        },
        _getDomainCookies: function(tabCookies, domain, path) {
            var parts = utils.getDomainParts(domain),
                    root = tabCookies;
            var cookies = {};
            while (parts.length > 0) {
                var p = parts.shift(),
                        root = root[p];
                if (!root) {
                    return cookies;
                }
                var domainCookies = root['__domainCookies'] || {},
                        pathCookies = this._getPathCookie(domainCookies, path);
                $.extend(cookies, pathCookies);
            }
            return cookies;
        },
        _saveDomainCookie: function(tabCookies, cookie) {
            var domain = cookie.domain,
                    parts = utils.getDomainParts(domain),
                    root = tabCookies;
            while (parts.length > 0) {
                var p = parts.shift(),
                        root = (root[p] = root[p] || {});
            }
            var domainCookies = (root['__domainCookies'] = root['__domainCookies'] || {});
            this._savePathCookie(domainCookies, cookie);
        },
        _getPathCookie: function(domainCookies, path) {
            var parts = utils.getPathParts(path),
                    root = domainCookies;
            var cookies = {};
            while (parts.length > 0) {
                var p = parts.shift(),
                        root = root[p];
                if (!root) {
                    return cookies;
                }
                $.extend(cookies, root['__cookies'] || {});
            }
            return cookies;
        },
        _savePathCookie: function(domainCookies, cookie) {
            var path = cookie.path,
                    parts = utils.getPathParts(path),
                    root = domainCookies;
            while (parts.length > 0) {
                var p = parts.shift();
                root = (root[p] = root[p] || {});
            }
            root['__cookies'] = root['__cookies'] || {};
            root['__cookies'][cookie.name] = cookie;
        },
        _separatedTabs: {},
        separate: function(tabId) {
            this._separatedTabs[tabId] = true;
        },
        unseparate: function(tabId) {
            this._separatedTabs[tabId] = false;
        },
        hasSeparetedTab: function(tabId) {
            return this._separatedTabs[tabId] ? true : false;
        },
        _inited: false,
        init: function() {
            if (this._inited) {
                return;
            }
            this._inited = true;
            this._onBeforeSendHeaders();
            this._onHeadersReceived();
        },
        _validateReq: function(details) {
            if (!this.hasSeparetedTab(details.tabId)) {
                return false;
            }
            return true;
        },
        _listenerFilter: {
            urls: ['http://*/*', "https://*/*"]
        },
        _onBeforeSendHeaders: function() {
            var that = this;
            chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
                if (!that._validateReq(details)) {
                    return;
                }

                var tabId = details.tabId,
                        url = details.url,
                        domain = utils.getUrlDomain(url),
                        path = utils.getUrlPath(url);

                var cookies = that._getCookies(tabId, domain, path);
                var temp = [];
                $.each(cookies, function(name, item) {
                    temp.push(item.name + '=' + item.value);
                });

                var headers = details.requestHeaders;
                $.each(headers, function(idx, item) {
                    if (item.name === 'Cookie') {
                        item.value = temp.join('; ');
                        return false;
                    }
                });

                return {requestHeaders: headers};
            }, that._listenerFilter, ["blocking", "requestHeaders"]);
        },
        _onHeadersReceived: function() {
            var that = this;
            chrome.webRequest.onHeadersReceived.addListener(function(details) {
                if (!that._validateReq(details)) {
                    return;
                }
                var tabId = details.tabId,
                        url = details.url,
                        fromDomain = utils.getUrlDomain(url);

                var Set_Cookies = [],
                        leftHeaders = [];
                $.each(details.responseHeaders, function(idx, item) {
                    if (item.name === 'Set-Cookie') {
                        Set_Cookies.push(item.value);
                    } else {
                        leftHeaders.push(item);
                    }
                });

                $.each(Set_Cookies, function(idx, item) {
                    var cookie = Cookie.parseCookie(fromDomain, item);
                    that._saveCookie(tabId, fromDomain, cookie);
                });
                return {responseHeaders: leftHeaders};
            }, that._listenerFilter, ["blocking", "responseHeaders"]);
        }
    };

    cookieSeparator.init();
    window.cookieSeparator = cookieSeparator;
})();