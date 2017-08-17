/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.about = (function () {
    "use strict";

    var content = [
        ["h2", "The Story"],
        ["p", "When I took U.S. history in prep school, we were told no Indians and the class would be stopping before the Vietnam war. That always stuck with me because it was clear how woefully unprepared I would be for understanding my context as a citizen. I studied on my own, but it was hard to know where to start. Over 3 decades later it's still hard to know where to start. The intent of this interactive timeline is to provide some initial starting points. The goal is to increase understanding and respect for the context of others whose histories are so frequently ignored."],
        ["h2", "Caveats"],
        ["p", "This timeline is incomplete. The initial release is extremely limited in scope, and fails to include women, LGBTQ people, people with less money, or people percieved as less able. The limiting was necessary to make a first release achievable. The goal is to grow the timeline in later releases."],
        ["p", "This timeline will always be incomplete.  The few short snippets included are meant to serve as starting points for further inquiry.  All the depth and connections are on the net and in books.  The points presented here are a mix of incredibly major and potentially interesting.  You are encouraged to check all points for yourself.  Knowledge evolves over time."],
        ["p", "Points are categorized for search based on the racism that was being applied, which leads to things like Hawai'i and the Pacific Islands usually included with Asian timeline.  This reflects the situation even though it's wrong.  Hawai'i is spelled \"Hawaii\" because sometimes it's quoted like that and the search is currently unsophisticated.  This should be improved."],
        ["h2", "Acknowledgments"],
        ["p", "There is no conceivable way I could have compiled this on my own. The starting points for this timeline were compiled by Karen L. Suyemoto, Ph.D. - UMass (Boston) Psychology and Asian American Studies. Those points were updated 2005-2006 by Claudia Fox Tree and Elli Stern for EMI Empowering Multicultural Initiatives. In 2014 the points were updated again by Emily Davis, for K. Suyemoto.  My full pass conversion into JSON data format finished in January 2017 and touched everything, so if you find something problematic open an issue for the project on github.  Many of my heroes didn't get included because there was already so much to cover. This is a starting outline."],
        ["h2", "Use"],
        ["p", "You are welcome to embed this timeline as part of your website. [TODO: instructions]"]];


    function display (ms) {
        jt.byId("itemdispdiv").style.visibility = "hidden";
        d3.select("#suppvisdiv")
            .style("left", "0px")
            .style("top", "0px")
            .style("width", ms.w + "px")
            .style("height","30px")
            .style("background", "#fff5ce")
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("height", (window.innerHeight - 40) + "px");
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
        display: function (ms) { display(ms); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden"); }
    };
}());
