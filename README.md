# Vacation Planner

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

## Saving

One trip is stored in **localStorage**, under `vacation-day-planner:v1`. There is no backend, account, analytics, or external service.

Data belongs to this browser profile and origin (scheme, hostname, and port). Switching browsers, changing `localhost` to another hostname, or using the preview port does not share data. Clearing site data removes the saved trip; private browsing may discard it. This is local convenience storage, not a backup or synchronization service.

Failed writes show an error and do not apply the unsaved change. Invalid or unsupported stored data is not silently overwritten: retry loading or explicitly confirm **Start fresh** to replace it.

## Scope

Version 1 supports a single trip, same-day events, hourly scheduling, and automatic colors. Color selection, notes/links, overnight events, and multiple-trip pills are intentionally deferred.

See [future features](./NEXT-FEATURES.md) for the additions discussed for later versions.
