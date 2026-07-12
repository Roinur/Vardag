# Security Policy

Vardag stores family data in the Supabase project operated by each installer. Maintainers cannot access independently deployed instances.

## Reporting

Do not post credentials, invite codes, tokens, private family data, or exploitable details in a public issue. Use GitHub's private security-advisory flow for the repository when available.

Include the affected version or commit, the relevant record scope, reproduction steps using synthetic data, and the expected access boundary.

## Deployment responsibility

Operators are responsible for protecting their Supabase, Google Cloud, hosting, and VAPID credentials; applying migrations; reviewing provider logs; and keeping dependencies updated. Never expose a Supabase service-role key or VAPID private key to the browser.
