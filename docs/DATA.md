# Your data

Where Setwise keeps what you enter, and how to not lose it.

## Where it lives

Everything Setwise knows about you — your profile, routine, custom exercises,
logged sessions, preferences, and the date of your last backup — is stored in
a single `localStorage` key, `setwise.v1`, on the device and in the browser
you're using (`src/app/state.js`). There is no account, no server, and no
sync: nothing is sent anywhere. If you open Setwise in a different browser or
on a different device, it starts empty because that key doesn't exist there.

Because it's just a browser storage key, anything that clears site data for
this browser (clearing browsing data, uninstalling the browser, a "free up
space" cleanup on the OS) can erase it.

## Why installing helps

Settings has an **Install app** button when the app isn't already installed.
Installing it to your home screen doesn't just add an icon — browsers are
far less likely to clear storage for installed apps, and some browsers will
also ask the OS to persist storage for you. Setwise asks for that directly:
after you finish a logged session, it calls
`navigator.storage.persist()`, a standard browser API that marks the site's
storage as one the browser shouldn't evict under storage pressure (granted
automatically for installed apps on most browsers). This is a request, not a
guarantee — the browser decides.

## The backup reminder

Setwise tracks the date of your last backup (`lastBackup`). Once you have at
least 5 logged sessions, if you've never backed up or it's been more than 14
days since your last one, the Today screen shows a reminder card with
**Save a backup** and **Later** buttons. **Later** doesn't dismiss it forever
— it sets `lastBackup` back 7 days, so the reminder returns in a week if you
still haven't backed up.

## Save a backup

Settings → **Save a backup** downloads a JSON file named
`setwise-backup-YYYY-MM-DD.json` containing your entire state (profile,
routine, custom exercises, logs, preferences, start date) plus an
`exportedAt` timestamp. Saving a backup also updates `lastBackup` to now,
which clears the reminder. The same **Save a backup** action is available
from the reminder card on Today.

## Restore (replaces everything)

Settings → **Restore backup** reads a JSON file you choose. Setwise checks
that it looks like one of its own backups (an `app: "setwise"` marker, a
profile, and a logs array) and refuses the file otherwise. If it's valid, it
asks you to confirm — the dialog shows how many sessions the backup
contains — because **restoring replaces everything currently on this
device**: your current profile, routine, custom exercises, logs,
preferences, and backup date are all overwritten with the backup's. There is
no merge.

## Moving to a new phone

Since nothing is synced automatically, moving devices means moving the
backup file yourself:

1. On the old device: Settings → **Save a backup**, and get the downloaded
   JSON file onto the new device (AirDrop, email it to yourself, a cloud
   drive — whatever you'd normally use to move a file).
2. On the new device: open Setwise, go to Settings → **Restore backup**, and
   choose that file.

## Per-lift CSV

If you have logged sets for at least one exercise, Settings shows a lift
picker and an **Export lift CSV** button. It exports a CSV with one row per
session for that lift: the session date and the estimated one-rep max for
that session. It's meant as a plain outcome series for a spreadsheet or a
self-experiment tool (the app's export even suggests feeding it to an
N-of-1 tracker) — it isn't a full backup, and restoring from a CSV isn't
supported.

## Reset

Settings → **Erase everything on this device**, under "Start over," asks you
to confirm, then removes the `setwise.v1` key outright. This deletes your
routine and every logged session with no way to undo it from within the
app — the confirmation dialog itself reminds you to save a backup first if
you want to keep a copy.
