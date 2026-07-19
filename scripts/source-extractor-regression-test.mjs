import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractAbhaChamberEvents,
  extractAsharqiaChamberEvents,
  extractCodeMcitPrograms,
  extractInvestSaudiEvents,
  extractIthraEvents,
  extractJazanChamberEvents,
  extractMadinahArchitectureFestival,
  extractMadinahChamberPayload,
  extractHayyJameelCards,
  extractHayyJameelDetail,
  extractHayyJameelEvents,
  baseCandidate,
  extractSaudiconEvents,
  readableExcerpt,
  jazanApiEndpoint,
  jazanMonthsToFetch,
  extractKaustEvents,
  extractKauEvents,
  extractMakkahChamberEvents,
  extractUmmAlQuraEventDetail,
  extractMocCalendarPayload,
  extractMonshaat,
  extractQassimChamberEvents,
  extractSaudiSpaceAgencyEvents,
  extractSfdaEvents,
  extractSaudiProLeagueFixtures,
  extractSdaiaAcademyPrograms,
  extractSdaiaCalendarEvents,
  extractVisitSaudiApiEvents,
  loadSourceExtraction,
  sourceExtractors
} from './collect-source-candidates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => fs.readFileSync(path.join(root, 'scripts', 'fixtures', name), 'utf8');
const referenceDate = new Date('2026-07-19T00:00:00+03:00');

const ithraEvents = extractIthraEvents(JSON.stringify({
  hits: [{
    id: 18080,
    locale: 'en',
    title: 'Kinusaiga Art',
    url: 'https://www.ithra.com/en/programme/2026/ithra-childrens-festival-2026/kinusaiga-art',
    description: '<p>A family art workshop.</p>',
    start_date: 1784098800,
    end_date: 1784201400,
    start_timestamp: [1784098800, 1784107800],
    end_timestamp: [1784106000, 1784115000],
    website_calendar_json: [{
      title: 'Kinusaiga Art',
      pageLink: 'https://www.ithra.com/en/programme/2026/ithra-childrens-festival-2026/kinusaiga-art'
    }, {
      title: 'Kinusaiga Art',
      pageLink: 'https://www.ithra.com/en/programme/2026/ithra-childrens-festival-2026/kinusaiga-art'
    }],
    website_json: {
      date: '15th July 2026',
      time: '10:00 AM - 2:30 PM',
      age: '6+ Years with families',
      language: 'English, Arabic',
      location: 'Ithra Tower - level 8, Art Studio',
      button_text: '35.00 SAR'
    },
    ticket_price: 35,
    image_url: ['https://www.ithra.com/application/files/cache/thumbnails/kinusaiga.jpg'],
    filter_tags: ['Workshop', 'Children-Museum']
  }]
}), {
  id: 'ithra-events',
  name: 'Ithra Events',
  url: 'https://www.ithra.com/en/programme/2026',
  owner: 'King Abdulaziz Center for World Culture / Ithra'
});

assert.equal(ithraEvents.length, 1);
assert.equal(ithraEvents[0].starts_at, '2026-07-15T10:00:00+03:00');
assert.equal(ithraEvents[0].ends_at, '2026-07-15T14:30:00+03:00');
assert.equal(ithraEvents[0].sessions.length, 2);
assert.equal(ithraEvents[0].sessions[0].starts_at, '2026-07-15T10:00:00+03:00');
assert.equal(ithraEvents[0].price_label, '35 SAR');
assert.equal(ithraEvents[0].verification_method, 'official-public-algolia-index');
assert.equal(ithraEvents[0].venue, 'Ithra - Ithra Tower - level 8, Art Studio');

const visitSaudiSource = {
  id: 'visit-saudi-calendar',
  name: 'Visit Saudi Calendar',
  url: 'https://www.visitsaudi.com/en/saudi-calendar',
  owner: 'Saudi Tourism Authority',
  categories: ['tourism'],
  cities: ['Saudi Arabia']
};

const visitSaudiEvents = extractVisitSaudiApiEvents(JSON.stringify({
  response: {
    data: [{
      title: 'Saudi Live Test Event',
      subtitle: 'Visitor-facing event',
      startDate: '2026-08-05T00:00:00.000+00:00',
      endDate: '2026-08-07T00:00:00.000+00:00',
      cityId: 'riyadh',
      pageLink: { url: 'https://www.visitsaudi.com/en/events/saudi-live-test-event' },
      eventDescription: '<p>Live test description.</p>',
      bannerImages: [{
        s7fileReference: 'https://scth.scene7.com/is/image/scth/saudi-live-test-event',
        alt: 'Saudi Live Test Event'
      }],
      timings: [{ startTimeLabel: '16:00', endTimeLabel: '22:30' }],
      season: { title: 'Experience Riyadh Season' },
      categories: [{ title: 'Entertainment' }],
      targetGroupTags: ['sauditourism:audience/adults']
    }, {
      title: 'Saudi Overnight Test Event',
      subtitle: 'Late-night event whose source keeps the same calendar date',
      startDate: '2026-08-09T00:00:00.000+00:00',
      endDate: '2026-08-09T00:00:00.000+00:00',
      cityId: 'riyadh',
      pageLink: { url: 'https://www.visitsaudi.com/en/events/saudi-overnight-test-event' },
      timings: [{ startTimeLabel: '21:00', endTimeLabel: '00:30' }]
    }]
  }
}), visitSaudiSource);

assert.equal(visitSaudiEvents.length, 2);
assert.equal(visitSaudiEvents[0].title, 'Saudi Live Test Event');
assert.equal(visitSaudiEvents[0].city, 'Riyadh');
assert.equal(visitSaudiEvents[0].starts_at, '2026-08-05T16:00:00+03:00');
assert.equal(visitSaudiEvents[0].ends_at, '2026-08-07T22:30:00+03:00');
assert.ok(visitSaudiEvents[0].tags.includes('Experience Riyadh Season'));
assert.equal(visitSaudiEvents[0].image_url, 'https://scth.scene7.com/is/image/scth/saudi-live-test-event?wid=1400&hei=788&fit=constrain&fmt=webp');
assert.equal(visitSaudiEvents[1].starts_at, '2026-08-09T21:00:00+03:00');
assert.equal(visitSaudiEvents[1].ends_at, '2026-08-10T00:30:00+03:00', 'same-date Visit Saudi closing times before the start must roll into the next day');

const investSaudiEvents = extractInvestSaudiEvents(JSON.stringify({
  data: [{
    id: 46229,
    title: 'INNOPROM. Saudi Arabia 2026',
    description: 'International industrial and investment platform.',
    location: 'The Arena, Riyadh, Saudi Arabia',
    image: 'https://investsaudi.sa/backend/wp-content/uploads/2026/02/innoprom-logos-01-scaled.png',
    button: { href: 'https://ksa.biwexpo.com/en/registration-visitor' },
    acf: {
      start_date: '08/02/2026',
      end_date: '10/02/2026',
      link: 'https://ksa.biwexpo.com/en/registration-visitor'
    },
    sectors: []
  }, {
    id: 15049,
    title: 'Web Summit Lisbon 2026',
    description: 'Global technology conference.',
    location: 'Lisbon, Portugal.',
    image: 'https://investsaudi.sa/backend/wp-content/uploads/2025/12/web-summite-lisbon-1-1.png',
    button: { href: '/coming-soon' },
    acf: {
      start_date: '09/11/2026',
      end_date: '12/11/2026',
      link: ''
    },
    sectors: []
  }]
}), {
  id: 'invest-saudi-events',
  name: 'Invest Saudi Events',
  url: 'https://www.investsaudi.sa/events',
  owner: 'Ministry of Investment / Invest Saudi',
  categories: ['investment', 'business'],
  cities: ['Saudi Arabia', 'Global']
});

assert.equal(investSaudiEvents.length, 2);
assert.equal(investSaudiEvents[0].city, 'Riyadh');
assert.equal(investSaudiEvents[0].starts_at, '2026-02-08T09:00:00+03:00');
assert.equal(investSaudiEvents[0].ends_at, '2026-02-10T18:00:00+03:00');
assert.ok(investSaudiEvents[0].image_url.includes('innoprom-logos-01-scaled.png'));
assert.equal(investSaudiEvents[1].city, 'Global');
assert.equal(investSaudiEvents[1].url, 'https://www.investsaudi.sa/events');

const saudiSpaceAgencyEvents = extractSaudiSpaceAgencyEvents(JSON.stringify({
  data: {
    searchResult: {
      items: [{
        id: '18404',
        url: '/en/events/spacedebris2026/',
        title: 'Space Debris Conference 2026',
        image: '/media/uh1azmeq/sdcevent26.webp?width=466&height=191&rnd=133752762668230000',
        startDate: '2026-01-26T07:00:00Z',
        endDate: '2026-01-27T15:00:00Z',
        brief: 'Space sustainability conference in Riyadh.',
        location: 'Riyadh, Saudi Arabia'
      }, {
        id: '5273',
        url: '/en/events/spacedebris/',
        title: 'Space Debris',
        image: '/media/hgyloqwa/sdc-event-header.webp?width=466&height=191&rnd=133504631959500000',
        startDate: '2024-02-11T07:00:00Z',
        endDate: '2024-02-12T15:30:00Z',
        brief: 'Space debris event at CST headquarters.',
        location: 'Communication, Space & Technology Commission Headquarters'
      }, {
        id: '3506',
        url: '/en/events/iac2022-paris/',
        title: 'International Astronautical Congress IAC2022 in Paris',
        image: '/media/4pyhjdal/iac2022.webp?width=466&height=191&rnd=133492252309270000',
        startDate: '2022-09-22T09:00:00Z',
        endDate: '2022-09-22T19:30:00Z',
        brief: 'Saudi Space Agency international participation.',
        location: 'Paris, France'
      }]
    }
  }
}), {
  id: 'saudi-space-agency-events',
  name: 'Saudi Space Agency Events',
  url: 'https://ssa.gov.sa/en/events/?path=/events/',
  owner: 'Saudi Space Agency',
  categories: ['space', 'science'],
  cities: ['Riyadh', 'Saudi Arabia']
});

assert.equal(saudiSpaceAgencyEvents.length, 3);
assert.equal(saudiSpaceAgencyEvents[0].city, 'Riyadh');
assert.equal(saudiSpaceAgencyEvents[0].starts_at, '2026-01-26T10:00:00+03:00');
assert.equal(saudiSpaceAgencyEvents[0].ends_at, '2026-01-27T18:00:00+03:00');
assert.equal(saudiSpaceAgencyEvents[0].publication_gate, 'human-review');
assert.ok(saudiSpaceAgencyEvents[0].image_url.includes('width=1400'));
assert.equal(saudiSpaceAgencyEvents[1].city, 'Riyadh');
assert.equal(saudiSpaceAgencyEvents[1].publication_gate, 'human-review');
assert.equal(saudiSpaceAgencyEvents[2].city, 'Global');
assert.equal(saudiSpaceAgencyEvents[2].publication_gate, 'source-evidence');

const sfdaEvents = await extractSfdaEvents(`
  <a href="/ar/workshop/5521991">
    2026-07-21 - 2026-07-21 دور مقدمي الرعاية الصحية وضباط الاتصال في التعامل مع انذارات السلامة الصادرة من المركز الوطني لبلاغات الأجهزة والمستلزمات الطبية
    رابط الدخول لورشة العمل
  </a>
`, {
  id: 'sfda-events',
  name: 'Saudi Food and Drug Authority Events',
  url: 'https://www.sfda.gov.sa/',
  owner: 'Saudi Food and Drug Authority',
  categories: ['healthcare', 'workshops'],
  cities: ['Riyadh', 'Jeddah', 'Saudi Arabia'],
  collector_pages: []
});

assert.equal(sfdaEvents.length, 1);
assert.equal(sfdaEvents[0].title, 'دور مقدمي الرعاية الصحية وضباط الاتصال في التعامل مع انذارات السلامة الصادرة من المركز الوطني لبلاغات الأجهزة والمستلزمات الطبية');
assert.equal(sfdaEvents[0].starts_at, '2026-07-21T09:00:00+03:00');
assert.equal(sfdaEvents[0].ends_at, '2026-07-21T18:00:00+03:00');
assert.equal(sfdaEvents[0].city, 'Online');
assert.equal(sfdaEvents[0].category, 'regulatory workshop');

const monshaatSource = {
  id: 'monshaat-events',
  name: "Monsha'at All Events",
  url: 'https://www.monshaat.gov.sa/en/events-list',
  owner: "Monsha'at",
  categories: ['entrepreneurship'],
  cities: ['Saudi Arabia'],
  disable_internal_api: true
};

const monshaatEvents = await extractMonshaat(`
  <a title="SME Growth Forum" href="/en/node/123" class="event-card">
    <div class="event-card-day">12</div>
    <div class="event-card-month">2026 August</div>
    <p class="event-card-desc">Forum for Saudi SMEs.</p>
    <span class="event-card-location-txt">Jeddah</span>
  </a>
`, monshaatSource);

assert.equal(monshaatEvents.length, 1);
assert.equal(monshaatEvents[0].title, 'SME Growth Forum');
assert.equal(monshaatEvents[0].city, 'Jeddah');
assert.equal(monshaatEvents[0].starts_at, '2026-08-12T09:00:00+03:00');
const monshaatRangeEvents = await extractMonshaat(`
  <a title="Monshaat Range Demo" href="/en/node/124" class="event-card">
    <div class="event-card-day">05 - 12</div>
    <div class="event-card-month">2018 March</div>
    <p class="event-card-desc">Demo for parsing range text.</p>
    <span class="event-card-location-txt">Riyadh</span>
  </a>
`, {
  ...monshaatSource,
  disable_internal_api: true
});
assert.equal(monshaatRangeEvents.length, 1);
assert.equal(monshaatRangeEvents[0].starts_at, '2018-03-05T09:00:00+03:00');
assert.equal(monshaatRangeEvents[0].ends_at, '2018-03-12T17:00:00+03:00');

const sdaiaSource = {
  id: 'sdaia-academy-programs',
  name: 'SDAIA Academy Programs',
  url: 'https://sdaia.gov.sa/en/Sectors/academy/bootcamps/Pages/default.aspx',
  owner: 'Saudi Data and AI Authority / SDAIA Academy',
  categories: ['AI', 'data'],
  cities: ['Riyadh']
};

const sdaiaPrograms = await extractSdaiaAcademyPrograms(`
  <a href="/en/Sectors/academy/bootcamps/Pages/applied-ai.aspx" title="Applied AI Bootcamp">
    <h3>Applied AI Bootcamp</h3>
    <span>29 March 2027 - 21 May 2027</span>
    <p>In Riyadh for data and AI practitioners.</p>
  </a>
`, sdaiaSource);

assert.equal(sdaiaPrograms.length, 1);
assert.equal(sdaiaPrograms[0].title, 'Applied AI Bootcamp');
assert.equal(sdaiaPrograms[0].starts_at, '2027-03-29T09:00:00+03:00');
assert.equal(sdaiaPrograms[0].category, 'AI bootcamp');

const codeSource = {
  id: 'code-mcit-programs',
  name: 'CODE MCIT Programs',
  url: 'https://code.mcit.gov.sa/en/our-programs',
  owner: 'Ministry of Communications and Information Technology / CODE',
  categories: ['technology'],
  cities: ['Riyadh'],
  disable_detail_fetch: true
};

const codePrograms = await extractCodeMcitPrograms(`
  <div class=" row m-0 p-0 pt-4 main-item-program Program">
    <div class="program-image">
      <img src="/sites/default/files/styles/program_home_page/public/2025-12/multiverse.png?itok=test" width="450" height="230" alt="Multiverse - Tech Founders 4th Edition" />
    </div>
    <div class="program-text">
      <div class="col-12 element-title program-title"><a href="/en/eventlive-code-test" hreflang="en">Multiverse - Tech Founders 4th Edition</a></div>
      <div class="col-12 program-created">2026</div>
      <div class="col-12 program-category"><div class="tags"><div class="item-list"><ul><li>Incubator</li></ul></div></div><div class="status"><div class="item-list"><ul><li class="bg-success open"> Open </li></ul></div></div></div>
      <div class="col-12 program-body">An immersive program for technology startup founders. Program Timeline 1 December 2025 Applications open 2 January 2026 Applications close 7 June 2026 Start of incubation 8 June 2026 Demo Day</div>
    </div>
  </div>
`, codeSource);

assert.equal(codePrograms.length, 1);
assert.equal(codePrograms[0].title, 'Multiverse - Tech Founders 4th Edition');
assert.equal(codePrograms[0].starts_at, '2025-12-01T09:00:00+03:00');
assert.equal(codePrograms[0].ends_at, '2026-06-08T18:00:00+03:00');
assert.equal(codePrograms[0].category, 'incubator');
assert.ok(codePrograms[0].image_url.includes('/styles/program_home_page/public/2025-12/multiverse.png'));

const mocSource = {
  id: 'moc-cultural-calendar',
  name: 'Ministry of Culture Cultural Calendar',
  url: 'https://www.moc.gov.sa/en/Modules/Pages/Cultural-Calendar',
  owner: 'Ministry of Culture',
  categories: ['culture'],
  cities: ['Saudi Arabia'],
  candidate_gate: 'human-review'
};

const mocItems = extractMocCalendarPayload({
  Events: [{
    title: 'Film Business Accelerator',
    fromDate: '20260118T210000Z',
    toDate: '20261230T210000Z',
    eventDetailPageLink: 'Modules/Pages/Initiative/Film%20Business%20Accelerator/EventDetail',
    templatePageLink: 'Modules/Pages/Initiative/Film%20Business%20Accelerator/EventDetail',
    regionName: 'Riyadh',
    categoryName: 'Initiative',
    image: '/-/media/Project/Ministries/Moc/Events/Film-events/accelerator.jpg'
  }, {
    title: 'Culture Night',
    fromDate: '20260704T210000Z',
    toDate: '20260723T210000Z',
    eventDetailPageLink: 'Modules/Pages/Events/Culture%20Night/EventDetail',
    regionName: 'Jeddah',
    categoryName: 'Events',
    image: '/-/media/Project/Ministries/Moc/Events/night.jpg'
  }, {
    title: 'hi',
    fromDate: '20260704T210000Z',
    toDate: '20260723T210000Z',
    categoryName: 'Initiative'
  }]
}, mocSource);

assert.equal(mocItems.length, 2);
assert.equal(mocItems[0].title, 'Film Business Accelerator');
assert.equal(mocItems[0].starts_at, '2026-01-19T00:00:00+03:00');
assert.equal(mocItems[0].ends_at, '2026-12-31T00:00:00+03:00');
assert.equal(mocItems[0].publication_gate, 'source-evidence');
assert.equal(mocItems[0].category, 'cultural initiative');
assert.ok(mocItems[0].image_url.includes('/-/media/Project/Ministries/Moc/Events/Film-events/accelerator.jpg'));
assert.equal(mocItems[1].publication_gate, 'human-review');
assert.equal(mocItems[1].category, 'cultural event');

const splSource = {
  id: 'saudi-pro-league-fixtures',
  name: 'Saudi Pro League Fixtures',
  url: 'https://www.spl.com.sa/en',
  owner: 'Saudi Pro League',
  categories: ['sports', 'football'],
  cities: ['Saudi Arabia']
};

const splFixtures = extractSaudiProLeagueFixtures(JSON.stringify({
  content: [{
    id: 90001,
    kickoff: { millis: Date.parse('2026-08-20T18:00:00Z') },
    teams: [
      { team: { club: { name: 'Al Hilal' } } },
      { team: { club: { name: 'Al Nassr' } } }
    ],
    ground: { name: 'Kingdom Arena', city: 'Riyadh' },
    gameweek: { gameweek: 1, compSeason: { label: '2026/27' }, competition: { description: 'Saudi Arabian League' } },
    metadata: { 'ticket-url': 'https://webook.com/en/events/test-spl-fixture' }
  }]
}), splSource);

assert.equal(splFixtures.length, 1);
assert.equal(splFixtures[0].title, 'Al Hilal vs Al Nassr');
assert.equal(splFixtures[0].starts_at, '2026-08-20T21:00:00+03:00');
assert.equal(splFixtures[0].ends_at, '2026-08-20T23:00:00+03:00');
assert.equal(splFixtures[0].city, 'Riyadh');
assert.equal(splFixtures[0].source_url, undefined);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    status: 200,
    data: {
      events: [{
        eventsMasterId: 511,
        eventName: 'KAUST Research Open Day',
        eventStartDate: '2026-09-14',
        eventEndDate: '2026-09-14',
        eventStartTime: '10:30:00',
        eventEndTime: '15:00:00',
        eventStatus: 'Published',
        eventVisibility: 'Public',
        eventLocationType: 'Map',
        eventLocationName: 'Discovery Square',
        description: 'Public research showcase for the KAUST community.'
      }]
    }
  })
});

let kaustEvents;
try {
  kaustEvents = await extractKaustEvents('', {
    id: 'saudi-university-events',
    name: 'Saudi Universities and Technical Colleges',
    url: 'https://www.kaust.edu.sa/',
    owner: 'Saudi universities and technical colleges',
    categories: ['education'],
    cities: ['Thuwal'],
    skip_snapshot: true
  });
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(kaustEvents.length, 1);
assert.equal(kaustEvents[0].title, 'KAUST Research Open Day');
assert.equal(kaustEvents[0].city, 'Thuwal');
assert.equal(kaustEvents[0].starts_at, '2026-09-14T10:30:00+03:00');
assert.equal(kaustEvents[0].ends_at, '2026-09-14T15:00:00+03:00');
assert.equal(kaustEvents[0].publication_gate, 'human-review');

const kauEvents = extractKauEvents(`
  "children":"Future Frontiers for Businesses: Catalysts for Growth in a Transformational Economy"
  "children":"01 Dec 2026 - 02 Dec 2026"
  "href":"/en/event/future-frontiers-for-businesses-catalysts-for-growth-in-a-transformational-economy"
`, {
  id: 'kau-events',
  name: 'King Abdulaziz University Events',
  url: 'https://kau.edu.sa/en/events',
  collector_url: 'https://kau.edu.sa/en/events',
  owner: 'King Abdulaziz University'
});

assert.equal(kauEvents.length, 1);
assert.equal(kauEvents[0].title, 'Future Frontiers for Businesses: Catalysts for Growth in a Transformational Economy');
assert.equal(kauEvents[0].city, 'Jeddah');
assert.equal(kauEvents[0].organizer, 'King Abdulaziz University');
assert.match(kauEvents[0].url, /^https:\/\/kau\.edu\.sa\/en\/event\//);
assert.equal(kauEvents[0].starts_at, '2026-12-01T09:00:00+03:00');
assert.equal(kauEvents[0].ends_at, '2026-12-02T18:00:00+03:00');

const asharqiaEvents = await extractAsharqiaChamberEvents(`
  <li class="dfwp-item"><div class="event-Item list"><h3 class="title">معرض وظائف 2026</h3>
  <ul class="event-details"><li><div class="icon"><label class="fa-solid fa-location-dot" /></div><span>شركة معارض الظهران الدولية (اكسبو)</span></li>
  <li><div class="icon"><label class="fa-regular fa-calendar-days" /></div><span class="end-date">29/09/2026</span><span class="separator-date">-</span><span class="start-date">01/10/2026</span></li>
  <li class="time-Txt"><div class="icon"><label class="fa-regular fa-clock" /></div><span>12:00 AM</span><span class="separator-date">-</span><span>12:00 AM</span></li></ul>
  <a href="/sites/Arabic/Events/ChamberEvents/Pages/ChamberEventDetails.aspx?ItemID=410">التفاصيل</a></div></li>
`, {
  id: 'asharqia-chamber-events',
  name: 'Asharqia Chamber Events',
  url: 'https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx',
  owner: 'Asharqia Chamber'
});

assert.equal(asharqiaEvents.length, 1);
assert.equal(asharqiaEvents[0].city, 'Dhahran');
assert.equal(asharqiaEvents[0].starts_at, '2026-09-29T09:00:00+03:00');
assert.equal(asharqiaEvents[0].ends_at, '2026-10-01T18:00:00+03:00');

const makkahEvents = extractMakkahChamberEvents(`
  <li class="card media"><div class="media-body" itemscope="itemscope" itemtype="http://schema.org/Event">
    <span><img src="/web/image/event.event/566/image?unique=3166b23" class="img img-fluid event-image"/></span>
    <a itemprop="url" href="/event/2026-03-01-2026-03-02-566/register"><span itemprop="name">التوسع الذكي: متى وكيف تكبر مشروعك؟</span></a>
    <div><p>بناء استراتيجية توسع مدروسة</p></div>
    <span itemprop="startDate">01/03/2026</span><span itemprop="endDate">02/03/2026</span>
    <span itemprop="startDate">23:30</span><span itemprop="endDate">00:30</span>
    <span class="badge badge-info">حضوري</span><span class="badge badge-info">فعالية فوانيس</span>
  </div></li>
`, {
  id: 'makkah-chamber-events',
  name: 'Makkah Chamber Events',
  url: 'https://makkahcci.org.sa/events',
  owner: 'Makkah Chamber of Commerce'
});

assert.equal(makkahEvents.length, 1);
assert.equal(makkahEvents[0].city, 'Makkah');
assert.equal(makkahEvents[0].starts_at, '2026-03-01T23:30:00+03:00');
assert.equal(makkahEvents[0].ends_at, '2026-03-02T00:30:00+03:00');
assert.ok(makkahEvents[0].image_url.includes('/web/image/event.event/566/image'));

const uquEvent = extractUmmAlQuraEventDetail(`
  <h1 class="text-2xl font-bold mb-8 text-gray-900">دورة تقنية PCR بالمعامل الحيوية الجزيئية</h1>
  <div class="mb-8 text-base text-justify text-gray-700"><p>دورة عملية في تقنيات البيولوجيا الجزيئية.</p></div>
  <span>المدة:</span><span>2 يوم/أيام</span>
  <span>تبدأ في:</span><span>2026/07/26 - 10:00 - صباحاً</span>
  <a href="/App/Enrollments/register?event=fixture">التسجيل</a>
`, {
  id: 'umm-al-qura-events',
  name: 'Umm Al-Qura University Events Center',
  url: 'https://uqu.edu.sa/App/Events',
  owner: 'Umm Al-Qura University'
}, 'https://uqu.edu.sa/App/Events/41008');

assert.ok(uquEvent, 'UQU detail with an explicit schedule must be extracted');
assert.equal(uquEvent.city, 'Makkah');
assert.equal(uquEvent.venue, 'Umm Al-Qura University');
assert.equal(uquEvent.starts_at, '2026-07-26T10:00:00+03:00');
assert.equal(uquEvent.ends_at, '2026-07-27T18:00:00+03:00');
assert.match(uquEvent.registration_url, /\/App\/Enrollments\/register/);
assert.equal(extractUmmAlQuraEventDetail('<h1 class="text-2xl font-bold">خبر بلا موعد</h1>', { owner: 'UQU' }, 'https://uqu.edu.sa/App/Events/1'), null);

const madinahChamberEvents = extractMadinahChamberPayload(JSON.stringify({
  data: [{
    eventId: 501,
    title: 'ملتقى أعمال المدينة 2026',
    summery: '<p>ملتقى رسمي لقطاع الأعمال.</p><a href="https://survey.example.sa/register">التسجيل</a>',
    eventDate: '2026-12-01T10:00:00',
    imageUrl: 'event-501.jpg',
    organisers: 'غرفة المدينة المنورة',
    type: 'ملتقى',
    location: 'غرفة المدينة المنورة'
  }]
}), {
  id: 'madinah-chamber-events',
  name: 'Madinah Chamber Events',
  url: 'https://www.mcci.org.sa/Event/events',
  owner: 'Madinah Chamber of Commerce'
});

assert.equal(madinahChamberEvents.length, 1);
assert.equal(madinahChamberEvents[0].city, 'Madinah');
assert.equal(madinahChamberEvents[0].starts_at, '2026-12-01T10:00:00+03:00');
assert.equal(madinahChamberEvents[0].ends_at, '2026-12-01T12:00:00+03:00');
assert.match(madinahChamberEvents[0].image_url, /upload\/events\/main\/event-501\.jpg/);
assert.match(madinahChamberEvents[0].registration_url, /survey\.example\.sa/);

const madinahFestivalEvents = extractMadinahArchitectureFestival(`
  <h1>Madinah International Architecture Festival</h1>
  <h2>مهرجان المدينة المنورة الدولي للعمارة</h2>
  <span>Festival Date</span><strong>10 December 2026</strong>
  <img src="/_app/immutable/assets/competition-1.fixture.jpg" alt="Madinah architecture festival">
`, {
  id: 'madinah-architecture-festival',
  name: 'Madinah International Architecture Festival',
  url: 'https://mdc.almunawarah.sa/',
  owner: 'Al-Madinah Region Development Authority'
});

assert.equal(madinahFestivalEvents.length, 1);
assert.equal(madinahFestivalEvents[0].city, 'Madinah');
assert.equal(madinahFestivalEvents[0].starts_at, '2026-12-10T09:00:00+03:00');
assert.equal(madinahFestivalEvents[0].ends_at, '2026-12-10T21:00:00+03:00');
assert.match(madinahFestivalEvents[0].image_url, /competition-1\.fixture\.jpg/);

const hayySource = {
  id: 'hayy-jameel-events',
  name: "Hayy Jameel What's On",
  url: 'https://hayyjameel.org/whats-on/',
  owner: 'Art Jameel / Hayy Jameel'
};
const hayyCards = extractHayyJameelCards(`
  <li class="YESY mix-target all workshop up-coming families" data-order="1">
    <div class="uk-card"><div class="uk-card-header"><h5>Workshop</h5></div>
    <a href="https://hayyjameel.org/whats-on/pottery/" rel="bookmark" title="Hayy Makers | Pottery"><img data-src="https://hayyjameel.org/uploads/pottery-560x400.jpg"></a>
    <div class="uk-card-body"><h3><a href="https://hayyjameel.org/whats-on/pottery/" title="Hayy Makers | Pottery">Hayy Makers | Pottery</a></h3>
    <p class="uk-margin-medium-top">July 26, 2026 - July 28, 2026<br /><br /></p></div></div>
  </li>
  <li class="YESY mix-target all announcement past" data-order="2">
    <div class="uk-card"><div class="uk-card-header"><h5>Announcement</h5></div>
    <a href="https://hayyjameel.org/whats-on/past-call/" rel="bookmark" title="Past Open Call"></a>
    <div class="uk-card-body"><h3><a href="https://hayyjameel.org/whats-on/past-call/" title="Past Open Call">Past Open Call</a></h3>
    <p class="uk-margin-medium-top">August 24, 2026 - August 30, 2026<br /></p></div></div>
  </li>
`, hayySource);

assert.equal(hayyCards.length, 1, 'Hayy listing must reject cards labelled past even when their application window is later');
assert.equal(hayyCards[0].title, 'Hayy Makers | Pottery', 'Hayy listing must preserve the full programme title after the vertical separator');
assert.equal(baseCandidate(hayySource, hayyCards[0], 'data/raw/source-snapshots/hayy.fixture.html').title, 'Hayy Makers | Pottery', 'Hayy candidate identity must preserve the full programme title');
assert.equal(readableExcerpt('alpha beta gamma delta', 14), 'alpha beta...', 'source excerpts must end at word boundaries');
assert.equal(readableExcerpt('First clean sentence. Second sentence continues for much longer.', 32), 'First clean sentence.', 'source excerpts should prefer a complete sentence when one is available');
assert.equal(hayyCards[0].city, 'Jeddah');
assert.equal(hayyCards[0].starts_at, '2026-07-26T09:00:00+03:00');
assert.equal(hayyCards[0].ends_at, '2026-07-28T18:00:00+03:00');

const hayyDetail = extractHayyJameelDetail(`
  <nav class="side-nav uk-visible@m">
    <p class="strip_tagss">Hayy Makers</p>
    <p>Date and time:<br />Day 1:<br />Sunday, July 26<br />5 - 9PM</p>
    <p>Day 2:<br />Monday, July 27<br />5 - 9 PM</p>
    <p>Day 3:<br />Tuesday, July 28<br />5 - 9 PM</p>
    <p>Fees:<br />989 SAR</p><p>Location:<br />Hayy Makers, First Floor</p>
    <a href="https://applytoday.typeform.com/to/fixture">Register Here</a>
  </nav>
  <div class="uk-margin-medium-bottom"><img data-src="https://hayyjameel.org/uploads/pottery-1100x500.jpg"></div>
  <div class="entry-content"><p>A rich three-day official pottery course for the Jeddah community.</p></div></div>
`, hayyCards[0], hayySource);

assert.equal(hayyDetail.venue, 'Hayy Jameel - Hayy Makers, First Floor');
assert.equal(hayyDetail.sessions.length, 3);
assert.equal(hayyDetail.sessions[0].starts_at, '2026-07-26T17:00:00+03:00');
assert.equal(hayyDetail.sessions[2].ends_at, '2026-07-28T21:00:00+03:00');
assert.equal(hayyDetail.starts_at, '2026-07-26T17:00:00+03:00');
assert.equal(hayyDetail.ends_at, '2026-07-28T21:00:00+03:00');
assert.match(hayyDetail.registration_url, /typeform\.com/);
assert.match(hayyDetail.image_url, /1100x500/);
assert.equal(hayyDetail.live_schedule_ready, true);
assert.equal(hayyDetail.rich_summary, hayyDetail.summary);

const hayySitemapRows = [
  ['pottery-workshop', 'hayy-jameel-workshop-detail.html'],
  ['studio-residency', 'hayy-jameel-sitemap-workshop-detail.html'],
  ['sidematrix-workshop', 'hayy-jameel-sidematrix-workshop-detail.html']
];
const hayySourceForExtract = {
  id: 'hayy-jameel-events',
  name: "Hayy Jameel What's On",
  url: 'https://hayyjameel.org/whats-on/',
  owner: 'Art Jameel / Hayy Jameel',
  cities: ['Jeddah'],
  source_type: 'venue-calendar',
  collector_url: 'https://hayyjameel.org/whats-on-sitemap.xml',
  max_candidates_per_run: 6,
  sitemap_max_age_days: 90
};
const hayyEventsFromSitemap = await extractHayyJameelEvents(
  fixture('hayy-jameel-listing.html'),
  hayySourceForExtract,
  {
    referenceDate,
    maxCandidates: 6,
    sitemapMaxAgeDays: 90,
    sitemapXml: fixture('hayy-jameel-sitemap.xml'),
    fetchText: async (url) => {
      const slug = (() => {
        try {
          return new URL(url).pathname.split('/').filter(Boolean).at(-1);
        } catch {
          return String(url).split('/').filter(Boolean).at(-1);
        }
      })();
      const match = hayySitemapRows.find((row) => row[0] === slug);
      if (!match) throw new Error(`missing hayy fixture for ${url}`);
      return fixture(match[1]);
    }
  }
);
assert.equal(hayyEventsFromSitemap.length, 3, 'Hayy listing+sitemap extraction should include side-nav matrix workshop row');
assert.ok(hayyEventsFromSitemap.some((event) => /Pottery/.test(event.title)));
assert.ok(hayyEventsFromSitemap.some((event) => /Circular Fabric/.test(event.title)));
assert.equal(hayyEventsFromSitemap.every((event) => event.city === 'Jeddah'), true);
assert.equal(hayyEventsFromSitemap.every((event) => new Date(event.ends_at) >= referenceDate), true);

assert.equal(sourceExtractors['saudicon-events'], extractSaudiconEvents);
const saudiconEventsFromSitemap = await extractSaudiconEvents('', {
  id: 'saudicon-events',
  name: 'Saudicon Events',
  url: 'https://saudicon.app/',
  owner: 'Saudicon',
  source_type: 'conference-organizer',
  trust_level: 'aggregator',
  cities: ['Saudi Arabia', 'Riyadh']
}, {
  sitemapXml: fixture('saudicon-events-sitemap.xml'),
  maxCandidates: 6,
  fetchText: async (url) => {
    const slug = (() => {
      try {
        return new URL(url).pathname.split('/').filter(Boolean).at(-1);
      } catch {
        return String(url).split('/').filter(Boolean).at(-1);
      }
    })();
    if (slug === 'saudi-ai-forum') return fixture('saudicon-ai-forum-detail.html');
    if (slug === 'saudi-tech-summit') return fixture('saudicon-tech-summit-detail.html');
    throw new Error(`missing saudicon fixture for ${url}`);
  }
});
const saudiconCandidates = new Set(saudiconEventsFromSitemap.map((event) => event.url));
assert.equal(saudiconEventsFromSitemap.length, 2, 'Saudicon sitemap should yield two valid JSON-LD candidates');
assert.equal(saudiconCandidates.size, saudiconEventsFromSitemap.length, 'Saudicon candidates should stay deduplicated by URL');
assert.equal(saudiconEventsFromSitemap.every((event) => event.verification_method === 'official-detail-jsonld'), true);

const qassimEvents = extractQassimChamberEvents(`
  <div class="card h-100"><div class="carousel-item active" style="background-image: url('https://tc.qcc.org.sa/storage/260/hr.jpg')"></div>
    <div class="card-body">
      <h4 class="card-title"><a class="card-link" href="https://tc.qcc.org.sa/events/204">عمليات إدارة الموارد البشرية</a></h4>
      <h5 class="card-subtitle">متبقي على الفعالية يوم من الآن</h5>
      <h6 class="card-subtitle">الاثنين, يوليو 6 2026, 16:30</h6>
      <p class="card-text "><p>عمليات إدارة الموارد البشرية</p></p>
    </div>
  </div>
`, {
  id: 'qassim-chamber-events',
  name: 'Qassim Chamber Events',
  url: 'https://qcc.org.sa/events-list',
  owner: 'Qassim Chamber of Commerce'
});

assert.equal(qassimEvents.length, 1);
assert.equal(qassimEvents[0].city, 'Buraydah');
assert.equal(qassimEvents[0].starts_at, '2026-07-06T16:30:00+03:00');
assert.equal(qassimEvents[0].ends_at, '2026-07-06T18:30:00+03:00');
assert.equal(qassimEvents[0].image_url, 'https://tc.qcc.org.sa/storage/260/hr.jpg');

const abhaEvents = extractAbhaChamberEvents(`
  <div class="events-block"><div class="d-flex w-100"><figure><img src="/Files/Images/fa3.JPG" alt="ورشة عمل الرقابة على منتجات التجميل"></figure>
    <div class="text"><h4>ورشة عمل الرقابة على منتجات التجميل</h4><h6>05/12/2024</h6>
    <p>فعالية توعوية من غرفة أبها.</p><a href="/Events/Details/3" class="theme-btn">تفاصيل الفعالية</a></div>
  </div></div>
`, {
  id: 'abha-chamber-events',
  name: 'Abha Chamber Events',
  url: 'https://abhacci.org.sa/Events',
  owner: 'Abha Chamber of Commerce'
});

assert.equal(abhaEvents.length, 1);
assert.equal(abhaEvents[0].city, 'Abha');
assert.equal(abhaEvents[0].starts_at, '2024-12-05T09:00:00+03:00');
assert.equal(abhaEvents[0].ends_at, '2024-12-05T18:00:00+03:00');
assert.equal(abhaEvents[0].image_url, 'https://abhacci.org.sa/Files/Images/fa3.JPG');

const jazanEvents = await extractJazanChamberEvents(JSON.stringify([{
  id: 14,
  slug: 'wrshh-aml-dlyl-alistyrad-mn-alsyn-',
  title: {
    ar: 'ورشة عمل دليل الإستيراد من الصين ',
    en: 'Importing from China Guide Workshop'
  },
  cover: {
    url: 'https://firebasestorage.googleapis.com/v0/b/event-jcci/o/media%2Fimport.jpeg?alt=media&token=test'
  },
  description: {
    ar: '<p>دليل الاستيراد من الصين</p><p>الفئة المستهدفة: رواد ورائدات الأعمال.</p>'
  },
  startAt: '2026-06-16T15:00:00.000Z',
  endAt: '2026-06-16T17:00:00.000Z',
  location: 'أكاديمية غرفة جازان',
  url: 'https://events.jazancci.org.sa/ar/events/wrshh-aml-dlyl-alistyrad-mn-alsyn-',
  published: true
}]), {
  id: 'jazan-chamber-events',
  name: 'Jazan Chamber Events',
  url: 'https://jazancci.org.sa/',
  owner: 'Jazan Chamber of Commerce',
  disable_monthly_fetch: true
});

assert.equal(jazanEvents.length, 1);
assert.equal(jazanEvents[0].city, 'Jazan');
assert.equal(jazanEvents[0].starts_at, '2026-06-16T18:00:00+03:00');
assert.equal(jazanEvents[0].ends_at, '2026-06-16T20:00:00+03:00');
assert.equal(jazanEvents[0].publication_gate, 'duplicate-review');
assert.equal(jazanEvents[0].venue, 'أكاديمية غرفة جازان');
assert.ok(jazanEvents[0].image_url.includes('firebasestorage.googleapis.com'));
assert.equal(jazanApiEndpoint(7, 2026), 'https://jazancci.org.sa/api/events/calendar/7/2026');
const jazanRollingMonths = jazanMonthsToFetch(new Date('2026-07-10T12:00:00Z'), {
  futureMonths: 12,
  historyMode: 'rolling',
  historyBatchSize: 2
});
assert.equal(jazanRollingMonths.length, 15);
assert.deepEqual(jazanRollingMonths[0], { month: 7, year: 2026 });
assert.deepEqual(jazanRollingMonths[12], { month: 7, year: 2027 });
assert.equal(jazanRollingMonths.filter((item) => (
  new Date(Date.UTC(item.year, item.month - 1, 1)) < new Date('2026-07-01T00:00:00Z')
)).length, 2);

const fallbackExtraction = await loadSourceExtraction(
  { id: 'test-official-api-fallback' },
  () => { throw new Error('primary extractor must not run'); },
  {
    fetchPrimary: async () => { throw new Error('listing timeout'); },
    fallbackExtractor: async () => [{ title: 'Official API Event' }]
  }
);
assert.equal(fallbackExtraction.payload, '');
assert.equal(fallbackExtraction.items[0].title, 'Official API Event');
assert.match(fallbackExtraction.primary_error.message, /listing timeout/);

const sdaiaCalendarEvents = await extractSdaiaCalendarEvents(`
  <a class="card h-100 card-border card-action" href="/en/MediaCenter/Events/Pages/EventsDetails.aspx?EventID=122" title="Global Forum on the Ethics of AI">
    <p class="text-sm-regular text-muted">9/14/2026 - 9/17/2026</p>
    <h5 class="card-title">Global Forum on the Ethics of AI</h5>
    <p class="card-description">Organizer: UNESCO</p>
    <span class="badge badge-default">artificial intelligence</span>
  </a>
`, {
  id: 'sdaia-calendar-events',
  name: 'SDAIA Calendar and Events',
  url: 'https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx',
  owner: 'Saudi Data and AI Authority'
});

assert.equal(sdaiaCalendarEvents.length, 1);
assert.equal(sdaiaCalendarEvents[0].title, 'Global Forum on the Ethics of AI');
assert.equal(sdaiaCalendarEvents[0].starts_at, '2026-09-14T09:00:00+03:00');
assert.equal(sdaiaCalendarEvents[0].ends_at, '2026-09-17T18:00:00+03:00');
assert.equal(sdaiaCalendarEvents[0].source_url, undefined);

console.log('source-extractor-regression-test: ok');
