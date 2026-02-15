document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const timeFormatRadios = document.querySelectorAll('input[name="timeFormat"]');
    const colorByDayCheckbox = document.getElementById('colorByDay');
    const dateFormatInput = document.getElementById('dateFormat');
    const stalenessEnabledCheckbox = document.getElementById('stalenessEnabled');
    const stalenessWarnDaysInput = document.getElementById('stalenessWarnDays');
    const stalenessCriticalDaysInput = document.getElementById('stalenessCriticalDays');
    const showStalenessBadgesCheckbox = document.getElementById('showStalenessBadges');
    const highlightStaleRowsCheckbox = document.getElementById('highlightStaleRows');
    const registrationWall = document.getElementById('registrationWall');
    const registrationComplete = document.getElementById('registrationComplete');
    const leadEmailInput = document.getElementById('leadEmail');
    const registerLeadButton = document.getElementById('registerLeadButton');
    const checkVerificationButton = document.getElementById('checkVerificationButton');
    const registerLeadStatus = document.getElementById('registerLeadStatus');
    const registeredEmail = document.getElementById('registeredEmail');
    const resetRegistrationButton = document.getElementById('resetRegistrationButton');
    const stalenessLockedNote = document.getElementById('stalenessLockedNote');

    const leadConfig = window.GHAT_LEAD_CONFIG || {};
    const leadApiBase = getLeadApiBase(typeof leadConfig.endpoint === 'string' ? leadConfig.endpoint.trim() : '');
    const requiredElements = [
        ['saveButton', saveButton],
        ['status', status],
        ['leadEmail', leadEmailInput],
        ['registerLeadButton', registerLeadButton],
        ['checkVerificationButton', checkVerificationButton],
        ['registerLeadStatus', registerLeadStatus],
        ['resetRegistrationButton', resetRegistrationButton]
    ];
    const missingElements = requiredElements.filter(([, element]) => !element).map(([id]) => id);
    if (missingElements.length > 0) {
        console.error('Popup initialization failed. Missing elements:', missingElements.join(', '));
        if (status) {
            status.textContent = `Popup initialization error: missing ${missingElements.join(', ')}`;
            status.className = 'status error';
            status.style.display = 'block';
        }
        return;
    }

    const defaults = {
        timeFormat: 'auto',
        colorByDay: false,
        dateFormat: 'auto',
        stalenessEnabled: false,
        stalenessWarnDays: 7,
        stalenessCriticalDays: 14,
        showStalenessBadges: true,
        highlightStaleRows: true,
        stalenessLeadRegistered: false,
        stalenessLeadEmail: '',
        stalenessLeadRegisteredAt: '',
        stalenessLeadVerificationPending: false,
        stalenessLeadStatusToken: ''
    };

    const state = {
        stalenessLeadRegistered: false,
        stalenessLeadEmail: '',
        stalenessLeadRegisteredAt: '',
        stalenessLeadVerificationPending: false,
        stalenessLeadStatusToken: ''
    };

    function parsePositiveInt(value, fallback) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }
        return parsed;
    }

    function isSupportedGitHubUrl(url) {
        return url.includes('://github.com/')
            || url.includes('://github.wdf.sap.corp/')
            || url.includes('://github.tools.sap.corp/');
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function formatRetryAfter(seconds) {
        const total = Number(seconds);
        if (!Number.isFinite(total) || total <= 0) {
            return 'a few minutes';
        }
        if (total < 60) {
            return `${Math.ceil(total)}s`;
        }
        const minutes = Math.ceil(total / 60);
        return `${minutes}m`;
    }

    function toLeadErrorMessage(payload, fallback) {
        const error = payload && typeof payload.error === 'string' ? payload.error : '';
        if (error === 'email_cooldown') {
            return `Please wait ${formatRetryAfter(payload.retryAfterSec)} before requesting another email.`;
        }
        if (error === 'rate_limited') {
            return `Too many requests. Try again in ${formatRetryAfter(payload.retryAfterSec)}.`;
        }
        if (error === 'forbidden_client' || error === 'forbidden_origin') {
            return 'This build is not allowed to call the registration API.';
        }
        if (error === 'forbidden_request_context') {
            return 'Request was blocked by API security checks. Please retry from the extension popup.';
        }
        return error || fallback;
    }

    function toStoredDateFormat(value) {
        if (!value) {
            return 'auto';
        }
        return value.trim() || 'auto';
    }

    function getLeadApiBase(rawEndpoint) {
        if (!rawEndpoint) {
            return '';
        }

        let parsed;
        try {
            parsed = new URL(rawEndpoint);
        } catch {
            return '';
        }

        let path = parsed.pathname.replace(/\/+$/, '');
        const suffixes = ['/lead/start', '/lead/status', '/lead/verify', '/lead'];
        suffixes.forEach((suffix) => {
            if (path.endsWith(suffix)) {
                path = path.slice(0, path.length - suffix.length);
            }
        });

        return `${parsed.origin}${path}`;
    }

    function leadApiUrl(path) {
        if (!leadApiBase) {
            return '';
        }
        return `${leadApiBase}${path}`;
    }

    function markDirty() {
        saveButton.disabled = false;
    }

    function isStalenessUnlocked() {
        return Boolean(state.stalenessLeadRegistered);
    }

    function setLeadState(next) {
        state.stalenessLeadRegistered = Boolean(next.stalenessLeadRegistered);
        state.stalenessLeadEmail = next.stalenessLeadEmail || '';
        state.stalenessLeadRegisteredAt = next.stalenessLeadRegisteredAt || '';
        state.stalenessLeadVerificationPending = Boolean(next.stalenessLeadVerificationPending);
        state.stalenessLeadStatusToken = next.stalenessLeadStatusToken || '';

        if (state.stalenessLeadRegistered) {
            state.stalenessLeadVerificationPending = false;
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        setTimeout(() => {
            status.style.display = 'none';
        }, 3500);
    }

    function showLeadStatus(message, type) {
        if (!registerLeadStatus) {
            return;
        }
        if (!message) {
            registerLeadStatus.textContent = '';
            registerLeadStatus.className = 'gate-status';
            registerLeadStatus.style.display = 'none';
            return;
        }
        registerLeadStatus.textContent = message;
        registerLeadStatus.className = `gate-status ${type}`;
    }

    function applyRegistrationUi() {
        if (state.stalenessLeadRegistered) {
            registrationWall.style.display = 'none';
            registrationComplete.style.display = 'block';
            registeredEmail.textContent = state.stalenessLeadEmail;
            stalenessLockedNote.style.display = 'none';
            return;
        }

        registrationWall.style.display = 'block';
        registrationComplete.style.display = 'none';
        registeredEmail.textContent = '';
        stalenessLockedNote.style.display = 'block';

        const hasPending = state.stalenessLeadVerificationPending && Boolean(state.stalenessLeadStatusToken);
        checkVerificationButton.style.display = hasPending ? 'block' : 'none';
        registerLeadButton.textContent = hasPending ? 'Resend Verification Email' : 'Register & Unlock';
        if (hasPending && !registerLeadStatus.textContent) {
            showLeadStatus('Verification email sent. Click the link in your inbox, then click "Check Verification Status".', 'info');
        }
    }

    function updateStalenessControlState() {
        const locked = !isStalenessUnlocked();
        stalenessEnabledCheckbox.disabled = locked;
        const advancedDisabled = locked || !stalenessEnabledCheckbox.checked;
        stalenessWarnDaysInput.disabled = advancedDisabled;
        stalenessCriticalDaysInput.disabled = advancedDisabled;
        showStalenessBadgesCheckbox.disabled = advancedDisabled;
        highlightStaleRowsCheckbox.disabled = advancedDisabled;
    }

    function getCurrentSettingsFromForm() {
        const dateFormat = toStoredDateFormat(dateFormatInput.value);
        const stalenessWarnDays = parsePositiveInt(stalenessWarnDaysInput.value, defaults.stalenessWarnDays);
        const stalenessCriticalDays = parsePositiveInt(stalenessCriticalDaysInput.value, defaults.stalenessCriticalDays);

        return {
            timeFormat: document.querySelector('input[name="timeFormat"]:checked')?.value || defaults.timeFormat,
            colorByDay: colorByDayCheckbox.checked,
            dateFormat: dateFormat,
            stalenessEnabled: isStalenessUnlocked() ? stalenessEnabledCheckbox.checked : false,
            stalenessWarnDays: stalenessWarnDays,
            stalenessCriticalDays: stalenessCriticalDays,
            showStalenessBadges: showStalenessBadgesCheckbox.checked,
            highlightStaleRows: highlightStaleRowsCheckbox.checked,
            stalenessLeadRegistered: state.stalenessLeadRegistered,
            stalenessLeadEmail: state.stalenessLeadEmail,
            stalenessLeadRegisteredAt: state.stalenessLeadRegisteredAt,
            stalenessLeadVerificationPending: state.stalenessLeadVerificationPending,
            stalenessLeadStatusToken: state.stalenessLeadStatusToken
        };
    }

    function saveToStorage(data) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(data, function () {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    }

    function broadcastSettings(update) {
        chrome.tabs.query({}, function (tabs) {
            tabs.forEach(function (tab) {
                if (!tab.id || !tab.url || !isSupportedGitHubUrl(tab.url)) {
                    return;
                }
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateSettings',
                    ...update
                });
            });
        });
    }

    async function persistAndBroadcast(settings) {
        await saveToStorage(settings);
        broadcastSettings(settings);
    }

    async function startLeadVerification(email) {
        const endpoint = leadApiUrl('/lead/start');
        if (!endpoint) {
            throw new Error('Lead endpoint is not configured in lead-config.js');
        }
        const extensionId = chrome.runtime.id;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-GHAT-Extension-ID': extensionId
            },
            body: JSON.stringify({
                email: email,
                capturedAt: new Date().toISOString(),
                source: 'github-absolute-time-extension',
                extensionVersion: chrome.runtime.getManifest().version,
                locale: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
            })
        });

        let payload = {};
        try {
            payload = await response.json();
        } catch {
            payload = {};
        }

        if (!response.ok || !payload.ok) {
            const message = toLeadErrorMessage(payload, `Lead verification start failed (${response.status})`);
            throw new Error(message);
        }

        if (!payload.statusToken) {
            throw new Error('Verification status token missing from server response');
        }

        return payload;
    }

    async function checkLeadVerificationStatus(statusToken) {
        const endpoint = leadApiUrl(`/lead/status?token=${encodeURIComponent(statusToken)}`);
        if (!endpoint) {
            throw new Error('Lead endpoint is not configured in lead-config.js');
        }
        const extensionId = chrome.runtime.id;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'X-GHAT-Extension-ID': extensionId
            }
        });
        let payload = {};
        try {
            payload = await response.json();
        } catch {
            payload = {};
        }

        if (!response.ok || !payload.ok) {
            const message = toLeadErrorMessage(payload, `Status check failed (${response.status})`);
            throw new Error(message);
        }
        return payload;
    }

    async function applyVerificationStatus(statusPayload, showFeedback) {
        if (statusPayload.verified) {
            setLeadState({
                stalenessLeadRegistered: true,
                stalenessLeadEmail: statusPayload.email || state.stalenessLeadEmail,
                stalenessLeadRegisteredAt: statusPayload.verifiedAt || new Date().toISOString(),
                stalenessLeadVerificationPending: false,
                stalenessLeadStatusToken: state.stalenessLeadStatusToken
            });
            stalenessEnabledCheckbox.checked = true;
            const settings = getCurrentSettingsFromForm();
            settings.stalenessEnabled = true;
            await persistAndBroadcast(settings);
            applyRegistrationUi();
            updateStalenessControlState();
            saveButton.disabled = true;
            if (showFeedback) {
                showLeadStatus('Email verified. Staleness is unlocked.', 'success');
                showStatus('Email verified. Staleness unlocked.', 'success');
            }
            return;
        }

        if (statusPayload.pending) {
            setLeadState({
                stalenessLeadRegistered: false,
                stalenessLeadEmail: statusPayload.email || state.stalenessLeadEmail,
                stalenessLeadRegisteredAt: '',
                stalenessLeadVerificationPending: true,
                stalenessLeadStatusToken: state.stalenessLeadStatusToken
            });
            applyRegistrationUi();
            updateStalenessControlState();
            if (showFeedback) {
                showLeadStatus('Not verified yet. Check your inbox and click the verification link.', 'info');
                showStatus('Still pending verification', 'error');
            }
            return;
        }

        setLeadState({
            stalenessLeadRegistered: false,
            stalenessLeadEmail: state.stalenessLeadEmail,
            stalenessLeadRegisteredAt: '',
            stalenessLeadVerificationPending: false,
            stalenessLeadStatusToken: ''
        });
        stalenessEnabledCheckbox.checked = false;
        const settings = getCurrentSettingsFromForm();
        settings.stalenessEnabled = false;
        await persistAndBroadcast(settings);
        applyRegistrationUi();
        updateStalenessControlState();
        saveButton.disabled = true;
        if (showFeedback) {
            showLeadStatus('Verification link expired. Click "Resend Verification Email".', 'error');
            showStatus('Verification expired', 'error');
        }
    }

    async function syncVerificationStatusSilently() {
        if (!state.stalenessLeadVerificationPending || !state.stalenessLeadStatusToken) {
            return;
        }
        try {
            const payload = await checkLeadVerificationStatus(state.stalenessLeadStatusToken);
            await applyVerificationStatus(payload, false);
        } catch {
            // Keep current local state if status check fails silently on popup open.
        }
    }

    chrome.storage.sync.get(Object.keys(defaults), async function (result) {
        const settings = {
            ...defaults,
            ...result
        };

        const selectedFormat = settings.timeFormat || defaults.timeFormat;
        const formatRadio = document.getElementById(`format-${selectedFormat}`);
        if (formatRadio) {
            formatRadio.checked = true;
        } else {
            document.getElementById(`format-${defaults.timeFormat}`).checked = true;
        }

        colorByDayCheckbox.checked = Boolean(settings.colorByDay);
        dateFormatInput.value = settings.dateFormat && settings.dateFormat !== 'auto' ? settings.dateFormat : '';

        setLeadState({
            stalenessLeadRegistered: settings.stalenessLeadRegistered,
            stalenessLeadEmail: settings.stalenessLeadEmail,
            stalenessLeadRegisteredAt: settings.stalenessLeadRegisteredAt,
            stalenessLeadVerificationPending: settings.stalenessLeadVerificationPending,
            stalenessLeadStatusToken: settings.stalenessLeadStatusToken
        });

        stalenessEnabledCheckbox.checked = isStalenessUnlocked() ? Boolean(settings.stalenessEnabled) : false;
        stalenessWarnDaysInput.value = parsePositiveInt(settings.stalenessWarnDays, defaults.stalenessWarnDays);
        stalenessCriticalDaysInput.value = parsePositiveInt(settings.stalenessCriticalDays, defaults.stalenessCriticalDays);
        showStalenessBadgesCheckbox.checked = Boolean(settings.showStalenessBadges);
        highlightStaleRowsCheckbox.checked = Boolean(settings.highlightStaleRows);
        leadEmailInput.value = state.stalenessLeadEmail || '';

        applyRegistrationUi();
        updateStalenessControlState();
        saveButton.disabled = true;

        await syncVerificationStatusSilently();
    });

    registerLeadButton.addEventListener('click', async function (event) {
        event.preventDefault();
        try {
            const email = leadEmailInput.value.trim().toLowerCase();
            if (!isValidEmail(email)) {
                showLeadStatus('Enter a valid email address.', 'error');
                showStatus('Enter a valid email address', 'error');
                return;
            }

            showLeadStatus('Sending verification email...', 'info');
            registerLeadButton.disabled = true;
            checkVerificationButton.disabled = true;
            registerLeadButton.textContent = 'Sending...';
            const payload = await startLeadVerification(email);
            setLeadState({
                stalenessLeadRegistered: false,
                stalenessLeadEmail: email,
                stalenessLeadRegisteredAt: '',
                stalenessLeadVerificationPending: true,
                stalenessLeadStatusToken: payload.statusToken
            });
            stalenessEnabledCheckbox.checked = false;
            const settings = getCurrentSettingsFromForm();
            settings.stalenessEnabled = false;
            await persistAndBroadcast(settings);
            applyRegistrationUi();
            updateStalenessControlState();
            saveButton.disabled = true;
            showLeadStatus('Verification email sent. Open the link in your inbox, then click "Check Verification Status".', 'success');
            showStatus('Verification email sent', 'success');
        } catch (error) {
            const message = error.message || 'Could not start email verification';
            console.error('Lead registration failed:', error);
            showLeadStatus(message, 'error');
            showStatus(message, 'error');
        } finally {
            registerLeadButton.disabled = false;
            checkVerificationButton.disabled = false;
            applyRegistrationUi();
        }
    });

    checkVerificationButton.addEventListener('click', async function () {
        if (!state.stalenessLeadStatusToken) {
            showLeadStatus('Start registration first to create a verification request.', 'error');
            return;
        }

        checkVerificationButton.disabled = true;
        showLeadStatus('Checking verification status...', 'info');
        try {
            const payload = await checkLeadVerificationStatus(state.stalenessLeadStatusToken);
            await applyVerificationStatus(payload, true);
        } catch (error) {
            const message = error.message || 'Could not check verification status';
            showLeadStatus(message, 'error');
            showStatus(message, 'error');
        } finally {
            checkVerificationButton.disabled = false;
            applyRegistrationUi();
        }
    });

    resetRegistrationButton.addEventListener('click', async function () {
        setLeadState({
            stalenessLeadRegistered: false,
            stalenessLeadEmail: '',
            stalenessLeadRegisteredAt: '',
            stalenessLeadVerificationPending: false,
            stalenessLeadStatusToken: ''
        });
        stalenessEnabledCheckbox.checked = false;
        leadEmailInput.value = '';
        showLeadStatus('', 'info');
        applyRegistrationUi();
        updateStalenessControlState();

        const updatedSettings = getCurrentSettingsFromForm();
        try {
            await persistAndBroadcast(updatedSettings);
            saveButton.disabled = true;
            showStatus('Registration reset', 'success');
        } catch (error) {
            showStatus(error.message || 'Could not reset registration', 'error');
        }
    });

    saveButton.addEventListener('click', async function () {
        const updatedSettings = getCurrentSettingsFromForm();

        if (updatedSettings.dateFormat !== 'auto' && updatedSettings.dateFormat.includes('YYYY')) {
            showStatus('Please use YY (2-digit year) instead of YYYY', 'error');
            return;
        }

        if (updatedSettings.stalenessCriticalDays <= updatedSettings.stalenessWarnDays) {
            showStatus('Critical days must be greater than warning days', 'error');
            return;
        }

        if (!isStalenessUnlocked()) {
            updatedSettings.stalenessEnabled = false;
            stalenessEnabledCheckbox.checked = false;
        }

        try {
            await persistAndBroadcast(updatedSettings);
            saveButton.disabled = true;
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            showStatus(error.message || 'Error saving settings', 'error');
        }
    });

    timeFormatRadios.forEach((radio) => {
        radio.addEventListener('change', markDirty);
    });
    colorByDayCheckbox.addEventListener('change', markDirty);
    dateFormatInput.addEventListener('input', markDirty);
    stalenessEnabledCheckbox.addEventListener('change', function () {
        updateStalenessControlState();
        markDirty();
    });
    stalenessWarnDaysInput.addEventListener('input', markDirty);
    stalenessCriticalDaysInput.addEventListener('input', markDirty);
    showStalenessBadgesCheckbox.addEventListener('change', markDirty);
    highlightStaleRowsCheckbox.addEventListener('change', markDirty);
});
