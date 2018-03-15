/*jslint browser, multivar, white, fudge, this */
/*global app, window, jt, d3 */

app.slavery = (function () {
    "use strict";

    var stats = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fef6d7", 
                          map: {neutral:"#fadb66",
                                slavery:"#cc6c6c",
                                hover:"#d3aaaa"}}},
        ani = {wmin:1.0, wbase:0.25, nudge:0.05, tes:[]},
        sps = [{state:"AK", name:"Alaska", start:0, end:0,
                notes:"Slavery and forced labor of indigenous people by others, including the U.S. government, but everything after the Alaska purchase in 1867 should have been illegal."},
               {state:"HI", name:"Hawaii", start:0, end:0,
                notes:"Indentured servitude of native Hawaiians and imported labor under extremely harsh conditions."},
               {state:"AL", name:"Alabama", start:1721, end:1865,
                notes:"First slaves brought to Alabama aboard the Harriet in 1721. Slavery ends when the 13th amendment is ratified."},
               {state:"AR", name:"Arkansas", start:1720, end:1865,
               notes:"The first slaves came with settlers moving into the John Law colony on land given to them on the lower Arkansas River by the king of France."},
               {state:"AZ", name:"Arizona", start:1692, end:1862,
                notes:"Slavery is outlawed with the Arizona Organic Act, separating the state from New Mexico. In 1861 the southern half was part of the Confederacy."
},
               {state:"CA", name:"California", start:1848, end:1865,
                notes:"The Spanish force Native Californians into servitude beginning in 1769. The area became part of Mexico starting in 1821, and slavery was outlawed in 1829. Mexico ceded California in 1848, and enslaved Africans were brought in for the gold rush starting that same year. California is admitted as a free state in 1850, though slavery continued illegally after that until the 13th amendment was ratified."},
               {state:"CO", name:"Colorado", start:0, end:0,
                notes:"Though part of New Spain, and disputed with the U.S. after the Louisiana Purchase in 1803, influx of Europeans only significantly began with the Pike's Peak gold rush in 1858. Colorado became a free territory in 1861 and was admitted as a state in 1876."},
               {state:"CT", name:"Connecticut", start:1639, end:1848,
                notes:"The first slaves were recorded in Hartford. Gradual emancipation act passed in 1784 emancipated those born into slavery after they reach the age of 25."},
               {state:"DE", name:"Delaware", start:1639, end:1776,
                notes:"The first Black slave was brought to Delaware in 1639 while it is under Swedish control. Slavery grows under the Dutch after they take over in 1655. Slavery is outlawed as part of the 1776 constitution, but slave ships are not banned from the port until 1789."},
               {state:"FL", name:"Florida", start:1581, end:1865,
                notes:"African slaves are first imported by Spanish residents of St. Augustine. Slavery ends when the 13th amendment is ratified."},
               {state:"GA", name:"Georgia", start:1751, end:1865,
                notes:"Georgia was established in 1732, and African slavery was banned from 1735 to 1751 before becoming integral to the economy. Slavery ends when the 13th amendment is ratified."},
               {state:"IA", name:"Iowa", start:0, end:0,
                notes:"Iowa was claimed by France in 1673, but settlement of the area did not really begin until 1833. While there was some pro-slavery sentiment, the state was free and a significant stop on the underground railroad."},
               {state:"ID", name:"Idaho", start:0, end:0,
                notes:"The first substantial non-indigenous community in Idaho was Lewiston, which was established in 1861."},
               {state:"IL", name:"Illinois", start:1720, end:1848,
                notes:"French Canadian colonists owned African slaves since 1720 and the Northwest Ordinance was not enforced for those already holding slaves. There are around 900 slaves when Illinois becomes a state in 1818. In 1822 residents vote against making slavery legal and gradual emancipation begins in 1825. The Illinois' Constitution of 1848 specifically bans slavery."},
               {state:"IN", name:"Indiana", start:1720, end:1820,
                notes:"Slavery was legal under French control. The first French presence is in 1679 when La Salle explores the area. French residents of Vincennes were allowed to keep their slaves when the British took control in 1763. Opposition to slavery begins around 1805 and it is banned in the constitution in 1816, with all slaves freed by the Indiana Supreme Court in Polly v. Lasselle in 1820."},
               {state:"KS", name:"Kansas", start:0, end:0,
               notes:"First European settlers in 1812. Large influx in the 1850s to try and tip whether it will become a slave or free state. After violent confrontations \"Bleeding Kansas\" enters the union as a free state in 1861."},
               {state:"KY", name:"Kentucky", start:1750, end:1865,
                notes:"Early travelers to Kentucky in the 1750s brought their slaves with them. Slavery ends when the 13th amendment is ratified."},
               {state:"LA", name:"Louisiana", start:1710, end:1864,
                notes:"French colonists enslave indigenous people in 1706 and introduce African slavery in 1710. Slavery was officially abolished by the Louisiana state Constitution of 1864."},
               {state:"MA", name:"Massachusetts", start:1638, end:1840,
                notes:"The first African slaves may have been brought in 1624, but the first confirmed account is in 1638 when Pequot prisoners were exchanged for African slaves in the West Indies.  Technically slavery remains legal until the 13th amendment is ratified, but several are freed in court cases and from 1790-1820 no slaves are reported. In 1830 one slave is reported. From 1840 on no slaves are reported."},
               {state:"MD", name:"Maryland", start:1642, end:1864,
                notes:"13 African slaves are brought to St. Mary's City in 1642. In 1864 slavery is prohibited in the revised state constitution."},
               {state:"ME", name:"Maine", start:1736, end:1820,
                notes:"In 1736 an African slave was purchased for work in a Parish. Maine was part of Massachusetts until 1820 when it entered the union as a free state."},
               {state:"MI", name:"Michigan", start:1761, end:1837,
                notes:"When the British took control of the Great Lakes in 1761 they discovered Native American and African slaves in Detroit. The Northwest Ordinance prohibited slavery in 1787, but there are purchase records after that.  Slavery is abolished when Michigan enters the union as a free state in 1837."
},
               {state:"MN", name:"Minnesota", start:1826, end:1858,
                notes:"Slaves were brought into Minnesota primarily by Army officers who brought their slaves with them to Fort Snelling at Army expense at least as early as 1826. Several cases including Dred Scott. Slavery is forbidden in Minnesota when it is admitted to the union in 1858."},
               {state:"MO", name:"Missouri", start:1720, end:1865,
                notes:"In 1720, 500 slaves are brought in to work the lead mines. Slavery ends in 1865 by state convention ordinance and gubernatorial proclamation."},
               {state:"MS", name:"Mississippi", start:1699, end:1865,
                notes:"French establish the first permanent settlement in 1699 and bring African slaves first for tobacco plantation. Slavery remains legal until the 13th amendment is ratified nationally. Mississipi lawmakers don't actually ratify the amendment until 1995, and don't notify the U.S. Archivist until 2013."},
               {state:"MT", name:"Montana", start:0, end:0,
                notes:"Montana became a territory in 1864 and a state in 1889. There were many Confederate sympathizers but no records of slavery."},
               {state:"NC", name:"North Carolina", start:1655, end:1865,
                notes:"English colonists bring slaves when they migrate from Virginia beginning in 1655. Slavery was encouraged through land grants per slave. Slavery ends when the 13th amendment is ratified."},
               {state:"ND", name:"North Dakota", start:1802, end:1820,
                notes:"The first recorded non-Indian child born in North Dakota was in 1802 to Black slaves Pierre Bonza and his wife. Non-Native population and infrastructure was sparse until railroads beginning in 1872. The Missouri Commpromise prohibited slavery in 1820. North Dakokta becomes a state in 1889."},
               {state:"NE", name:"Nebraska", start:1804, end:1861,
                notes:"York, an enslaved African held by William Clark traveled and worked with him in 1804 and in 1806. European-American settlement did not begin in any numbers until after 1848 and the California Gold Rush. Some migrant farmers from the South brought a small number of slaves with them. In 1855 there were 13 slaves in Nebraska. Slavery was outlawed by the territorial legislature in 1861. Nebraska becomes a state in 1867."},
               {state:"NH", name:"New Hampshire", start:1645, end:1865,
                notes:"Slaves are noted in New Hampshire in 1645, primarily around Portsmouth. New Hampshire did not impose a tariff on import of slaves and was a popular port. A law banning discrimination for citizenship is passed in 1857, but slavery explicitely ends with ratification of the 13th amendment."},
               {state:"NJ", name:"New Jersey", start:1626, end:1865,
                notes:"New Jersey was originally part of New Netherlands which had slaves beginning in 1626. In 1664 they offer land grants per slave to encourage slavery. A gradual abolition act is passed in 1804. Slavery was permanently abolished in 1846, but at the start of the civil there were 18 \"apprentices for life\". The last 16 slaves are freed on ratification of the 13th amendment."},
               {state:"NM", name:"New Mexico", start:1692, end:1865,
                notes:"Young Native American captives are sold into slavery in New Mexico beginning in 1692. Slavery persists until the 13th amendment is ratified, and forced servitude continues until the Peonage act of 1867."},
               {state:"NV", name:"Nevada", start:0, end:0,
                notes:"While Mormons set up way stations in Nevada en route to California gold fields Nevada was generally anti-slavery. Nevada becomes a state in 1864."},
               {state:"NY", name:"New York", start:1626, end:1827,
                notes:"The Dutch West India Company imports 11 black male slaves into the New Netherlands in 1626. New York begins gradual emancipation in 1799, with remaining slaves freed in 1827."},
               {state:"OH", name:"Ohio", start:1800, end:1865,
                notes:"Slavery is illegal in the territory based on the Northwest Ordinance of 1787, and is abolished by the original state constitution in 1802, however slave owners living in southern Ohio would transport their slaves across the river to Kentucky to avoid law enforcement. A practice that probably subsided over time but definitely ends with ratification of the 13th amendment. The 1830 census lists 6 slaves. A small number of the 337 African Americans living in Ohio in 1800 were likely slaves."},
               {state:"OK", name:"Oklahoma", start:1832, end:1863,
                notes:"Black slaves are moved to Oklahoma with their Native American (primarily Cherokee) owners in the Trail of Tears starting in 1830. Slaves in the Cherokee nation are emancipated by the Cherokee National Council in 1863. Native American slave ownership was not traditionally chattel, but by this time enough similarities had developed that not including the period seems like an omission."},
               {state:"OR", name:"Oregon", start:1853, end:1865,
                notes:"In 1844 all blacks are excluded from the state, but some slaves are still brought in with early settlers, primarily from Missouri, beginning in 1853. Slavery is made illegal in the state consitution in 1857. Oregon becomes a state in 1859. In 1860 the state census lists 3 slaves. Black exclusion is not repealed until 1926."},
               {state:"PA", name:"Pennsylvania", start:1639, end:1847,
                notes:"Swedes and Dutch imported African slaves to the region of Pennsylvania beginning in 1639. Slavery continues under English in 1664. A gradual abolition act (first in the nation) is passed in 1780. No records of any remaining slaves after 1847."},
               {state:"RI", name:"Rhode Island", start:1652, end:1850,
                notes:"Black slaves were in Rhode Island by 1652. Gradual emancipation in 1784. Slave trading continued even after the Abolition Society attempts to secure enforcement of previous legislation in 1789. Violations continue until at least 1796. Census reports 5 slaves in 1840. By the 1850 census there are zero reported."},
               {state:"SC", name:"South Carolina", start:1526, end:1865,
                notes:"After the first slave rebellion and failed settlement by the Spanish in 1526, The first British settlers arrive in 1670 with slaves. Slavery ends when the 13th amendment is ratified."},
               {state:"SD", name:"South Dakota", start:1804, end:1820,
                notes:"York, an enslaved African held by William Clark traveled and worked with him in South Dakota in 1804 and in 1806. The Missouri Compromise prohibited slavery in the region in 1820. South Dakota becomes a state in 1889."},
               {state:"TN", name:"Tennessee", start:1766, end:1865,
                notes:"Slaves are brought in to Tennessee in 1766 while the region is still part of North Carolina. It is the last state to join the Confederacy and the first state brought back into the Union after the civil war."},
               {state:"TX", name:"Texas", start:1740, end:1865,
                notes:"In the 1740s, Spanish settlers would capture Native American children, baptise them and \"adopt\" them into the homes of townspeople as servants. Opportunities for slaves escaping to freedom in Texas occur under rule of Spain and later Mexico, but slavery also continues. African slavery grows starting in 1821 and continues through the civil war."},
               {state:"UT", name:"Utah", start:1847, end:1862,
                notes:"Mormon pioneers arrived with African slaves in 1847. In 1851 Mormons actively seek to purchase Indian slaves. Slavery is officially legalized in 1852. Slavery ends in 1862 when Congress prohibits slavery in all territories."},
               {state:"VA", name:"Virginia", start:1619, end:1865,
                notes:"The first African slaves are brought to Virginia in 1619, taken from a Spanish slave ship by British privateers. As the Africans had been baptized, they were treated as indentured servants. Africans are gradually differentiated into chattel slaves from 1640 to 1660. Slavery ends after the civil war."},
               {state:"VT", name:"Vermont", start:0, end:0,
                notes:"Vermont declares its independence and abolishes adult slavery in its constitution in 1777. However violations of the law were not unusual, and In 1802 a case is even brought against State Supreme Court Justice Stephen Jacob. Child slavery remained legal (though possibly for apprenticeships), and some illegal slaveholding continues until the early 19th century. Free African Americans are also kidnapped and sold out of state. 16 slaves reported on the 1790 census are claimed to be a mistake and corrected to Free Other."},
               {state:"WA", name:"Washington", start:0, end:0,
                notes:"In 1855 Charles Mitchell is given by Rebecca Gibson to James Tilton who is relocating to Olympia from Maryland. Representatives of the black community in Victoria then help him escape from the Tilton family.  Washington becomes a state in 1889."},
               {state:"WI", name:"Wisconsin", start:1725, end:1848,
                notes:"There were African slaves in the region during fur trading in the 1700s, with one recorded death in 1725. In the 1820s and 30s, lead miners brought slaves. Wisconsin was the first state to grant black suffrage in 1865. Wisconsin territory is created in 1836. It becomes a state in 1848. In 1854 a fugitive slave is freed by an abolishonist mob and escapes to Canada, ultimately leading to the Fugitive Slave Law being ruled unconstitutional."},
               {state:"WV", name:"West Virginia", start:1748, end:1865,
                notes:"The area that became West Virginia was settled both from north to south and from east to west with slave presence recorded from 1748.  West Virginia separated from Virginia to become a union state in 1863 with a gradual emancipation clause, but slavery is actually abolished on ratification on 13th amendment."},
               {state:"WY", name:"Wyoming", start:0, end:0,
                notes:"By the time the Spanish took over parts of Wyoming in 1764, they had outlawed slavery of Native Americans. Lewis and Clark brought their slave York with them when they passed through.  Wyoming becomes a state in 1890 after slavery is illegal."}],
        tlpts = [
            {date:"1501",
             text:"The Spanish throne officially approves the use of African slaves in the New World. The Portugese, following exploration of the Brazilian coast in 1500, bring their first shipload of African slaves to the Western Hemisphere in 1502, selling them in what is now Latin America.",
             codes:"BLD", orgid:"1", source:"ksep: B2"},
            {date:"1526", states:["SC"],
             text:"First documented slave rebellion in North America. Lucas Vázquez de Ayllón lands near what will later be Georgetown, South Carolina and establishes a settlement (San Miguel de Gualdape) which fails after about 3 months. During that time the Africans he brought with him as laborers escape to the interior and settle with Native Americans.",
             codes:"BND", orgid:"1", source:"ksep: B3"},
            {date:"1562",
             text:"Britain enters the slave trade when John Hawkins sells a large cargo of African slaves to Spanish planters.",
             codes:"B", orgid:"1", source:"ksep: B4"},
            {date:"1581", states:["FL"],
             text:"Spanish residents in St. Augustine, the first permanent settlement in Florida, import African slaves.",
             codes:"B", orgid:"1", source:"ksep: B274"},
            {date:"1619", states:["FL","VA"],
             text:"20 Africans brought to Jamestown are the first slaves imported into Britain’s North American colonies.",
             codes:"B", orgid:"1", source:"ksep: B275"},
            {date:"1626", states:["FL","VA","NY"],
             text:"The Dutch West India Company imports 11 black male slaves into the New Netherlands.",
             codes:"B", orgid:"1", source:"ksep: B276"},
            {date:"1629-1637", states:["FL","VA","NY","MD","CT"],
             text:"Expanding from Virginia, African slaves are imported into Maryland, Connecticut, and New Amsterdam (modern New York).",
             codes:"B", orgid:"1", source:"ksep: B264"},
            {date:"1640",
             text:"Beginning of large-scale sugar planting in the Caribbean islands. Slave labor plantations steadily grow in size. By 1832 many plantations in Jamaica have over 250 slaves.",
             codes:"LBD", orgid:"1", source:"ksep: B8"},
            {date:"1641", states:["FL","VA","NY","MD","CT","MA","RI"],
             text:"Massachusetts becomes the first colony to legalize slavery.",
             codes:"B", orgid:"1", source:"ksep: B9"},
            {date:"1663",
             text:"Maryland settlers pass a law stipulating that all imported Africans are to be given the status of slaves. Free White women who marry Black slaves are also considered slaves during the lives of their spouses; children of such unions are also to be classified as slaves. In 1681, an amending law is passed stipulating that children born from a union of a White servant woman and African are free citizens.",
             codes:"BR", orgid:"1", source:"ksep: R4"},
            {date:"1774", states:["FL","VA","NY","MD","CT","MA"],
             //The RI law doesn't really end slavery, but unmarking the
             //state on the map to indicate progress.
             text:"The Continental Congress demands elimination of the trans-Atlantic slave trade and economic embargoes on all countries participating in it. Rhode Island enacts a law prohibiting slavery (non-retroactively).",
             codes:"B", orgid:"1", source:"ksep: B23"},
            {date:"1777",
             text:"Vermont becomes the first colony to abolish slavery.",
             codes:"B", orgid:"1", source:"ksep: B277"},
            {date:"1780-03-01",
             text:"The Pennsylvania legislature passes \"An Act for the Gradual Abolition of Slavery\" prohibiting further import of slaves and declaring all newborn children free. Existing slaves are not freed, and members of Congress are exempt. The \"gradual abolition\" approach becomes a model for emancipation of slaves in other northern states.",
             codes:"B", orgid:"1", source:"ksep: B26"},
            {date:"1781",
             text:"Slaves in Massachusetts begin to sue for manumission with the court ruling that perpetual servitude is unconstitutional. Slavery fades rapidly with only isolated cases remaining. Blacks in taxable categories are granted suffrage.",
             code:"B", orgid:"1", source:"ksep: B27"},
            {date:"1787",
             text:"Congress passes the Northwest Ordinance, which forbids slavery in the area between the Appalachian Mountains, the Mississippi River, and the Ohio River. It provides the basis for white settlement, and stipulates that Native Americans’ land should never be taken from them without their consent.",
             codes:"BN", orgid:"1", source:"ksep: B28"},
            {date:"1803",
             text:"The South Carolina state legislature, which had been trying limit importation of slaves, reopens the slave trade with Latin America and the West Indies.",
             codes:"B", orgid:"1", source:"ksep: B36"},
            {date:"1804",
             text:"New Jersey passes an emancipation law. All states north of the Mason-Dixon Line now have laws forbidding slavery or providing for its gradual elimination.",
             codes:"B", orgid:"1", source:"ksep: B37"},
            {date:"1817",
             text:"Mississippi enters the union as a slave state. New York passes a gradual slavery abolition act.",
             codes:"B", orgid:"1", source:"ksep: B42"},
            {date:"1819",
             text:"Alabama enters the Union as a slave state.",
             codes:"B", orgid:"1", source:"ksep: B43"},
            {date:"1820",
             text:"The Missouri Compromise is enacted. It provides for Missouri’s entry into the Union as a slave state and Maine’s entry as a free state, making 12 of each in the U.S. All territory north of 36 30’ latitude declared free, and south of that latitude is open to slavery.",
             codes:"B", orgid:"1", source:"ksep: B44"},
            {date:"1829",
             text:"Slavery in Mexico is abolished",
             codes:"BL", orgid:"1", source:"ksep: L11"},
            {date:"1834",
             text:"Parliament abolishes slavery in the British empire. 700,000 slaves are liberated at a cost of 20 million British pounds sterling.",
             codes:"B", orgid:"1", source:"ksep: B52"},
            {date:"1836",
             text:"The U.S. House of Representatives adopts the “gag rule,” which prevents congressional action on anti-slavery resolutions of legislation.",
             codes:"BD", orgid:"1", source:"ksep: B53"},
            {date:"1845",
             text:"U.S. Congress overturns the “gag rule”. Texas is admitted to the Union as a slave state.",
             codes:"B", orgid:"1", source:"ksep: B57"},
            {date:"1859",
             text:"The last ship to bring slaves to the U.S., the Clothilde, arrives in Mobile Bay, Alabama.",
             codes:"BD", orgid:"1", source:"ksep: B63"},
            {date:"1865-12-06",
             text:"The 13th amendment is ratified, abolishing slavery in the United States.",
             codes:"B", orgid:"1", source:"ksep: B278"},
            {date:"1866-06-14",
             text:"The last treaty of a new round of treaties ending slavery in Indian Territory is signed by the Creek.",
             codes:"B", orgid:"1", source:"ksep: B279"}];


    function datapoints () {
        tlpts.forEach(function (pt, idx) {
            pt.instid = "slavery" + idx; });
        return tlpts;
    }


    function usmapTAC () {
        var html = [];
        app.svcommon.usmap().forEach(function (state) {
            html.push(["path", {
                id:state.id, d:state.d,
                onclick:jt.fs("app.slavery.stclick('" + state.id + "')"),
                onmouseover:jt.fs("app.slavery.stmsover('" + state.id + "')"),
                onmouseout:jt.fs("app.slavery.stmsout('" + state.id + "')"),
                fill:chart.colors.map.neutral}]); });
        html = ["svg", {id:"svgin", width:chart.ms.w, height:chart.ms.h,
                        viewBox:"0 0 959 593", preserveAspectRatio:"none"},
                ["g", {id:"outlines"},
                 html]];
        return html;
    }


    function initHTMLContent () {
        var k;
        chart.key = {w: 280, 
                     svg: {h:20}};
        chart.key.svg.w = chart.key.svg.w || chart.key.w;
        k = chart.key;
        k.yr = {start: tlpts[0].start.year, 
                end: tlpts[tlpts.length - 1].start.year};
        k.styles = {mdiv:"width:" + k.w + "px;margin:auto;text-align:center;",
                    ctrl:"display:inline-block;width:56px;height:40px;",
                    tspan:"line-height:40px;font-size:large;cursor:pointer;"};
        jt.out("suppvisdiv", jt.tac2html(
            [["div", {id:"keydiv", style:k.styles.mdiv + "position:relative;"},
              [["svg", {id:"keysvg", width:k.svg.w, height:k.svg.h}],
               ["div", {id:"tctrldiv", style:k.styles.mdiv},
                [["div", {id:"kcsdiv", style:k.styles.ctrl + "float:left;" +
                          "text-align:left;vertical-align:middle;"},
                  ["span", {cla:"tranctrl", style:k.styles.tspan,
                            onclick:jt.fs("app.slavery.selyear(" +
                                          k.yr.start + ")")},
                   k.yr.start]],
                 ["div", {id:"kcediv", style:k.styles.ctrl + "float:right;" +
                          "text-align:right;vertical-align:middle;"},
                  ["span", {cla:"tranctrl", style:k.styles.tspan,
                            onclick:jt.fs("app.slavery.selyear(" +
                                          k.yr.end + ")")},
                   k.yr.end]],
                 ["div", {id:"kcldiv", style:k.styles.ctrl},
                  ["img", {cla:"tranctrl", src:"img/backward.png",
                           onclick:jt.fs("app.slavery.transport('prev')")}]],
                 ["div", {id:"kcplaydiv", style:k.styles.ctrl},
                  ["img", {id:"playpause", cla:"tranctrl", src:"img/play.png",
                           onclick:jt.fs("app.slavery.transport('toggle')")}]],
                 ["div", {id:"kcrdiv", style:k.styles.ctrl},
                  ["img", {cla:"tranctrl", src:"img/forward.png",
                           onclick:jt.fs("app.slavery.transport('next')")}]]]],
               ["div", {id:"kyrdiv", style:"position:absolute;" +
                        "top:60px;left:0px;width:280px;min-height:26px;" + 
                        "padding:12px 0px 0px 0px;" +
                        "text-align:center;font-weight:bold;"},
                ""]]],  //"year"
             //text display container:
             ["div", {id:"kytdiv", style:"position:absolute;" + 
                                         "left:30px;top:120px;" +
                                         "margin-right:30px;" +
                                         "opacity:0.0;",
                      onclick:jt.fs("app.slavery.stunclick()")}],
             usmapTAC()]));
    }


    function displayTitle () {
        var mid, tg, delay = 3500, duration = 2000;
        mid = {x: Math.round(0.5 * 959),   //calculate from viewbox
               y: Math.round(0.35 * 593)};
        tg = d3.select("#svgin").append("g").attr("opacity", 1.0);
        tg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", mid.x)
            .attr("y", mid.y)
            .attr("font-size", 78)
            .attr("font-weight", "bold")
            .text("Legalized Chattel Slavery");
        tg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", mid.x)
            .attr("y", mid.y + 100)
            .attr("font-size", 64)
            .attr("font-weight", "bold")
            .text("By Region/State");
        tg.transition().delay(delay).duration(duration)
            .attr("opacity", 0.0)
            .remove();
        setTimeout(function () { app.slavery.transport("play"); },
                   delay + duration - 500);
    }


    function initDisplayElements () {
        var kh = 50, mid, ks;
        chart.ms = {w:tl.width2, h:Math.min((tl.height - kh), tl.width2)};
        initHTMLContent();
        ks = chart.key.svg;
        displayTitle();
        ks.x = d3.scaleLinear()
            .domain(d3.extent(tlpts, function (d) { return d.tc; }))
            .range([0, ks.w]);
        ks.g = d3.select("#keysvg").append("g");
        ks.g.append("rect")
            .attr("id", "progbarBackgroundRect")
            .attr("x", 0)
            .attr("y", 6)
            .attr("width", ks.w)
            .attr("height", ks.h)
            .style("fill", chart.colors.map.hover)
            .style("opacity", 0.2);
        ks.g.append("rect")
            .attr("id", "progrect")
            .attr("x", 0)
            .attr("y", 6)
            .attr("width", 0)
            .attr("height", ks.h)
            .style("fill", chart.colors.map.hover)
            .style("opacity", 0.8);
        ks.g.selectAll(".ksbar")
            .data(tlpts)
            .enter().append("rect")
            .attr("class", "ksbar")
            .attr("id", function (d) { return "kb" + d.cid; })
            .attr("x", function (d) { return ks.x(d.tc); })
            .attr("y", 6)  //unstick from top of div to make things balance
            .attr("width", 3)
            .attr("height", ks.h)
            .style("fill", chart.colors.map.slavery)
            .style("opacity", 0.2)
            .on("mouseover", function () { this.style.opacity = 1.0; })
            .on("mouseout", function () { this.style.opacity = 0.2; })
            .on("click", function (d) { app.slavery.selcid(d.cid); });
        mid = {x: Math.round(tl.width2 / 2) + tl.margin.left,
               y: Math.round(tl.height / 2) + tl.margin.top};
        d3.select("#suppvisdiv")
            .style("left", mid.x - 15 + "px")
            .style("top", mid.y - 15 + "px")
            .style("width", 30 + "px")
            .style("height", 30 + "px")
            .style("background", chart.colors.bg)
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px");
    }


    function initAnimationSequence () {
        var byy = {};   //display points by year
        //make sure there is a display point for each state's slavery
        //start and end years to drive the state color changes.
        sps.forEach(function (sp) {
            if(sp.start) {
                byy[sp.start] = {text:""};
                //technically it's the year after the end when it's over but
                //blink the state off on the year to reinforce the value.
                byy[sp.end] = {text:""}; } });
        //add the display points from the suppvis, overwriting the default
        //state toggle point to include display text.
        tlpts.forEach(function (pt) {
            byy[pt.start.year] = {text:pt.text, cid:pt.cid}; });
        //make a sorted array out of that to use as a sequence
        Object.keys(byy).forEach(function (year) {
            ani.tes.push({year:year, text:byy[year].text, 
                          cid:byy[year].cid}); });
        ani.tes.sort(function (a, b) {
            return a.year - b.year; });
        ani.idx = 0;
    }


    function markSlaveStates (year) {
        //technically there is still slavery during the ending year, but
        //doing all the endings year + 1 just makes it harder to follow
        //the date when it happened.
        sps.forEach(function (sp) {
            if(year >= sp.start && year < sp.end) {
                d3.select("#" + sp.state)
                    .transition().duration(600)
                    .style("fill", chart.colors.map.slavery); }
            else {
                d3.select("#" + sp.state)
                    .transition().duration(600)
                    .style("fill", chart.colors.map.neutral); } });
    }


    function updateProgressBar (year) {
        var idx = 0, pcnt;
        ani.tes.forEach(function (te) {
            if(te.year <= year) {
                idx += 1; } });
        pcnt = Math.round(idx * 100 / (ani.tes.length - 1)) / 100;
        d3.select("#progrect").transition().duration(500)
            .attr("width", Math.round(pcnt * chart.key.svg.w));
    }


    function displayPoint () {
        var wc = 1, te, fintext = "Click any state for details.";
        if(ani.timeout) {
            clearTimeout(ani.timeout); }
        ani.idx = Math.max(ani.idx, 0);
        if(ani.idx < ani.tes.length) {
            te = ani.tes[ani.idx];
            jt.out("kyrdiv", te.year);
            d3.select("#kyrdiv")
                .style("font-size", "10px")
                .transition().duration(500)
                .style("font-size", "24px");
            jt.out("kytdiv", te.text || "");
            d3.select("#kytdiv").transition().duration(500)
                .style("opacity", 1.0);
            markSlaveStates(te.year);
            updateProgressBar(te.year);
            if(te.text) {
                wc += te.text.split(" ").length; } }
        else {
            ani.styrtemp = jt.tac2html(
                ["a", {href:"#done", onclick:jt.fs("app.slavery.finish()")},
                 "Done"]);
            jt.out("kyrdiv", ani.styrtemp);
            jt.out("kytdiv", fintext);
            app.slavery.transport("pause");
            ani.idx = 0;  //reset to beginning they hit play again.
            app.slavery.stunclick(); }
        if(ani.playing) {
            ani.ww = ani.ww || ani.wbase;
            ani.timeout = setTimeout(function () {
                app.slavery.transport("next"); },
                                     Math.max(ani.wmin, wc * ani.ww) * 1000); }
    }


    function transport (command) {
        if(command === "toggle") {
            command = ani.playing? "pause" : "play"; }
        switch(command) {
        case "play":
            ani.playing = true;
            jt.byId("playpause").src = "img/pause.png";
            displayPoint();
            break;
        case "pause":
            ani.playing = false;
            jt.byId("playpause").src = "img/play.png";
            break;
        case "prev":
            ani.idx -= 1;
            displayPoint();
            break;
        case "next":
            ani.idx += 1;
            displayPoint();
            break;
        default:
            displayPoint(); }
    }


    function display (timeline, endfunc) {
        var ctx = {yr: 0, dy: 0, maxy: 0};
        stats = {startDate: new Date()};
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        tlpts.forEach(function (pt) {
            app.db.parseDate(pt);
            app.db.makeCoordinates(pt, ctx); });
        initDisplayElements();
        initAnimationSequence();
    }


    function displayPointById (cid) {
        var teindex = -1;
        ani.tes.forEach(function (te, idx) {
            if(cid === te.cid) {
                teindex = idx; } });
        if(teindex < 0) {
            jt.log("displayPointById: " + cid + " not found.");
            return; }
        ani.idx = teindex;
        displayPoint();
    }


    function displayPointByYear (year) {
        var teindex = 0;
        ani.tes.forEach(function (te, idx) {
            if(year >= te.year) { //track all interim to catch nearest year
                teindex = idx; } });
        ani.idx = teindex;
        displayPoint();
    }


    function stateUnclick () {
        //unclick all the states just in case they manage to click things
        //faster than the code cleans up
        sps.forEach(function (st) {
            jt.byId(st.state).style.fill = chart.colors.map.neutral; });
        if(ani.styrtemp) {
            jt.out("kyrdiv", ani.styrtemp); }
        d3.select("#kytdiv").transition().duration(1400).style("opacity", 0.0);
        ani.stateclicktimeout = setTimeout(function () { 
            jt.out("kytdiv", ""); }, 1400);
    }


    function stateClick (stid) {
        var stxt, wc, txtwait;
        if(ani.playing) {
            return; }
        if(ani.stateclicktimeout) {
            clearTimeout(ani.stateclicktimeout); }
        stateUnclick();
        clearTimeout(ani.stateclicktimeout);
        jt.byId(stid).style.fill = chart.colors.map.slavery;

        if(!ani.statename) {
            ani.statename = {};
            sps.forEach(function (st) {
                ani.statename[st.state] = st.name; }); }
        ani.styrtemp = jt.byId("kyrdiv").innerHTML;
        jt.out("kyrdiv", ani.statename[stid]);

        if(!ani.statetext) {
            ani.statetext = {};
            sps.forEach(function (st) {
                ani.statetext[st.state] = st.notes; }); }
        stxt = ani.statetext[stid];
        jt.out("kytdiv", stxt);
        d3.select("#kytdiv").transition().duration(300).style("opacity", 1.0);
        wc = stxt.split(" ").length;
        txtwait = Math.max(8, Math.round(wc * ani.wbase)) * 1000;
        jt.log("stateClick txtwait: " + txtwait);
        ani.stateclicktimeout = setTimeout(function () {
            stateUnclick(stid); }, txtwait);
    }


    function stateMouseOver (stid) {
        var st = jt.byId("kytdiv").innerHTML;
        if(!st) {
            jt.byId(stid).style.fill = chart.colors.map.hover; }
    }


    function stateMouseOut (stid) {
        var st = jt.byId("kytdiv").innerHTML;
        if(!st) {
            jt.byId(stid).style.fill = chart.colors.map.neutral; }
    }


    function finish () {
        //PENDING: ask some kind of a question to complete the viz.
        //possibly how long the longest status quo period was
        var date;
        if(!ani.finished) {
            ani.finished = true;
            date = new Date();
            stats.startstamp = app.db.wallClockTimeStamp(stats.startDate);
            stats.duration = app.db.getElapsedTime(date, stats.startDate);
            stats.visited = date.toISOString();
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    }


    return {
        display: function (tl, endf) { display(tl, endf); },
        transport: function (command) { transport(command); },
        selcid: function (cid) { displayPointById(cid); },
        selyear: function (year) { displayPointByYear(year); },
        stclick: function (stid) { stateClick(stid); },
        stunclick: function (stid) { stateUnclick(stid); },
        stmsover: function (stid) { stateMouseOver(stid); },
        stmsout: function (stid) { stateMouseOut(stid); },
        finish: function () { finish(); },
        datapoints: function () { return datapoints(); }
    };
}());

