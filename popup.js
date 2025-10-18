document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const timeFormatRadios = document.querySelectorAll('input[name="timeFormat"]');
    
    // Load saved settings
    chrome.storage.sync.get(['timeFormat'], function(result) {
        const savedFormat = result.timeFormat || 'auto';
        document.getElementById(`format-${savedFormat}`).checked = true;
    });
    
    // Handle save button click
    saveButton.addEventListener('click', function() {
        const selectedFormat = document.querySelector('input[name="timeFormat"]:checked').value;
        
        // Save to chrome storage
        chrome.storage.sync.set({
            timeFormat: selectedFormat
        }, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings', 'error');
            } else {
                showStatus('Settings saved successfully!', 'success');
                
                // Notify content scripts to update
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0] && tabs[0].url && tabs[0].url.includes('github.com')) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'updateTimeFormat',
                            timeFormat: selectedFormat
                        });
                    }
                });
            }
        });
    });
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    // Handle radio button changes
    timeFormatRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            saveButton.disabled = false;
        });
    });
});
