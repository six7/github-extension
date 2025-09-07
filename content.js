// GitHub PR Diff Copier - Content Script
class GitHubDiffCopier {
  constructor() {
    this.init();
  }

  init() {
    // Only run on GitHub PR pages
    if (!this.isGitHubPRPage()) return;
    
    // Wait for the page to load and then observe for changes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  isGitHubPRPage() {
    return (window.location.hostname === 'github.com' || 
            (window.location.hostname === 'localhost' && window.location.pathname.includes('/pull/'))) && 
           window.location.pathname.includes('/pull/');
  }

  start() {
    // Observe for changes in the DOM since GitHub is a SPA
    const observer = new MutationObserver(() => {
      this.addCopyDiffButtons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial run
    this.addCopyDiffButtons();
  }

  addCopyDiffButtons() {
    // Find all file dropdowns in the PR diff view
    const fileHeaders = document.querySelectorAll('.file-header');
    
    fileHeaders.forEach(fileHeader => {
      // Check if we already added our button
      if (fileHeader.querySelector('.copy-diff-btn')) return;
      
      // Find the dropdown toggle button (... menu)
      const dropdownToggle = fileHeader.querySelector('.js-file-header-dropdown');
      if (!dropdownToggle) return;
      
      // Find or create the dropdown menu
      let dropdownMenu = fileHeader.querySelector('.dropdown-menu');
      if (!dropdownMenu) {
        // If no dropdown menu exists, we need to wait for it to be created
        dropdownToggle.addEventListener('click', () => {
          setTimeout(() => this.addCopyDiffToMenu(fileHeader), 100);
        });
      } else {
        this.addCopyDiffToMenu(fileHeader);
      }
    });
  }

  addCopyDiffToMenu(fileHeader) {
    const dropdownMenu = fileHeader.querySelector('.dropdown-menu');
    if (!dropdownMenu || dropdownMenu.querySelector('.copy-diff-btn')) return;

    // Create the "Copy diff" menu item
    const copyDiffItem = document.createElement('li');
    copyDiffItem.innerHTML = `
      <button class="dropdown-item copy-diff-btn" type="button">
        <svg class="octicon octicon-copy mr-2" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
          <path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
        </svg>
        Copy diff
      </button>
    `;

    // Add click handler
    const button = copyDiffItem.querySelector('.copy-diff-btn');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.copyFileDiff(fileHeader);
    });

    // Add to dropdown menu
    dropdownMenu.appendChild(copyDiffItem);
  }

  copyFileDiff(fileHeader) {
    try {
      // Get the file path from the header
      const filePathElement = fileHeader.querySelector('.file-info a') || 
                             fileHeader.querySelector('[data-path]');
      
      if (!filePathElement) {
        this.showNotification('Could not find file path', 'error');
        return;
      }

      const filePath = filePathElement.getAttribute('data-path') || 
                      filePathElement.textContent.trim();

      // Find the diff content for this file
      const fileContainer = fileHeader.closest('.file');
      if (!fileContainer) {
        this.showNotification('Could not find file diff content', 'error');
        return;
      }

      // Extract the diff content
      const diffContent = this.extractDiffContent(fileContainer, filePath);
      
      if (!diffContent) {
        this.showNotification('No diff content found for this file', 'error');
        return;
      }

      // Copy to clipboard
      navigator.clipboard.writeText(diffContent).then(() => {
        this.showNotification('Diff copied to clipboard!', 'success');
      }).catch(() => {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(diffContent);
      });

    } catch (error) {
      console.error('Error copying diff:', error);
      this.showNotification('Error copying diff', 'error');
    }
  }

  extractDiffContent(fileContainer, filePath) {
    // Start building the diff content
    let diffContent = '';
    
    // Add file header
    const fileMode = this.getFileMode(fileContainer);
    diffContent += `diff --git a/${filePath} b/${filePath}\n`;
    
    if (fileMode) {
      diffContent += `${fileMode}\n`;
    }
    
    // Check if file was renamed, added, or deleted
    const fileStatus = this.getFileStatus(fileContainer);
    if (fileStatus) {
      diffContent += `${fileStatus}\n`;
    }

    // Add the diff hunks
    const diffTable = fileContainer.querySelector('.diff-table');
    if (diffTable) {
      diffContent += this.extractDiffFromTable(diffTable);
    } else {
      // Handle other diff formats (like binary files or renames)
      const diffBody = fileContainer.querySelector('.data');
      if (diffBody) {
        diffContent += diffBody.textContent.trim();
      }
    }

    return diffContent;
  }

  getFileMode(fileContainer) {
    // Look for file mode information
    const modeElement = fileContainer.querySelector('.file-mode');
    return modeElement ? modeElement.textContent.trim() : '';
  }

  getFileStatus(fileContainer) {
    // Check for file status (new, deleted, renamed)
    const statusElements = fileContainer.querySelectorAll('.file-header .text-diff-added, .file-header .text-diff-deleted');
    let status = '';
    
    statusElements.forEach(el => {
      const text = el.textContent.trim();
      if (text.includes('new file')) {
        status += 'new file mode 100644\n';
      } else if (text.includes('deleted')) {
        status += 'deleted file mode 100644\n';
      }
    });
    
    return status;
  }

  extractDiffFromTable(diffTable) {
    let diffContent = '';
    const rows = diffTable.querySelectorAll('tr');
    let currentHunkHeader = '';
    
    rows.forEach(row => {
      // Check if this is a hunk header
      if (row.classList.contains('js-expandable-line') || 
          row.querySelector('.blob-code-hunk')) {
        const hunkText = row.textContent.trim();
        if (hunkText.startsWith('@@')) {
          currentHunkHeader = hunkText;
          diffContent += `${hunkText}\n`;
        }
        return;
      }

      // Skip empty rows or non-diff rows
      if (!row.querySelector('.blob-code')) return;
      
      const lineType = this.getLineType(row);
      const lineContent = this.getLineContent(row);
      
      if (lineType && lineContent !== null) {
        diffContent += `${lineType}${lineContent}\n`;
      }
    });
    
    return diffContent;
  }

  getLineType(row) {
    if (row.classList.contains('blob-code-addition') || 
        row.querySelector('.blob-code-addition')) {
      return '+';
    } else if (row.classList.contains('blob-code-deletion') || 
               row.querySelector('.blob-code-deletion')) {
      return '-';
    } else if (row.querySelector('.blob-code-context')) {
      return ' ';
    }
    return '';
  }

  getLineContent(row) {
    const codeElement = row.querySelector('.blob-code-inner');
    if (!codeElement) return null;
    
    // Get the text content, preserving whitespace
    return codeElement.textContent || '';
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showNotification('Diff copied to clipboard!', 'success');
    } catch (err) {
      this.showNotification('Failed to copy diff', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  showNotification(message, type = 'info') {
    // Create a GitHub-style notification
    const notification = document.createElement('div');
    notification.className = `flash flash-${type === 'success' ? 'success' : 'error'} github-diff-copier-notification`;
    notification.innerHTML = `
      <div class="d-flex">
        <div class="flex-auto">
          ${message}
        </div>
        <button class="btn-link flash-close js-flash-close" type="button">
          <svg class="octicon octicon-x" width="16" height="16">
            <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
          </svg>
        </button>
      </div>
    `;

    // Add to the top of the page
    const container = document.querySelector('.repository-content') || document.body;
    container.insertBefore(notification, container.firstChild);

    // Add close functionality
    const closeBtn = notification.querySelector('.js-flash-close');
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
}

// Initialize the extension
new GitHubDiffCopier();