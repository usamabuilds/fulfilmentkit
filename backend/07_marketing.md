# Marketing

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
