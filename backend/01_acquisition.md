# Acquisition

```text
CATEGORY: Acquisition

  Report                      Purpose                             Data Source                    Key Metrics & Fields                     Filters & Dimensions                 How It Runs                        Calculation Logic               Limitations / Caveats


  Sessions by referrer        Shows how visitors reach the        Online Store sessions          Session count by referrer source;        Date range; group by time            Data collected via Shopify’s       Counts sessions by last         Cookies required; bots
                              store by categorizing sessions      (cookie‑based). Uses           may include metrics like sessions,       (hour/day/week/month). Can           Online Store cookie tracking.      referrer before purchase.       may skew results. Some
                              into referrer types such as         session cookies to track       percent of total, and sales              filter to human traffic or include   Reports update within ~1           Session ends after              traffic sources appear as
                              Direct, Search, Email, Social       visits (30‑minute inactivity   conversion rate.                         bot traffic.                         minute and only include            30 minutes of inactivity.       Unknown when data is
                              and Unknown                         resets; session ends at                                                                                      sessions when visitors consent                                     blocked
                              【809535999433376†L146-              midnight)                                                                                                    to cookies                                                         【809535999433376†L14
                              L180】. Helps determine which        【809535999433376†L146-                                                                                       【809535999433376†L146-                                             6-L180】.
                              channels drive traffic and sales.   L180】.                                                                                                       L180】.


  Sessions by location        Displays the countries/regions      Online store sessions;         Sessions, visitors, conversion rate by   Date range; group by country/        Real‑time within ~1 minute;        Counts sessions per             IP geolocation may be
                              (and sometimes cities) where        geolocation data from          location.                                region; optionally by city.          relies on IP geolocation and       location; conversion rate       inaccurate if visitors use
                              visitors come from                  visitors’ IP addresses.                                                                                      session cookies                    calculated as sessions          VPNs; cookies must be
                              【809535999433376†L146-                                                                                                                           【809535999433376†L146-             completing checkout divided     accepted.
                              L180】. Useful for                                                                                                                                L180】.                             by total sessions.
                              understanding geographic
                              reach and tailoring marketing or
                              product assortment.


  Sessions over time          Shows how sessions and              Session data from the Online   Sessions, unique visitors, conversion    Date range; group by hour, day,      Data updates every ~1 minute;      Sessions counted per visitor    Does not include sessions
                              visitors change over a selected     Store (cookie‑based).          rate, bounce rate etc.                   week, month, quarter or year.        based on real‑time sessions        per session; visitors counted   where cookies aren’t
                              period                                                                                                                                           consented through cookie           once per time period.           accepted; sessions start
                              【809535999433376†L146-                                                                                                                           banner.                                                            counting only after
                              L180】. Used to identify traffic                                                                                                                                                                                     Oct 1 2022 for some
                              trends, seasonality and                                                                                                                                                                                             merchants.
                              campaign impacts.


  Visitors over time          Displays unique visitors over       Session cookies identifying    Unique visitors; can include             Date range; grouping similar to      Real‑time with ~1 minute delay;    Unique visitors are counted     Visitors cannot be
                              time, comparing the selected        unique devices (visitors).     additional metrics like sessions and     Sessions over time.                  uses cookie to identify unique     once per device per day;        identified across devices
                              period to a previous period                                        conversion rate.                                                              visitors.                          sessions may be multiple per    without cross‑device data;
                              【809535999433376†L146-                                                                                                                                                              visitor.                        requires cookie consent.
                              L180】. Helps understand
                              growth in reach.
```
