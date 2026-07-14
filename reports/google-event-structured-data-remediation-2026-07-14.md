# Google Event structured-data remediation — 2026-07-14

## Search Console baseline

- Valid Event items: 500
- Invalid Event items: 0
- Non-critical recommendations: 9
- Newly reported recommendations: missing `description`, missing `image`, missing `offers.price`, and missing `offers.priceCurrency`

## Root cause

The main Event entity already includes a canonical URL, description, event image, organizer evidence, and an Offer when a public registration or ticket URL exists. The missing `description` and `image` recommendations came from official agenda rows emitted as nested `subEvent` Event entities. Google therefore reported the same detail page once per agenda row.

## Remediation

1. Every official `subEvent` now inherits the parent event image.
2. Every official `subEvent` now carries a concise session-specific description, preferring official session description fields and falling back to the session and parent event names.
3. Arabic and English generated event pages are covered by regression checks that recursively validate every Event JSON-LD node.
4. Unknown prices remain absent. EventLive only emits `offers.price` and `offers.priceCurrency` when a source provides a numeric price or explicitly marks the event as free. This prevents fabricated commercial data.
5. A bounded ticket-offer enricher now reads explicit public prices from Eventbrite `AggregateOffer` data and visible Informa/NoFomo ticket packages during the six-hour source cycle. It uses plain public requests only, stops on protected pages, and never guesses a price.

## Verification

- Generated event detail pages checked: 2,370 across Arabic and English.
- Event entities checked recursively: 6,426, including nested agenda sessions.
- Missing descriptions after remediation: 0.
- Missing images after remediation: 0.
- Public ticket pages eligible for the bounded price probe: 9.
- Explicit prices found: 7; no public price evidence: 2; failed requests: 0.

## Expected Search Console outcome

After Google recrawls the affected pages, the 275 missing-image and 275 missing-description recommendations should clear. Price and currency recommendations may remain for ticket or registration pages whose official source does not publish a verified price; these are non-critical and deliberately evidence-gated.
