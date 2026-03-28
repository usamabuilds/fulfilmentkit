# Shopify Analytics Reports - Codex Input Package

This folder contains a repo-ready conversion of the uploaded PDF into both Markdown and plain-text files.

## What is included

- `00_front_matter.md` and `00_front_matter.txt`
- `FULL_REPORT_EXTRACTED.md` and `FULL_REPORT_EXTRACTED.txt`
- one `.md` file and one `.txt` file for each Shopify report category

## Category file order

- `01_acquisition.md` and `01_acquisition.txt`
- `02_behavior.md` and `02_behavior.txt`
- `03_customers.md` and `03_customers.txt`
- `04_finances.md` and `04_finances.txt`
- `05_fraud.md` and `05_fraud.txt`
- `06_inventory.md` and `06_inventory.txt`
- `07_marketing.md` and `07_marketing.txt`
- `08_orders.md` and `08_orders.txt`
- `09_performance.md` and `09_performance.txt`
- `10_profit_margin.md` and `10_profit_margin.txt`
- `11_retail_sales.md` and `11_retail_sales.txt`
- `12_sales.md` and `12_sales.txt`
- `13_store.md` and `13_store.txt`

## Notes

- The extraction used a layout-preserving PDF-to-text method to keep table alignment as intact as possible.
- Content has been split by the same category structure shown in the PDF.
- Inline source markers from the PDF were preserved.
- The Store section is included exactly as stated in the PDF, including the note that no confirmed default Shopify Store reports were documented.

## Best way to give this to Codex

Place this folder inside your repo, for example:

```text
docs/shopify-reports/
```

Then ask Codex to read all files in that folder and use them as the source of truth.
