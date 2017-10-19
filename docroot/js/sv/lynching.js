/*jslint browser, multivar, white, fudge, this */
/*global app, window, jt, d3 */

app.lynching = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fef6d7", 
                          map: {neutral:"#fadb66",
                                hover:"#d3aaaa"}}},
        ani = {},
        //See http://www.chesnuttarchive.org/classroom/lynchingstat.html
        //in particular the notes about totals and "Whites".
        ldty = [["year", "other", "black", "total"],
                [1882, 64, 49, 113],
                [1883, 77, 53, 130],
                [1884, 160, 51, 211],
                [1885, 110, 74, 184],
                [1886, 64, 74, 138],
                [1887, 50, 70, 120],
                [1888, 68, 69, 137],
                [1889, 76, 94, 170],
                [1890, 11, 85, 96],
                [1891, 71, 113, 184],
                [1892, 69, 161, 230],
                [1893, 34, 118, 152],
                [1894, 58, 134, 192],
                [1895, 66, 113, 179],
                [1896, 45, 78, 123],
                [1897, 35, 123, 158],
                [1898, 19, 101, 120],
                [1899, 21, 85, 106],
                [1900, 9, 106, 115],
                [1901, 25, 105, 130],
                [1902, 7, 85, 92],
                [1903, 15, 84, 99],
                [1904, 7, 76, 83],
                [1905, 5, 57, 62],
                [1906, 3, 62, 65],
                [1907, 3, 58, 61],
                [1908, 8, 89, 97],
                [1909, 13, 69, 82],
                [1910, 9, 67, 76],
                [1911, 7, 60, 67],
                [1912, 2, 62, 64],
                [1913, 1, 51, 52],
                [1914, 4, 51, 55],
                [1915, 13, 56, 69],
                [1916, 4, 50, 54],
                [1917, 2, 36, 38],
                [1918, 4, 60, 64],
                [1919, 7, 76, 83],
                [1920, 8, 53, 61],
                [1921, 5, 59, 64],
                [1922, 6, 51, 57],
                [1923, 4, 29, 33],
                [1924, 0, 16, 16],
                [1925, 0, 17, 17],
                [1926, 7, 23, 30],
                [1927, 0, 16, 16],
                [1928, 1, 10, 11],
                [1929, 3, 7, 10],
                [1930, 1, 20, 21],
                [1931, 1, 12, 13],
                [1932, 2, 6, 8],
                [1933, 2, 24, 28],
                [1934, 0, 15, 15],
                [1935, 2, 18, 20],
                [1936, 0, 8, 8],
                [1937, 0, 8, 8],
                [1938, 0, 6, 6],
                [1939, 1, 2, 3],
                [1940, 1, 4, 5],
                [1941, 0, 4, 4],
                [1942, 0, 6, 6],
                [1943, 0, 3, 3],
                [1944, 0, 2, 2],
                [1945, 0, 1, 1],
                [1946, 0, 6, 6],
                [1947, 0, 1, 1],
                [1948, 1, 1, 2],
                [1949, 0, 3, 3],
                [1950, 1, 1, 2],
                [1951, 0, 1, 1],
                [1952, 0, 0, 0],
                [1953, 0, 0, 0],
                [1954, 0, 0, 0],
                [1955, 0, 3, 3],
                [1956, 0, 0, 0],
                [1957, 1, 0, 1],
                [1958, 0, 0, 0],
                [1959, 0, 1, 1],
                [1960, 0, 0, 0],
                [1961, 0, 1, 1],
                [1962, 0, 0, 0],
                [1963, 0, 1, 1],
                [1964, 2, 1, 3],
                [1965, 0, 0, 0],
                [1966, 0, 0, 0],
                [1967, 0, 0, 0],
                [1968, 0, 0, 0]],
        ldts = [["state", "other", "black", "total"],
                ["Alabama", 48, 299, 347],
                ["Arizona", 31, 0, 31],
                ["Arkansas", 58, 226, 284],
                ["California", 41, 2, 43],
                ["Colorado", 65, 3, 68],
                ["Delaware", 0, 1, 1],
                ["Florida", 25, 257, 282],
                ["Georgia", 39, 492, 531],
                ["Idaho", 20, 0, 20],
                ["Illinois", 15, 19, 34],
                ["Indiana", 33, 14, 47],
                ["Iowa", 17, 2, 19],
                ["Kansas", 35, 19, 54],
                ["Kentucky", 63, 142, 205],
                ["Louisiana", 56, 335, 391],
                ["Maine", 1, 0, 1],
                ["Maryland", 2, 27, 29],
                ["Michigan", 7, 1, 8],
                ["Minnesota", 5, 4, 9],
                ["Mississippi", 42, 539, 581],
                ["Missouri", 53, 69, 122],
                ["Montana", 82, 2, 84],
                ["Nebraska", 52, 5, 57],
                ["Nevada", 6, 0, 6],
                ["New Jersey", 1, 1, 2],
                ["New Mexico", 33, 3, 36],
                ["New York", 1, 1, 2],
                ["North Carolina", 15, 86, 101],
                ["North Dakota", 13, 3, 16],
                ["Ohio", 10, 16, 26],
                ["Oklahoma", 82, 40, 122],
                ["Oregon", 20, 1, 21],
                ["Pennsylvania", 2, 6, 8],
                ["South Carolina", 4, 156, 160],
                ["South Dakota", 27, 0, 27],
                ["Tennessee", 47, 204, 251],
                ["Texas", 141, 352, 493],
                ["Utah", 6, 2, 8],
                ["Vermont", 1, 0, 1],
                ["Virginia", 17, 83, 100],
                ["Washington", 25, 1, 26],
                ["West Virginia", 20, 28, 48],
                ["Wisconsin", 6, 0, 6],
                ["Wyoming", 30, 5, 35]];


    function display (suppvis, timeline, endfunc) {
        sv = suppvis || app.lev.suppVisByCode("sl");
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        sv.startDate = new Date();
        jt.err("Not implemented yet");
    }


    function finish () {
        var date, nowiso;
        if(!ani.finished) {
            ani.finished = true;
            date = new Date();
            sv.startstamp = app.db.wallClockTimeStamp(sv.startDate);
            sv.duration = app.db.getElapsedTime(date, sv.startDate);
            nowiso = date.toISOString();
            sv.pts.forEach(function (pt) {
                pt.visited = nowiso; });
            sv.visited = nowiso;
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    }


    return {
        //TODO: need to init data points for each year so they show up in
        //the main display at start.
        display: function (sv, tl, endf) { display(sv, tl, endf); },
        transport: function (command) { transport(command); },
        selcid: function (cid) { displayPointById(cid); },
        selyear: function (year) { displayPointByYear(year); },
        stclick: function (stid) { stateClick(stid); },
        stunclick: function (stid) { stateUnclick(stid); },
        stmouseover: function (stid) { stateMouseOver(stid); },
        stmouseout: function (stid) { stateMouseOut(stid); },
        finish: function () { finish(); }
    };
}());

