# Trip Planner

A browser-only vacation itinerary planner with draggable events, hourly scheduling, and local saving.

## Run

Requires Node.js 20.19+ (or a newer supported Node release). From the repository root:

```sh
npm install
npm run dev
```

Open **http://localhost:5178/**. The port is strict: if it is occupied, Vite reports an error rather than silently changing the browser storage origin.

```sh
npm run build
npm test
npm run preview
```

The production static files are generated in `dist/`. Preview uses http://localhost:4178/ and therefore has separate saved data from the development app.

## Plan your days

- Set the trip dates and choose **Apply dates**.
- Days run across the grid; hours run down from **07:00 to 23:00**.
- Click an empty hour or **+ Add event** to enter a name and times.
- Drag an event vertically to change its time or horizontally to change its day. Duration stays the same. Near the grid edges, dragging scrolls the grid.
- Pull the top or bottom edge to change the start or end. Events snap to whole hours, last at least one hour, and stay within the displayed day/time bounds.
- Click an event (or focus it and press Enter/Space) to rename it, set exact dates/times without dragging, or delete it. Deletion requires confirmation.
- Overlaps are allowed and shown side by side. Adjacent events do not count as overlapping.
- Shortening the displayed date range never moves or deletes events. A notice counts hidden events; extending the dates brings them back.

The first launch opens an empty seven-day trip beginning today. Event colors are automatic and stable.

## Trips and sharing

- Use the pills above the dates to switch trips, **+ New trip** to add one, and **Rename** / **Delete** for the selected trip.
- The address bar always holds the complete selected trip (name, dates, and events), compressed into the `#t=...` part of the URL. **Copy link** copies it. Opening the link on any device recreates the trip there.
- The URL fragment is never sent to a server, but anyone with the link can read the trip, and it appears in browser history and wherever you paste it.
- If a link points to a trip that is already saved on this device with different contents, you choose to save the link as a copy, keep your version, or replace it. Nothing is overwritten silently.
- Trips span at most 366 days. Very long links may be cut off by some apps; a notice appears when a link gets long.

## Saving

All trips are stored in **localStorage**, under `vacation-day-planner:v2`. Data saved by the earlier single-trip version (`vacation-day-planner:v1`) is copied into a trip named "My trip" on first load and the old entry is left in place. There is no backend, account, analytics, or external service.

Data belongs to this browser profile and origin (scheme, hostname, and port). Switching browsers, changing `localhost` to another hostname, or using the preview port does not share data. Clearing site data removes the saved trips; private browsing may discard them. This is local convenience storage, not a backup or synchronization service. Copy a trip's link to keep it elsewhere.

Failed writes show an error and do not apply the unsaved change. Invalid or unsupported stored data is not silently overwritten: retry loading or explicitly confirm **Start fresh** to replace it.

## Scope

Supports multiple trips, same-day events, hourly scheduling, and automatic colors. Color selection, notes/links, and overnight events are intentionally deferred. Any new trip or event field must also be added to the share link format.

See [future features](./NEXT-FEATURES.md) for the additions discussed for later versions.
