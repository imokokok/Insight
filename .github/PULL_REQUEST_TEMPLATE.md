## Summary

Describe the user-visible outcome and any API, database, billing, or data-pipeline impact.

## Verification

- [ ] `npm run validate:ci`
- [ ] Relevant Playwright smoke/interaction tests
- [ ] Public and authenticated data responses remain compatible
- [ ] No secret, production credential, or customer data is included
- [ ] Migration/RLS impact reviewed, or no database change
- [ ] Observability and rollback steps documented for risky changes

## Release notes

List required environment variables, migration order, manual activation, and rollback steps. Write “None” when not applicable.
