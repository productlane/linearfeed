# linearfeed

Replace your newsfeeds with your Linear issues.

Open Instagram, YouTube, LinkedIn or X and you see your assigned Linear issues where the feed used to be, styled like Linear's "My issues" view.

| Site | What gets replaced | What still works |
|---|---|---|
| Instagram | Home feed (below the stories) and the Reels tab | Stories, DMs, profiles, shared reels |
| YouTube | Recommendations on the home page and in the sidebar next to videos | Videos, search, subscriptions, playlists, live chat |
| LinkedIn | The feed column | Messages, profiles, jobs |
| X | The home timeline, all tabs | Profiles, search, DMs, single posts |

No backend. The extension talks to the Linear API directly from your browser, using a personal API key that is stored only in your browser's extension storage.

## Install in Chrome

1. Download this repo (Code > Download ZIP) or `git clone` it, and keep the folder somewhere permanent.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension` folder.
4. Open Instagram, click **Add API key**, and paste a Linear personal API key.
   Create one in Linear under Settings > Account > Security & access > Personal API keys. Read access is enough.

To update: `git pull`, then click the reload icon on the extension in `chrome://extensions`.

## Install in Safari

Safari extensions have to be signed, so you build it yourself once:

1. Install Xcode and sign in with any Apple ID under Xcode > Settings > Accounts.
2. Run `./build-safari.sh`.
3. Enable **LinearFeed** in Safari > Settings > Extensions, and allow it on instagram.com, youtube.com, linkedin.com, x.com and api.linear.app.
4. Add your Linear API key as above.

To update after a `git pull` or after changing files in `extension/`:

1. Run `./build-safari.sh` again. It rebuilds and replaces `/Applications/LinearFeed.app`.
2. Reload the open Instagram, YouTube, LinkedIn and X tabs.

Your API key and settings stay. If Safari doesn't pick up the change, quit and reopen Safari.

## Notes

- The "Open in Linear" link points to the Productlane workspace. Change `MY_ISSUES_URL` in `extension/linear-view.js` for your own.
- Instagram, YouTube, LinkedIn and X change their markup often. If the list ends up in the wrong place, the selectors live in `extension/content.js`. Pull requests welcome.

Built by the [Productlane](https://productlane.com) team.
