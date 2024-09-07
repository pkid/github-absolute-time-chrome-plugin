# GitHub Absolute Time Chrome Extension

This Chrome extension replaces relative time expressions on GitHub with absolute dates, making it easier to understand when events occurred without hovering over timestamps.

## Features

- Converts relative time expressions (e.g., "2 days ago") to absolute dates (e.g., "Jun 15, 2023")

## Installation

### For Developers (Local Installation)

1. Clone this repository:
   ```
   git clone https://github.com/pkid/github-absolute-time-extension.git
   ```

2. Open Google Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" by toggling the switch in the top right corner

4. Click "Load unpacked" and select the directory where you cloned this repository

5. The extension should now appear in your list of installed extensions

## Usage

Once installed, the extension will automatically convert relative times to absolute dates on GitHub pages. 

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