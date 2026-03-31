# Retail Sales

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
