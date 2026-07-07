import assert from 'node:assert/strict';
import {
  extractAbhaChamberEvents,
  extractAsharqiaChamberEvents,
  extractCodeMcitPrograms,
  extractInvestSaudiEvents,
  extractJazanChamberEvents,
  jazanApiEndpoint,
  extractKaustEvents,
  extractKauEvents,
  extractMakkahChamberEvents,
  extractMocCalendarPayload,
  extractMonshaat,
  extractQassimChamberEvents,
  extractSaudiSpaceAgencyEvents,
  extractSfdaEvents,
  extractSaudiProLeagueFixtures,
  extractSdaiaAcademyPrograms,
  extractSdaiaCalendarEvents,
  extractVisitSaudiApiEvents
} from './collect-source-candidates.mjs';

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
    }]
  }
}), visitSaudiSource);

assert.equal(visitSaudiEvents.length, 1);
assert.equal(visitSaudiEvents[0].title, 'Saudi Live Test Event');
assert.equal(visitSaudiEvents[0].city, 'Riyadh');
assert.equal(visitSaudiEvents[0].starts_at, '2026-08-05T16:00:00+03:00');
assert.equal(visitSaudiEvents[0].ends_at, '2026-08-07T22:30:00+03:00');
assert.ok(visitSaudiEvents[0].tags.includes('Experience Riyadh Season'));
assert.equal(visitSaudiEvents[0].image_url, 'https://scth.scene7.com/is/image/scth/saudi-live-test-event?wid=1400&hei=788&fit=constrain&fmt=webp');

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
  id: 'saudi-university-events',
  name: 'Saudi Universities and Technical Colleges',
  url: 'https://www.kaust.edu.sa/',
  owner: 'Saudi universities and technical colleges'
});

assert.equal(kauEvents.length, 1);
assert.equal(kauEvents[0].title, 'Future Frontiers for Businesses: Catalysts for Growth in a Transformational Economy');
assert.equal(kauEvents[0].city, 'Jeddah');
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
assert.equal(jazanApiEndpoint(7, 2026), 'https://www.jazancci.org.sa/api/events/calendar/7/2026');

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
