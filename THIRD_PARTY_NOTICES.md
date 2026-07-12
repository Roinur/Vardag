# Third-Party Notices

Vardag is built with open-source packages installed through npm. The repository does not redistribute a separate proprietary backend or third-party executable.

## Primary runtime dependencies

| Project | Purpose | License |
| --- | --- | --- |
| [React](https://github.com/facebook/react) | User interface | MIT |
| [Vite](https://github.com/vitejs/vite) | Development and production build | MIT |
| [Supabase JS](https://github.com/supabase/supabase-js) | Authentication, database, realtime, and functions client | MIT |
| [Dexie](https://github.com/dexie/Dexie.js) | IndexedDB/local-first persistence | Apache-2.0 |
| [Lucide](https://github.com/lucide-icons/lucide) | Interface icons | ISC |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Styling toolchain | MIT |
| [web-push](https://github.com/web-push-libs/web-push) | VAPID Web Push from the Edge Function | MIT |

Transitive dependencies retain their respective licenses. Run `npm install` to obtain the exact dependency tree and bundled license metadata for the checked-out version.

Supabase is a separately operated service chosen and configured by each person who deploys Vardag. Google OAuth and the chosen hosting provider are external services and are not bundled with this repository.
