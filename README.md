# Uttarakhand Explorer

An interactive travel itinerary and destination explorer for six stops across
Uttarakhand — Haridwar, Rishikesh, Dehradun, Tehri Garhwal, Chopta and Auli.

Built with React, Vite, Tailwind CSS, React Router and Leaflet (via
react-leaflet).

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview   # serves the production build locally
```

## Project structure

```
src/
  data/
    destinations.js   # all destination content: hotels, cuisine, attractions...
    packages.js        # tour packages + day-by-day itineraries
  context/
    ItineraryContext.jsx   # "Plan My Trip" state, persisted to localStorage
  utils/
    search.js          # flattens all data into one searchable index
  components/           # reusable UI: Navbar, Footer, MapView, cards, etc.
  pages/                 # one file per route
  App.jsx                # router + layout
  main.jsx               # entry point
```

## Configure the shared backend

The admin panel and public site use Supabase for shared content, authentication,
inquiries, gallery moderation, notifications, and image storage. Without these
steps, admin sign-in and visitor submissions are unavailable; public content
continues to use the bundled sample data.

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from the project's API settings. Use only the
   publishable/anon key in the browser; never put a service-role key in a
   `VITE_` variable.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL
   Editor. It creates the protected application state, public published-state
   projection, submission functions, access policies, and `site-assets`
   storage bucket.
4. Create an admin account in Supabase Authentication. Then grant that account
   admin access in the SQL Editor, replacing the email with the account email:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

5. Add the local and deployed website URLs to Supabase Authentication's site
   URL and redirect URL settings. Set the same two environment variables in
   the production hosting provider and redeploy.
6. Restart the local Vite server after changing `.env.local`, then sign in at
   `/admin/login`.

Admin access is allow-listed by `public.admin_users`; creating a normal
Supabase Auth user alone does not grant admin permissions. Database row-level
security keeps inquiries, drafts, and moderation data private. Public readers
receive only published content and approved gallery photos. Inquiries and
photos are sent to Supabase and appear in the admin panel across browsers;
photos are stored in Supabase Storage.

## Where to edit bundled sample content

Bundled destinations and packages in `src/data/destinations.js` and
`src/data/packages.js` provide the initial sample content. After Supabase is
configured, the admin panel stores shared additions and edits on top of this
baseline; public pages read those updates from Supabase automatically.

Image URLs currently point to Unsplash placeholders. Replace `image`,
`gallery`, and any per-item `image` fields with your own hosted assets when
ready.

## Key interactive features

- **Interactive map** (`/map`): Leaflet map with custom glowing markers per
  destination, a route line connecting them in order, hover-to-preview and
  click-to-open a full detail panel, plus a destination list and journey
  stats panel.
- **Itinerary builder** (`/itinerary`): add/remove/reorder destinations
  (drag-and-drop or up/down buttons), persisted automatically to
  `localStorage` under the key `uttarakhand-explorer:itinerary`.
- **Global search**: click the search icon in the navbar to search
  destinations, hotels, attractions, activities, cuisine and packages in one
  place.
- **Gallery** (`/gallery`): category-filterable grid with a fullscreen
  lightbox viewer.

## Notes

- Supabase provides the shared website/admin backend. There is no booking,
  payment, or email-delivery integration; inquiries are stored in the admin
  panel but are not automatically emailed.
- Destination and package sample data remains bundled in `src/data/`; admin
  changes are saved as shared Supabase overrides/additions.
- The map's distance figures (in the itinerary builder and map overview) are
  rough straight-line/road estimates for display purposes, not routed
  directions.
