# linearfeed

Replace your newsfeeds with your Linear issues.

Open Instagram, YouTube, LinkedIn or X and you see your assigned Linear issues where the feed used to be, styled like Linear's "My issues" view.

| Site | What gets replaced | What still works |
|---|---|---|
| Instagram | Home feed (below the stories) and the Reels tab | Stories, DMs, profiles, shared reels |
| YouTube | Recommendations on the home page and in the sidebar next to videos | Videos, search, subscriptions, playlists, live chat |
| LinkedIn | The feed column | Messages, profiles, jobs |
| X | The home timeline, all tabs | Profiles, search, DMs, single posts |

No backend. The extension talks to the Linear and Typefully APIs directly from your browser, using personal API keys that are stored only in your browser's extension storage.

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
3. Enable **LinearFeed** in Safari > Settings > Extensions, and allow it on instagram.com, youtube.com, linkedin.com, x.com, productlane.com, api.linear.app and api.typefully.com.
4. Add your Linear API key as above.

To update after a `git pull` or after changing files in `extension/`:

1. Run `./build-safari.sh` again. It rebuilds and replaces `/Applications/LinearFeed.app`.
2. Restart Safari when the script asks. Safari keeps the old extension code in memory until it restarts, so reloading the page is not enough.

Your API key and settings stay.

## Typefully posts next to Productlane changelogs (optional)

In the Productlane changelog editor (`/edit-changelog/...`) a panel on the right shows the matching Typefully post: the text per platform (X, LinkedIn), its status and date, and a link to open it in Typefully.

1. In Typefully, create an API key under Settings > API.
2. Open the extension settings (Chrome: Details > Extension options, or the **Add API key** button in the panel) and paste it under Typefully.

The extension suggests the post whose title and text best match the changelog. If the suggestion is wrong, click **Change** and pick the right one. Your choice is saved in your browser.

## Notes

- The "Open in Linear" link points to the Productlane workspace. Change `MY_ISSUES_URL` in `extension/linear-view.js` for your own.
- Instagram, YouTube, LinkedIn and X change their markup often. If the list ends up in the wrong place, the selectors live in `extension/content.js`. Pull requests welcome.

Built by the [Productlane](https://productlane.com) team.
