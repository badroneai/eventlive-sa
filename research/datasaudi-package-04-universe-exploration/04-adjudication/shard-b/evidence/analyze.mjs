import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(
  "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b/evidence",
);
const RAW = path.join(ROOT, "raw");
const API = "https://api.datasaudi.sa/tesseract";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (id) => JSON.parse(await readFile(path.join(RAW, `${id}.body`), "utf8"));

const months = (startYear, startMonth, endYear, endMonth) => {
  const values = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const first = year === startYear ? startMonth : 1;
    const last = year === endYear ? endMonth : 12;
    for (let month = first; month <= last; month += 1) {
      values.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }
  return values;
};

const quarters = (startYear, endYear) => {
  const values = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) values.push(`${year}-Q${quarter}`);
  }
  return values;
};

const levelRecords = (schema) =>
  (schema.dimensions || []).flatMap((dimension) =>
    (dimension.hierarchies || []).flatMap((hierarchy) =>
      (hierarchy.levels || []).map((level) => ({
        dimension: dimension.name,
        hierarchy: hierarchy.name,
        level: level.name,
        time_scale: level.time_scale,
        annotations: level.annotations || {},
      })),
    ),
  );

const members = async (id) => (await readJson(id)).members || [];
const rows = async (id) => (await readJson(id)).data || [];

const openapi = await readJson("openapi-live");
const catalog = await readJson("catalog-show-all-en");
const catalogCubes = catalog.cubes || catalog.data?.cubes || [];
const catalogCrosswalkMatches = catalogCubes
  .filter((cube) => {
    const searchable = [
      cube.name,
      cube.caption,
      cube.annotations?.table_en,
      cube.annotations?.table_ar,
    ]
      .filter(Boolean)
      .join(" ");
    return /\bcrosswalk\b|\bmapping\b|\bcity\b.*\bprovince\b|\bprovince\b.*\bcity\b/i.test(
      searchable,
    );
  })
  .map((cube) => cube.name);

const gdp = await readJson("schema-gastat_gdp");
const inflation = await readJson("schema-gastat_inflation");
const oil = await readJson("schema-sama_oil_prices");
const gdpYearlySubstitute = await readJson("schema-gastat_gdp_by_main_activities_yearly");
const gdpQuarterlySubstitute = await readJson("schema-gastat_gdp_by_main_activities_quarterly");

const month2025 = await rows("p014-month-2025");
const quarter2025 = await rows("p014-quarter-2025");
const q1Months = month2025.filter((row) => ["2025-01", "2025-02", "2025-03"].includes(row.Month));
const q1Quarter = quarter2025.find((row) => row.Quarter === "2025-Q1");
const tradeMeasures = ["Exports", "Imports", "Trade Balance"];
const p014 = Object.fromEntries(
  tradeMeasures.map((measure) => {
    const monthlyRawMillionSar = q1Months.map((row) => row[measure]);
    const sum = monthlyRawMillionSar.reduce((total, value) => total + value, 0);
    const retrieved = q1Quarter[measure];
    return [
      measure,
      {
        monthly_raw_million_sar: monthlyRawMillionSar,
        monthly_sum_million_sar: sum,
        quarterly_api_row_raw_million_sar: retrieved,
        delta_million_sar: retrieved - sum,
        converted_sum_sar: sum * 1_000_000,
      },
    ];
  }),
);

const expectedMonths = months(2023, 1, 2025, 12);
const expectedQuarters = quarters(2023, 2025);
const completeness = async ({ id, periodField, expected, measureFields }) => {
  const dataRows = await rows(id);
  const boundedRows = dataRows.filter((row) => expected.includes(row[periodField]));
  const observed = [...new Set(boundedRows.map((row) => row[periodField]))].sort();
  return {
    expected_period_count: expected.length,
    observed_period_count: observed.length,
    observed_periods: observed,
    missing_periods: expected.filter((period) => !observed.includes(period)),
    bounded_row_count: boundedRows.length,
    null_measure_cell_count: boundedRows.reduce(
      (count, row) => count + measureFields.filter((field) => row[field] === null).length,
      0,
    ),
    zero_measure_cell_count: boundedRows.reduce(
      (count, row) => count + measureFields.filter((field) => row[field] === 0).length,
      0,
    ),
    oldest_observed: observed[0] ?? null,
    latest_observed: observed.at(-1) ?? null,
  };
};

const popProvince = await members("p017-pop-province-en");
const inflationProvince = await members("p017-inflation-province-en");
const inflationProvinceCore = inflationProvince.filter((member) => member.key >= 1 && member.key <= 13);
const exactProvincePairs = popProvince.filter((member) =>
  inflationProvinceCore.some(
    (candidate) => candidate.key === member.key && candidate.caption === member.caption,
  ),
);
const governorateEn = await members("p017-governorate-en");
const governorateAr = await members("p017-governorate-ar");
const sampleGovernorKeys = [101, 201, 301, 401, 501];

const cityMembers = await members("p018-city-en");
const targetProvinceMembers = await members("p018-target-province-en");
const substituteProvinceMembers = await members("p018-substituted-province-en");
const cityCases = [
  { city_caption: "Riyadh", province_caption: "Al-Riyadh" },
  { city_caption: "Makkah", province_caption: "Makkah Al-Mokarramah" },
  { city_caption: "AL-Madinah", province_caption: "Al-Madinah Al-Monawarah" },
].map((item) => ({
  ...item,
  city_key: cityMembers.find((member) => member.caption === item.city_caption)?.key,
  province_key: targetProvinceMembers.find((member) => member.caption === item.province_caption)?.key,
}));

const gdpActivities = await members("p019-gdp-activity");
const bankIsic4 = await members("p019-bank-isic4");
const demographySectors = await members("p019-demography-sectors");
const taxonomyCases = [
  ["Mining & Quarrying", "Mining and Quarrying", "Mining and quarrying"],
  ["Manufacturing", "Manufacturing", "Manufacturing"],
  ["Construction", "Construction", "Construction"],
  ["Wholesale & Retail Trade, Restaurants & hotels", "Wholesale and Retail Trade", "Wholesale and retail trade; repair of motor vehicles and motorcycles"],
  ["Finance, Insurance, Real Estate & Business Services", "Financial and Insurance Activities", "Financial and insurance activities"],
].map(([gdpCaption, bankCaption, demographyCaption]) => ({
  gdp: gdpActivities.find((member) => member.caption === gdpCaption),
  bank: bankIsic4.find((member) => member.caption === bankCaption),
  demography: demographySectors.find((member) => member.caption === demographyCaption),
}));

const foreignRows = await rows("p020-foreign-latest-three");
const balanceRows = await rows("p020-balance-latest-three");
const commonMonths = [...new Set(foreignRows.map((row) => row.Month))]
  .filter((month) => balanceRows.some((row) => row.Month === month))
  .sort();
const p020Month = commonMonths.at(-1);
const p020Exports = foreignRows.find(
  (row) => row.Month === p020Month && row["Trade Flow"] === "Exports",
);
const p020Imports = foreignRows.find(
  (row) => row.Month === p020Month && row["Trade Flow"] === "Imports",
);
const p020Balance = balanceRows.find((row) => row.Month === p020Month);
const calculatedBalance = p020Exports["Million SAR"] - p020Imports["Million SAR"];

const popYears = (await members("p021-pop-year")).map((member) => member.key);
const rateYears = (await members("p021-rate-year")).map((member) => member.key);
const waterYears = (await members("p021-water-year")).map((member) => member.key);
const healthYears = (await members("p021-health-year")).map((member) => member.key);
const commonYears = popYears.filter(
  (year) => rateYears.includes(year) && waterYears.includes(year) && healthYears.includes(year),
);
const pop2022 = await rows("p021-pop-2022");
const rate2022 = await rows("p021-rate-2022");
const rate2022Detailed = await rows("p021-rate-2022-detailed");
const water2022 = await rows("p021-water-2022");
const health2022 = await rows("p021-health-2022");
const healthCategories = await members("p021-health-category");
const rateSex = await members("p021-rate-sex");
const rateNationality = await members("p021-rate-nationality");

const representative2022 = {
  riyadh: {
    population: pop2022.find((row) => row["Geography Province ID"] === 1)?.Population,
    unemployment_rate: rate2022.find((row) => row["Province ID"] === 1)?.["Unemployment Rate"],
    water_thousand_m3: water2022.find((row) => row["Province ID"] === 1)?.["Thousand cubic meters"],
    hospitals: health2022.find(
      (row) => row["Province ID"] === 1 && row["Resource Category"] === "Hospitals",
    )?.Resources,
  },
  makkah: {
    population: pop2022.find((row) => row["Geography Province ID"] === 2)?.Population,
    water_thousand_m3: water2022.find((row) => row["Province ID"] === 2)?.["Thousand cubic meters"],
    hospitals: health2022.find(
      (row) => row["Province ID"] === 2 && row["Resource Category"] === "Hospitals",
    )?.Resources,
  },
  jazan: {
    population: pop2022.find((row) => row["Geography Province ID"] === 10)?.Population,
    unemployment_rate: rate2022.find((row) => row["Province ID"] === 10)?.["Unemployment Rate"],
  },
};

const dataRequestIds = [
  "p014-month-2025",
  "p014-quarter-2025",
  "p016-construction-full",
  "p016-confidence-full",
  "p016-current-account-full",
  "p020-foreign-latest-three",
  "p020-balance-latest-three",
  "p021-pop-2022",
  "p021-rate-2022",
  "p021-rate-2022-detailed",
  "p021-water-2022",
  "p021-health-2022",
];
const rowHashRecords = [];
for (const requestId of dataRequestIds) {
  const responseRows = await rows(requestId);
  for (const [rowIndex, row] of responseRows.entries()) {
    const rowJson = JSON.stringify(row);
    rowHashRecords.push({
      schema_version: "1.0",
      request_id: requestId,
      row_index: rowIndex,
      row_identity: Object.fromEntries(
        Object.entries(row).filter(
          ([key]) =>
            key.endsWith(" ID") || ["Year", "Quarter", "Month", "Sex", "Nationality"].includes(key),
        ),
      ),
      row_sha256: sha256(rowJson),
    });
  }
}
const rowHashesSerialized = `${rowHashRecords.map((record) => JSON.stringify(record)).join("\n")}\n`;
const rowHashesSha256 = sha256(rowHashesSerialized);

const output = {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  official_api_base: API,
  row_hashes_path:
    "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b/evidence/row-hashes.jsonl",
  row_hashes_sha256: rowHashesSha256,
  P04_013: {
    schema_term_matches: {
      gastat_gdp: JSON.stringify(gdp).match(/vintage|revision|release_timestamp/gi) || [],
      gastat_inflation: JSON.stringify(inflation).match(/vintage|revision|release_timestamp/gi) || [],
    },
    matching_openapi_paths: Object.keys(openapi.paths || {}).filter((pathname) =>
      /vintage|revision|snapshot|histor/i.test(pathname),
    ),
    bounded_conclusion: "No vintage, revision-number, historical-snapshot, or release-timestamp field/path is exposed in the inspected live schemas/OpenAPI contract. This does not prove how the upstream store mutates old values.",
  },
  P04_014: {
    q1_month_rows: q1Months,
    q1_quarter_api_row: q1Quarter,
    measures: p014,
    schema_measure_captions: (await readJson("schema-gastat_trade_balance")).measures.map(
      (measure) => ({ name: measure.name, caption: measure.caption }),
    ),
    bounded_conclusion: "The Quarter-level API response exactly reconciles to the three Month-level values. The API proves retrieval at Quarter level, not physical storage lineage beneath Tesseract.",
  },
  P04_015: {
    target_gastat_gdp: {
      table_en: gdp.annotations?.table_en,
      measures: gdp.measures,
      levels: levelRecords(gdp),
    },
    target_gastat_inflation: {
      table_en: inflation.annotations?.table_en,
      measures: inflation.measures,
      levels: levelRecords(inflation),
    },
    target_sama_oil_prices: {
      table_en: oil.annotations?.table_en,
      table_ar: oil.annotations?.table_ar,
      measures: oil.measures,
      levels: levelRecords(oil),
    },
    substituted_gdp_cubes: [
      {
        cube: gdpYearlySubstitute.name,
        table_en: gdpYearlySubstitute.annotations?.table_en,
        measures: gdpYearlySubstitute.measures.map((measure) => measure.name),
      },
      {
        cube: gdpQuarterlySubstitute.name,
        table_en: gdpQuarterlySubstitute.annotations?.table_en,
        measures: gdpQuarterlySubstitute.measures.map((measure) => measure.name),
      },
    ],
    bounded_conclusion: "The observed answer substituted two different GDP cubes and falsely marked the existing sama_oil_prices cube unavailable; its live table metadata explicitly states Base Year: 2005.",
  },
  P04_016: {
    construction_cost_index_by_sector: await completeness({
      id: "p016-construction-full",
      periodField: "Month",
      expected: expectedMonths,
      measureFields: ["Construction Cost Index", "Construction Cost Index YoY Growth"],
    }),
    consumer_confidence_index: await completeness({
      id: "p016-confidence-full",
      periodField: "Month",
      expected: expectedMonths,
      measureFields: ["Index of Consumer Confidence", "Index of Current Economic Conditions"],
    }),
    current_account_quarter: await completeness({
      id: "p016-current-account-full",
      periodField: "Quarter",
      expected: expectedQuarters,
      measureFields: ["Million SAR"],
    }),
  },
  P04_017: {
    population_province_count: popProvince.length,
    inflation_province_count_including_general_index: inflationProvince.length,
    exact_key_and_caption_pairs: exactProvincePairs.length,
    unmatched_population_members: popProvince.filter(
      (member) => !exactProvincePairs.some((candidate) => candidate.key === member.key),
    ),
    unmatched_inflation_members: inflationProvince.filter(
      (member) => !exactProvincePairs.some((candidate) => candidate.key === member.key),
    ),
    sample_governorates: sampleGovernorKeys.map((key) => ({
      key,
      en: governorateEn.find((member) => member.key === key),
      ar: governorateAr.find((member) => member.key === key),
    })),
    riyadh_governorate_count: governorateEn.filter(
      (member) => member.ancestor?.[0]?.key === 1,
    ).length,
    catalog_crosswalk_matches: catalogCrosswalkMatches,
    bounded_conclusion: "All 13 administrative-region key/caption pairs match between the two inspected cubes; Province is the common grain. The catalog exposes no separately named crosswalk cube, so 'safe' should be scoped to this verified pair rather than generalized platform-wide.",
  },
  P04_018: {
    cases: cityCases,
    target_cube: "gastat_inflation_province_yoy",
    substituted_cube_in_answer: "gastat_inflation_province_yearly",
    target_and_substitute_member_sets_identical:
      JSON.stringify(targetProvinceMembers) === JSON.stringify(substituteProvinceMembers),
    catalog_crosswalk_matches: catalogCrosswalkMatches,
    bounded_conclusion: "The three city and province IDs are accurately quoted and cannot be directly joined. The answer nevertheless changed the requested cube to the yearly variant and did not prove crosswalk absence beyond the public catalog surface.",
  },
  P04_019: {
    verified_taxonomy_cases: taxonomyCases,
    observed_answer_claimed_keys: {
      gastat_gdp: ["A02/A03", "A04", "A06", "A07", "A09"],
      sama_bank_credit_month: [2, 3, 5, 6, 9],
      business_demography_enterprises: ["B", "C", "F", "G", "K"],
    },
    catalog_crosswalk_matches: catalogCrosswalkMatches,
    bounded_conclusion: "The answer fabricated every shown gastat_gdp code and gave wrong SAMA keys for all five examples. Only the business-demography letter codes match the public member endpoint.",
  },
  P04_020: {
    latest_common_month: p020Month,
    foreign_trade_exports_row: p020Exports,
    foreign_trade_imports_row: p020Imports,
    trade_balance_row: p020Balance,
    calculated_balance_million_sar: calculatedBalance,
    delta_million_sar: p020Balance["Trade Balance"] - calculatedBalance,
    foreign_trade_schema_caption: (await readJson("schema-foreign_trade")).measures.find(
      (measure) => measure.name === "Million SAR",
    )?.caption,
    trade_balance_schema_caption: (await readJson("schema-trade_balance_by_country")).measures.find(
      (measure) => measure.name === "Trade Balance",
    )?.caption,
    bounded_conclusion: "The numeric reconciliation is exact at 2026-04. The foreign_trade raw API values are in Million SAR; multiplying by 1,000,000 is a conversion, not the raw row. The answer omitted the actual member keys chn, 27, and flow 1/2.",
  },
  P04_021: {
    common_years: commonYears,
    latest_common_year: commonYears.at(-1),
    schemas: {
      gastat_detailed_population: levelRecords(await readJson("schema-gastat_detailed_population")),
      gastat_rate_gender_nationality_region: levelRecords(
        await readJson("schema-gastat_rate_gender_nationality_region"),
      ),
      sama_water_consumption_region: levelRecords(
        await readJson("schema-sama_water_consumption_region"),
      ),
      sama_health_facilities_resources: levelRecords(
        await readJson("schema-sama_health_facilities_resources"),
      ),
    },
    rate_total_members: {
      sex: rateSex.find((member) => member.caption === "Total"),
      nationality: rateNationality.find((member) => member.caption === "Total"),
    },
    riyadh_rate_detailed_rows: rate2022Detailed.filter((row) => row["Province ID"] === 1),
    health_categories: healthCategories,
    representative_2022_values: representative2022,
    bounded_conclusion: "2022 is the latest common year and Year+Province is the common comparison key only after explicit total-member/category choices. The unemployment cube also has quarterly grain; heterogeneous health resource categories cannot be losslessly summed or dropped, and the original multi-dimensional rows are not preserved by the proposed collapse.",
  },
};

await writeFile(path.join(ROOT, "row-hashes.jsonl"), rowHashesSerialized);
await writeFile(
  path.join(ROOT, "row-hashes.sha256"),
  `${rowHashesSha256}  row-hashes.jsonl\n`,
);
const serialized = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(path.join(ROOT, "derived-verification.json"), serialized);
await writeFile(
  path.join(ROOT, "derived-verification.sha256"),
  `${sha256(serialized)}  derived-verification.json\n`,
);
process.stdout.write(`${sha256(serialized)}\n`);
