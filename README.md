# GitHub Absolute Date Chrome Extension

This Chrome extension replaces relative time expressions on GitHub with absolute dates and times, making it easier to understand when events occurred without hovering over timestamps.

## Features

- Converts relative time expressions (e.g., "2 days ago") to absolute dates and times (e.g., "9/14/24, 4:25 PM")
- Works on self-hosted GitHub Enterprise instances via configurable URLs (no need to edit the manifest)

## Installation

### For Developers (Local Installation)

1. Clone this repository:
   ```
   git clone https://github.com/pkid/github-absolute-time-chrome-plugin.git
   ```

2. Open Google Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" by toggling the switch in the top right corner

4. Click "Load unpacked" and select the directory where you cloned this repository

5. The extension should now appear in your list of installed extensions

## Usage

Once installed, the extension will automatically convert relative times to absolute dates and times on GitHub pages.

### GitHub Enterprise / self-hosted instances

If your organization runs GitHub on a custom domain (e.g. `https://github.mycompany.com`), you can enable the extension there without editing any files:

1. Click the extension icon to open the popup.
2. Under **GitHub Enterprise URLs**, enter your instance URL and click **Add**.
3. Chrome will ask you to grant access to that site — approve it.
4. Reload the tab; relative times will now be converted.

To stop the extension from running on a site, remove it from the same list (this also revokes the granted permission).

## Development

To modify or enhance the extension:

1. Make changes to the relevant files (`content.js`, `background.js`, `manifest.json`)
2. Save your changes
3. Go to `chrome://extensions`
4. Find this extension in the list and click the refresh icon
5. Reload any open GitHub tabs to see your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on this GitHub repository.
