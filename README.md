# plex-letterboxd

Syncs your letterboxd watchlist with movies on you plex

## Installation

```bash
git clone https://github.com/slgoetz/plex-letterboxd-sync.git
cd plex-letterboxd-sync
yarn install
```

## Setup

Copy `.env.sample` to `.env` and fill in the environment variables.

* `$PLEX_TOKEN` - See [this Plex support article](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)
* `$PLEX_IP` - Can be an IP address (e.g., `192.168.1.2`) or a hostname (e.g., `plex.example.com`)
* `$PLEX_USER` - Your username with Plex (e.g., how you log in to plex.tv)

## Usage

### Run Once

If you would like to run this once:

```bash
cd plex-letterboxd-sync
./start.sh
```

### Run On A Schedule

If you want this to run in the background on a regular interval (e.g., once a day), you can add it as a launchd script on your Mac.

1. Edit `com.slgoetz.plexletterboxdsync.plist` and replace `/path/to/plex-letterboxd-sync` with the absolute path to where you cloned this repository. E.g., `/Users/username/plex-letterboxd-sync`
2. *Make sure the `PATH` set in `~/Library/LaunchAgents/com.slgoetz.plexletterboxdsync.plist` is valid for your user,* it should ensure that `node` is available to launchd to run the script.
   * E.g., if `node` is at `/usr/local/bin` or `/opt/homebrew/bin` (the default locations for Homebrew-installed Node.js, depending on if you have an Intel or Apple Silicon Mac), you should be good with the default value.
3. Check if you have a directory at `~/Library/LaunchAgents`. If not, create it.
4. Copy the launchd plist file, `com.slgoetz.plexletterboxdsync.plist`, to `~/Library/LaunchAgents`

This will enable the script to run at midnight every day and output a log file for synced movies as well as errors to the `WorkingDirectory` you set in step 1 above.

If you’d like to run it on a different schedule, the `StartCalendarInterval` stanza can be modified. You can do this by hand, or using a utility application like [LaunchControl](https://www.soma-zone.com/LaunchControl/).

## Roadmap

- [ ] Sync ratings
- [ ] Sync Watched
