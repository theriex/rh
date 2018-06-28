/*jslint browser, multivar, white, fudge, this, long */
/*global app, window, jt, d3 */

app.miscegenation = (function () {
    "use strict";

    var stats = null,
        tl = null,
        cm1 = "#cc6c6c",
        cm2 = "#6d3939",
        cmx = "#fadb66",
        chart = {colors: {bg: "#fef6d7", 
                          map: {neutral:cmx,
                                hover:"#d3aaaa"}}},
        sps = [{state:"AK", name:"Alaska", points:[]},  //none
               {state:"HI", name:"Hawaii", points:[]},  //none
               {state:"AL", name:"Alabama", points:[
                   { date:"1852", text:"Alabama prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"AR", name:"Arkansas", points:[
                   { date:"1838", text:"Arkansas prohibits intermarriage between Whites and Negroes, Indians, or mulattos.", nodisp:true }]},
               {state:"AZ", name:"Arizona", points:[
                   { date:"1865", source:"ksep: R48", text:"Arizona prohibits “All marriages of white persons with negroes, mulattoes, Indians, or Mongolians.” This is the first use of the term “Mongolian” as a racialized term for Asian Americans in anti-miscegenation laws.", color:cm2 },
                   { date:"1962", source:"ksep: R113", text:"Arizona legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"CA", name:"California", points:[
                   { date:"1850", source:"ksep: R34", text:"California prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1880", text:"California expands its anti-miscegenation law to explicitely prohibit marriage between Whites and “Mongolians”", nodisp:true, color:cm2 },
                   { date:"1901", source:"ksep: A47", text:"California’s anti-miscegenation law is amended to include marriages between whites and “Mongolians.” This law remains in effect until 1948.", nodisp:true, color:cm2 },
                   { date:"1948", source:"ksep: R78", text:"California legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"CO", name:"Colorado", points:[
                   { date:"1864", text:"Colorado prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true },
                   { date:"1957", text:"Colorado legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"CT", name:"Connecticut", points:[]},  //none
               {state:"DE", name:"Delaware", points:[
                   { date:"1807", source:"ksep: R19", text:"Delaware prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"FL", name:"Florida", points:[
                   { date:"1832", source:"ksep: R25", text:"Florida prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"GA", name:"Georgia", points:[
                   { date:"1750", source:"ksep: R13", text:"Georgia prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1927", source:"ksep: R76", text:"Georgia passes all-encompassing anti-miscegenation law: “It shall be unlawful for a white person to marry anyone but a white person. Any marriage in violation of this section shall be void.”", color:cm2 }]},
               {state:"IA", name:"Iowa", points:[
                   { date:"1839", source:"ksep: R30", text:"Iowa prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1851", source:"ksep: R37", text:"Iowa legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"ID", name:"Idaho", points:[
                   { date:"1864", text:"Idaho prohibits intermarriage between Whites and Negroes, mulattos or Chinese.", color:cm2, nodisp:true },
                   { date:"1921", text:"Idaho expands its anti-miscegenation law to explicitely prohibit marriage between Whites and all “Mongolians”.", nodisp:true, color:cm2 },
                   { date:"1959", text:"Idaho legalizes interracial marriage.", nodisp:true, col:cmx }]},
               {state:"IL", name:"Illinois", points:[
                   { date:"1829", source:"ksep: R24", text:"Illinois prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1874", source:"ksep: R55", text:"Illinois legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"IN", name:"Indiana", points:[
                   { date:"1818", source:"ksep: R21", text:"Indiana prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1965", text:"Indiana legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"KS", name:"Kansas", points:[
                   { date:"1851", source:"ksep: R36", text:"Kansas legalizes interracial marriage.", nodisp:true, color:cmx },
                   { date:"1855", text:"Kansas prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"KY", name:"Kentucky", points:[
                   { date:"1792", source:"ksep: R17", text:"Kentucky prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"LA", name:"Louisiana", points:[
                   { date:"1724", source:"ksep: R10", text:"Louisiana prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true },
                   { date:"1808", source:"ksep: R20", text:"The Louisiana Civil Code prohibits \"free people of color\" from marrying whites (or slaves). Spanish rule had previously issued dispensations for whites marrying free people of color, and had also provided for the legitimation of mixed-blood children born in concubinage." }]},
               {state:"MA", name:"Massachusetts", points:[
                   { date:"1705", source:"ksep: R7", text:"Massachusetts follows Virginia and prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1840", source:"ksep: R32", text:"Massachusetts repeals its anti-miscegenation law.", nodisp:true, color:cmx },
                   { date:"1843", source:"ksep: R33", text:"Massachusetts legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"MD", name:"Maryland", points:[
                   { date:"1664", source:"ksep: R5", text:"The first anti-miscegenation law in Maryland is passed.", nodisp:true }]},
               {state:"ME", name:"Maine", points:[
                   { date:"1821", source:"ksep: R22", text:"Maine prohibits intermarriage between Whites and Negroes, Indians, or mulattos.", color:cm2, nodisp:true },
                   { date:"1883", text:"Maine legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"MI", name:"Michigan", points:[
                   { date:"1838", text:"Michigan prohibits intermarriage between Whites and Negroes, Indians, or mulattos.", nodisp:true },
                   { date:"1883", text:"Michigan legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"MN", name:"Minnesota", points:[]},  //none
               {state:"MO", name:"Missouri", points:[
                   { date:"1835", source:"ksep: R26", text:"Missouri prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1909", text:"Missouri expands its anti-miscegenation law to explicitely prohibit marriage between Whites and “Mongolians”." }]},
               {state:"MS", name:"Mississippi", points:[
                   { date:"1822", source:"ksep: R23", text:"Mississippi prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1892", text:"Mississippi expands its anti-miscegenation law to explicitely prohibit marriage between Whites and “Mongolians”.", nodisp:true, color:cm2 }]},
               {state:"MT", name:"Montana", points:[
                   { date:"1909", text:"Montana prohibits intermarriage between Whites and Negroes, mulattos, or Chinese and Japanese.", nodisp:true, color:cm2 },
                   { date:"1953", source:"ksep: R82", text:"Montana legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"NC", name:"North Carolina", points:[
                   { date:"1715", source:"ksep: R8", text:"North Carolina prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true }]},
               {state:"ND", name:"North Dakota", points:[
                   { date:"1909", text:"North Dakota prohibits intermarriage between Whites and Negroes, or mulattos.", nodisp:true },
                   { date:"1955", source:"ksep: R84", text:"North Dakota legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"NE", name:"Nebraska", points:[
                   { date:"1855", text:"Nebraska prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1913", text:"Nebraska expands its anti-miscegenation law to explicitely prohibit marriage between Whites and Chinese or Japanese.", nodisp:true, color:cm2 },
                   { date:"1963", text:"Nebraska legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"NH", name:"New Hampshire", points:[]},  //none
               {state:"NJ", name:"New Jersey", points:[]},  //none
               {state:"NM", name:"New Mexico", points:[
                   { date:"1857", source:"ksep: R42", text:"New Mexico prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1866", source:"ksep: R49", text:"New Mexico legalizes interracial marriage.", color:cmx, nodisp:true }]},
               {state:"NV", name:"Nevada", points:[
                   { date:"1861", source:"ksep: R43", text:"In response to Chinese immigration, Nevada passes the first anti-miscegenation laws explicitly targeting Asian Americans, prohibiting marriage between Blacks, mulattos, Indians, and Chinese.", color:cm2 },
                   { date:"1912", source:"ksep: R67", text:"Nevada updates its anti-miscegenation law to address Filipino immigration and add “color” language: “It shall be unlawful for any person of the Caucasian or white race to intermarry with any person of the Ethiopian or black race, Malay or brown race, Mongolian or yellow race, or the American Indian or red race, within the State of Nevada”", color:cm2 },
                   { date:"1959", text:"Nevada legalize interracial marriage.", nodisp:true, color:cmx }]},
               {state:"NY", name:"New York", points:[]},  //none
               {state:"OH", name:"Ohio", points:[
                   { date:"1861", source:"ksep: R44", text:"Ohio prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1887", source:"ksep: R58", text:"Ohio legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"OK", name:"Oklahoma", points:[
                   { date:"1897", source:"ksep: R60", text:"Oklahoma prohibits intermarriage between Whites and Negroes or mulattos." }]},
               {state:"OR", name:"Oregon", points:[
                   { date:"1862", source:"ksep: R45", text:"Oregon prohibits intermarriage between Whites and Negroes, Indians, or mulattos.", nodisp:true },
                   { date:"1866", text:"Oregon expands its anti-miscegenation law to explicitely prohibit marriage between Whites and Chinese.", nodisp:true, color:cm2 },
                   { date:"1893", text:"Oregon expands its anti-miscegenation law to explicitely prohibit marriage between Whites and all “Mongolians”.", nodisp:true, color:cm2 },
                   { date:"1951", source:"ksep: R81", text:"Oregon legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"PA", name:"Pennsylvania", points:[
                   { date:"1725", source:"ksep: R11", text:"Pennsylvania prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true },
                   { date:"1780", source:"ksep: R14", text:"Pennsylvania legalizes interracial marriage.", color:cmx }]},
               {state:"RI", name:"Rhode Island", points:[
                   { date:"1798", source:"ksep: R18", text:"Rhode Island prohibits intermarriage between Whites and Negroes, Indians, or mulattos." },
                   { date:"1868", source:"ksep: R51", text:"Rhode Island legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"SC", name:"South Carolina", points:[
                   { date:"1717", source:"ksep: R9", text:"South Carolina prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true }]},
               {state:"SD", name:"South Dakota", points:[
                   { date:"1909", text:"South Dakota prohibits intermarriage between Whites and Negroes, or mulattos.", nodisp:true },
                   { date:"1913", text:"South Dakota prohibits marriage of \"persons belonging to the African, Corean [sic], Malayan, or Mongolian race with any person of the opposite sex belonging to the Caucasian or White race\".", nodisp:true, color:cm2 },
                   { date:"1957", text:"South Dakota legalizes interracial marriage.", nodisp:true }]},
               {state:"TN", name:"Tennessee", points:[
                   { date:"1741", source:"ksep: R12", text:"Tennessee prohibits intermarriage between Whites and Negroes or mulattos", nodisp:true }]},
               {state:"TX", name:"Texas", points:[
                   { date:"1837", source:"ksep: R28", text:"Texas prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"UT", name:"Utah", points:[
                   { date:"1852", text:"Utah prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true },
                   { date:"1888", text:"Utah expands its anti-miscegenation law to explicitely prohibit marriage between Whites and “Mongolians”.", nodisp:true, color:cm2 },
                   { date:"1963", text:"Utah legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"VA", name:"Virginia", points:[
                   { date:"1630", source:"ksep: R2", text:"A Jamestown, Virginia court order states that \"a White man... be soundly whipped before an assemblage of Negroes and others for abusing himself to the dishonor of God and the shame of Christians by defiling his body in lying with a Negro, which fault he is to acknowledge next Sabbath day.\"" },
                   { date:"1662", source:"ksep: R3", text:"Virginia becomes the first colony to establish anti-miscegenation laws stating “sexual intercourse between a White and a Black was twice as evil as fornication between two White adults.” Punishment could include public whipping." },
                   { date:"1691", source:"ksep: R6", text:"Virginia enacts legislation to prohibit marriage and fornication between Whites and non-Whites. The legislation states that: \"...for the prevention of that abominable mixture and spurious issue which may hereafter increase in this dominion with English, or White women, as well as by their unlawful accompanying with one another. Be it enacted... that for the time to come whatsoever English or White man or woman being free shall intermarry with a Negro, mulatto, or Indian man or woman, bound or free, shall within three months thereafter be banished and removed from the dominion forever...and be it further enacted... that if any English or White woman shall have a bastard child by a Negro or mulatto, she shall pay the sum of fifteen pounds sterling, within one month after the child is born, to the wardens of the parish, where she shall be delivered of such child, and in default of such payment, she shall be taken into possession of the said church wardens and disposed of for five years... and such bastard child shall be found out as a servant by the said church wardens until he or she shall attain the age of thirty years.\"" },
                   { date:"1924", source:"ksep: R74", text:"The Racial Integrity Act passes in Virginia, proclaiming the existence of only two racial categories: \"pure\" White and everybody else (i.e. colored). The act makes interracial marriages illegal and classifies many Native Americans as Black. The law strips people of color of their land, voting rights, and legal identity. It emphasizes the \"scientific\" basis of race assessment, and the degenerative dangers of race mixing", color:cm2 },
                   { date:"1924", source:"ksep: R75", text:"Virginia expands its anti-miscegenation law, prohibiting the marriage of whites to \"Negroes, Mongolians, American Indians, Asiatic Indians, and Malays\"", nodisp:true, color:cm2 },
                   { date:"1955", source:"ksep: R83", text:"Virginia State Supreme Court of Appeals upholds anti-miscegenation laws, stating that the laws served legitimate purposes, including: \"to preserve the racial integrity of its citizens\", and to prevent \"the corruption of blood\", \"a mongrel breed of citizens\", and \"the obliteration of racial pride.\"", color:cm2 }]},
               {state:"VT", name:"Vermont", points:[]},  //none
               {state:"WA", name:"Washington", points:[
                   { date:"1855", text:"Washington prohibits intermarriage between Whites and Negroes, Indians, or mulattos.", nodisp:true },
                   { date:"1868", source:"ksep: R50", text:"Washington Territory legalizes interracial marriage.", nodisp:true, color:cmx }]},
               {state:"WI", name:"Wisconsin", points:[]},  //none
               {state:"WV", name:"West Virginia", points:[
                   { date:"1863", source:"ksep: R46", text:"West Virginia prohibits intermarriage between Whites and Negroes or mulattos.", nodisp:true }]},
               {state:"WY", name:"Wyoming", points:[
                   { date:"1913", text:"Wyoming prohibits \"all marriages of white persons with Negroes, Mulattoes, Mongolians or Malays\"", nodisp:true, color:cm2 },
                   { date:"1965", text:"Wyoming legalizes interracial marriage.", nodisp:true, color:cmx }]}],
        tlpts = [  //all code:"R", generated cid
            { date:"1492", text:"With the arrival of Columbus, Native Americans are brought into contact with Europeans and with African slaves" },
            { date:"1614-04-05", text:"Pocahontas (aka Matoaka or Amonute, later Rebecca), 19 year old daughter of Algonquin Chief Powhatan, marries tobacco planter John Rolfe in probably the earliest officially recorded interracial marriage in North America" },
            { date:"1700", text:"Intermarriage between the African slaves and Native Americans. During the 18th century the African slave population is predominantly male and there is a decline in the number of Native American men." },
            { date:"1784", source:"ksep: R15", text:"Patrick Henry presents a Bill to the Virginia Legislature reflecting the philosophy that racial mixing will address social problems stating that: \"...every White man who married an Indian woman should be paid ten pounds, and five for each child born of such a marriage; and that if any White woman married an Indian she should be entitled to ten pounds with which the county court should buy them livestock; that once each year the Indian husband of this woman should be entitled to three pounds with which the county court should buy clothes for him; that every child born to the Indian man and White woman should be educated by the state between the ages of ten and twenty-one years...\"" },
            { date:"1800", source:"ksep: M1", text:"First major wave of Arab immigration. Motivations include escaping civil war and/or religious persecution. The overwhelming majority are from the Ottoman province of Syria (now Syria, Lebanon, Jordan, and Palestine). Most immigrants are Christian, only 5-10% are Muslim and and an even smaller number are Druze. Men outnumber women 4:1, leading to high intermarriage rates." },
            { date:"1838", source:"ksep: R29", text:"Michigan and Arkansas prohibit intermarriage between Whites and Negroes, Indians, or mulattos.", nodisp:true },
            { date:"1850", text:"Chinese American men marry African American women in high proportions to their total marriage numbers due to few Chinese American women being in the United States" },
            { date:"1852", source:"ksep: R38", text:"Alabama and Utah prohibit intermarriage between Whites and Negroes or mulattos.", nodisp:true },
            { date:"1855", source:"ksep: R41", text:"Kansas, Nebraska and Washington prohibit intermarriage between Whites and Negroes, Indians (in Washington), or mulattos.", nodisp:true },
            { date:"1864", source:"ksep: R47", text:"Colorado and Idaho prohibit intermarriage between Whites and Negroes, mulattos. Idaho also prohibits intermarriage between Whites and Chinese.", nodisp:true },
            { date:"1883", source:"ksep: R57", text:"Maine and Michigan legalize interracial marriage.", nodisp:true },
            { date:"1900s", source:"ksep: R61", text:"The eugenics movement supplies a new set of arguments to support existing restrictions on interracial marriage. These arguments incorporate a \"scientific\" brand of racism, emphasizing the supposed biological dangers of mixing the races – also known as miscegenation." },
            { date:"1909", source:"ksep: R65", text:"South Dakota and North Dakota prohibit intermarriage between Whites and Negroes, or mulattos.", nodisp:true },
            { date:"1913-1947", source:"ksep: R70", text:"30 of 48 states maintain anti-miscegenation laws." },
            { date:"1930", text:"The Motion Picture Production Code (aka Hays Code) explicitly states the depiction of \"miscegenation... is forbidden\"" },
            { date:"1950", source:"ksep: R80", text:"Anti-miscegenation legislation now generally includes not only unions between blacks and whites but also Mongolians, Malayans, Mulattos and Native Americans." },
            { date:"1957", source:"ksep: R85", text:"Colorado and South Dakota legalize interracial marriage.", nodisp:true },
            { date:"1959", source:"ksep: R87", text:"Mildred Jeter and Richard Loving are married in Washington DC and arrested when they return home to Virginia for violating VA’s anti-miscegenation law. Jeter and Loving plead guilty to the charge of miscegenation in Virginia court and are sentenced to a year in jail, which they could avoid by leaving Virginia and staying out for 25 years. They appeal the ruling." },
            { date:"1959", source:"ksep: R88", text:"Idaho and Nevada legalize interracial marriage.", nodisp:true },
            { date:"1963", source:"ksep: R89", text:"Nebraska and Utah legalize interracial marriage.", nodisp:true },
            { date:"1964-12-07", source:"ksep: R90", text:"The U.S. Supreme Court, which ruled against Jim Crow laws in the 1954 decision of Brown v. Board of Education, rules as invalid a Florida statute allowing harsher penalties for cohabitation and adultery by interracial couples than same-race couples in McLaughlin v. Florida. This case is said to be a predecessor to the Loving v. Virginia case (in 1967)." },
            { date:"1965", source:"ksep: R91", text:"Indiana and Wyoming legalize interracial marriage.", nodisp:true },
            { date:"1913", source:"ksep: R68", text:"South Dakota prohibits marriage of \"persons belonging to the African, Corean [sic], Malayan, or Mongolian race with any person of the opposite sex belonging to the Caucasian or White race\". Wyoming prohibits \"all marriages of white persons with Negroes, Mulattoes, Mongolians or Malays\"", color:cm2 },
            { date:"1967", source:"ksep: R114", text:"17 states still have anti-miscegenation laws: Alabama, Arkansas, Delaware, Florida, Georgia, Kentucky, Louisiana, Maryland, Mississippi, Missouri, North Carolina, Oklahoma, South Carolina, Tennessee, Texas, Virginia and West Virginia. Only 9 states never had anti-miscegenation laws (Alaska, Connecticut, Hawai’i, Minnesota, New Hampshire, New Jersey, New York, Vermont, and Wisconsin).", nodisp:true },
            { date:"1967", source:"ksep: R92", text:"Loving v. Virginia (the case involving Mildred Jeter and Richard Loving) is heard by the U.S. Supreme Court which strikes down anti-miscegenation laws as unconstitutional, ruling that distinctions between citizens solely because of their ancestry was \"odious to a free people whose institutions are founded upon the doctrine of equality.\"" }];


    function datapoints () {
        tlpts.forEach(function (pt, idx) {
            pt.sv = "miscegenation";
            pt.codes = "R";
            pt.instid = "miscegenation" + idx; });
        return tlpts;
    }

    return {
        display: function () { jt.err("Not implemented yet"); },
        datapoints: function () { return datapoints(); }
    };
}());


