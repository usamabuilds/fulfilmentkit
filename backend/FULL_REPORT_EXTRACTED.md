# Shopify Analytics Reports Deep Extraction - Repo-ready Markdown/Text Export

This package was created from the uploaded PDF using a layout-preserving text extraction so the original table-style structure is retained as closely as possible.

## Front matter

```text
S H O P I F Y A N A LY T I C S D O C U M E N TAT I O N R E P O R T


Shopify Analytics Reports Deep Extraction
Complete inventory of Shopify Analytics default reports, organized by category and documented with purpose, data source, metrics, filters, execution
behavior, calculation logic, limitations, and operational use cases.



   COVERAGE                                                                              METHOD
     • Acquisition                                                                       This PDF packages the full report content into a print-ready format. The
     • Behavior                                                                          wording and detail are preserved from the compiled report so nothing
     • Customers                                                                         substantive is omitted.
     • Finances
     • Fraud
     • Inventory
     • Marketing
     • Orders
     • Performance
     • Profit Margin
     • Retail Sales
     • Sales
     • Store




PREPARED                                                   FORMAT                                          SOURCE BASIS
2026-03-26                                                 Landscape PDF Report                            Shopify Help Center documentation


[PAGE BREAK]

   Packaging note. This PDF includes the full report content from the original markdown report. Inline source markers from the compiled working draft are preserved where they appeared in that report.




Shopify Analytics Reports – Detailed Inventory
This document compiles all default reports in Shopify Analytics → Reports. Reports are organized under the categories defined by Shopify. Each report section details the purpose, underlying data sources, metrics and fields, available filters/
dimensions, report behaviour, calculation logic, limitations and sample use cases. All information is based on Shopify’s documentation and is strictly focused on Shopify’s reporting features without any third‑party tools or assumptions.
```

## Acquisition

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

## Behavior

```text
CATEGORY: Behavior

  Report                      Purpose                             Data Source                    Key Metrics & Fields                     Filters & Dimensions                 How It Runs                        Calculation Logic               Limitations / Caveats


  Conversion rate             Visual funnel of sessions with      Online store sessions and      Sessions; sessions with cart             Filters: date range, device type,    Updates every minute. Relies       Conversion rate = (sessions     Excludes sessions without
  breakdown                   cart additions, sessions            checkout events collected      additions; sessions reaching             sales channel; can view data         on cookie‑based session            completing checkout ÷ total     cookie consent; bots can
                              reaching checkout, and              via Shopify’s tracking         checkout; sessions completing            for human traffic vs bot traffic.    tracking and checkout events;      sessions)                       lower conversion rate;
                              sessions completing checkout                                       checkout; conversion rate (sessions                                           cross‑device reporting available                                   multi‑buy sessions


[PAGE BREAK]

Report                       Purpose                            Data Source                    Key Metrics & Fields                    Filters & Dimensions                 How It Runs                       Calculation Logic               Limitations / Caveats

                             【151414418696600†L95-              (cookies and checkout          completing checkout ÷ sessions)                                              only from Oct 1 2022 onward       【151414418696600†L95-           counted once for each
                             L120】. Helps diagnose where        events).                       【151414418696600†L95-L120】.                                                  【151414418696600†L95-             L120】.                          purchase.
                             visitors drop off during the                                                                                                                   L120】.
                             purchase journey.


Conversion rate over         Displays conversion rate trends    Same data sources as           Time‑based metrics: sessions,           Time grouping (hour/day/week/        Data updates within ~1 minute.    Conversion rate formula         Data may have spikes if
time                         over time with metrics:            Conversion rate breakdown.     sessions with cart additions,           month) and filters for sales         Uses cookie and checkout          same as above.                  low volume; not back‑filled
                             sessions, sessions with cart                                      sessions reaching checkout,             channel, device type, human vs       events; cross‑device data from                                    before Oct 1 2022
                             additions, sessions reaching                                      sessions completing checkout,           bot traffic.                         Oct 1 2022.                                                       【151414418696600†L95
                             checkout, sessions completing                                     conversion rate                                                                                                                                -L120】.
                             checkout                                                          【151414418696600†L142-L160】.
                             【151414418696600†L142-
                             L160】.


Web performance              Assess how the online store        Real user metrics collected    For each Core Web Vital: 75th           Filters: date range (today, last 7   Data can be delayed up to         Metrics are 75th percentile     Requires enough traffic;
reports (Largest             meets Google’s Core Web            from customer devices          percentile LCP/INP/CLS values,          days, last 30 days), time            36 hours                          times; performance is           new or
Contentful Paint,            Vitals for loading speed (LCP),    (RUM) after the storefront     distribution across performance         grouping; device type; page          【822950260754957†L20-             categorised into Good,          password‑protected
Interaction to Next Paint,   interactivity (INP) and visual     password is removed            categories (Good/Moderate/Poor)         URL; page type                       L21】 because metrics rely on      Moderate or Poor based on       stores may have no data
Cumulative Layout Shift –    stability (CLS)                    【822950260754957†L36-          【822950260754957†L119-L140】;            【822950260754957†L153-               aggregated RUM. Reports           thresholds (LCP ≤2.5 s, INP     【822950260754957†L14
over time, by page URL,      【822950260754957†L14-              L44】. Data for LCP, INP,       event annotations marking theme or      L170】                                update after enough traffic.      ≤200 ms, CLS ≤0.1)              9-L152】. Not real‑time
by page type)                L16】. Over‑time reports show       CLS is aggregated using the    app changes                             【822950260754957†L193-                                                 【822950260754957†L119-          (up to 36‑hour delay).
                             trends; URL and page‑type          75th percentile of user        【822950260754957†L168-L179】;            L232】.                                                                 L140】.
                             reports highlight specific pages   experiences                    sessions by device type.
                             causing performance issues         【822950260754957†L95-
                             【822950260754957†L153-             L140】.
                             L170】.


Product                      Shows conversion performance       Online store sessions,         Sessions with recommendations,          Date range; group by time; filter    Data updated daily; relies on     Conversion rate calculated      Dependent on
recommendation               of Shopify’s product               product recommendation         products recommended, products          by recommendation location.          Shopify’s product                 as orders from                  recommendation
conversions over time        recommendations – number of        interactions and orders.       added to cart from                                                           recommendation algorithm and      recommendations ÷ sessions      placement and algorithm;
                             sessions that saw a                                               recommendations, conversion rate,                                            session tracking.                 with recommendations.           not available if
                             recommendation and how                                            total sales from recommendations.                                                                                                              recommendations are not
                             many converted (products                                                                                                                                                                                         enabled.
                             purchased).


Product                      Identifies products that are       Same sources as above.         Products recommended; number of         Date range; filter by                Updates daily.                    Click‑through rate = clicks ÷   Low sample sizes may
recommendations with         recommended often but rarely                                      recommendation views; number of         recommendation placement.                                              recommendation views.           cause volatile rates.
low engagement               clicked or purchased.                                             clicks; click‑through rate; number of
                                                                                               purchases.


Searches by search           Lists the most common search       Search queries captured        Search query text; number of times      Date range; group by day/            Updates daily; relies on search   Search conversion rate =        Only captures searches
query                        terms used in the store’s          from the online store search   searched; number of results; number     week/month; filter by device         events recorded in the            orders resulting from           via Shopify’s search bar;
                             search bar.                        function.                      of clicks; search conversion rate.      type.                                storefront.                       searches ÷ number of            may not track third‑party
                                                                                                                                                                                                              searches.                       search apps.


Searches with no clicks      Identifies search queries where    Same search data.              Search query; number of searches        Date range.                          Daily update.                     N/A.                            Limited data if search is
                             customers didn’t click any                                        with zero clicks.                                                                                                                              seldom used.
                             results.


Searches with no             Lists queries that returned zero   Search data.                   Search query; number of searches        Date range.                          Daily update.                     N/A.                            N/A.
results                      results.                                                          producing no results.



Search conversions           Shows conversion metrics for       Search events and orders.      Number of searches; search              Date range; group by time.           Daily update.                     Conversion rate = orders        None.
over time                    searches over time (orders,                                       add‑to‑cart events; search orders;                                                                             from search ÷ number of
                             conversion rate).                                                 search conversion rate.                                                                                        searches.


Sessions by landing          Displays sessions based on the     Online store session data.     Landing page URL; sessions;             Date range; group by landing         Real‑time within ~1 minute;
page                         first page visited (landing                                       conversion metrics; bounce rate.        page; filter by device type.         uses cookie sessions.
                             page). Useful for evaluating


[PAGE BREAK]

Report                  Purpose                             Data Source                    Key Metrics & Fields                   Filters & Dimensions                How It Runs                        Calculation Logic               Limitations / Caveats

                        marketing landing pages and                                                                                                                                                      Bounce rate = sessions with     Same limitations as
                        home page performance.                                                                                                                                                           single page view ÷ total        sessions metrics (cookie
                                                                                                                                                                                                         sessions.                       consent, cross‑device).


Sessions by device      Shows breakdown of sessions         Session data with device       Device category; sessions; orders;     Date range; filter by sales         Real‑time with minimal delay;      Conversion rate formula as      ‘Other’ devices may
                        by device type (desktop,            detection.                     conversion rate; average order         channel; group by time.             uses user agent detection.         above.                          include consoles or
                        mobile, tablet).                                                   value.                                                                                                                                        unknown devices; data
                                                                                                                                                                                                                                         accuracy depends on user
                                                                                                                                                                                                                                         agent strings.
```

## Customers

```text
CATEGORY: Customers

Report                  Purpose                             Data Source                    Key Metrics & Fields                   Filters & Dimensions                How It Runs                        Calculation Logic               Limitations / Caveats


New customers over      Tracks the number of new            Order and customer records.    New customers; orders by new           Date range; time grouping.          Near‑real‑time; updates within     Counts each customer only       Customers with multiple
time                    customers placing their first                                      customers; total spend by new                                              ~1 minute.                         once when they place their      email addresses may be
                        order during a specified period                                    customers.                                                                                                    first order.                    counted separately.
                        【483427677669002†L65-
                        L140】.


New vs returning        Compares first‑time purchasers      Customer records and           Number of new customers; number        Date range; group by day/           Real‑time.                         AOV = (gross sales –            Doesn’t consider
customers               to returning customers over         orders.                        of returning customers; orders;        week/month; filter by customer                                         discounts) / orders (for the    customers with multiple
                        time【483427677669002†L65-                                          average order value (AOV).             segment.                                                               respective group).              accounts.
                        L140】.


Customers by location   Shows geographic distribution       Shipping addresses from        Customer count; orders; total spend    Date range; group by country/       Real‑time.                         Same as sessions location       Plan localized marketing
                        of new customers based on           orders.                        by location.                           region or city.                                                        limitations; shipping address   or new shipping zones.
                        shipping address                                                                                                                                                                 may not reflect actual
                        【483427677669002†L65-                                                                                                                                                            residence.
                        L140】.


Returning customers     Lists customers who placed at       Customer records and           Customer information (name, email,     Date range; filters for number of   Real‑time.                         Average spend = total spent     None.
                        least two orders                    orders.                        marketing acceptance); first order     orders, total spent, or marketing                                      ÷ number of orders.
                        【483427677669002†L175-                                             date; most recent order date;          acceptance.
                        L235】.                                                             number of orders; average spend;
                                                                                           total spent
                                                                                           【483427677669002†L175-L235】.


One‑time customers      Lists customers with exactly        Same as above.                 Customer info; order date; total       Date range.                         Real‑time.                         N/A.                            Convert one‑time buyers
                        one order                                                          spent.                                                                                                                                        into repeat customers
                        【483427677669002†L175-                                                                                                                                                                                           through targeted
                        L235】.                                                                                                                                                                                                           promotions.


Customer cohort         Groups customers based on           Order and customer data.       Cohort first order date; number of     Cohort grouping; date range;        Real‑time but aggregated by        Repeat purchase rate =          Complex for small
analysis                the date of their first order and                                  customers in cohort; repeat            filters for sales channel,          cohort; uses cohort analysis       customers with repeat orders    cohorts; sensitive to date
                        shows how cohorts repeat                                           purchase rate; total sales; AOV;       marketing channel, predicted        table and heatmap.                 ÷ total customers in cohort.    range selection.
                        purchases over time                                                marketing channel; sales channel;      spend tier.
                        【483427677669002†L175-                                             predicted spend tier; ratio of
                        L235】.                                                             subscription vs one‑time purchase
                                                                                           【483427677669002†L175-L235】.


Predicted spend tier    Uses machine learning to            Historical order and           Customer name; email; marketing        Date range; filters by spend        Predictions update periodically;   Predicted spend tiers are       Predictions may not be
                        predict a customer’s future         customer data processed by     status; last order date; number of     tier; sort by total spent or        not real‑time.                     based on historical spend       available for new
                        lifetime spend and categorizes      Shopify’s prediction models.   orders; total spent; predicted spend   orders.                                                                patterns; not a guarantee.      customers or those with
                        them into tiers (e.g., Low,                                        tier.                                                                                                                                         insufficient data.
                        Medium, High)


[PAGE BREAK]

Report                  Purpose                             Data Source                   Key Metrics & Fields                   Filters & Dimensions               How It Runs                      Calculation Logic               Limitations / Caveats

                        【483427677669002†L175-
                        L235】.


RFM customer analysis   Scores customers based on           Order history and customer    RFM scores; segment names;             Date range; filter by specific     Real‑time.                       Recency score based on          Requires multiple orders
                        Recency, Frequency and              data.                         percent of total customers; average    segment or score threshold.                                         days since last order;          to generate reliable
                        Monetary value (spend).                                           days since last order; total orders;                                                                       frequency score based on        scores.
                        Groups them into segments                                         total spend.                                                                                               order count; monetary score
                        such as Champions, Loyal, At                                                                                                                                                 based on total spend.
                        Risk, etc.
                        【483427677669002†L175-
                        L235】.


RFM customer list       Detailed list of customers with     Same as above.                Customer information; recency          Filters by score, segment or       Real‑time.                       Same scoring logic as RFM       None.
                        their recency, frequency and                                      score; frequency score; monetary       spend.                                                              analysis.
                        monetary scores and values.                                       score; total spend; last order date.
```

## Finances

```text
CATEGORY: Finances

Report                  Purpose                             Data Source                   Key Metrics & Fields                   Filters & Dimensions               How It Runs                      Calculation Logic               Limitations / Caveats


Finance Summary         Gives a high‑level overview of      Orders, returns, discounts,   Summary metrics for sales (gross,      Date range; group by day/          Data updates within ~1 minute.   Net sales = gross sales –       Sales reports do not track
                        sales, payments, gift cards, tips   taxes, shipping, payment      discounts, returns, net sales,         week/month; filter by payment                                       discounts – returns; total      money moving between
                        and gross profit for a selected     gateway data, gift card and   shipping, taxes, total sales);         method, staff (for tips).                                           sales = gross sales –           you and customers; they
                        period                              tip transactions.             payments (total payments, payments                                                                         discounts – returns + taxes +   reflect value of goods sold
                        【257048601378994†L363-                                            by method, payments received,                                                                              shipping + fees                 【257048601378994†L36
                        L423】.                                                            payments by gateway); gift card                                                                            【257048601378994†L363-          3-L423】.
                                                                                          sales and outstanding balance; tips                                                                        L423】.
                                                                                          data (tips over time, tips by staff)
                                                                                          【257048601378994†L363-L423】.


Gross sales by order    Shows gross sales for each          Order records.                Date; Sale ID; order name; product     Date range; filter by sales        Real‑time.                       Gross sales = product price     Same as above regarding
                        order.                                                            title at time of sale; gross sales;    channel, location, order status.                                    × quantity before discounts     returns and adjustments.
                                                                                          discounts; returns; net sales;                                                                             and returns.
                                                                                          shipping; return fees; taxes; total
                                                                                          sales【257048601378994†L363-
                                                                                          L423】.


Discounts by order      Lists order‑level and line‑item     Order data and discount       Order number; discount code/name;      Date range; filter by discount     Real‑time.                       Discount amount                 Orders with multiple
                        discounts.                          codes.                        discount type; discount amount;        type or code.                                                       summarises line‑item and        combinable discounts
                                                                                          other discounts; shipping discounts;                                                                       order‑level discounts.          may appear multiple
                                                                                          orders; total sales                                                                                                                        times.
                                                                                          【257048601378994†L363-L423】.


Returns by order        Summarizes returned items           Order records and return      Order ID; product name; quantity       Date range; filter by return       Real‑time.                       Net sales adjusted for          None.
                        and refunds.                        transactions.                 returned; return reason; total value   reason or product.                                                  returns.
                                                                                          returned; return fees.


Net sales by order      Shows net sales per order after     Order records.                Same columns as Gross sales by         Date range.                        Real‑time.                       Net sales = gross sales –       None.
                        factoring discounts and returns                                   order plus net sales.                                                                                      discounts – returns
                        【257048601378994†L363-                                                                                                                                                       【257048601378994†L363-
                        L423】.                                                                                                                                                                       L423】.


Shipping by order       Displays shipping charges by        Order and shipping            Shipping charges; shipping             Date range; filter by shipping     Real‑time.                       Net shipping = shipping         Excludes shipping costs
                        order.                              transaction data.             discounts; refunded shipping; net      zone or carrier.                                                    charges – shipping discounts    paid to carrier.
                                                                                          shipping revenue.                                                                                          – refunded shipping.


[PAGE BREAK]

Report                        Purpose                             Data Source                      Key Metrics & Fields                      Filters & Dimensions                 How It Runs                   Calculation Logic               Limitations / Caveats


Taxes report                  Summarises taxes collected by       Order tax records.               Taxable sales; tax collected; tax rate;   Date range; filter by tax            Real‑time.                    Tax collected = taxable sales   Jurisdiction definitions
                              country, region, jurisdiction and                                    transactions; tax region.                 jurisdiction.                                                      × tax rate.                     vary; not all countries
                              transaction                                                                                                                                                                                                       included.
                              【257048601378994†L363-
                              L423】.


United States sales tax       Available to US stores using        Shopify Tax data.                Sales per jurisdiction; tax collected;    Date range; filter by state or       Real‑time; uses Shopify Tax   Follows US tax rules.           Helps merchants file state
report                        Shopify Tax. Summarises sales                                        number of transactions; tax liability.    county.                              engine.                                                       and local sales taxes.
                              and taxes by country,
                              jurisdiction and transaction
                              【257048601378994†L363-
                              L423】.


Net payments by               Shows net payments after fees       Payment gateway                  Net payments; gross payments;             Date range; group by payment         Real‑time (near‑real‑time).   Net payments = gross            Limited to payment
method / over time / by       grouped by payment method,          transactions.                    fees; number of transactions.             method or gateway.                                                 payments – payment fees.        gateways integrated with
gateway / by order            time, gateway or individual                                                                                                                                                                                       Shopify; offline payments
                              order                                                                                                                                                                                                             may not show fees.
                              【257048601378994†L363-
                              L423】.


Gift card finance reports     Shows revenue generated from        Gift card purchases and          Net sales from gift cards;                Date range; group by day/            Real‑time.                    Net sales includes gift card    Gift card redemptions
(Net sales from gift cards,   selling gift cards and              redemptions.                     outstanding balance.                      week/month.                                                        sales minus refunds;            aren’t revenue until used;
Outstanding gift card         outstanding gift card liabilities                                                                                                                                                 outstanding balance equals      treat outstanding balance
balance)                      【257048601378994†L363-                                                                                                                                                            unredeemed gift card value.     as liability.
                              L423】.


Tips reports (Tips over       Available if tipping enabled.       Orders with tip line items and   Tips total; average tip per order; tips   Date range; filter by staff          Real‑time.                    Tips total = sum of tip         Only for stores using
time, Tips by staff)          Shows tip amounts collected         staff assignment.                by staff member.                          member or sales channel.                                           amounts.                        tipping at checkout or
                              and optionally which staff                                                                                                                                                                                        POS.
                              member received tips
                              【257048601378994†L363-
                              L423】.


Store credit reports          For merchants using store           Store credit transactions.       Credit issued; credit used; balance       Date range; filter by customer.      Real‑time.                    Balance = issued credit –       Only available if store
                              credit features. Shows credit                                        outstanding.                                                                                                 redeemed credit.                credit feature enabled.
                              transactions and outstanding
                              credit balance.
```

## Fraud

```text
CATEGORY: Fraud

Report                        Purpose                             Data Source                      Key Metrics & Fields                      Filters & Dimensions                 How It Runs                   Calculation Logic               Limitations / Caveats


Acceptance rate               Percentage of total orders not      Orders with fraud analysis       Acceptance rate (% of orders not          No filters (fraud reports can’t be   Data updates regularly when   Acceptance rate = accepted      Requires use of fraud
                              flagged as high‑risk                (Shopify or third‑party).        flagged high risk); number of             customized)                          new orders processed.         orders ÷ total orders.          analysis; high‑risk orders
                              【699502019967685†L76-                                                accepted orders; number of high‑risk      【699502019967685†L76-                                                                              flagged by Shopify or
                              L92】. Measures how many                                              orders.                                   L92】.                                                                                              apps.
                              orders pass fraud checks.


Chargeback rate (fraud)       Percentage of total payments        Payment transactions and         Chargeback rate (fraud); number of        None (no customization).             Updates when chargebacks      Chargeback rate =               Only includes
                              where the chargeback reason         chargeback records.              fraudulent chargebacks; total                                                  occur.                        fraudulent chargebacks ÷        chargebacks classified as
                              is Fraudulent                                                        payments.                                                                                                    total payments.                 fraud.
                              【699502019967685†L76-
                              L92】.


                              Total value of payments with        Payment transactions.                                                      None.
                              fraud‑related chargebacks


[PAGE BREAK]

Report                     Purpose                            Data Source                    Key Metrics & Fields                       Filters & Dimensions               How It Runs                       Calculation Logic               Limitations / Caveats

Chargeback amount          【699502019967685†L76-                                             Amount of fraudulent chargebacks;                                             Real‑time when chargebacks        Sum of amounts disputed as      Excludes non‑fraud
(fraud)                    L92】.                                                             average chargeback amount.                                                    processed.                        fraud.                          chargebacks.


High risk orders rate      Percentage of orders flagged       Order risk assessments.        High‑risk order rate; number of            None.                              Real‑time.                        Rate = high‑risk orders ÷       Depends on Shopify’s risk
                           as high‑risk by Shopify’s fraud                                   high‑risk orders; total orders.                                                                                 total orders.                   algorithm; may change.
                           analysis
                           【699502019967685†L76-
                           L92】.


Canceled due to fraud      Value of total orders cancelled    Cancelled orders flagged as    Total value of cancelled orders;           None.                              Updates when orders are           Sum of order values where       Only cancellations flagged
                           due to suspected fraud             high‑risk.                     number of cancelled orders.                                                   cancelled.                        cancellations were due to       as fraud counted.
                           【699502019967685†L76-                                                                                                                                                             fraud.
                           L92】.


Chargeback rate            Overall chargeback rate across     Payment transactions.          Chargeback rate; number of                 None.                              Real‑time.                        Rate = total chargebacks ÷      Doesn’t distinguish fraud
(overall)                  all reasons.                                                      chargebacks; total payments.                                                                                    total payments.                 vs other reasons.



Orders covered by          Shows orders eligible and          Orders processed through       Number of protected orders; total          None.                              Real‑time.                        N/A (reporting counts           Only available for
Shopify Protect / Orders   covered by Shopify Protect;        Shopify Payments and           value; number of orders declined                                                                                orders).                        merchants using Shopify
protected by Shopify       helps merchants using Shopify      meeting protection criteria.   coverage.                                                                                                                                       Protect.
Protect                    Protect.
```

## Inventory

```text
CATEGORY: Inventory

Report                     Purpose                            Data Source                    Key Metrics & Fields                       Filters & Dimensions               How It Runs                       Calculation Logic               Limitations / Caveats


Month‑end inventory        Shows quantity of each product     Inventory counts in Shopify    Product title; variant title; SKU;         Month; filter by location or       Generates snapshot after          Ending quantity equals          Overselling or untracked
snapshot                   variant in stock at month‑end      (available stock excluding     ending quantity (can be negative if        product type.                      month‑end; available for last     available inventory at end of   inventory can cause
                           【129737202224484†L150-             committed and incoming         overselling)                                                                  two years.                        month (stock on hand –          negative values
                           L170】. Used for month‑end          units).                        【129737202224484†L150-L170】.                                                                                    committed + incoming).          【129737202224484†L15
                           accounting and inventory                                                                                                                                                                                          0-L170】.
                           reconciliation.


Month‑end inventory        Calculates value of inventory at   Same as above plus cost per    Product title; variant title; SKU; cost;   Month; filter by location or       Available after month‑end; uses   Total value = ending quantity   Requires cost fields to be
value                      month‑end (ending quantity ×       item.                          ending quantity; total inventory value     product type.                      cost at time of snapshot.         × cost.                         set; overselling can
                           cost per item)                                                    (cost × quantity).                                                                                                                              produce negative values.
                           【129737202224484†L150-
                           L170】.


Inventory sold daily by    Shows average number of            Order data and inventory       Product title; variant title; SKU;         Date range; filter by product or   Real‑time; uses orders for sold   Quantity sold per day = total   Negative ending inventory
product                    items sold per day and             counts.                        quantity sold; ending quantity;            location.                          quantities.                       quantity sold ÷ number of       may appear due to
                           remaining inventory                                               quantity sold per day                                                                                           days in period.                 overselling.
                           【129737202224484†L150-                                            【129737202224484†L150-L170】.
                           L170】.


Products by percentage     Shows percentage of starting       Inventory counts and sales     Product title; variant title; SKU;         Date range; filter by location.    Real‑time; may have 2–3‑day       Percent sold = (quantity sold   Delay of 2–3 days;
sold                       inventory sold during selected     data.                          quantity sold; starting quantity;                                             delay for sell‑through rate       ÷ starting quantity) × 100;     negative starting quantity
                           period                                                            percent sold                                                                  updates                           values may be >100 % or         due to overselling can
                           【129737202224484†L260-                                            【129737202224484†L216-L256】.                                                  【129737202224484†L260-            negative if overselling         cause out‑of‑range
                           L276】. Helps identify                                                                                                                           L276】.                            【129737202224484†L260-          percentages
                           fast‑moving and slow‑moving                                                                                                                                                       L276】.                          【129737202224484†L26
                           products.                                                                                                                                                                                                         0-L276】.


ABC product analysis       Grades product variants into A,    Sales revenue and inventory.   Product title; variant title; SKU;                                                                              Grades assigned based on
                           B, C categories based on                                          product grade (A: top 80 % revenue;                                                                             cumulative revenue share


[PAGE BREAK]

Report                    Purpose                              Data Source                  Key Metrics & Fields                      Filters & Dimensions                  How It Runs                        Calculation Logic               Limitations / Caveats

                          revenue contribution over last                                    B: next 15 %; C: bottom 5 %); ending      Last 28 days (fixed); filter by       Updates daily; uses last           thresholds (Pareto principle)   Not a predictive metric;
                          28 days                                                           quantity; total value cost; total value   location or product type.             28 days of sales.                  【129737202224484†L216-          categories shift over time.
                          【129737202224484†L216-                                            price【129737202224484†L216-                                                                                        L256】.
                          L256】.                                                            L256】.


Products by               Shows percentage of total            Inventory counts and sales   Product title; variant title; SKU;        Date range; filter by location or     Real‑time but has 2–3‑day data     Sell‑through rate = quantity    Negative ending inventory
sell‑through rate         inventory sold during the period     data.                        starting quantity; ending quantity;       product type.                         processing delay                   sold ÷ (quantity sold +         or overselling can produce
                          【129737202224484†L260-                                            quantity sold; sell‑through rate                                                【129737202224484†L260-             ending quantity)                unusual rates; delay
                          L276】.                                                            【129737202224484†L260-L276】.                                                    L276】.                             【129737202224484†L260-          applies.
                                                                                                                                                                                                               L276】.


Inventory remaining per   Estimates days of inventory          Inventory counts and sales   Product title; variant title; SKU;        Date range; filter by location or     Real‑time; but uses average        Days remaining = ending         Predictions may be
product                   remaining based on average           velocity.                    ending quantity; quantity sold per        product.                              daily sales; delays if no sales.   quantity ÷ quantity sold per    inaccurate for products
                          sales per day                                                     day; days of inventory remaining                                                                                   day; returns N/A if no sales    with irregular sales.
                          【129737202224484†L328-                                            【129737202224484†L328-L355】.                                                                                       or negative inventory
                          L355】.                                                                                                                                                                               【129737202224484†L328-
                                                                                                                                                                                                               L355】.


Inventory adjustment      Shows inventory adjustments          Inventory adjustment logs.   Date; adjustment type (available vs       Date range; filter by location or     Real‑time; uses logs of            N/A; lists events.              None.
changes                   and state changes, including                                      committed); location; quantity            adjustment reason.                    adjustments.
                          manual adjustments, apps,                                         change; staff/app responsible;
                          transfers, and order fulfillments.                                reason.


Inventory adjustments     Shows the number of                  Inventory adjustment logs.   Number of adjustments; breakdown          Date range; filter by reason or       Real‑time.                         N/A.                            None.
by count                  adjustments (not quantity)                                        by staff, location or reason.             staff.
                          grouped by staff, location or
                          app.
```

## Marketing

```text
CATEGORY: Marketing

Report                    Purpose                              Data Source                  Key Metrics & Fields                      Filters & Dimensions                  How It Runs                        Calculation Logic               Limitations / Caveats


Sales attributed to       Summarizes total sales that          Orders linked to marketing   Total sales from marketing; orders        Date range; attribution model         Data updates within ~1 minute      Sales are attributed to         Does not include sales
marketing                 can be attributed to trackable       campaigns via UTM            (first or last interaction)               (last non‑direct click, last click,   【6145180237643†L200-               marketing only when traffic     without UTM or marketing
                          marketing efforts using UTM          parameters or Shopify        【6145180237643†L194-L205】;                first click, any click, linear)       L213】.                             includes UTM parameters or      identifiers; may differ from
                          parameters or campaigns              marketing activities.        UTM campaign name; marketing              【655702821549513†L331-                                                   is linked through Shopify       total sales
                          【6145180237643†L200-                                              event type and target                     L352】; filter by UTM campaign                                            marketing activities            【6145180237643†L200-
                          L213】.                                                            【6145180237643†L218-L232】.                or marketing channel.                                                    【6145180237643†L200-            L213】.
                                                                                                                                                                                                               L213】.


Sessions attributed to    Shows number of sessions on          Online store sessions with   Sessions attributed to marketing;         Date range.                           Real‑time; sessions counted via    Session occurs when visitor     Must have UTM or
marketing campaigns       the online store that originated     marketing tags (UTM          device type; referrer channel.                                                  cookies; update within seconds     arrives via marketing tagged    marketing tags;
                          from marketing efforts such as       parameters or Shopify                                                                                        【6145180237643†L254-               link; counted once per          cross‑device sessions
                          UTM campaigns, Facebook ads          marketing activities).                                                                                       L256】.                             session.                        may be attributed to last
                          or Google Shopping ads                                                                                                                                                                                               click.
                          【6145180237643†L247-
                          L255】.


Top channel               Displays the store’s top five        Marketing data combining     For each channel: sales, sessions,        Date range; filter channels;          Data may take up to 24 hours       Conversion rate = orders ÷      Dependence on UTM and
performance report        marketing channels and details       UTM parameters and           orders, conversion rate, AOV, ROAS,       select metrics to display;            to update                          sessions; ROAS = revenue ÷      marketing app data;
                          such as sales, sessions,             connected marketing apps     CTR, CPA, cost, impressions, clicks,      choose attribution model (last        【655702821549513†L23-              advertising cost; CPA = cost    missing cost metrics for
                          orders, conversion rate, AOV,        【655702821549513†L185-       new customers, returning customers        click, first click, last non‑direct   L25】; some channels (e.g.,         ÷ first‑time customers          some platforms.
                          return on ad spend (ROAS),           L197】.                       【655702821549513†L185-L215】.              click)                                Facebook, Google) do not           【655702821549513†L185-
                          click‑through rate (CTR), cost                                                                              【655702821549513†L203-                provide cost/ROAS metrics via      L197】.
                          per acquisition (CPA), first‑time                                                                           L221】.                                Shopify
                          and returning customers


[PAGE BREAK]

Report                 Purpose                            Data Source                   Key Metrics & Fields                    Filters & Dimensions                     How It Runs                       Calculation Logic                 Limitations / Caveats

                       【655702821549513†L185-                                                                                                                            【655702821549513†L194-
                       L197】.                                                                                                                                            L197】.


Channel performance    Provides a list of all marketing   Same as above.                Channels; sales; sessions; orders;      Date range; choose metrics;              Data may update with delay;       Calculations same as Top          Missing data for some
report                 channels and their conversion                                    AOV; cost; ROAS; CPA; CTR;              select attribution model                 reliant on integrated marketing   channel performance.              channels (e.g., cost).
                       results over a selected time                                     impressions; clicks; conversion rate;   【655702821549513†L203-                   apps and UTM tags.
                       frame                                                            referring category; referring URL;      L221】.
                       【655702821549513†L203-                                           new customers; returning customers
                       L223】.                                                           【655702821549513†L203-L215】.


Campaigns report       Lists all campaigns within a       Campaign data from            Campaign name; metrics as above;        Date range; select attribution           Data updates daily; may lag up    Same formulas as channel          Dependent on partner
                       selected channel and displays      marketing apps and UTM        partner row comparison for certain      model; filter by channel or view         to 24 hours.                      performance; cost per             integration; not all metrics
                       metrics such as sales,             parameters.                   platforms like Google                   all campaigns                                                              acquisition = cost ÷ first‑time   available for all partners.
                       sessions, orders, AOV, cost,                                     【655702821549513†L232-L239】.            【655702821549513†L230-                                                     customers
                       ROAS, CPA, CTR,                                                                                          L244】.                                                                     【655702821549513†L251-
                       impressions, clicks, conversion                                                                                                                                                     L268】; ROAS = sales ÷
                       rate                                                                                                                                                                                cost
                       【655702821549513†L230-                                                                                                                                                              【655702821549513†L275-
                       L244】.                                                                                                                                                                              L276】.


Campaign attribution   Provides detailed analysis of a    Same as campaigns report      Metrics listed above.                   Date range; attribution model;           Updates daily; reliant on         See formulas above.               None beyond general
report                 specific campaign, including       but focuses on one                                                    device type.                             marketing app integration.                                          marketing limitations.
                       AOV, conversion rate, cost,        campaign.
                       customer acquisition cost
                       (CAC), CTR, impressions, new
                       vs returning customers, top
                       orders by sales, online store
                       conversion funnel, top products
                       sold, sessions by device type,
                       orders, ROAS, sales, sessions,
                       campaign type
                       【655702821549513†L249-
                       L283】.


Performance by         Default marketing report in        Orders and sessions with      Sales metrics (gross, net, total),      Date range; choose attribution           Real‑time sales and sessions;     Sales aggregated by last or       Only includes tracked
referring channel      Analytics that displays sales or   referrer channel (Direct,     sessions, orders, conversion rate,      model (last non‑direct click, last       attribution model changes         first interaction depending on    referrer sources; direct
                       sessions grouped by referring      Search, Email, Social,        average order value; referrer           click, first click, any click, linear)   update results instantly.         attribution model.                traffic may dominate.
                       channel; supports attribution      Unknown).                     channel dimension.                      【6145180237643†L151-
                       models                                                                                                   L156】.
                       【6145180237643†L151-
                       L156】.


Performance by         Similar to above but groups by     Orders and sessions linked    Sales, sessions, orders, conversion     Date range; attribution model.           Real‑time; data depends on        Same as above.                    Requires campaigns to be
marketing activity     marketing activity (specific ads   to marketing activities via   rate, AOV per marketing activity.                                                campaign tagging.                                                   tagged; missing tags will
                       or campaigns).                     UTM parameters or                                                                                                                                                                  under‑report.
                                                          marketing apps.


Performance by UTM     Groups sales and sessions by       Orders and sessions with      Sales, sessions, orders, conversion     Date range; attribution model.           Real‑time; requires accurate      Same formulas as above.           Only campaigns with UTM
campaign               UTM campaign name.                 utm_campaign parameters.      rate, AOV by UTM campaign.                                                       UTM parameters.                                                     tags are included.



Conversion by          Historical report that compared    Orders and sessions with      Sales under first interaction, last     Date range.                              Deprecated.                       N/A.                              Data available only up to
attribution model      different attribution models;      referrer data.                interaction, any click, etc.                                                                                                                         certain date; use
(deprecated)           replaced by Performance                                                                                                                                                                                               marketing performance
                       reports                                                                                                                                                                                                               reports instead.
                       【6145180237643†L281-
                       L289】.


                       Show conversion results for                                                                              Date range; filter by activity.          Data may take up to 24 hours      Sessions and sales                Discrepancies may occur
                       marketing activities created in                                                                                                                   to sync                           attributed using last‑click       due to different attribution


[PAGE BREAK]

Report                     Purpose                              Data Source                     Key Metrics & Fields                     Filters & Dimensions                How It Runs                         Calculation Logic                 Limitations / Caveats

Marketing activity         Shopify, including sessions,         Data from Shopify marketing     Sessions; cost; sales; CTR; status                                           【655702821549513†L454-              model                             rules or delayed spend
reports                    cost, sales, CTR and status          activities and third‑party      (draft/active/paused).                                                       L457】.                              【655702821549513†L396-            data
                           【655702821549513†L409-               marketing apps.                                                                                                                                  L400】.                            【655702821549513†L42
                           L424】.                                                                                                                                                                                                                  6-L456】.
```

## Orders

```text
CATEGORY: Orders

Report                     Purpose                              Data Source                     Key Metrics & Fields                     Filters & Dimensions                How It Runs                         Calculation Logic                 Limitations / Caveats


Orders and reversals by    Shows total number of products       Order records and reversal      Product title; ordered quantity;         Date range; filter by product,      Real‑time.                          Reversed quantity rate =          Edited orders create
product                    ordered and reversed/                transactions.                   reversed quantity rate; return rate      vendor, or product type.                                                reversed quantity ÷ ordered       separate entries; may look
                           cancelled; helps track                                               【194180348863084†L55-L88】.                                                                                       quantity; return rate = returns   like multiple orders for
                           product‑level fulfilment and                                                                                                                                                          ÷ ordered quantity                same purchase
                           reversals                                                                                                                                                                             【194180348863084†L55-             【194180348863084†L96
                           【194180348863084†L55-                                                                                                                                                                 L88】.                             -L132】.
                           L88】.


Orders over time           Shows orders, average units          Order records.                  Orders; average units per order;         Date range; group by hour/day/      Real‑time.                          Average order value = gross       Orders edited after initial
                           per order, average order value,                                      average order value; returned items      week/month.                                                             sales – discounts ÷ orders        creation appear as
                           and returned items over time                                         【194180348863084†L96-L132】.                                                                                      (excluding post‑order             separate orders; may
                           【194180348863084†L96-                                                                                                                                                                 adjustments)                      inflate order count
                           L132】.                                                                                                                                                                                【194180348863084†L96-             【194180348863084†L96
                                                                                                                                                                                                                 L132】.                            -L132】.


Shipping and delivery      Tracks time to fulfil, ship and      Order fulfilment and shipping   Order count; median fulfilment time;     Date range; filter by location or   Real‑time; uses time stamps of      Calculates median times (not      Dependent on accurate
performance                deliver orders (median times         events.                         median shipping time; median             fulfilment service.                 fulfilment, shipping and delivery   averages) between events.         fulfilment and shipping
                           between order placed, fulfilled,                                     delivery time; distribution of orders                                        events.                                                               updates; pre‑orders may
                           shipped, delivered)                                                  by time buckets.                                                                                                                                   skew data.
                           【194180348863084†L96-
                           L132】.


Orders fulfilled over      Shows number of orders               Order fulfilment events.        Orders fulfilled; orders shipped;        Date range; group by time.          Real‑time.                          N/A.                              None.
time                       fulfilled, shipped, and delivered                                    orders delivered; trend lines.
                           over time.


Shipping labels over       Shows number of shipping             Shipping label purchase         Labels purchased; cost; average          Date range; group by time; filter   Data may take up to 24 hours        Average cost per label = cost     Only includes labels
time                       labels purchased and their cost,     transactions.                   cost per label.                          by carrier or service.              to update                           ÷ labels purchased.               purchased through
                           along with average cost per                                                                                                                       【194180348863084†L96-                                                 Shopify Shipping.
                           label【194180348863084†L96-                                                                                                                        L132】.
                           L132】.


Shipping labels by order   Detailed breakdown of shipping       Shipping label data and         Order number; origin country;            Date range; filter by carrier or    Data may take up to 24 hours        N/A.                              Only available for labels
                           labels by order, including origin/   order details.                  destination country; carrier; service;   service.                            to update.                                                            purchased through
                           destination country, carrier,                                        package dimensions; package                                                                                                                        Shopify Shipping.
                           service, package dimensions                                          weight; customer paid; cost;
                           and weight, amount paid by                                           difference.
                           customer vs cost
                           【194180348863084†L96-
                           L132】.


Items bought together      Lists common product or              Order line items.               Group of products/variants; number       Date range; filter by number of     Real‑time; updates as orders        Percentage = (orders with         Only shows top
                           variant combinations frequently                                      of orders where they appear              items in a bundle (2 or 3); can     come in.                            the combination ÷ total           combinations; low volume
                           purchased in the same order                                          together; percentage of orders.          switch between “Products                                                orders) × 100.                    pairs may not appear.
                           【194180348863084†L182-                                                                                        bought together” and “Variants
                           L204】.                                                                                                        bought


[PAGE BREAK]

  Report                      Purpose                            Data Source                  Key Metrics & Fields                   Filters & Dimensions             How It Runs                       Calculation Logic              Limitations / Caveats

                                                                                                                                     together”【194180348863084†
                                                                                                                                     L182-L204】.
```

## Performance

```text
CATEGORY: Performance

This category focuses on web performance metrics based on Google’s Core Web Vitals. See Behavior – Web performance reports above for detailed breakdowns of each report. The performance category includes the following reports:

    1. Largest Contentful Paint: Over Time – displays LCP values and trends over time for the online store【822950260754957†L153-L170】.
    2. Interaction to Next Paint: Over Time – displays INP values over time【822950260754957†L153-L170】.
    3. Cumulative Layout Shift: Over Time – displays CLS values over time【822950260754957†L153-L170】.
    4. Largest Contentful Paint: Page URL – shows LCP values by specific page URLs【822950260754957†L191-L210】.
    5. Interaction to Next Paint: Page URL – shows INP values by page URL【822950260754957†L191-L210】.
    6. Cumulative Layout Shift: Page URL – shows CLS values by page URL【822950260754957†L191-L210】.
    7. Largest Contentful Paint: Page Type – shows LCP performance by template type (home, product page, collection page)【822950260754957†L213-L232】.
    8. Interaction to Next Paint: Page Type – shows INP performance by page type【822950260754957†L213-L232】.
    9. Cumulative Layout Shift: Page Type – shows CLS performance by page type【822950260754957†L213-L232】.

Each of these reports shares the same data source (real user metrics captured from visitor sessions), supports filters for date range, device type, and grouping by time or page attributes, and has a delay of up to 36 hours before data is
available【822950260754957†L20-L21】. They help store owners identify slow pages or templates and measure the impact of changes on Core Web Vitals.
```

## Profit Margin

```text
CATEGORY: Profit Margin

  Report                      Purpose                            Data Source                  Key Metrics & Fields                   Filters & Dimensions             How It Runs                       Calculation Logic              Limitations / Caveats


  Average profit margin       Shows profit metrics grouped       Sales and cost data per      Net quantity; net sales; cost; gross   Date range; group by market;     Real‑time when cost per item is   Gross profit = net sales –     Requires cost per item;
  by market                   by market (international market    market.                      margin %; gross profit                 filter by country.               set.                              cost; gross margin % = gross   returns and discounts
                              vs domestic)                                                    【835402185299714†L104-L132】.                                                                              profit ÷ net sales             lower profit.
                              【835402185299714†L104-                                                                                                                                                    【835402185299714†L104-
                              L132】. Helps identify                                                                                                                                                     L132】.
                              profitability across markets.


  Gross profit by product     Displays gross profit per          Orders and cost of goods     Net quantity; net sales; cost; gross   Date range; filter by product,   Real‑time.                        Same formulas as above.        Requires cost fields;
                              product                            sold.                        margin %; gross profit                 vendor, type.                                                                                     overselling can distort
                              【835402185299714†L104-                                          【835402185299714†L104-L132】.                                                                                                             numbers.
                              L132】.


  Gross profit by product     Same as above but for each         Same as above.               Net quantity; net sales; cost; gross   Filters by variant.              Real‑time.                        Same formulas.                 Same limitations.
  variant                     product variant                                                 margin; gross profit per variant.
                              【835402185299714†L104-
                              L132】.


  Gross profit by POS         Shows gross profit for each        POS orders and cost data.    Net quantity; net sales; cost; gross   Date range; filter by POS        Real‑time.                        Same formulas.                 Only includes POS sales;
  location                    point‑of‑sale location                                          profit; gross margin.                  location.                                                                                         not online.
                              【835402185299714†L104-
                              L132】.


  Profit margin by order      Displays profit margin for every   Orders and cost data.        Order ID; net sales; cost; gross       Date range; filter by order      Real‑time.                        Gross profit = net sales –     Requires accurate cost
                              order including product and                                     profit; gross margin; duties; import   channel or location.                                               cost; gross margin = gross     per item and shipping
                              shipping charges, duties and                                    taxes.                                                                                                    profit ÷ net sales.            costs; partial refunds can
                              import taxes                                                                                                                                                                                             affect profitability.
                              【835402185299714†L104-
                              L132】.
```

## Retail Sales

```text
CATEGORY: Retail Sales

 Report                      Purpose                            Data Source               Key Metrics & Fields                     Filters & Dimensions             How It Runs                 Calculation Logic                Limitations / Caveats


 POS total sales by          Shows breakdown of total sales     Point‑of‑sale orders.     Product type; product title; net         Date range; filter by product    Updates every 1–5 minutes   Net quantity = sold items –      Only for POS channel;
 product                     of products (excluding shipping)                             quantity; net sales; discounts; gross    type or POS location.            【165765846470801†L154-      returned items; Net sales =      shipping not included.
                             across POS locations                                         profit; average order value.                                              L167】.                      gross sales – discounts –
                             【165765846470801†L66-                                                                                                                                              returns.
                             L117】.


 POS total sales by          More granular version showing      POS orders.               Product title; variant title; variant    Filters by variant.              Real‑time (1–5 minutes).    Same formulas.                   None.
 product variant             sales per product variant                                    SKU; net quantity; net sales.
                             【165765846470801†L66-
                             L117】.


 POS total sales by          Breaks down sales by vendor        POS orders and vendor     Vendor name; POS location; net           Filter by vendor or location.    Real‑time.                  Net sales = gross sales –        Only for products with
 vendor                      grouped by POS location            data.                     quantity; net sales.                                                                                  discounts – returns.             vendor information.
                             【165765846470801†L154-
                             L167】.


 POS total sales by          Groups POS sales by product        POS orders.               Product type; POS location; net          Filter by product type or        Real‑time.                  Same formulas.                   Product type must be set.
 product type                type                                                         quantity; net sales.                     location.
                             【165765846470801†L154-
                             L167】.


 Total sales by POS          Shows total sales for each POS     POS orders.               Product type; net quantity; POS          Filter by location.              Real‑time.                  Same formulas.                   Only for POS channel.
 location                    location and product type                                    location name; net sales.
                             【165765846470801†L154-
                             L167】.


 POS total sales by staff    Shows sales per staff member       POS orders with staff     Staff name; POS location; net            Filter by staff member or        Real‑time.                  Percent with staff help =        Depends on staff
 member                      and percent of sales with staff    attribution.              quantity; net sales; percentage of       location.                                                    (sales by staff ÷ total sales)   attribution at checkout;
                             help                                                         sales with staff help.                                                                                × 100.                           custom sale items may
                             【165765846470801†L154-                                                                                                                                                                              require manual
                             L167】.                                                                                                                                                                                              assignment.


 POS staff daily sales       Shows daily sales by staff or      POS orders.               Date; staff name; POS location; net      Date range; filter by staff or   Real‑time.                  Same formulas.                   None.
 total / POS staff sales     aggregated total sales by staff                              sales; percentage of sales with staff    location.
 total                       【165765846470801†L154-                                       help.
                             L167】.
```

## Sales

```text
CATEGORY: Sales

Sales reports encompass a wide range of analyses on order data. Shopify distinguishes between Total sales reports (which include taxes, duties, shipping and fees) and Net sales reports (which exclude returns and discounts). The key
reports include:


 Report                      Purpose                            Data Source               Key Metrics & Fields                     Filters & Dimensions             How It Runs                 Calculation Logic                Limitations / Caveats


 Total sales by product      Breaks down total sales            Order line items.         Product title; product vendor; product   Date range; filter by product    Real‑time.                  Net sales = gross sales –        Product data may display
                             (excluding shipping) by product                              type; net quantity; gross sales;         type or vendor; group by                                     discounts – returns; total       as dash when changed
                             【728304705354781†L377-                                       discounts; returns; net sales; taxes;    product.                                                     sales excludes shipping          after the order
                             L386】. Useful for                                            total sales                                                                                           because shipping can’t be        【728304705354781†L40
                             understanding product                                        【728304705354781†L377-L408】.                                                                          apportioned                      1-L408】.
                             performance.                                                                                                                                                       【728304705354781†L377-
                                                                                                                                                                                                L386】.


[PAGE BREAK]

Report                    Purpose                           Data Source                     Key Metrics & Fields                      Filters & Dimensions               How It Runs                      Calculation Logic               Limitations / Caveats


Total sales by product    More granular breakdown of        Order line items.               Product title; variant title; variant     Date range; filter by variant.     Real‑time.                       Same as above.                  Data may be duplicated if
variant                   gross sales (excluding                                            SKU; net quantity; gross sales;                                                                                                               product details change
                          shipping) by variant                                              discounts; returns; net sales; taxes;                                                                                                         over time.
                          【728304705354781†L410-                                            total sales
                          L418】.                                                            【728304705354781†L410-L428】.


Total sales by vendor     Displays vendors and products     Order items and vendor field.   Vendor name; net quantity; gross          Filter by vendor.                  Real‑time.                       Same formulas.                  Only products with vendor
                          they supply                                                       sales; discounts; returns; net sales;                                                                                                         field populated.
                          【728304705354781†L430-                                            total sales
                          L442】.                                                            【728304705354781†L430-L442】.


Sales by discount codes   Shows sales grouped by            Orders and discount codes.      Discount name; discount ID;               Date range; filter by discount     Real‑time; includes data since   Total sales for discount code   Orders with multiple
                          discount code name, including                                     discount class (shipping, product,        code.                              May 1 2017                       includes only sales affected    discounts show multiple
                          automatic discounts                                               order, unknown); discount method;                                            【728304705354781†L444-           by that discount.               rows; may double‑count if
                          【728304705354781†L444-                                            discount type (percentage, fixed                                             L459】.                                                           combinable discounts
                          L456】.                                                            amount, free shipping, buy X get Y,                                                                                                           used
                                                                                            App); discount code; discount                                                                                                                 【728304705354781†L45
                                                                                            amount; other discounts;                                                                                                                      2-L481】.
                                                                                            non‑shipping discounts; shipping
                                                                                            discounts; script discounts (Shopify
                                                                                            Plus); orders; total sales; shipping
                                                                                            【728304705354781†L444-L500】.


Total sales by referrer   Displays sales based on the       Orders with referrer            Referrer source; traffic referrer host;   Date range; filter by referrer     Real‑time.                       Same formulas; uses last        Many visits show as
                          referrer site (direct, search,    information.                    gross sales; discounts; returns; net      source.                                                             interaction referrer            Unknown due to blocked
                          email, social, unknown)                                           sales; taxes; total sales                                                                                     【728304705354781†L537-          referrer data or privacy
                          【728304705354781†L503-                                            【728304705354781†L503-L526】.                                                                                  L539】.                          settings
                          L521】.                                                                                                                                                                                                          【728304705354781†L52
                                                                                                                                                                                                                                          8-L536】.


Total sales by billing    Shows sales by country/region     Orders’ billing addresses.      Billing location; net quantity; gross     Date range; filter by country or   Real‑time.                       Same formulas.                  None.
location                  of the billing address                                            sales; discounts; returns; net sales;     region.
                          【728304705354781†L541-                                            taxes; total sales
                          L552】.                                                            【728304705354781†L541-L552】.


Total sales by currency   Available only for stores using   Multi‑currency orders.          Order checkout currency; number of        Date range; filter by currency.    Real‑time.                       N/A.                            Only available with
                          Shopify Payments; displays                                        orders; total sales in local currency                                                                                                         Shopify Payments; not all
                          breakdown of sales by                                             【728304705354781†L553-L569】.                                                                                                                  currencies supported.
                          customer currency
                          【728304705354781†L553-
                          L569】.


Total sales by sales      Shows amount of sales for         Order records with sales        Sales channel; gross sales;               Date range; filter by channel.     Real‑time.                       Same formulas.                  Orders from unnamed
channel / Net sales by    each sales channel (Online        channel tag.                    discounts; returns; net sales; taxes;                                                                                                         apps display as Other;
channel                   Store, Buy Button, Draft                                          total sales                                                                                                                                   draft orders appear
                          Orders, etc.)                                                     【728304705354781†L571-L580】.                                                                                                                  separately.
                          【728304705354781†L571-
                          L580】.


Sales by customer name    Breaks down orders by             Orders and customer data.       Customer name; customer email; net        Date range; filter by customer     Real‑time.                       Same formulas.                  Customers with multiple
                          customer over time                                                quantity; gross sales; discounts;         segment.                                                                                            email addresses may
                          【728304705354781†L583-                                            returns; net sales; taxes; total sales                                                                                                        appear separately.
                          L595】.                                                            【728304705354781†L583-L595】.


Average order value       Shows how AOV changes over        Order data.                     Average order value per time unit;        Date range; group by hour/day/     Real‑time.                       AOV = (gross sales –            Excludes post‑order
(AOV) over time           time                                                              orders; gross sales; discounts.           week/month/quarter/year;                                            discounts) ÷ orders             adjustments; low order
                          【728304705354781†L596-                                                                                      compare date ranges                                                 【728304705354781†L608-          volume may skew results.
                          L610】.                                                                                                      【728304705354781†L596-                                              L617】.
                                                                                                                                      L604】.


[PAGE BREAK]

 Report                      Purpose                         Data Source                   Key Metrics & Fields                    Filters & Dimensions              How It Runs                       Calculation Logic           Limitations / Caveats


 Bundle total sales over     Present sales of product        Orders involving product      Orders; net quantity; total sales;      Date range; default period last   Real‑time; available when using   Same formulas; bundle       Data appears only for
 time / Total sales by       bundles and components          bundles using the Shopify     AOV; for comparison report – split by   30 days; group by time.           Bundles app.                      component comparison        merchants using product
 bundle / Total sales by     【728304705354781†L632-          Bundles app.                  Is bundle (Yes/No)                                                                                          splits sales of bundle vs   bundles.
 bundle component /          L671】.                                                        【728304705354781†L632-L671】.                                                                                individual components
 Bundle component and                                                                                                                                                                                  【728304705354781†L664-
 product comparison                                                                                                                                                                                    L671】.


 Active / Canceled / New     Track subscription orders       Subscription orders and       Number of active subscriptions,         Date range; default last 30       Real‑time; available when using   Simple counts and sums;     Only available when using
 subscriptions over time;    created through Shopify         subscription events.          canceled subscriptions, new             days.                             Shopify Subscriptions.            e.g., subscription sales    the Subscriptions app.
 Subscription sales over     Subscriptions app                                             subscriptions; total sales from                                                                             include taxes, shipping,
 time; Subscription vs       【728304705354781†L672-                                        subscriptions; number of                                                                                    duties and fees
 one‑time sales              L720】.                                                        subscription orders; comparison of                                                                          【728304705354781†L710-
                                                                                           subscription vs one‑time orders                                                                             L713】.
                                                                                           【728304705354781†L690-L722】.
```

## Store

```text
CATEGORY: Store

As of the writing of this report, Shopify’s Help Center does not document a distinct Store category of default reports separate from other categories. The Analytics data points (fields) reference includes a Stores section describing
dimensions like Shop ID and Store name used for multi‑store analytics【944592434573300†L6563-L6580】, but no specific “Store” reports are documented. Therefore, no confirmed default reports exist in the Store category. If your Shopify
admin shows a Store category, it likely contains custom reports or field groupings rather than standard Shopify reports. Not confirmed in Shopify.




Note: Report names and behaviours are subject to change as Shopify updates their analytics features. Always refer to the latest Shopify documentation or your Shopify admin for the most current information.


END OF REPORT. This document preserves the complete report content and structure from the working inventory supplied for PDF conversion.
```
