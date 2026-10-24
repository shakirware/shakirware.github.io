---
layout: write-up
title: "PharmacyShifts"
project: pharmacyshifts
permalink: /projects/pharmacyshifts/
description: "How I built and operate a live platform that collects UK locum pharmacy shifts from three agencies, deduplicates them and makes them searchable by distance."
---

PharmacyShifts is a platform I built to help locum pharmacists across the UK find available shifts. It brings together listings from different agencies, making it easier to see what's available without checking multiple websites. I continue to develop and run it myself.

[pharmacyshifts.app](https://pharmacyshifts.app/)
{: .meta}

<figure>
  <a href="{{ '/assets/pharmacyshifts/search-results.webp' | relative_url }}"><img src="{{ '/assets/pharmacyshifts/search-results.webp' | relative_url }}" alt="Two search results, from Boots and Day Lewis, each showing an hourly rate, the number of agencies listing the shift, the best rate, a recent rate rise, the date and time, and the distance from the searched postcode."></a>
  <figcaption>Search results, sorted by hourly rate.</figcaption>
</figure>

## The problem

My partner is a pharmacist, and through her I became more familiar with the challenges of finding locum work. It's not just about finding an available shift. Location, travel distance, working hours, pay and the likely workload all influence whether an opportunity is worth taking.

The information needed to make those decisions is scattered across agency websites. The same shift can be advertised more than once, sometimes with different rates or payment arrangements, while details about the pharmacy's usual activity can be difficult to find.

There's also a time-sensitive element. New shifts appear throughout the day, and checking multiple websites regularly isn't particularly practical. Finding suitable work involves not only comparing what's available, but keeping track of new opportunities before they're gone.


## What I built

A pharmacist looking for work can start by entering their postcode and choosing how far they're willing to travel. PharmacyShifts shows available shifts from different agencies, with filters for dates and rates to help narrow down the results.

If the same shift is advertised by three agencies, rather than appearing as three separate listings, the offers are grouped together. Pharmacists can compare hourly rates, estimated earnings and rate changes in one place. The application also includes historical pharmacy activity data, giving some additional context about the pharmacy before deciding whether a shift is suitable.

For anyone who doesn't want to keep checking the website, there's the option to save a search and receive notifications by email or Telegram when new matching shifts appear. This makes it easier to keep track of opportunities without having to search manually throughout the day.

<figure>
  <a href="{{ '/assets/pharmacyshifts/source-comparison.webp' | relative_url }}"><img src="{{ '/assets/pharmacyshifts/source-comparison.webp' | relative_url }}" alt="A comparison table for one shift listed by Locate a Locum at £45 an hour, and by LocumBell and LocumPrime at £40 an hour, with previous rate, change, total, pay basis and status for each."></a>
  <figcaption>The same shift from three agencies, compared side by side.</figcaption>
</figure>

## How it works

PharmacyShifts is built around a data pipeline that regularly collects shift listings from three UK locum agencies. Each agency structures its data differently, so incoming listings are normalised into a consistent format before being processed and stored.

The next stage identifies listings that refer to the same underlying shift. Rather than treating every agency listing as a separate opportunity, the system groups matching records while preserving the individual offers, including their rates, hours and payment arrangements. Changes to existing listings are also tracked as the source data is refreshed.

The application uses this processed data to provide location-based search and filtering. Pharmacists can search within a specified distance of a postcode, compare offers across agencies and view historical pharmacy activity data alongside the available shifts.

A separate notification workflow uses saved search preferences to identify relevant new opportunities. When matching shifts are discovered, notifications can be delivered through email or Telegram. Together, these components handle the collection, processing, presentation and delivery of shift information.

<figure>
  <a href="{{ '/assets/pharmacyshifts/data-flow.svg' | relative_url }}"><img src="{{ '/assets/pharmacyshifts/data-flow.svg' | relative_url }}" alt="Data-flow diagram. Three locum agencies feed scheduled ingestion, then normalisation and validation, then matching shifts across agencies. Matched shifts and pharmacy activity data are stored in PostgreSQL with PostGIS. From there, data serves search and comparisons, and saved-search matching, which sends email and Telegram alerts."></a>
  <figcaption>How listings move through PharmacyShifts.</figcaption>
</figure>

## The interesting parts

### Matching shifts across agencies

One of the more interesting challenges was deciding how to represent a shift advertised by multiple agencies. Each source assigns its own identifiers and may describe the same pharmacy differently, so treating agency listings as independent shifts would create duplicates and make meaningful comparisons difficult.

I use a deterministic matching strategy to establish a canonical identity for each shift. Where available, a trusted pharmacy identifier is combined with the postcode and shift times. Otherwise, the system falls back to normalised pharmacy names and location details. Additional checks look for conflicting identifiers, addresses and coordinates before listings are grouped. Each agency's offer remains separate, preserving differences in rates, working hours and payment arrangements.

The main trade-off is between incorrectly merging different shifts and failing to recognise genuine duplicates. I've taken a conservative approach, requiring enough information to establish a reliable match rather than relying on loose similarities. This means some duplicate listings may remain separate, but avoids presenting unrelated opportunities as a single shift.

### Location-based search

Location is one of the most important factors when looking for locum work. Searching by city or postcode alone isn't particularly useful when a pharmacist needs to know which shifts fall within a reasonable travelling distance. The challenge was making location-based filtering both accurate enough to be useful and efficient across thousands of listings.

I implemented geographic search using PostgreSQL and PostGIS. UK postcode data is used to resolve search locations into coordinates, while shift locations are stored as geographic points. The application uses `ST_DWithin` to filter shifts within a specified radius and `ST_Distance` to calculate their distance from the searched postcode. Spatial indexes help keep these queries efficient as the number of listings grows.

The main limitation is that geographic distance isn't the same as travel distance. A pharmacy 10 kilometres away in a straight line might involve a much longer journey by road. I chose radius-based searching rather than introducing routing calculations, keeping searches fast and predictable while accepting that the displayed distances are approximations of how far someone would actually need to travel.

### Keeping data up to date

One of the harder problems with collecting shift listings is deciding when a shift is no longer available. If a listing disappears from an agency's response, that doesn't necessarily mean the opportunity has been removed. The collection might have failed, returned only part of the available data or encountered a temporary issue.

I built safeguards around the ingestion process rather than assuming every successful request represents a complete dataset. Listings are updated as they're observed, but deactivating missing ones requires stronger evidence. For full-snapshot sources, the system checks collection completeness, compares the number of returned listings against previous runs and limits unexpected mass deactivations. Sources that don't provide complete coverage use separate freshness handling.

The trade-off is intentional. Aggressively removing anything that wasn't seen in the latest run would keep results looking fresh, but a single bad response could hide hundreds of legitimate opportunities. I'd rather tolerate some stale listings than let an unreliable source response incorrectly remove valid shifts from the application.

<figure>
  <a href="{{ '/assets/pharmacyshifts/telegram-alerts.webp' | relative_url }}"><img src="{{ '/assets/pharmacyshifts/telegram-alerts.webp' | relative_url }}" alt="A Telegram message from the Pharmacy Shifts bot announcing a new shift that matches a saved search: Rowlands Pharmacy at St Mary's Hospital, Wednesday 4 November, 09:00 to 18:00, from Locate a Locum at £31 an hour, with links to open the shift or manage the alert. The alert name is redacted."></a>
  <figcaption>A Telegram alert for a new shift matching a saved search.</figcaption>
</figure>

## Running it

I run PharmacyShifts on a single 4 GB Hetzner VPS using Docker Compose. It hosts the application, database, background workers and monitoring stack. Running everything on one machine keeps the infrastructure manageable, although it also means the server is a single point of failure. For the current scale of the project, I've preferred that simplicity over introducing a more distributed setup.

I've put more effort into making deployments safe. A separate release pipeline builds and scans container images on a self-hosted runner in my homelab, then deploys them through a restricted SSH entry point. Blue-green deployments let me start and health-check a new release before switching traffic, while keeping the previous version available for rollback. Database backups are verified before deployment, and migrations must remain backward-compatible.

Monitoring is equally important because not every failure is immediately visible. I use Prometheus, Grafana and Alertmanager to track server health, API errors, ingestion freshness, worker backlogs and backup status, with alerts delivered through Telegram. A website that responds successfully isn't much use if its shift data has stopped updating. Detecting those quieter failures matters just as much as detecting downtime.

## Looking back

The biggest thing I've taken away from PharmacyShifts is how much work goes into making a system dependable once people can actually use it. Getting listings into a database and displaying them was relatively straightforward. Making sure those listings were accurate, up to date and safe to compare took considerably more effort.

I also underestimated the complexity of comparing agency offers. Matching listings is useful, but the comparison becomes misleading if differences in paid breaks and working arrangements aren't accounted for. That pushed me towards representing individual agency offers separately and making uncertain payment estimates explicit rather than presenting them as definitive.

The operational side required more work than I expected. Problems with deployments, background workers, backups and monitoring all exposed assumptions that had seemed reasonable during development. I've gradually moved towards treating those safeguards as part of the application itself, rather than something to add once everything else is working.

Some limitations remain. Data freshness depends on how often each agency can be polled, upstream APIs can change without warning, and parts of the original per-agency search implementation still exist alongside the newer merged-shift approach.

If I were rebuilding PharmacyShifts, I'd start with the canonical data model, define what a complete crawl means for each source, and establish deployment, backup and monitoring processes earlier. Retrofitting those foundations has been considerably more work than designing around them from the beginning.
