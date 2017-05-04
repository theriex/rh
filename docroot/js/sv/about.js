/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.about = (function () {
    "use strict";

    var content = [
        ["p", "When I took U.S. history in prep school I was told we would be stopping before the Vietnam war and no Indians. So I studied on my own, but it was hard without any outline to start from. This timeline is for others who missed out in school and could use some starting context."],
        ["p", "The timeline is incomplete. This first release is extremely limited in scope, and fails to include women, LGBTQ people, folks with less money, or people percieved as less able.  That needs to change in upcoming releases."],
        ["p", "This timeline will always be incomplete.  The few short snippets included are meant to serve as starting points for further search.  All the depth and connections are on the net.  The points presented here are a mix of incredibly major and potentially interesting.  You are encouraged to check all points for yourself.  Knowledge evolves over time."],
        ["p", "Points are categorized for search based on the racism that was being applied, which leads to things like Hawai'i and the Pacific Islands usually included with Asian timeline.  This reflects the situation even though it's wrong.  Hawai'i is spelled \"Hawaii\" because sometimes it's quoted like that and the search is currently unsophisticated.  This should be improved."],
        ["p", "There is no conceivable way I could have compiled this on my own. The starting points for this timeline were compiled by Karen L. Suyemoto, Ph.D. - UMass (Boston) Psychology and Asian American Studies. Those points were updated 2005-2006 by Claudia Fox Tree and Elli Stern for EMI Empowering Multicultural Initiatives. In 2014 the points were updated again by Emily Davis, for K. Suyemoto.  My full pass conversion into JSON data format finished in January 2017 and touched everything, so if you find something problematic open an issue for the project on github.  Many of my heroes didn't get included because there was already so much to cover. This is a starting outline."],
        ["p", "You are welcome to include this timeline as part of your website. Please keep the contents of this about text, and download updates at least every 6 months."]];


    function display () {
        d3.select("#suppvisdiv")
            .style("left", "0px")
            .style("top", "0px")
            .style("width", (window.innerWidth - 40) + "px")
            .style("height","30px")
            .style("background", "#fff5ce")
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("height", (window.innerHeight - 40) + "px")
        jt.out("suppvisdiv", jt.tac2html(
            [["div", {id:"aboutxdiv"},
              ["a", {href:"#close", onclick:jt.fs("app.about.close()")}, "X"]],
             ["div", {id:"abcontdiv"}, jt.tac2html(content)]]));
        setTimeout(function () {
            var url = "https://github.com/theriex/rh/issues",
                sdiv = jt.byId("suppvisdiv"),
                link = jt.tac2html(
                    ["a", {href: url, 
                           onclick:jt.fs("window.open('" + url + "')")},
                     "github"]);
            sdiv.innerHTML = sdiv.innerHTML.replace(/github/g, link); }, 200);
    }


    return {
        display: function () { display(); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden"); }
    };
}());
