import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ksaEgressHosts, requiresKsaEgress, ksaEgressDispatcher, ksaEgressStatus } from './ksa-egress.mjs';

// The three ministry origins must stay flagged in the registry: unflagging them
// silently would look like a fix while collection keeps failing from CI.
const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const flagged = (registry.sources || registry).filter((source) => source.requires_ksa_egress).map((source) => source.id);
for (const id of ['moc-cultural-calendar', 'mos-events', 'moc-cultural-subportals']) {
  assert.ok(flagged.includes(id), `${id} must stay flagged requires_ksa_egress until it is reachable without a Saudi egress`);
}

const hosts = ksaEgressHosts();
assert.ok(hosts.has('www.moc.gov.sa'), 'the registry flag must resolve to the actual origin host');
assert.ok(hosts.has('music.moc.gov.sa'), 'sub-portal origins must be routed too');
assert.equal(requiresKsaEgress('https://www.moc.gov.sa/s-core/api/OtherEvents/CulturalCalendar'), true, 'API paths on a flagged origin must route through the egress, not just the page URL');

// Nothing else may be dragged onto the proxy: one proxy outage must never be
// able to take down the other sources.
assert.equal(requiresKsaEgress('https://www.visitsaudi.com/bin/api/v3/events'), false, 'unflagged origins must keep their direct path');
assert.equal(requiresKsaEgress('https://tc.qcc.org.sa/'), false, 'Qassim Chamber is reachable from CI (browser path) and must not be routed');
assert.equal(requiresKsaEgress('not a url'), false, 'a malformed URL must not be routed');

// No proxy configured → no dispatcher. The request then fails honestly instead
// of pretending a route exists.
assert.equal(await ksaEgressDispatcher('https://www.moc.gov.sa/en/Modules/Pages/Cultural-Calendar', {}), null, 'without EVENTLIVE_KSA_EGRESS_PROXY there must be no dispatcher');
assert.equal(await ksaEgressDispatcher('https://www.visitsaudi.com/x', { EVENTLIVE_KSA_EGRESS_PROXY: 'http://proxy.invalid:8080' }), null, 'an unflagged origin must not be proxied even when a proxy exists');

const dispatcher = await ksaEgressDispatcher('https://www.mos.gov.sa/en/media/events', { EVENTLIVE_KSA_EGRESS_PROXY: 'http://proxy.invalid:8080' });
assert.ok(dispatcher, 'a flagged origin must receive a dispatcher when the egress is configured');
assert.equal(typeof dispatcher.dispatch, 'function', 'the dispatcher must be a usable undici dispatcher');
await dispatcher.close?.().catch(() => {});

const status = ksaEgressStatus({});
assert.equal(status.configured, false, 'status must report an unconfigured egress honestly');
assert.ok(status.hosts.length >= 3, 'status must list the routed hosts for the operator');

console.log(`ksa-egress-regression-test: ok routed_hosts=${status.hosts.length}`);
