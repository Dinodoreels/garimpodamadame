## Security fixes

- Sanitize AI chat output before rendering.
- Enforce server-side loyalty and shipping validation during checkout.
- Restrict customer data and administrative endpoints by authenticated role or internal scheduler secret.
- Tighten database function permissions and the three unsafe row policies.
- Deploy affected functions, apply the database migration, verify, and close only the selected findings.
