# GitHub PR Diff Copier

A Chrome extension that adds a "Copy diff" option to file menus in GitHub pull requests, allowing you to easily copy the diff content for individual files.

## Features

- Adds a "Copy diff" button to the dropdown menu (...) of each file in GitHub PR views
- Copies the complete diff for a specific file in standard diff format
- Works with additions, deletions, and modifications
- Supports file renames and new/deleted files
- Shows notifications when diff is successfully copied

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension will now be active on GitHub pages

## Usage

1. Navigate to any GitHub pull request
2. Find a file in the diff view
3. Click the "..." (more options) button in the file header
4. Select "Copy diff" from the dropdown menu
5. The diff for that specific file will be copied to your clipboard

## Files Structure

- `manifest.json` - Extension configuration
- `content.js` - Main functionality script
- `styles.css` - Extension styling
- `icon*.svg` - Extension icons

## Development

This extension uses Manifest V3 and runs as a content script on GitHub pages. It observes DOM changes to handle GitHub's single-page application behavior.

## Permissions

- `activeTab` - Required to access GitHub page content and modify the DOM

## License

MIT License