/*jslint browser, multivar, white, fudge, this */
/*global app, window, jt, d3 */

app.slavery = (function () {
    "use strict";

    var sv = null,
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
                notes:"First slaves brought to Alabama aboard the Harriet"},
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
                notes:"By the time the Spanish took over parts of Wyoming in 1764, they had outlawed slavery of Native Americans. Lewis and Clark brought their slave York with them when they passed through.  Wyoming becomes a state in 1890 after slavery is illegal."}];


    function mapJSHTML () {
        var html;
        html = ["svg", {id:"svgin", width:chart.ms.w, height:chart.ms.h,
                        viewBox:"0 0 959 593", preserveAspectRatio:"none"},
                ["g", {id:"outlines"},
                 [["path", {id:"AK", onclick:jt.fs("app.slavery.stclick('AK')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('AK')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('AK')"),
                            fill:chart.colors.map.neutral, d:"M161.1,453.7 l-0.3,85.4 1.6,1 3.1,0.2 1.5,-1.1 h2.6 l0.2,2.9 7,6.8 0.5,2.6 3.4,-1.9 0.6,-0.2 0.3,-3.1 1.5,-1.6 1.1,-0.2 1.9,-1.5 3.1,2.1 0.6,2.9 1.9,1.1 1.1,2.4 3.9,1.8 3.4,6 2.7,3.9 2.3,2.7 1.5,3.7 5,1.8 5.2,2.1 1,4.4 0.5,3.1 -1,3.4 -1.8,2.3 -1.6,-0.8 -1.5,-3.1 -2.7,-1.5 -1.8,-1.1 -0.8,0.8 1.5,2.7 0.2,3.7 -1.1,0.5 -1.9,-1.9 -2.1,-1.3 0.5,1.6 1.3,1.8 -0.8,0.8 c0,0 -0.8,-0.3 -1.3,-1 -0.5,-0.6 -2.1,-3.4 -2.1,-3.4 l-1,-2.3 c0,0 -0.3,1.3 -1,1 -0.6,-0.3 -1.3,-1.5 -1.3,-1.5 l1.8,-1.9 -1.5,-1.5 v-5 h-0.8 l-0.8,3.4 -1.1,0.5 -1,-3.7 -0.6,-3.7 -0.8,-0.5 0.3,5.7 v1.1 l-1.5,-1.3 -3.6,-6 -2.1,-0.5 -0.6,-3.7 -1.6,-2.9 -1.6,-1.1 v-2.3 l2.1,-1.3 -0.5,-0.3 -2.6,0.6 -3.4,-2.4 -2.6,-2.9 -4.8,-2.6 -4,-2.6 1.3,-3.2 v-1.6 l-1.8,1.6 -2.9,1.1 -3.7,-1.1 -5.7,-2.4 h-5.5 l-0.6,0.5 -6.5,-3.9 -2.1,-0.3 -2.7,-5.8 -3.6,0.3 -3.6,1.5 0.5,4.5 1.1,-2.9 1,0.3 -1.5,4.4 3.2,-2.7 0.6,1.6 -3.9,4.4 -1.3,-0.3 -0.5,-1.9 -1.3,-0.8 -1.3,1.1 -2.7,-1.8 -3.1,2.1 -1.8,2.1 -3.4,2.1 -4.7,-0.2 -0.5,-2.1 3.7,-0.6 v-1.3 l-2.3,-0.6 1,-2.4 2.3,-3.9 v-1.8 l0.2,-0.8 4.4,-2.3 1,1.3 h2.7 l-1.3,-2.6 -3.7,-0.3 -5,2.7 -2.4,3.4 -1.8,2.6 -1.1,2.3 -4.2,1.5 -3.1,2.6 -0.3,1.6 2.3,1 0.8,2.1 -2.7,3.2 -6.5,4.2 -7.8,4.2 -2.1,1.1 -5.3,1.1 -5.3,2.3 1.8,1.3 -1.5,1.5 -0.5,1.1 -2.7,-1 -3.2,0.2 -0.8,2.3 h-1 l0.3,-2.4 -3.6,1.3 -2.9,1 -3.4,-1.3 -2.9,1.9 h-3.2 l-2.1,1.3 -1.6,0.8 -2.1,-0.3 -2.6,-1.1 -2.3,0.6 -1,1 -1.6,-1.1 v-1.9 l3.1,-1.3 6.3,0.6 4.4,-1.6 2.1,-2.1 2.9,-0.6 1.8,-0.8 2.7,0.2 1.6,1.3 1,-0.3 2.3,-2.7 3.1,-1 3.4,-0.6 1.3,-0.3 0.6,0.5 h0.8 l1.3,-3.7 4,-1.5 1.9,-3.7 2.3,-4.5 1.6,-1.5 0.3,-2.6 -1.6,1.3 -3.4,0.6 -0.6,-2.4 -1.3,-0.3 -1,1 -0.2,2.9 -1.5,-0.2 -1.5,-5.8 -1.3,1.3 -1.1,-0.5 -0.3,-1.9 -4,0.2 -2.1,1.1 -2.6,-0.3 1.5,-1.5 0.5,-2.6 -0.6,-1.9 1.5,-1 1.3,-0.2 -0.6,-1.8 v-4.4 l-1,-1 -0.8,1.5 h-6.1 l-1.5,-1.3 -0.6,-3.9 -2.1,-3.6 v-1 l2.1,-0.8 0.2,-2.1 1.1,-1.1 -0.8,-0.5 -1.3,0.5 -1.1,-2.7 1,-5 4.5,-3.2 2.6,-1.6 1.9,-3.7 2.7,-1.3 2.6,1.1 0.3,2.4 2.4,-0.3 3.2,-2.4 1.6,0.6 1,0.6 h1.6 l2.3,-1.3 0.8,-4.4 c0,0 0.3,-2.9 1,-3.4 0.6,-0.5 1,-1 1,-1 l-1.1,-1.9 -2.6,0.8 -3.2,0.8 -1.9,-0.5 -3.6,-1.8 -5,-0.2 -3.6,-3.7 0.5,-3.9 0.6,-2.4 -2.1,-1.8 -1.9,-3.7 0.5,-0.8 6.8,-0.5 h2.1 l1,1 h0.6 l-0.2,-1.6 3.9,-0.6 2.6,0.3 1.5,1.1 -1.5,2.1 -0.5,1.5 2.7,1.6 5,1.8 1.8,-1 -2.3,-4.4 -1,-3.2 1,-0.8 -3.4,-1.9 -0.5,-1.1 0.5,-1.6 -0.8,-3.9 -2.9,-4.7 -2.4,-4.2 2.9,-1.9 h3.2 l1.8,0.6 4.2,-0.2 3.7,-3.6 1.1,-3.1 3.7,-2.4 1.6,1 2.7,-0.6 3.7,-2.1 1.1,-0.2 1,0.8 4.5,-0.2 2.7,-3.1 h1.1 l3.6,2.4 1.9,2.1 -0.5,1.1 0.6,1.1 1.6,-1.6 3.9,0.3 0.3,3.7 1.9,1.5 7.1,0.6 6.3,4.2 1.5,-1 5.2,2.6 2.1,-0.6 1.9,-0.8 4.8,1.9z m-115.1,28.9 2.1,5.3 -0.2,1 -2.9,-0.3 -1.8,-4 -1.8,-1.5 h-2.4 l-0.2,-2.6 1.8,-2.4 1.1,2.4 1.5,1.5z m-2.6,33.5 3.7,0.8 3.7,1 0.8,1 -1.6,3.7 -3.1,-0.2 -3.4,-3.6z m-20.7,-14.1 1.1,2.6 1.1,1.6 -1.1,0.8 -2.1,-3.1 v-1.9z m-13.7,73.1 3.4,-2.3 3.4,-1 2.6,0.3 0.5,1.6 1.9,0.5 1.9,-1.9 -0.3,-1.6 2.7,-0.6 2.9,2.6 -1.1,1.8 -4.4,1.1 -2.7,-0.5 -3.7,-1.1 -4.4,1.5 -1.6,0.3z m48.9,-4.5 1.6,1.9 2.1,-1.6 -1.5,-1.3z m2.9,3 1.1,-2.3 2.1,0.3 -0.8,1.9 h-2.4z m23.6,-1.9 1.5,1.8 1,-1.1 -0.8,-1.9z m8.8,-12.5 1.1,5.8 2.9,0.8 5,-2.9 4.4,-2.6 -1.6,-2.4 0.5,-2.4 -2.1,1.3 -2.9,-0.8 1.6,-1.1 1.9,0.8 3.9,-1.8 0.5,-1.5 -2.4,-0.8 0.8,-1.9 -2.7,1.9 -4.7,3.6 -4.8,2.9z m42.3,-19.8 2.4,-1.5 -1,-1.8 -1.8,1z"}],
                  ["path", {id:"HI", onclick:jt.fs("app.slavery.stclick('HI')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('HI')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('HI')"),
                            fill:chart.colors.map.neutral, d:"M233.1,519.3 l1.9,-3.6 2.3,-0.3 0.3,0.8 -2.1,3.1z m10.2,-3.7 6.1,2.6 2.1,-0.3 1.6,-3.9 -0.6,-3.4 -4.2,-0.5 -4,1.8z m30.7,10 3.7,5.5 2.4,-0.3 1.1,-0.5 1.5,1.3 3.7,-0.2 1,-1.5 -2.9,-1.8 -1.9,-3.7 -2.1,-3.6 -5.8,2.9z m20.2,8.9 1.3,-1.9 4.7,1 0.6,-0.5 6.1,0.6 -0.3,1.3 -2.6,1.5 -4.4,-0.3z m5.3,5.2 1.9,3.9 3.1,-1.1 0.3,-1.6 -1.6,-2.1 -3.7,-0.3z m7,-1.2 2.3,-2.9 4.7,2.4 4.4,1.1 4.4,2.7 v1.9 l-3.6,1.8 -4.8,1 -2.4,-1.5z m16.6,15.6 1.6,-1.3 3.4,1.6 7.6,3.6 3.4,2.1 1.6,2.4 1.9,4.4 4,2.6 -0.3,1.3 -3.9,3.2 -4.2,1.5 -1.5,-0.6 -3.1,1.8 -2.4,3.2 -2.3,2.9 -1.8,-0.2 -3.6,-2.6 -0.3,-4.5 0.6,-2.4 -1.6,-5.7 -2.1,-1.8 -0.2,-2.6 2.3,-1 2.1,-3.1 0.5,-1 -1.6,-1.8z"}],
                  ["path", {id:"AL", onclick:jt.fs("app.slavery.stclick('AL')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('AL')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('AL')"),
                            fill:chart.colors.map.neutral, d:"M628.5,466.4 l0.6,0.2 1.3,-2.7 1.5,-4.4 2.3,0.6 3.1,6 v1 l-2.7,1.9 2.7,0.3 5.2,-2.5 -0.3,-7.6 -2.5,-1.8 -2,-2 0.4,-4 10.5,-1.5 25.7,-2.9 6.7,-0.6 5.6,0.1 -0.5,-2.2 -1.5,-0.8 -0.9,-1.1 1,-2.6 -0.4,-5.2 -1.6,-4.5 0.8,-5.1 1.7,-4.8 -0.2,-1.7 -1.8,-0.7 -0.5,-3.6 -2.7,-3.4 -2,-6.5 -1.4,-6.7 -1.8,-5 -3.8,-16 -3.5,-7.9 -0.8,-5.6 0.1,-2.2 -9,0.8 -23.4,2.2 -12.2,0.8 -0.2,6.4 0.2,16.7 -0.7,31 -0.3,14.1 2.8,18.8 1.6,14.7z"}],
                  ["path", {id:"AR", onclick:jt.fs("app.slavery.stclick('AR')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('AR')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('AR')"),
                            fill:chart.colors.map.neutral, d:"M587.3,346.1 l-6.4,-0.7 0.9,-3.1 3.1,-2.6 0.6,-2.3 -1.8,-2.9 -31.9,1.2 -23.3,0.7 -23.6,0.3 1.5,6.9 0.1,8.5 1.4,10.9 0.3,38.2 2.1,1.6 3,-1.2 2.9,1.2 0.4,10.1 25.2,-0.2 26.8,-0.8 0.9,-1.9 -0.3,-3.8 -1.7,-3.1 1.5,-1.4 -1.4,-2.2 0.7,-2.4 1.1,-5.9 2.7,-2.3 -0.8,-2.2 4,-5.6 2.5,-1.1 -0.1,-1.7 -0.5,-1.7 2.9,-5.8 2.5,-1.1 0.2,-3.3 2.1,-1.4 0.9,-4.1 -1.4,-4 4.2,-2.4 0.3,-2.1 1.2,-4.2 0.9,-3.1z"}],
                  ["path", {id:"AZ", onclick:jt.fs("app.slavery.stclick('AZ')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('AZ')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('AZ')"),
                            fill:chart.colors.map.neutral, d:"M135.1,389.7 l-0.3,1.5 0.5,1 18.9,10.7 12.1,7.6 14.7,8.6 16.8,10 12.3,2.4 25.4,2.7 6,-39.6 7,-53.1 4.4,-31 -24.6,-3.6 -60.7,-11 -0.2,1.1 -2.6,16.5 -2.1,3.8 -2.8,-0.2 -1.2,-2.6 -2.6,-0.4 -1.2,-1.1 -1.1,0.1 -2.1,1.7 -0.3,6.8 -0.3,1.5 -0.5,12.5 -1.5,2.4 -0.4,3.3 2.8,5 1.1,5.5 0.7,1.1 1.1,0.9 -0.4,2.4 -1.7,1.2 -3.4,1.6 -1.6,1.8 -1.6,3.6 -0.5,4.9 -3,2.9 -1.9,0.9 -0.1,5.8 -0.6,1.6 0.5,0.8 3.9,0.4 -0.9,3 -1.7,2.4 -3.7,0.4z"}],
                  ["path", {id:"CA", onclick:jt.fs("app.slavery.stclick('CA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('CA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('CA')"),
                            fill:chart.colors.map.neutral, d:"M122.7,385.9 l-19.7,-2.7 -10,-1.5 -0.5,-1.8 v-9.4 l-0.3,-3.2 -2.6,-4.2 -0.8,-2.3 -3.9,-4.2 -2.9,-4.7 -2.7,-0.2 -3.2,-0.8 -0.3,-1 1.5,-0.6 -0.6,-3.2 -1.5,-2.1 -4.8,-0.8 -3.9,-2.1 -1.1,-2.3 -2.6,-4.8 -2.9,-3.1 h-2.9 l-3.9,-2.1 -4.5,-1.8 -4.2,-0.5 -2.4,-2.7 0.5,-1.9 1.8,-7.1 0.8,-1.9 v-2.4 l-1.6,-1 -0.5,-2.9 -1.5,-2.6 -3.4,-5.8 -1.3,-3.1 -1.5,-4.7 -1.6,-5.3 -3.2,-4.4 -0.5,-2.9 0.8,-3.9 h1.1 l2.1,-1.6 1.1,-3.6 -1,-2.7 -2.7,-0.5 -1.9,-2.6 -2.1,-3.7 -0.2,-8.2 0.6,-1.9 0.6,-2.3 0.5,-2.4 -5.7,-6.3 v-2.1 l0.3,-0.5 0.3,-3.2 -1.3,-4 -2.3,-4.8 -2.7,-4.5 -1.8,-3.9 1,-3.7 0.6,-5.8 1.8,-3.1 0.3,-6.5 -1.1,-3.6 -1.6,-4.2 -2.7,-4.2 0.8,-3.2 1.5,-4.2 1.8,-0.8 0.3,-1.1 3.1,-2.6 5.2,-11.8 0.2,-7.4 1.69,-4.9 38.69,11.8 25.6,6.6 -8,31.3 -8.67,33.1 12.63,19.2 42.16,62.3 17.1,26.1 -0.4,3.1 2.8,5.2 1.1,5.4 1,1.5 0.7,0.6 -0.2,1.4 -1.4,1 -3.4,1.6 -1.9,2.1 -1.7,3.9 -0.5,4.7 -2.6,2.5 -2.3,1.1 -0.1,6.2 -0.6,1.9 1,1.7 3,0.3 -0.4,1.6 -1.4,2 -3.9,0.6z m-73.9,-48.9 1.3,1.5 -0.2,1.3 -3.2,-0.1 -0.6,-1.2 -0.6,-1.5z m1.9,0 1.2,-0.6 3.6,2.1 3.1,1.2 -0.9,0.6 -4.5,-0.2 -1.6,-1.6z m20.7,19.8 1.8,2.3 0.8,1 1.5,0.6 0.6,-1.5 -1,-1.8 -2.7,-2 -1.1,0.2 v1.2z m-1.4,8.7 1.8,3.2 1.2,1.9 -1.5,0.2 -1.3,-1.2 c0,0 -0.7,-1.5 -0.7,-1.9 0,-0.4 0,-2.2 0,-2.2z"}],
                  ["path", {id:"CO", onclick:jt.fs("app.slavery.stclick('CO')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('CO')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('CO')"),
                            fill:chart.colors.map.neutral, d:"M380.2,235.5 l-36,-3.5 -79.1,-8.6 -2.2,22.1 -7,50.4 -1.9,13.7 34,3.9 37.5,4.4 34.7,3 14.3,0.6z"}],
                  ["path", {id:"CT", onclick:jt.fs("app.slavery.stclick('CT')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('CT')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('CT')"),
                            fill:chart.colors.map.neutral, d:"M852,190.9 l3.6,-3.2 1.9,-2.1 0.8,0.6 2.7,-1.5 5.2,-1.1 7,-3.5 -0.6,-4.2 -0.8,-4.4 -1.6,-6 -4.3,1.1 -21.8,4.7 0.6,3.1 1.5,7.3 v8.3 l-0.9,2.1 1.7,2.2z"}],
                  ["path", {id:"DE", onclick:jt.fs("app.slavery.stclick('DE')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('DE')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('DE')"),
                            fill:chart.colors.map.neutral, d:"M834.4,247.2 l-1,0.5 -3.6,-2.4 -1.8,-4.7 -1.9,-3.6 -2.3,-1 -2.1,-3.6 0.5,-2 0.5,-2.3 0.1,-1.1 -0.6,0.1 -1.7,1 -2,1.7 -0.2,0.3 1.4,4.1 2.3,5.6 3.7,16.1 5,-0.3 6,-1.1z"}],
                  ["path", {id:"FL", onclick:jt.fs("app.slavery.stclick('FL')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('FL')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('FL')"),
                            fill:chart.colors.map.neutral, d:"M750.2,445.2 l-5.2,-0.7 -0.7,0.8 1.5,4.4 -0.4,5.2 -4.1,-1 -0.2,-2.8 h-4.1 l-5.3,0.7 -32.4,1.9 -8.2,-0.3 -1.7,-1.7 -2.5,-4.2 h-5.9 l-6.6,0.5 -35.4,4.2 -0.3,2.8 1.6,1.6 2.9,2 0.3,8.4 3.3,-0.6 6,-2.1 6,-0.5 4.4,-0.6 7.6,1.8 8.1,3.9 1.6,1.5 2.9,1.1 1.6,1.9 0.3,2.7 3.2,-1.3 h3.9 l3.6,-1.9 3.7,-3.6 3.1,0.2 0.5,-1.1 -0.8,-1 0.2,-1.9 4,-0.8 h2.6 l2.9,1.5 4.2,1.5 2.4,3.7 2.7,1 1.1,3.4 3.4,1.6 1.6,2.6 1.9,0.6 5.2,1.3 1.3,3.1 3,3.7 v9.5 l-1.5,4.7 0.3,2.7 1.3,4.8 1.8,4 0.8,-0.5 1.5,-4.5 -2.6,-1 -0.3,-0.6 1.6,-0.6 4.5,1 0.2,1.6 -3.2,5.5 -2.1,2.4 3.6,3.7 2.6,3.1 2.9,5.3 2.9,3.9 2.1,5 1.8,0.3 1.6,-2.1 1.8,1.1 2.6,4 0.6,3.6 3.1,4.4 0.8,-1.3 3.9,0.3 3.6,2.3 3.4,5.2 0.8,3.4 0.3,2.9 1.1,1 1.3,0.5 2.4,-1 1.5,-1.6 3.9,-0.2 3.1,-1.5 2.7,-3.2 -0.5,-1.9 -0.3,-2.4 0.6,-1.9 -0.3,-1.9 2.4,-1.3 0.3,-3.4 -0.6,-1.8 -0.5,-12 -1.3,-7.6 -4.5,-8.2 -3.6,-5.8 -2.6,-5.3 -2.9,-2.9 -2.9,-7.4 0.7,-1.4 1.1,-1.3 -1.6,-2.9 -4,-3.7 -4.8,-5.5 -3.7,-6.3 -5.3,-9.4 -3.7,-9.7 -2.3,-7.3z m17.7,132.7 2.4,-0.6 1.3,-0.2 1.5,-2.3 2.3,-1.6 1.3,0.5 1.7,0.3 0.4,1.1 -3.5,1.2 -4.2,1.5 -2.3,1.2z m13.5,-5 1.2,1.1 2.7,-2.1 5.3,-4.2 3.7,-3.9 2.5,-6.6 1,-1.7 0.2,-3.4 -0.7,0.5 -1,2.8 -1.5,4.6 -3.2,5.3 -4.4,4.2 -3.4,1.9z"}],
                  ["path", {id:"GA", onclick:jt.fs("app.slavery.stclick('GA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('GA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('GA')"),
                            fill:chart.colors.map.neutral, d:"M750.2,444.2 l-5.6,-0.7 -1.4,1.6 1.6,4.7 -0.3,3.9 -2.2,-0.6 -0.2,-3 h-5.2 l-5.3,0.7 -32.3,1.9 -7.7,-0.3 -1.4,-1.2 -2.5,-4.3 -0.8,-3.3 -1.6,-0.9 -0.5,-0.5 0.9,-2.2 -0.4,-5.5 -1.6,-4.5 0.8,-4.9 1.7,-4.8 -0.2,-2.5 -1.9,-0.7 -0.4,-3.2 -2.8,-3.5 -1.9,-6.2 -1.5,-7 -1.7,-4.8 -3.8,-16 -3.5,-8 -0.8,-5.3 0.1,-2.3 3.3,-0.3 13.6,-1.6 18.6,-2 6.3,-1.1 0.5,1.4 -2.2,0.9 -0.9,2.2 0.4,2 1.4,1.6 4.3,2.7 3.2,-0.1 3.2,4.7 0.6,1.6 2.3,2.8 0.5,1.7 4.7,1.8 3,2.2 2.3,3 2.3,1.3 2,1.8 1.4,2.7 2.1,1.9 4.1,1.8 2.7,6 1.7,5.1 2.8,0.7 2.1,1.9 2,5.7 2.9,1.6 1.7,-0.8 0.4,1.2 -3.3,6.2 0.5,2.6 -1.5,4.2 -2.3,10 0.8,6.3z"}],
                  ["path", {id:"IA", onclick:jt.fs("app.slavery.stclick('IA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('IA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('IA')"),
                            fill:chart.colors.map.neutral, d:"M556.8,183.6 l2.1,2.1 0.3,0.7 -2,3 0.3,4 2.6,4.1 3.1,1.6 2.4,0.3 0.9,1.8 0.2,2.4 2.5,1 0.9,1.1 0.5,1.6 3.8,3.3 0.6,1.9 -0.7,3 -1.7,3.7 -0.6,2.4 -2.1,1.6 -1.6,0.5 -5.7,1.5 -1.6,4.8 0.8,1.8 1.7,1.5 -0.2,3.5 -1.9,1.4 -0.7,1.8 v2.4 l-1.4,0.4 -1.7,1.4 -0.5,1.7 0.4,1.7 -1.3,1 -2.3,-2.7 -1.4,-2.8 -8.3,0.8 -10,0.6 -49.2,1.2 -1.6,-4.3 -0.4,-6.7 -1.4,-4.2 -0.7,-5.2 -2.2,-3.7 -1,-4.6 -2.7,-7.8 -1.1,-5.6 -1.4,-1.9 -1.3,-2.9 1.7,-3.8 1.2,-6.1 -2.7,-2.2 -0.3,-2.4 0.7,-2.4 1.8,-0.3 61.1,-0.6 21.2,-0.7z"}],
                  ["path", {id:"ID", onclick:jt.fs("app.slavery.stclick('ID')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('ID')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('ID')"),
                            fill:chart.colors.map.neutral, d:"M175.3,27.63 l-4.8,17.41 -4.5,20.86 -3.4,16.22 -0.4,9.67 1.2,4.44 3.5,2.66 -0.2,3.91 -3.9,4.4 -4.5,6.6 -0.9,2.9 -1.2,1.1 -1.8,0.8 -4.3,5.3 -0.4,3.1 -0.4,1.1 0.6,1 2.6,-0.1 1.1,2.3 -2.4,5.8 -1.2,4.2 -8.8,35.3 20.7,4.5 39.5,7.9 34.8,6.1 4.9,-29.2 3.8,-24.1 -2.7,-2.4 -0.4,-2.6 -0.8,-1.1 -2.1,1 -0.7,2.6 -3.2,0.5 -3.9,-1.6 -3.8,0.1 -2.5,0.7 -3.4,-1.5 -2.4,0.2 -2.4,2 -2,-1.1 -0.7,-4 0.7,-2.9 -2.5,-2.9 -3.3,-2.6 -2.7,-13.1 -0.1,-4.7 -0.3,-0.1 -0.2,0.4 -5.1,3.5 -1.7,-0.2 -2.9,-3.4 -0.2,-3.1 7,-17.13 -0.4,-1.94 -3.4,-1.15 -0.6,-1.18 -2.6,-3.46 -4.6,-10.23 -3.2,-1.53 -2,-4.95 1.3,-4.63 -3.2,-7.58 4.4,-21.52z"}],
                  ["path", {id:"IL", onclick:jt.fs("app.slavery.stclick('IL')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('IL')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('IL')"),
                            fill:chart.colors.map.neutral, d:"M618.7,214.3 l-0.8,-2.6 -1.3,-3.7 -1.6,-1.8 -1.5,-2.6 -0.4,-5.5 -15.9,1.8 -17.4,1 h-12.3 l0.2,2.1 2.2,0.9 1.1,1.4 0.4,1.4 3.9,3.4 0.7,2.4 -0.7,3.3 -1.7,3.7 -0.8,2.7 -2.4,1.9 -1.9,0.6 -5.2,1.3 -1.3,4.1 0.6,1.1 1.9,1.8 -0.2,4.3 -2.1,1.6 -0.5,1.3 v2.8 l-1.8,0.6 -1.4,1.2 -0.4,1.2 0.4,2 -1.6,1.3 -0.9,2.8 0.3,3.9 2.3,7 7,7.6 5.7,3.7 v4.4 l0.7,1.2 6.6,0.6 2.7,1.4 -0.7,3.5 -2.2,6.2 -0.8,3 2,3.7 6.4,5.3 4.8,0.8 2.2,5.1 2,3.4 -0.9,2.8 1.5,3.8 1.7,2.1 1.6,-0.3 1,-2.2 2.4,-1.7 2.8,-1 6.1,2.5 0.5,-0.2 v-1.1 l-1.2,-2.7 0.4,-2.8 2.4,-1.6 3.4,-1.2 -0.5,-1.3 -0.8,-2 1.2,-1.3 1,-2.7 v-4 l0.4,-4.9 2.5,-3 1.8,-3.8 2.5,-4 -0.5,-5.3 -1.8,-3.2 -0.3,-3.3 0.8,-5.3 -0.7,-7.2 -1.1,-15.8 -1.4,-15.3 -0.9,-11.7z"}],
                  ["path", {id:"IN", onclick:jt.fs("app.slavery.stclick('IN')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('IN')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('IN')"),
                            fill:chart.colors.map.neutral, d:"M622.9,216.1 l1.5,1 1.1,-0.3 2.1,-1.9 2.5,-1.8 14.3,-1.1 18.4,-1.8 1.6,15.5 4.9,42.6 -0.6,2.9 1.3,1.6 0.2,1.3 -2.3,1.6 -3.6,1.7 -3.2,0.4 -0.5,4.8 -4.7,3.6 -2.9,4 0.2,2.4 -0.5,1.4 h-3.5 l-1.4,-1.7 -5.2,3 0.2,3.1 -0.9,0.2 -0.5,-0.9 -2.4,-1.7 -3.6,1.5 -1.4,2.9 -1.2,-0.6 -1.6,-1.8 -4.4,0.5 -5.7,1 -2.5,1.3 v-2.6 l0.4,-4.7 2.3,-2.9 1.8,-3.9 2.7,-4.2 -0.5,-5.8 -1.8,-3.1 -0.3,-3.2 0.8,-5.3 -0.7,-7.1 -0.9,-12.6 -2.5,-30.1z"}],
                  ["path", {id:"KS", onclick:jt.fs("app.slavery.stclick('KS')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('KS')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('KS')"),
                            fill:chart.colors.map.neutral, d:"M485.9,259.5 l-43.8,-0.6 -40.6,-1.2 -21.7,-0.9 -4.3,64.8 24.3,1 44.7,2.1 46.3,0.6 12.6,-0.3 0.7,-35 -1.2,-11.1 -2.5,-2 -2.4,-3 -2.3,-3.6 0.6,-3 1.7,-1.4 v-2.1 l-0.8,-0.7 -2.6,-0.2 -3.5,-3.4z"}],
                  ["path", {id:"KY", onclick:jt.fs("app.slavery.stclick('KY')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('KY')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('KY')"),
                            fill:chart.colors.map.neutral, d:"M607.2,331.8 l12.6,-0.7 0.1,-4.1 h4.3 l30.4,-3.2 45.1,-4.3 5.6,-3.6 3.9,-2.1 0.1,-1.9 6,-7.8 4.1,-3.6 2.1,-2.4 -3.3,-2 -2.5,-2.7 -3,-3.8 -0.5,-2.2 -2.6,-1.4 -0.9,-1.9 -0.2,-6.1 -2.6,-2 -1.9,-1.1 -0.5,-2.3 -1.3,0.2 -2,1.2 -2.5,2.7 -1.9,-1.7 -2.5,-0.5 -2.4,1.4 h-2.3 l-1.8,-2 -5.6,-0.1 -1.8,-4.5 -2.9,-1.5 -2.1,0.8 -4.2,0.2 -0.5,2.1 1.2,1.5 0.3,2.1 -2.8,2 -3.8,1.8 -2.6,0.4 -0.5,4.5 -4.9,3.6 -2.6,3.7 0.2,2.2 -0.9,2.3 -4.5,-0.1 -1.3,-1.3 -3.9,2.2 0.2,3.3 -2.4,0.6 -0.8,-1.4 -1.7,-1.2 -2.7,1.1 -1.8,3.5 -2.2,-1 -1.4,-1.6 -3.7,0.4 -5.6,1 -2.8,1.3 -1.2,3.4 -1,1 1.5,3.7 -4.2,1.4 -1.9,1.4 -0.4,2.2 1.2,2.4 v2.2 l-1.6,0.4 -6.1,-2.5 -2.3,0.9 -2,1.4 -0.8,1.8 1.7,2.4 -0.9,1.8 -0.1,3.3 -2.4,1.3 -2.1,1.7z"}],
                  ["path", {id:"LA", onclick:jt.fs("app.slavery.stclick('LA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('LA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('LA')"),
                            fill:chart.colors.map.neutral, d:"M526.9,485.9 l8.1,-0.3 10.3,3.6 6.5,1.1 3.7,-1.5 3.2,1.1 3.2,1 0.8,-2.1 -3.2,-1.1 -2.6,0.5 -2.7,-1.6 0.8,-1.5 3.1,-1 1.8,1.5 1.8,-1 3.2,0.6 1.5,2.4 0.3,2.3 4.5,0.3 1.8,1.8 -0.8,1.6 -1.3,0.8 1.6,1.6 8.4,3.6 3.6,-1.3 1,-2.4 2.6,-0.6 1.8,-1.5 1.3,1 0.8,2.9 -2.3,0.8 0.6,0.6 3.4,-1.3 2.3,-3.4 0.8,-0.5 -2.1,-0.3 0.8,-1.6 -0.2,-1.5 2.1,-0.5 1.1,-1.3 0.6,0.8 0.6,3.1 4.2,0.6 4,1.9 1,1.5 h2.9 l1.1,1 2.3,-3.1 v-1.5 h-1.3 l-3.4,-2.7 -5.8,-0.8 -3.2,-2.3 1.1,-2.7 2.3,0.3 0.2,-0.6 -1.8,-1 v-0.5 h3.2 l1.8,-3.1 -1.3,-1.9 -0.3,-2.7 -1.5,0.2 -1.9,2.1 -0.6,2.6 -3.1,-0.6 -1,-1.8 1.8,-1.9 1.9,-1.7 -2.2,-6.5 -3.4,-3.4 1,-7.3 -0.2,-0.5 -1.3,0.2 -33.1,1.4 -0.8,-2.4 0.8,-8.5 8.6,-14.8 -0.9,-2.6 1.4,-0.4 0.4,-2 -2.2,-2 0.1,-1.9 -2,-4.5 -0.4,-5.1 0.1,-0.7 -26.4,0.8 -25.2,0.1 0.4,9.7 0.7,9.5 0.5,3.7 2.6,4.5 0.9,4.4 4.3,6 0.3,3.1 0.6,0.8 -0.7,8.3 -2.8,4.6 1.2,2.4 -0.5,2.6 -0.8,7.3 -1.3,3 0.2,3.7z"}],
                  ["path", {id:"MA", onclick:jt.fs("app.slavery.stclick('MA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MA')"),
                            fill:chart.colors.map.neutral, d:"M887.5,172.5 l-0.5,-2.3 0.8,-1.5 2.9,-1.5 0.8,3.1 -0.5,1.8 -2.4,1.5 v1 l1.9,-1.5 3.9,-4.5 3.9,-1.9 4.2,-1.5 -0.3,-2.4 -1,-2.9 -1.9,-2.4 -1.8,-0.8 -2.1,0.2 -0.5,0.5 1,1.3 1.5,-0.8 2.1,1.6 0.8,2.7 -1.8,1.8 -2.3,1 -3.6,-0.5 -3.9,-6 -2.3,-2.6 h-1.8 l-1.1,0.8 -1.9,-2.6 0.3,-1.5 2.4,-5.2 -2.9,-4.4 -3.7,1.8 -1.8,2.9 -18.3,4.7 -13.8,2.5 -0.6,10.6 0.7,4.9 22,-4.8 11.2,-2.8 2,1.6 3.4,4.3 2.9,4.7z m12.5,1.4 2.2,-0.7 0.5,-1.7 1,0.1 1,2.3 -1.3,0.5 -3.9,0.1z m-9.4,0.8 2.3,-2.6 h1.6 l1.8,1.5 -2.4,1 -2.2,1z"}],
                  ["path", {id:"MD", onclick:jt.fs("app.slavery.stclick('MD')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MD')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MD')"),
                            fill:chart.colors.map.neutral, d:"M834.8,264.1 l1.7,-3.8 0.5,-4.8 -6.3,1.1 -5.8,0.3 -3.8,-16.8 -2.3,-5.5 -1.5,-4.6 -22.2,4.3 -37.6,7.6 2,10.4 4.8,-4.9 2.5,-0.7 1.4,-1.5 1.8,-2.7 1.6,0.7 2.6,-0.2 2.6,-2.1 2,-1.5 2.1,-0.6 1.5,1.1 2.7,1.4 1.9,1.8 1.3,1.4 4.8,1.6 -0.6,2.9 5.8,2.1 2.1,-2.6 3.7,2.5 -2.1,3.3 -0.7,3.3 -1.8,2.6 v2.1 l0.3,0.8 2,1.3 3.4,1.1 4.3,-0.1 3.1,1 2.1,0.3 1,-2.1 -1.5,-2.1 v-1.8 l-2.4,-2.1 -2.1,-5.5 1.3,-5.3 -0.2,-2.1 -1.3,-1.3 c0,0 1.5,-1.6 1.5,-2.3 0,-0.6 0.5,-2.1 0.5,-2.1 l1.9,-1.3 1.9,-1.6 0.5,1 -1.5,1.6 -1.3,3.7 0.3,1.1 1.8,0.3 0.5,5.5 -2.1,1 0.3,3.6 0.5,-0.2 1.1,-1.9 1.6,1.8 -1.6,1.3 -0.3,3.4 2.6,3.4 3.9,0.5 1.6,-0.8 3.2,4.2 1,0.4z m-14.5,0.2 1.1,2.5 0.2,1.8 1.1,1.9 c0,0 0.9,-0.9 0.9,-1.2 0,-0.3 -0.7,-3.1 -0.7,-3.1 l-0.7,-2.3z"}],
                  ["path", {id:"ME", onclick:jt.fs("app.slavery.stclick('ME')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('ME')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('ME')"),
                            fill:chart.colors.map.neutral, d:"M865.8,91.9 l1.5,0.4 v-2.6 l0.8,-5.5 2.6,-4.7 1.5,-4 -1.9,-2.4 v-6 l0.8,-1 0.8,-2.7 -0.2,-1.5 -0.2,-4.8 1.8,-4.8 2.9,-8.9 2.1,-4.2 h1.3 l1.3,0.2 v1.1 l1.3,2.3 2.7,0.6 0.8,-0.8 v-1 l4,-2.9 1.8,-1.8 1.5,0.2 6,2.4 1.9,1 9.1,29.9 h6 l0.8,1.9 0.2,4.8 2.9,2.3 h0.8 l0.2,-0.5 -0.5,-1.1 2.8,-0.5 1.9,2.1 2.3,3.7 v1.9 l-2.1,4.7 -1.9,0.6 -3.4,3.1 -4.8,5.5 c0,0 -0.6,0 -1.3,0 -0.6,0 -1,-2.1 -1,-2.1 l-1.8,0.2 -1,1.5 -2.4,1.5 -1,1.5 1.6,1.5 -0.5,0.6 -0.5,2.7 -1.9,-0.2 v-1.6 l-0.3,-1.3 -1.5,0.3 -1.8,-3.2 -2.1,1.3 1.3,1.5 0.3,1.1 -0.8,1.3 0.3,3.1 0.2,1.6 -1.6,2.6 -2.9,0.5 -0.3,2.9 -5.3,3.1 -1.3,0.5 -1.6,-1.5 -3.1,3.6 1,3.2 -1.5,1.3 -0.2,4.4 -1.1,6.3 -2.2,-0.9 -0.5,-3.1 -4,-1.1 -0.2,-2.5 -11.7,-37.43z m36.5,15.6 1.5,-1.5 1.4,1.1 0.6,2.4 -1.7,0.9z m6.7,-5.9 1.8,1.9 c0,0 1.3,0.1 1.3,-0.2 0,-0.3 0.2,-2 0.2,-2 l0.9,-0.8 -0.8,-1.8 -2,0.7z"}],
                  ["path", {id:"MI", onclick:jt.fs("app.slavery.stclick('MI')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MI')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MI')"),
                            fill:chart.colors.map.neutral, d:"M644.5,211 l19.1,-1.9 0.2,1.1 9.9,-1.5 12,-1.7 0.1,-0.6 0.2,-1.5 2.1,-3.7 2,-1.7 -0.2,-5.1 1.6,-1.6 1.1,-0.3 0.2,-3.6 1.5,-3 1.1,0.6 0.2,0.6 0.8,0.2 1.9,-1 -0.4,-9.1 -3.2,-8.2 -2.3,-9.1 -2.4,-3.2 -2.6,-1.8 -1.6,1.1 -3.9,1.8 -1.9,5 -2.7,3.7 -1.1,0.6 -1.5,-0.6 c0,0 -2.6,-1.5 -2.4,-2.1 0.2,-0.6 0.5,-5 0.5,-5 l3.4,-1.3 0.8,-3.4 0.6,-2.6 2.4,-1.6 -0.3,-10 -1.6,-2.3 -1.3,-0.8 -0.8,-2.1 0.8,-0.8 1.6,0.3 0.2,-1.6 -2.6,-2.2 -1.3,-2.6 h-2.6 l-4.5,-1.5 -5.5,-3.4 h-2.7 l-0.6,0.6 -1,-0.5 -3.1,-2.3 -2.9,1.8 -2.9,2.3 0.3,3.6 1,0.3 2.1,0.5 0.5,0.8 -2.6,0.8 -2.6,0.3 -1.5,1.8 -0.3,2.1 0.3,1.6 0.3,5.5 -3.6,2.1 -0.6,-0.2 v-4.2 l1.3,-2.4 0.6,-2.4 -0.8,-0.8 -1.9,0.8 -1,4.2 -2.7,1.1 -1.8,1.9 -0.2,1 0.6,0.8 -0.6,2.6 -2.3,0.5 v1.1 l0.8,2.4 -1.1,6.1 -1.6,4 0.6,4.7 0.5,1.1 -0.8,2.4 -0.3,0.8 -0.3,2.7 3.6,6 2.9,6.5 1.5,4.8 -0.8,4.7 -1,6 -2.4,5.2 -0.3,2.7 -3.2,3.1z m-33.3,-72.4 -1.3,-1.1 -1.8,-10.4 -3.7,-1.3 -1.7,-2.3 -12.6,-2.8 -2.8,-1.1 -8.1,-2.2 -7.8,-1 -3.9,-5.3 0.7,-0.5 2.7,-0.8 3.6,-2.3 v-1 l0.6,-0.6 6,-1 2.4,-1.9 4.4,-2.1 0.2,-1.3 1.9,-2.9 1.8,-0.8 1.3,-1.8 2.3,-2.3 4.4,-2.4 4.7,-0.5 1.1,1.1 -0.3,1 -3.7,1 -1.5,3.1 -2.3,0.8 -0.5,2.4 -2.4,3.2 -0.3,2.6 0.8,0.5 1,-1.1 3.6,-2.9 1.3,1.3 h2.3 l3.2,1 1.5,1.1 1.5,3.1 2.7,2.7 3.9,-0.2 1.5,-1 1.6,1.3 1.6,0.5 1.3,-0.8 h1.1 l1.6,-1 4,-3.6 3.4,-1.1 6.6,-0.3 4.5,-1.9 2.6,-1.3 1.5,0.2 v5.7 l0.5,0.3 2.9,0.8 1.9,-0.5 6.1,-1.6 1.1,-1.1 1.5,0.5 v7 l3.2,3.1 1.3,0.6 1.3,1 -1.3,0.3 -0.8,-0.3 -3.7,-0.5 -2.1,0.6 -2.3,-0.2 -3.2,1.5 h-1.8 l-5.8,-1.3 -5.2,0.2 -1.9,2.6 -7,0.6 -2.4,0.8 -1.1,3.1 -1.3,1.1 -0.5,-0.2 -1.5,-1.6 -4.5,2.4 h-0.6 l-1.1,-1.6 -0.8,0.2 -1.9,4.4 -1,4 -3.2,6.9z m-29.6,-56.5 1.8,-2.1 2.2,-0.8 5.4,-3.9 2.3,-0.6 0.5,0.5 -5.1,5.1 -3.3,1.9 -2.1,0.9z m86.2,32.1 0.6,2.5 3.2,0.2 1.3,-1.2 c0,0 -0.1,-1.5 -0.4,-1.6 -0.3,-0.2 -1.6,-1.9 -1.6,-1.9 l-2.2,0.2 -1.6,0.2 -0.3,1.1z"}],
                  ["path", {id:"MN", onclick:jt.fs("app.slavery.stclick('MN')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MN')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MN')"),
                            fill:chart.colors.map.neutral, d:"M464.6,66.79 l-0.6,3.91 v10.27 l1.6,5.03 1.9,3.32 0.5,9.93 1.8,13.45 1.8,7.3 0.4,6.4 v5.3 l-1.6,1.8 -1.8,1.3 v1.5 l0.9,1.7 4.1,3.5 0.7,3.2 v35.9 l60.3,-0.6 21.2,-0.7 -0.5,-6 -1.8,-2.1 -7.2,-4.6 -3.6,-5.3 -3.4,-0.9 -2,-2.8 h-3.2 l-3.5,-3.8 -0.5,-7 0.1,-3.9 1.5,-3 -0.7,-2.7 -2.8,-3.1 2.2,-6.1 5.4,-4 1.2,-1.4 -0.2,-8 0.2,-3 2.6,-3 3.8,-2.9 1.3,-0.2 4.5,-5 1.8,-0.8 2.3,-3.9 2.4,-3.6 3.1,-2.6 4.8,-2 9.2,-4.1 3.9,-1.8 0.6,-2.3 -4.4,0.4 -0.7,1.1 h-0.6 l-1.8,-3.1 -8.9,0.3 -1,0.8 h-1 l-0.5,-1.3 -0.8,-1.8 -2.6,0.5 -3.2,3.2 -1.6,0.8 h-3.1 l-2.6,-1 v-2.1 l-1.3,-0.2 -0.5,0.5 -2.6,-1.3 -0.5,-2.9 -1.5,0.5 -0.5,1 -2.4,-0.5 -5.3,-2.4 -3.9,-2.6 h-2.9 l-1.3,-1 -2.3,0.6 -1.1,1.1 -0.3,1.3 h-4.8 v-2.1 l-6.3,-0.3 -0.3,-1.5 h-4.8 l-1.6,-1.6 -1.5,-6.1 -0.8,-5.5 -1.9,-0.8 -2.3,-0.5 -0.6,0.2 -0.3,8.2 -30.1,-0.03z"}],
                  ["path", {id:"MO", onclick:jt.fs("app.slavery.stclick('MO')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MO')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MO')"),
                            fill:chart.colors.map.neutral, d:"M593.1,338.7 l0.5,-5.9 4.2,-3.4 1.9,-1 v-2.9 l0.7,-1.6 -1.1,-1.6 -2.4,0.3 -2.1,-2.5 -1.7,-4.5 0.9,-2.6 -2,-3.2 -1.8,-4.6 -4.6,-0.7 -6.8,-5.6 -2.2,-4.2 0.8,-3.3 2.2,-6 0.6,-3 -1.9,-1 -6.9,-0.6 -1.1,-1.9 v-4.1 l-5.3,-3.5 -7.2,-7.8 -2.3,-7.3 -0.5,-4.2 0.7,-2.4 -2.6,-3.1 -1.2,-2.4 -7.7,0.8 -10,0.6 -48.8,1.2 1.3,2.6 -0.1,2.2 2.3,3.6 3,3.9 3.1,3 2.6,0.2 1.4,1.1 v2.9 l-1.8,1.6 -0.5,2.3 2.1,3.2 2.4,3 2.6,2.1 1.3,11.6 -0.8,40 0.5,5.7 23.7,-0.2 23.3,-0.7 32.5,-1.3 2.2,3.7 -0.8,3.1 -3.1,2.5 -0.5,1.8 5.2,0.5 4.1,-1.1z"}],
                  ["path", {id:"MS", onclick:jt.fs("app.slavery.stclick('MS')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MS')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MS')"),
                            fill:chart.colors.map.neutral, d:"M604.3,472.5 l2.6,-4.2 1.8,0.8 6.8,-1.9 2.1,0.3 1.5,0.8 h5.2 l0.4,-1.6 -1.7,-14.8 -2.8,-19 1,-45.1 -0.2,-16.7 0.2,-6.3 -4.8,0.3 -19.6,1.6 -13,0.4 -0.2,3.2 -2.8,1.3 -2.6,5.1 0.5,1.6 0.1,2.4 -2.9,1.1 -3.5,5.1 0.8,2.3 -3,2.5 -1,5.7 -0.6,1.9 1.6,2.5 -1.5,1.4 1.5,2.8 0.3,4.2 -1.2,2.5 -0.2,0.9 0.4,5 2,4.5 -0.1,1.7 2.3,2 -0.7,3.1 -0.9,0.3 0.6,1.9 -8.6,15 -0.8,8.2 0.5,1.5 24.2,-0.7 8.2,-0.7 1.9,-0.3 0.6,1.4 -1,7.1 3.3,3.3 2.2,6.4z"}],
                  ["path", {id:"MT", onclick:jt.fs("app.slavery.stclick('MT')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('MT')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('MT')"),
                            fill:chart.colors.map.neutral, d:"M361.1,70.77 l-5.3,57.13 -1.3,15.2 -59.1,-6.6 -49,-7.1 -1.4,11.2 -1.9,-1.7 -0.4,-2.5 -1.3,-1.9 -3.3,1.5 -0.7,2.5 -2.3,0.3 -3.8,-1.6 -4.1,0.1 -2.4,0.7 -3.2,-1.5 -3,0.2 -2.1,1.9 -0.9,-0.6 -0.7,-3.4 0.7,-3.2 -2.7,-3.2 -3.3,-2.5 -2.5,-12.6 -0.1,-5.3 -1.6,-0.8 -0.6,1 -4.5,3.2 -1.2,-0.1 -2.3,-2.8 -0.2,-2.8 7,-17.15 -0.6,-2.67 -3.5,-1.12 -0.4,-0.91 -2.7,-3.5 -4.6,-10.41 -3.2,-1.58 -1.8,-4.26 1.3,-4.63 -3.2,-7.57 4.4,-21.29 32.7,6.89 18.4,3.4 32.3,5.3 29.3,4 29.2,3.5 30.8,3.07z"}],
                  ["path", {id:"NC", onclick:jt.fs("app.slavery.stclick('NC')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NC')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NC')"),
                            fill:chart.colors.map.neutral, d:"M786.7,357.7 l-12.7,-7.7 -3.1,-0.8 -16.6,2.1 -1.6,-3 -2.8,-2.2 -16.7,0.5 -7.4,0.9 -9.2,4.5 -6.8,2.7 -6.5,1.2 -13.4,1.4 0.1,-4.1 1.7,-1.3 2.7,-0.7 0.7,-3.8 3.9,-2.5 3.9,-1.5 4.5,-3.7 4.4,-2.3 0.7,-3.2 4.1,-3.8 0.7,1 2.5,0.2 2.4,-3.6 1.7,-0.4 2.6,0.3 1.8,-4 2.5,-2.4 0.5,-1.8 0.1,-3.5 4.4,0.1 38.5,-5.6 57.5,-12.3 2,4.8 3.6,6.5 2.4,2.4 0.6,2.3 -2.4,0.2 0.8,0.6 -0.3,4.2 -2.6,1.3 -0.6,2.1 -1.3,2.9 -3.7,1.6 -2.4,-0.3 -1.5,-0.2 -1.6,-1.3 0.3,1.3 v1 h1.9 l0.8,1.3 -1.9,6.3 h4.2 l0.6,1.6 2.3,-2.3 1.3,-0.5 -1.9,3.6 -3.1,4.8 h-1.3 l-1.1,-0.5 -2.7,0.6 -5.2,2.4 -6.5,5.3 -3.4,4.7 -1.9,6.5 -0.5,2.4 -4.7,0.5 -5.1,1.5z m49.3,-26.2 2.6,-2.5 3.2,-2.6 1.5,-0.6 0.2,-2 -0.6,-6.1 -1.5,-2.3 -0.6,-1.9 0.7,-0.2 2.7,5.5 0.4,4.4 -0.2,3.4 -3.4,1.5 -2.8,2.4 -1.1,1.2z"}],
                  ["path", {id:"ND", onclick:jt.fs("app.slavery.stclick('ND')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('ND')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('ND')"),
                            fill:chart.colors.map.neutral, d:"M471,126.4 l-0.4,-6.2 -1.8,-7.3 -1.8,-13.61 -0.5,-9.7 -1.9,-3.18 -1.6,-5.32 v-10.41 l0.6,-3.85 -1.8,-5.54 -28.6,-0.59 -18.6,-0.6 -26.5,-1.3 -25.2,-2.16 -0.9,14.42 -4.7,50.94 56.8,3.9 56.9,1.7z"}],
                  ["path", {id:"NE", onclick:jt.fs("app.slavery.stclick('NE')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NE')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NE')"),
                            fill:chart.colors.map.neutral, d:"M470.3,204.3 l-1,-2.3 -0.5,-1.6 -2.9,-1.6 -4.8,-1.5 -2.2,-1.2 -2.6,0.1 -3.7,0.4 -4.2,1.2 -6,-4.1 -2.2,-2 -10.7,0.6 -41.5,-2.4 -35.6,-2.2 -4.3,43.7 33.1,3.3 -1.4,21.1 21.7,1 40.6,1.2 43.8,0.6 h4.5 l-2.2,-3 -2.6,-3.9 0.1,-2.3 -1.4,-2.7 -1.9,-5.2 -0.4,-6.7 -1.4,-4.1 -0.5,-5 -2.3,-3.7 -1,-4.7 -2.8,-7.9 -1,-5.3z"}],
                  ["path", {id:"NH", onclick:jt.fs("app.slavery.stclick('NH')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NH')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NH')"),
                            fill:chart.colors.map.neutral, d:"M881.7,141.3 l1.1,-3.2 -2.7,-1.2 -0.5,-3.1 -4.1,-1.1 -0.3,-3 -11.7,-37.48 -0.7,0.08 -0.6,1.6 -0.6,-0.5 -1,-1 -1.5,1.9 -0.2,2.29 0.5,8.41 1.9,2.8 v4.3 l-3.9,4.8 -2.4,0.9 v0.7 l1.1,1.9 v8.6 l-0.8,9.2 -0.2,4.7 1,1.4 -0.2,4.7 -0.5,1.5 1,1.1 5.1,-1.2 13.8,-3.5 1.7,-2.9 4,-1.9z"}],
                  ["path", {id:"NJ", onclick:jt.fs("app.slavery.stclick('NJ')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NJ')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NJ')"),
                            fill:chart.colors.map.neutral, d:"M823.7,228.3 l0.1,-1.5 2.7,-1.3 1.7,-2.8 1.7,-2.4 3.3,-3.2 v-1.2 l-6.1,-4.1 -1,-2.7 -2.7,-0.3 -0.1,-0.9 -0.7,-2.2 2.2,-1.1 0.2,-2.9 -1.3,-1.3 0.2,-1.2 1.9,-3.1 v-3.1 l2.5,-3.1 5.6,2.5 6.4,1.9 2.5,1.2 0.1,1.8 -0.5,2.7 0.4,4.5 -2.1,1.9 -1.1,1 0.5,0.5 2.7,-0.3 1.1,-0.8 1.6,3.4 0.2,9.4 0.6,1.1 -1.1,5.5 -3.1,6.5 -2.7,4 -0.8,4.8 -2.1,2.4 h-0.8 l-0.3,-2.7 0.8,-1 -0.2,-1.5 -4,-0.6 -4.8,-2.3 -3.2,-2.9 -1,-2z"}],
                  ["path", {id:"NM", onclick:jt.fs("app.slavery.stclick('NM')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NM')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NM')"),
                            fill:chart.colors.map.neutral, d:"M270.2,429.4 l-16.7,-2.6 -1.2,9.6 -15.8,-2 6,-39.7 7,-53.2 4.4,-30.9 34,3.9 37.4,4.4 32,2.8 -0.3,10.8 -1.4,-0.1 -7.4,97.7 -28.4,-1.8 -38.1,-3.7 0.7,6.3z"}],
                  ["path", {id:"NV", onclick:jt.fs("app.slavery.stclick('NV')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NV')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NV')"),
                            fill:chart.colors.map.neutral, d:"M123.1,173.6 l38.7,8.5 26,5.2 -10.6,53.1 -5.4,29.8 -3.3,15.5 -2.1,11.1 -2.6,16.4 -1.7,3.1 -1.6,-0.1 -1.2,-2.6 -2.8,-0.5 -1.3,-1.1 -1.8,0.1 -0.9,0.8 -1.8,1.3 -0.3,7.3 -0.3,1.5 -0.5,12.4 -1.1,1.8 -16.7,-25.5 -42.1,-62.1 -12.43,-19 8.55,-32.6 8.01,-31.3z"}],
                  ["path", {id:"NY", onclick:jt.fs("app.slavery.stclick('NY')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('NY')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('NY')"),
                            fill:chart.colors.map.neutral, d:"M843.4,200 l0.5,-2.7 -0.2,-2.4 -3,-1.5 -6.5,-2 -6,-2.6 -0.6,-0.4 -2.7,-0.3 -2,-1.5 -2.1,-5.9 -3.3,-0.5 -2.4,-2.4 -38.4,8.1 -31.6,6 -0.5,-6.5 1.6,-1.2 1.3,-1.1 1,-1.6 1.8,-1.1 1.9,-1.8 0.5,-1.6 2.1,-2.7 1.1,-1 -0.2,-1 -1.3,-3.1 -1.8,-0.2 -1.9,-6.1 2.9,-1.8 4.4,-1.5 4,-1.3 3.2,-0.5 6.3,-0.2 1.9,1.3 1.6,0.2 2.1,-1.3 2.6,-1.1 5.2,-0.5 2.1,-1.8 1.8,-3.2 1.6,-1.9 h2.1 l1.9,-1.1 0.2,-2.3 -1.5,-2.1 -0.3,-1.5 1.1,-2.1 v-1.5 h-1.8 l-1.8,-0.8 -0.8,-1.1 -0.2,-2.6 5.8,-5.5 0.6,-0.8 1.5,-2.9 2.9,-4.5 2.7,-3.7 2.1,-2.4 2.4,-1.8 3.1,-1.2 5.5,-1.3 3.2,0.2 4.5,-1.5 7.4,-2.2 0.7,4.9 2.4,6.5 0.8,5 -1,4.2 2.6,4.5 0.8,2 -0.9,3.2 3.7,1.7 2.7,10.2 v5.8 l-0.6,10.9 0.8,5.4 0.7,3.6 1.5,7.3 v8.1 l-1.1,2.3 2.1,2.7 0.5,0.9 -1.9,1.8 0.3,1.3 1.3,-0.3 1.5,-1.3 2.3,-2.6 1.1,-0.6 1.6,0.6 2.3,0.2 7.9,-3.9 2.9,-2.7 1.3,-1.5 4.2,1.6 -3.4,3.6 -3.9,2.9 -7.1,5.3 -2.6,1 -5.8,1.9 -4,1.1 -1,-0.4z"}],
                  ["path", {id:"OH", onclick:jt.fs("app.slavery.stclick('OH')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('OH')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('OH')"),
                            fill:chart.colors.map.neutral, d:"M663.8,211.2 l1.7,15.5 4.8,41.1 3.9,-0.2 2.3,-0.8 3.6,1.8 1.7,4.2 5.4,0.1 1.8,2 h1.7 l2.4,-1.4 3.1,0.5 1.5,1.3 1.8,-2 2.3,-1.4 2.4,-0.4 0.6,2.7 1.6,1 2.6,2 0.8,0.2 2,-0.1 1.2,-0.6 v-2.1 l1.7,-1.5 0.1,-4.8 1.1,-4.2 1.9,-1.3 1,0.7 1,1.1 0.7,0.2 0.4,-0.4 -0.9,-2.7 v-2.2 l1.1,-1.4 2.5,-3.6 1.3,-1.5 2.2,0.5 2.1,-1.5 3,-3.3 2.2,-3.7 0.2,-5.4 0.5,-5 v-4.6 l-1.2,-3.2 1.2,-1.8 1.3,-1.2 -0.6,-2.8 -4.3,-25.6 -6.2,3.7 -3.9,2.3 -3.4,3.7 -4,3.9 -3.2,0.8 -2.9,0.5 -5.5,2.6 -2.1,0.2 -3.4,-3.1 -5.2,0.6 -2.6,-1.5 -2.2,-1.3z"}],
                  ["path", {id:"OK", onclick:jt.fs("app.slavery.stclick('OK')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('OK')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('OK')"),
                            fill:chart.colors.map.neutral, d:"M411.9,334.9 l-1.8,24.3 -0.9,18 0.2,1.6 4,3.6 1.7,0.9 h0.9 l0.9,-2.1 1.5,1.9 1.6,0.1 0.3,-0.2 0.2,-1.1 2.8,1.4 -0.4,3.5 3.8,0.5 2.5,1 4.2,0.6 2.3,1.6 2.5,-1.7 3.5,0.7 2.2,3.1 1.2,0.1 v2.3 l2.1,0.7 2.5,-2.1 1.8,0.6 2.7,0.1 0.7,2.3 4.4,1.8 1.7,-0.3 1.9,-4.2 h1.3 l1.1,2.1 4.2,0.8 3.4,1.3 3,0.8 1.6,-0.7 0.7,-2.7 h4.5 l1.9,0.9 2.7,-1.9 h1.4 l0.6,1.4 h3.6 l2,-1.8 2.3,0.6 1.7,2.2 3,1.7 3.4,0.9 1.9,1.2 -0.3,-37.6 -1.4,-10.9 -0.1,-8.6 -1.5,-6.6 -0.6,-6.8 0.1,-4.3 -12.6,0.3 -46.3,-0.5 -44.7,-2.1 -41.5,-1.8 -0.4,10.7z"}],
                  ["path", {id:"OR", onclick:jt.fs("app.slavery.stclick('OR')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('OR')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('OR')"),
                            fill:chart.colors.map.neutral, d:"M67.44,158.9 l28.24,7.2 27.52,6.5 17,3.7 8.8,-35.1 1.2,-4.4 2.4,-5.5 -0.7,-1.3 -2.5,0.1 -1.3,-1.8 0.6,-1.5 0.4,-3.3 4.7,-5.7 1.9,-0.9 0.9,-0.8 0.7,-2.7 0.8,-1.1 3.9,-5.7 3.7,-4 0.2,-3.26 -3.4,-2.49 -1.2,-4.55 -13.1,-3.83 -15.3,-3.47 -14.8,0.37 -1.1,-1.31 -5.1,1.84 -4.5,-0.48 -2.4,-1.58 -1.3,0.54 -4.68,-0.29 -1.96,-1.43 -4.84,-1.77 -1.1,-0.07 -4.45,-1.27 -1.76,1.52 -6.26,-0.24 -5.31,-3.85 0.21,-9.28 -2.05,-3.5 -4.1,-0.6 -0.7,-2.5 -2.4,-0.5 -5.8,2.1 -2.3,6.5 -3.2,10 -3.2,6.5 -5,14.1 -6.5,13.6 -8.1,12.6 -1.9,2.9 -0.8,8.6 -1.3,6 2.71,3.5z"}],
                  ["path", {id:"PA", onclick:jt.fs("app.slavery.stclick('PA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('PA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('PA')"),
                            fill:chart.colors.map.neutral, d:"M736.6,192.2 l1.3,-0.5 5.7,-5.5 0.7,6.9 33.5,-6.5 36.9,-7.8 2.3,2.3 3.1,0.4 2,5.6 2.4,1.9 2.8,0.4 0.1,0.1 -2.6,3.2 v3.1 l-1.9,3.1 -0.2,1.9 1.3,1.3 -0.2,1.9 -2.4,1.1 1,3.4 0.2,1.1 2.8,0.3 0.9,2.5 5.9,3.9 v0.4 l-3.1,3 -1.5,2.2 -1.7,2.8 -2.7,1.2 -1.4,0.3 -2.1,1.3 -1.6,1.4 -22.4,4.3 -38.7,7.8 -11.3,1.4 -3.9,0.7 -5.1,-22.4 -4.3,-25.9z"}],
                  ["path", {id:"RI", onclick:jt.fs("app.slavery.stclick('RI')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('RI')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('RI')"),
                            fill:chart.colors.map.neutral, d:"M873.6,175.7 l-0.8,-4.4 -1.6,-6 5.7,-1.5 1.5,1.3 3.4,4.3 2.8,4.4 -2.8,1.4 -1.3,-0.2 -1.1,1.8 -2.4,1.9 -2.8,1.1z"}],
                  ["path", {id:"SC", onclick:jt.fs("app.slavery.stclick('SC')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('SC')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('SC')"),
                            fill:chart.colors.map.neutral, d:"M759,413.6 l-2.1,-1 -1.9,-5.6 -2.5,-2.3 -2.5,-0.5 -1.5,-4.6 -3,-6.5 -4.2,-1.8 -1.9,-1.8 -1.2,-2.6 -2.4,-2 -2.3,-1.3 -2.2,-2.9 -3.2,-2.4 -4.4,-1.7 -0.4,-1.4 -2.3,-2.8 -0.5,-1.5 -3.8,-5.4 -3.4,0.1 -3.9,-2.5 -1.2,-1.2 -0.2,-1.4 0.6,-1.6 2.7,-1.3 -0.8,-2 6.4,-2.7 9.2,-4.5 7.1,-0.9 16.4,-0.5 2.3,1.9 1.8,3.5 4.6,-0.8 12.6,-1.5 2.7,0.8 12.5,7.4 10.1,8.3 -5.3,5.4 -2.6,6.1 -0.5,6.3 -1.6,0.8 -1.1,2.7 -2.4,0.6 -2.1,3.6 -2.7,2.7 -2.3,3.4 -1.6,0.8 -3.6,3.4 -2.9,0.2 1,3.2 -5,5.3 -2.3,1.6z"}],
                  ["path", {id:"SD", onclick:jt.fs("app.slavery.stclick('SD')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('SD')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('SD')"),
                            fill:chart.colors.map.neutral, d:"M471,181.1 l-0.9,3.2 0.4,3 2.6,2 -1.2,5.4 -1.8,4.1 1.5,3.3 0.7,1.1 -1.3,0.1 -0.7,-1.6 -0.6,-2 -3.3,-1.8 -4.8,-1.5 -2.5,-1.3 -2.9,0.1 -3.9,0.4 -3.8,1.2 -5.3,-3.8 -2.7,-2.4 -10.9,0.8 -41.5,-2.4 -35.6,-2.2 1.5,-24.8 2.8,-34 0.4,-5 56.9,3.9 56.9,1.7 v2.7 l-1.3,1.5 -2,1.5 -0.1,2.2 1.1,2.2 4.1,3.4 0.5,2.7 v35.9z"}],
                  ["path", {id:"TN", onclick:jt.fs("app.slavery.stclick('TN')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('TN')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('TN')"),
                            fill:chart.colors.map.neutral, d:"M670.8,359.6 l-13.1,1.2 -23.3,2.2 -37.6,2.7 -11.8,0.4 0.9,-0.6 0.9,-4.5 -1.2,-3.6 3.9,-2.3 0.4,-2.5 1.2,-4.3 3,-9.5 0.5,-5.6 0.3,-0.2 12.3,-0.2 13.6,-0.8 0.1,-3.9 3.5,-0.1 30.4,-3.3 54,-5.2 10.3,-1.5 7.6,-0.2 2.4,-1.9 1.3,0.3 -0.1,3.3 -0.4,1.6 -2.4,2.2 -1.6,3.6 -2,-0.4 -2.4,0.9 -2.2,3.3 -1.4,-0.2 -0.8,-1.2 -1.1,0.4 -4.3,4 -0.8,3.1 -4.2,2.2 -4.3,3.6 -3.8,1.5 -4.4,2.8 -0.6,3.6 -2.5,0.5 -2,1.7 -0.2,4.8z"}],
                  ["path", {id:"TX", onclick:jt.fs("app.slavery.stclick('TX')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('TX')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('TX')"),
                            fill:chart.colors.map.neutral, d:"M282.8,425.6 l37,3.6 29.3,1.9 7.4,-97.7 54.4,2.4 -1.7,23.3 -1,18 0.2,2 4.4,4.1 2,1.1 h1.8 l0.5,-1.2 0.7,0.9 2.4,0.2 1.1,-0.6 v-0.2 l1,0.5 -0.4,3.7 4.5,0.7 2.4,0.9 4.2,0.7 2.6,1.8 2.8,-1.9 2.7,0.6 2.2,3.1 0.8,0.1 v2.1 l3.3,1.1 2.5,-2.1 1.5,0.5 2.1,0.1 0.6,2.1 5.2,2 2.3,-0.5 1.9,-4 h0.1 l1.1,1.9 4.6,0.9 3.4,1.3 3.2,1 2.4,-1.2 0.7,-2.3 h3.6 l2.1,1 3,-2 h0.4 l0.5,1.4 h4.7 l1.9,-1.8 1.3,0.4 1.7,2.1 3.3,1.9 3.4,1 2.5,1.4 2.7,2 3.1,-1.2 2.1,0.8 0.7,20 0.7,9.5 0.6,4.1 2.6,4.4 0.9,4.5 4.2,5.9 0.3,3.1 0.6,0.8 -0.7,7.7 -2.9,4.8 1.3,2.6 -0.5,2.4 -0.8,7.2 -1.3,3 0.3,4.2 -5.6,1.6 -9.9,4.5 -1,1.9 -2.6,1.9 -2.1,1.5 -1.3,0.8 -5.7,5.3 -2.7,2.1 -5.3,3.2 -5.7,2.4 -6.3,3.4 -1.8,1.5 -5.8,3.6 -3.4,0.6 -3.9,5.5 -4,0.3 -1,1.9 2.3,1.9 -1.5,5.5 -1.3,4.5 -1.1,3.9 -0.8,4.5 0.8,2.4 1.8,7 1,6.1 1.8,2.7 -1,1.5 -3.1,1.9 -5.7,-3.9 -5.5,-1.1 -1.3,0.5 -3.2,-0.6 -4.2,-3.1 -5.2,-1.1 -7.6,-3.4 -2.1,-3.9 -1.3,-6.5 -3.2,-1.9 -0.6,-2.3 0.6,-0.6 0.3,-3.4 -1.3,-0.6 -0.6,-1 1.3,-4.4 -1.6,-2.3 -3.2,-1.3 -3.4,-4.4 -3.6,-6.6 -4.2,-2.6 0.2,-1.9 -5.3,-12.3 -0.8,-4.2 -1.8,-1.9 -0.2,-1.5 -6,-5.3 -2.6,-3.1 v-1.1 l-2.6,-2.1 -6.8,-1.1 -7.4,-0.6 -3.1,-2.3 -4.5,1.8 -3.6,1.5 -2.3,3.2 -1,3.7 -4.4,6.1 -2.4,2.4 -2.6,-1 -1.8,-1.1 -1.9,-0.6 -3.9,-2.3 v-0.6 l-1.8,-1.9 -5.2,-2.1 -7.4,-7.8 -2.3,-4.7 v-8.1 l-3.2,-6.5 -0.5,-2.7 -1.6,-1 -1.1,-2.1 -5,-2.1 -1.3,-1.6 -7.1,-7.9 -1.3,-3.2 -4.7,-2.3 -1.5,-4.4 -2.6,-2.9 -1.7,-0.5z m174.4,141.7 -0.6,-7.1 -2.7,-7.2 -0.6,-7 1.5,-8.2 3.3,-6.9 3.5,-5.4 3.2,-3.6 0.6,0.2 -4.8,6.6 -4.4,6.5 -2,6.6 -0.3,5.2 0.9,6.1 2.6,7.2 0.5,5.2 0.2,1.5z"}],
                  ["path", {id:"UT", onclick:jt.fs("app.slavery.stclick('UT')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('UT')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('UT')"),
                            fill:chart.colors.map.neutral, d:"M228.4,305.9 l24.6,3.6 1.9,-13.7 7,-50.5 2.3,-22 -32.2,-3.5 2.2,-13.1 1.8,-10.6 -34.7,-6.1 -12.5,-2.5 -10.6,52.9 -5.4,30 -3.3,15.4 -1.7,9.2z"}],
                  ["path", {id:"VA", onclick:jt.fs("app.slavery.stclick('VA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('VA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('VA')"),
                            fill:chart.colors.map.neutral, d:"M834.7,265.2 l-0.2,2.8 -2.9,3.8 -0.4,4.6 0.5,3.4 -1.8,5 -2.2,1.9 -1.5,-4.6 0.4,-5.4 1.6,-4.2 0.7,-3.3 -0.1,-1.7z m-60.3,44.6 -38.6,5.6 -4.8,-0.1 -2.2,-0.3 -2.5,1.9 -7.3,0.1 -10.3,1.6 -6.7,0.6 4.1,-2.6 4.1,-2.3 v-2.1 l5.7,-7.3 4.1,-3.7 2.2,-2.5 3.6,4.3 3.8,0.9 2.7,-1 2,-1.5 2.4,1.2 4.6,-1.3 1.7,-4.4 2.4,0.7 3.2,-2.3 1.6,0.4 2.8,-3.2 0.2,-2.7 -0.8,-1.2 4.8,-10.5 1.8,-5.2 0.5,-4.7 0.7,-0.2 1.1,1.7 1.5,1.2 3.9,-0.2 1.7,-8.1 3,-0.6 0.8,-2.6 2.8,-2.2 1.1,-2.1 1.8,-4.3 0.1,-4.6 3.6,1.4 6.6,3.1 0.3,-5.2 3.4,1.2 -0.6,2.9 8.6,3.1 1.4,1.8 -0.8,3.3 -1.3,1.3 -0.5,1.7 0.5,2.4 2,1.3 3.9,1.4 2.9,1 4.9,0.9 2.2,2.1 3.2,0.4 0.9,1.2 -0.4,4.7 1.4,1.1 -0.5,1.9 1.2,0.8 -0.2,1.4 -2.7,-0.1 0.1,1.6 2.3,1.5 0.1,1.4 1.8,1.8 0.5,2.5 -2.6,1.4 1.6,1.5 5.8,-1.7 3.7,6.2z"}],
                  ["path", {id:"VT", onclick:jt.fs("app.slavery.stclick('VT')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('VT')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('VT')"),
                            fill:chart.colors.map.neutral, d:"M832.7,111.3 l2.4,6.5 0.8,5.3 -1,3.9 2.5,4.4 0.9,2.3 -0.7,2.6 3.3,1.5 2.9,10.8 v5.3 l11.5,-2.1 -1,-1.1 0.6,-1.9 0.2,-4.3 -1,-1.4 0.2,-4.7 0.8,-9.3 v-8.5 l-1.1,-1.8 v-1.6 l2.8,-1.1 3.5,-4.4 v-3.6 l-1.9,-2.7 -0.3,-5.79 -26.1,6.79z"}],
                  ["path", {id:"WA", onclick:jt.fs("app.slavery.stclick('WA')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('WA')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('WA')"),
                            fill:chart.colors.map.neutral, d:"M74.5,67.7 l-2.3,-4.3 -4.1,-0.7 -0.4,-2.4 -2.5,-0.6 -2.9,-0.5 -1.8,1 -2.3,-2.9 0.3,-2.9 2.7,-0.3 1.6,-4 -2.6,-1.1 0.2,-3.7 4.4,-0.6 -2.7,-2.7 -1.5,-7.1 0.6,-2.9 v-7.9 l-1.8,-3.2 2.3,-9.4 2.1,0.5 2.4,2.9 2.7,2.6 3.2,1.9 4.5,2.1 3.1,0.6 2.9,1.5 3.4,1 2.3,-0.2 v-2.4 l1.3,-1.1 2.1,-1.3 0.3,1.1 0.3,1.8 -2.3,0.5 -0.3,2.1 1.8,1.5 1.1,2.4 0.6,1.9 1.5,-0.2 0.2,-1.3 -1,-1.3 -0.5,-3.2 0.8,-1.8 -0.6,-1.5 v-2.6 l1.8,-3.6 -1.1,-2.6 -2.4,-4.8 0.3,-0.8 1.4,-0.8 4.4,1.5 9.7,2.7 8.6,1.9 20,5.7 23,5.7 15,3.49 -4.8,17.56 -4.5,20.83 -3.4,16.25 -0.4,9.18 v0 l-12.9,-3.72 -15.3,-3.47 -14.5,0.32 -1.1,-1.53 -5.7,2.09 -3.9,-0.42 -2.6,-1.79 -1.7,0.65 -4.15,-0.25 -1.72,-1.32 -5.16,-1.82 -1.18,-0.16 -4.8,-1.39 -1.92,1.65 -5.65,-0.25 -4.61,-3.35z m9.6,-55.4 2,-0.2 0.5,1.4 1.5,-1.6 h2.3 l0.8,1.5 -1.5,1.7 0.6,0.8 -0.7,2 -1.4,0.4 c0,0 -0.9,0.1 -0.9,-0.2 0,-0.3 1.5,-2.6 1.5,-2.6 l-1.7,-0.6 -0.3,1.5 -0.7,0.6 -1.5,-2.3z"}],
                  ["path", {id:"WI", onclick:jt.fs("app.slavery.stclick('WI')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('WI')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('WI')"),
                            fill:chart.colors.map.neutral, d:"M541.4,109.9 l2.9,0.5 2.9,-0.6 7.4,-3.2 2.9,-1.9 2.1,-0.8 1.9,1.5 -1.1,1.1 -1.9,3.1 -0.6,1.9 1,0.6 1.8,-1 1.1,-0.2 2.7,0.8 0.6,1.1 1.1,0.2 0.6,-1.1 4,5.3 8.2,1.2 8.2,2.2 2.6,1.1 12.3,2.6 1.6,2.3 3.6,1.2 1.7,10.2 1.6,1.4 1.5,0.9 -1.1,2.3 -1.8,1.6 -2.1,4.7 -1.3,2.4 0.2,1.8 1.5,0.3 1.1,-1.9 1.5,-0.8 0.8,-2.3 1.9,-1.8 2.7,-4 4.2,-6.3 0.8,-0.5 0.3,1 -0.2,2.3 -2.9,6.8 -2.7,5.7 -0.5,3.2 -0.6,2.6 0.8,1.3 -0.2,2.7 -1.9,2.4 -0.5,1.8 0.6,3.6 0.6,3.4 -1.5,2.6 -0.8,2.9 -1,3.1 1.1,2.4 0.6,6.1 1.6,4.5 -0.2,3 -15.9,1.8 -17.5,1 h-12.7 l-0.7,-1.5 -2.9,-0.4 -2.6,-1.3 -2.3,-3.7 -0.3,-3.6 2,-2.9 -0.5,-1.4 -2.1,-2.2 -0.8,-3.3 -0.6,-6.8 -2.1,-2.5 -7,-4.5 -3.8,-5.4 -3.4,-1 -2.2,-2.8 h-3.2 l-2.9,-3.3 -0.5,-6.5 0.1,-3.8 1.5,-3.1 -0.8,-3.2 -2.5,-2.8 1.8,-5.4 5.2,-3.8 1.6,-1.9 -0.2,-8.1 0.2,-2.8 2.4,-2.8z"}],
                  ["path", {id:"WV", onclick:jt.fs("app.slavery.stclick('WV')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('WV')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('WV')"),
                            fill:chart.colors.map.neutral, d:"M758.9,254.3 l5.8,-6 2.6,-0.8 1.6,-1.5 1.5,-2.2 1.1,0.3 3.1,-0.2 4.6,-3.6 1.5,-0.5 1.3,1 2.6,1.2 3,3 -0.4,4.3 -5.4,-2.6 -4.8,-1.8 -0.1,5.9 -2.6,5.7 -2.9,2.4 -0.8,2.3 -3,0.5 -1.7,8.1 -2.8,0.2 -1.1,-1 -1.2,-2 -2.2,0.5 -0.5,5.1 -1.8,5.1 -5,11 0.9,1.4 -0.1,2 -2.2,2.5 -1.6,-0.4 -3.1,2.3 -2.8,-0.8 -1.8,4.9 -3.8,1 -2.5,-1.3 -2.5,1.9 -2.3,0.7 -3.2,-0.8 -3.8,-4.5 -3.5,-2.2 -2.5,-2.5 -2.9,-3.7 -0.5,-2.3 -2.8,-1.7 -0.6,-1.3 -0.2,-5.6 0.3,0.1 2.4,-0.2 1.8,-1 v-2.2 l1.7,-1.5 0.1,-5.2 0.9,-3.6 1.1,-0.7 0.4,0.3 1,1.1 1.7,0.5 1.1,-1.3 -1,-3.1 v-1.6 l3.1,-4.6 1.2,-1.3 2,0.5 2.6,-1.8 3.1,-3.4 2.4,-4.1 0.2,-5.6 0.5,-4.8 v-4.9 l-1.1,-3 0.9,-1.3 0.8,-0.7 4.3,19.3 4.3,-0.8 11.2,-1.3z"}],
                  ["path", {id:"WY", onclick:jt.fs("app.slavery.stclick('WY')"),
                            onmouseover:jt.fs("app.slavery.stmouseover('WY')"),
                            onmouseout:jt.fs("app.slavery.stmouseout('WY')"),
                            fill:chart.colors.map.neutral, d:"M353,161.9 l-1.5,25.4 -4.4,44 -2.7,-0.3 -83.3,-9.1 -27.9,-3 2,-12 6.9,-41 3.8,-24.2 1.3,-11.2 48.2,7 59.1,6.5z"}],
                  ["g", {id:"DC"},
                   [["path", {id:"DC1", fill:chart.colors.map.neutral, d:"M801.8,253.8 l-1.1-1.6 -1-0.8 1.1-1.6 2.2,1.5z"}],
                    ["circle", {id:"DC2", fill:chart.colors.map.neutral, stroke:"#FFFFFF",
                                "stroke-width":1.5, cx:801.3, cy:251.8, r:5, 
                                opacity:0}]]]  //set to 1 to display
                 ]], //end of state outlines
                ["path", {id:"frames", fill:"none", stroke:"#A9A9A9", 
                          "stroke-width":2, 
                          d:"M215,493v55l36,45 M0,425h147l68,68h85l54,54v46"}]
               ];
        return html;
    }


    function initHTMLContent () {
        var k;
        chart.key = {w: 280, 
                     svg: {h:20}};
        chart.key.svg.w = chart.key.svg.w || chart.key.w;
        k = chart.key;
        k.yr = {start: sv.pts[0].start.year, 
                end: sv.pts[sv.pts.length - 1].start.year};
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
             mapJSHTML()]));
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
            .domain(d3.extent(sv.pts, function (d) { return d.tc; }))
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
            .data(sv.pts)
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
        sv.pts.forEach(function (pt) {
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


    function display (suppvis, timeline, endfunc) {
        sv = suppvis || app.lev.suppVisByCode("sl");
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        sv.startDate = new Date();
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
        //TODO: ask some kind of a question to complete the viz.
        //possibly how long the longest status quo period was
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

