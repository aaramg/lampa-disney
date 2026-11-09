/*
 * Disney — Lampa plugin
 * Adds a "Disney" item to the side menu. It opens a page of TMDB rows:
 * Disney+, Pixar, Walt Disney Animation, Marvel, Star Wars, Disney Channel / Junior, classics.
 * Targets Lampa 3.x. Written in ES5 for old Android TV WebViews (Crosswalk).
 */
(function () {
    'use strict';

    if (window.plugin_disney_ready) return;
    window.plugin_disney_ready = true;

    var SOURCE = 'disney';
    var DAY = 1000 * 60 * 60 * 24;

    // TMDB ids (checked against themoviedb.org)
    var NET = { disney_plus: 2739, disney_channel: 54, disney_junior: 281 };
    var CO  = { disney: 2, pixar: 3, lucasfilm: 1, marvel: 420, wdas: 6125, wd_productions: 3166 };

    var ICON = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 1.5l1.6 3.2H12.9V7h1.6V5.6h1.4V7h1.6V4.7h-.7L18.4 2l1.6 2.7h-.7V8.5l1.7 1.3v12.7h-6.6v-4.8a2.4 2.4 0 0 0-4.8 0v4.8H3V9.8l1.7-1.3V4.7H4L5.6 2l1.6 2.7h-.7V7h1.6V5.6h1.4V7h1.6V4.7h-.7z"/>' +
        '</svg>';

    Lampa.Lang.add({
        disney_title:          { ru: 'Disney', en: 'Disney', uk: 'Disney' },
        disney_plus_new:       { ru: 'Новое на Disney+', en: 'New on Disney+', uk: 'Нове на Disney+' },
        disney_plus_popular:   { ru: 'Популярное на Disney+', en: 'Popular on Disney+', uk: 'Популярне на Disney+' },
        disney_movies_new:     { ru: 'Новые фильмы Disney', en: 'New Disney movies', uk: 'Нові фільми Disney' },
        disney_pixar:          { ru: 'Pixar', en: 'Pixar', uk: 'Pixar' },
        disney_animation:      { ru: 'Walt Disney Animation', en: 'Walt Disney Animation', uk: 'Walt Disney Animation' },
        disney_live:           { ru: 'Фильмы Walt Disney Pictures', en: 'Walt Disney Pictures', uk: 'Фільми Walt Disney Pictures' },
        disney_marvel_movies:  { ru: 'Marvel — фильмы', en: 'Marvel movies', uk: 'Marvel — фільми' },
        disney_marvel_series:  { ru: 'Marvel — сериалы', en: 'Marvel series', uk: 'Marvel — серіали' },
        disney_sw_movies:      { ru: 'Звёздные войны — фильмы', en: 'Star Wars movies', uk: 'Зоряні війни — фільми' },
        disney_sw_series:      { ru: 'Звёздные войны — сериалы', en: 'Star Wars series', uk: 'Зоряні війни — серіали' },
        disney_channel:        { ru: 'Disney Channel', en: 'Disney Channel', uk: 'Disney Channel' },
        disney_junior:         { ru: 'Disney Junior — для малышей', en: 'Disney Junior', uk: 'Disney Junior — для малят' },
        disney_classics:       { ru: 'Классика Disney', en: 'Disney classics', uk: 'Класика Disney' },
        disney_top:            { ru: 'Лучшее от Disney', en: 'Top rated Disney', uk: 'Найкраще від Disney' }
    });

    function isoDate(offsetDays) {
        return new Date(Date.now() + (offsetDays || 0) * DAY).toISOString().slice(0, 10);
    }

    // Each row: [lang key, TMDB discover request, cache life in days]
    function rows() {
        var today = isoDate(0);
        var yearAgo = isoDate(-365);

        return [
            ['disney_plus_new',      'discover/tv?with_networks=' + NET.disney_plus + '&first_air_date.gte=' + yearAgo + '&first_air_date.lte=' + today + '&sort_by=popularity.desc', 1],
            ['disney_movies_new',    'discover/movie?with_companies=' + [CO.disney, CO.pixar, CO.wdas, CO.marvel, CO.lucasfilm].join('|') + '&primary_release_date.gte=' + yearAgo + '&primary_release_date.lte=' + today + '&sort_by=popularity.desc', 1],
            ['disney_plus_popular',  'discover/tv?with_networks=' + NET.disney_plus + '&sort_by=popularity.desc', 2],
            ['disney_pixar',         'discover/movie?with_companies=' + CO.pixar + '&sort_by=popularity.desc', 7],
            ['disney_animation',     'discover/movie?with_companies=' + CO.wdas + '&sort_by=popularity.desc', 7],
            ['disney_marvel_movies', 'discover/movie?with_companies=' + CO.marvel + '&primary_release_date.lte=' + today + '&sort_by=popularity.desc', 3],
            ['disney_marvel_series', 'discover/tv?with_companies=' + CO.marvel + '&sort_by=popularity.desc', 3],
            ['disney_sw_movies',     'discover/movie?with_companies=' + CO.lucasfilm + '&sort_by=popularity.desc', 7],
            ['disney_sw_series',     'discover/tv?with_companies=' + CO.lucasfilm + '&sort_by=popularity.desc', 7],
            ['disney_live',          'discover/movie?with_companies=' + CO.disney + '&without_companies=' + CO.pixar + '&sort_by=popularity.desc', 7],
            ['disney_junior',        'discover/tv?with_networks=' + NET.disney_junior + '&sort_by=popularity.desc', 7],
            ['disney_channel',       'discover/tv?with_networks=' + NET.disney_channel + '&sort_by=popularity.desc', 7],
            ['disney_classics',      'discover/movie?with_companies=' + [CO.disney, CO.wdas, CO.wd_productions].join('|') + '&with_genres=16&primary_release_date.lte=1999-12-31&vote_count.gte=200&sort_by=vote_count.desc', 14],
            ['disney_top',           'discover/movie?with_companies=' + [CO.disney, CO.pixar, CO.wdas].join('|') + '&vote_count.gte=1000&sort_by=vote_average.desc', 14]
        ];
    }

    function main(params, oncomplite, onerror) {
        var tmdb = Lampa.Api.sources.tmdb;

        var parts = rows().map(function (row) {
            return function (call) {
                tmdb.get(row[1], {}, function (json) {
                    json.title = Lampa.Lang.translate(row[0]);
                    call(json);
                }, call, { life: DAY * row[2] });
            };
        });

        function loadPart(partLoaded, partEmpty) {
            Lampa.Api.partNext(parts, 5, partLoaded, partEmpty);
        }

        loadPart(oncomplite, onerror);

        return loadPart;
    }

    function registerSource() {
        // Copy the TMDB source so anything that looks up activity.source still works,
        // but leave out discovery, so search doesn't get a duplicate TMDB tab.
        var source = {};
        var tmdb = Lampa.Api.sources.tmdb;

        for (var key in tmdb) source[key] = tmdb[key];

        delete source.discovery;
        source.main = main;

        Lampa.Api.sources[SOURCE] = source;
    }

    function open() {
        Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('disney_title'),
            component: 'main',
            source: SOURCE,
            page: 1
        });
    }

    function addMenu() {
        if ($('.menu .menu__item[data-action="disney"]').length) return;

        Lampa.Menu.addButton(ICON, Lampa.Lang.translate('disney_title'), open).attr('data-action', 'disney');
    }

    // A plugin added by URL in Settings → Extensions has no name and shows as "Untitled".
    // Fill in our own entry once.
    function nameSelf() {
        if (!Lampa.Plugins || !Lampa.Plugins.get) return;

        var changed = false;

        Lampa.Plugins.get().forEach(function (plugin) {
            if (plugin.url && /\/disney\.js(\?|$)/.test(plugin.url) && !plugin.name) {
                plugin.name = 'Disney';
                plugin.author = '@aaramg';
                changed = true;
            }
        });

        if (changed) Lampa.Plugins.save();
    }

    function start() {
        registerSource();
        addMenu();

        try { nameSelf(); } catch (e) {}
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') start();
        });
    }
})();
