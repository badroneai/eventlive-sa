# EventLive Reliability Failure Modes

This matrix turns common EventLive failures into operational responses.

| Failure Mode | Detection | Degraded Behavior | Recovery |
| --- | --- | --- | --- |
| Source returns zero rows | `sources:yield`, source health reports | Keep previously published event pages; do not remove confirmed records automatically. | Probe source, inspect dropped rows, classify as parser/date/content-late issue. |
| Source blocks automated access | browser probe / health gate | Mark source as partnership or manual-evidence only; do not bypass protection. | Use approved public route or partnership. |
| Build produces broken event links | `test:public-assets`, `site-launch-sweep` | Stop release. | Fix generator or stale slug reconciliation, rebuild, rerun pipeline. |
| Live timing looks stale | `test:live-runtime-clock`, browser matrix | Keep static date visible; runtime countdown must refresh on page load. | Fix runtime script, rebuild, verify screen/today/event pages. |
| Owner-only page exposed | security review audit, sitemap/manifest checks | Remove from public nav, sitemap, service worker, manifest. | Rebuild and rerun security/public transparency tests. |
| Browser layout overflows | browser matrix audit | Keep content readable; block release if overflow is detected. | Fix CSS/layout, rerun matrix across Chromium/WebKit. |

Reliability principle: confirmed events are durable public records; source failures should not erase trusted published pages.
