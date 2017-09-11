/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.about = (function () {
    "use strict";

    var content = [
        ["h2", "Purpose"],
        ["p", "The goal of this timeline is to increase understanding and respect for the context of people whose histories are frequently ignored.  The intent is to reach people a few minutes at a time when they have a moment, building up scaffolding for further understanding."],
        ["p", "I'm grateful to friends who have helped me learn, and feel a responsibility to try help others as I have been helped. As a web software developer, I can reach people in ways not available to everyone else. My goal is to do that, with respect for the people and communities mentioned."],

        ["h2", "Caveats"],
        ["p", "This timeline is incomplete. The initial release is extremely limited in scope, and fails to include women, LGBTQ people, people with less money, or people percieved as less able. The limiting was necessary to make a first release achievable. The goal is to grow the timeline in later releases."],
        ["p", "This timeline will always be incomplete.  It's purpose is to provide a highly abbreviated outline of points for further inquiry. You are encouraged to check all points for yourself. Knowledge evolves over time. History has multiple perspectives."],
        ["p", "Points are categorized for search based on the racism that was being applied, which leads to things like Hawai'i and the Pacific Islands usually included with Asian timeline.  This reflects the situation even though it's wrong.  Hawai'i is spelled \"Hawaii\" because sometimes it's quoted like that and the search is currently unsophisticated.  This should be improved."],

        ["h2", "Acknowledgments"],
        ["p", "The starting points for this timeline were compiled by Karen L. Suyemoto, Ph.D. - UMass (Boston) Psychology and Asian American Studies. The points were updated 2005-2006 by Claudia Fox Tree and Elli Stern for EMI Empowering Multicultural Initiatives. In 2014 the points were updated again by Emily Davis, for K. Suyemoto. In 2017, I converted these points into an interactive timeline and supporting visualizations, updating much of the data and creating a public project. If you find anything problematic, please open an issue (or comment on an existing issue) on github."],  //github linkage created below..

        ["h2", "Use"],
        ["p", "You are welcome to embed this timeline as part of your website. [TODO: instructions]"]];


    function display (ms) {
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
            [["div", {id:"abcontdiv"}, jt.tac2html(content)],
             ["div", {id:"abokbuttondiv"}, 
              ["button", {type:"button", id:"okbutton",
                          onclick:jt.fs("app.about.close()")},
               "Ok"]]]));
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
                .style("visibility", "hidden");
            app.mode.chmode("interactive"); }
    };
}());
