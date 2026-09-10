/*
 * Fetchpoint homepage interaction — vanilla JS, no dependencies.
 * Implements the Phase 0 §0.4 workflow: submit -> loading -> result/error,
 * talking only to the stable /api/v1/metadata and /api/v1/process JSON
 * contract (Phase 1 §1.3). No knowledge of any processing provider here.
 */
(function () {
    'use strict';

    var form = document.getElementById('fetch-form');
    if (!form) {
        return;
    }

    var urlInput = document.getElementById('media-url');
    var submitButton = document.getElementById('fetch-submit');

    var states = {
        loading: document.getElementById('state-loading'),
        error: document.getElementById('state-error'),
        result: document.getElementById('state-result'),
    };

    var errorMessageEl = document.getElementById('error-message');
    var errorRetryBtn = document.getElementById('error-retry');
    var resultResetBtn = document.getElementById('result-reset');

    var resultTitleEl = document.getElementById('result-title');
    var resultMetaEl = document.getElementById('result-meta');
    var resultThumbEl = document.getElementById('result-thumbnail');
    var resultOptionsEl = document.getElementById('result-options');
    var resultOutputEl = document.getElementById('result-output');
    var resultDownloadLink = document.getElementById('result-download-link');

    var currentUrl = '';

    function showState(name) {
        Object.keys(states).forEach(function (key) {
            states[key].classList.toggle('d-none', key !== name);
        });
    }

    function hideAllStates() {
        Object.keys(states).forEach(function (key) {
            states[key].classList.add('d-none');
        });
    }

    function resetForm() {
        hideAllStates();
        submitButton.disabled = false;
        urlInput.focus();
    }

    function callApi(path, payload) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(function (response) {
            return response
                .json()
                .catch(function () {
                    return null;
                })
                .then(function (body) {
                    if (!response.ok || !body || !body.success) {
                        var error = (body && body.error) || {};
                        var err = new Error(error.message || 'Something went wrong. Please try again.');
                        err.code = error.code || 'INTERNAL_ERROR';
                        throw err;
                    }
                    return body.data;
                });
        });
    }

    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) {
            return '';
        }
        var minutes = Math.floor(seconds / 60);
        var remaining = seconds % 60;
        return minutes + ':' + String(remaining).padStart(2, '0');
    }

    function renderOptions(options) {
        resultOptionsEl.innerHTML = '';
        resultOutputEl.classList.add('d-none');

        if (!options || options.length === 0) {
            var note = document.createElement('p');
            note.className = 'text-body-secondary small mb-0';
            note.textContent = 'No download options are available for this link yet.';
            resultOptionsEl.appendChild(note);
            return;
        }

        options.forEach(function (option) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-primary option-btn mb-2';
            btn.textContent = option.label + (option.format ? ' (' + option.format + ')' : '');
            btn.addEventListener('click', function () {
                handleProcess(option.id, btn);
            });
            resultOptionsEl.appendChild(btn);
        });
    }

    function handleMetadata(url) {
        showState('loading');

        callApi('/api/v1/metadata', { url: url })
            .then(function (data) {
                resultTitleEl.textContent = data.title || 'Untitled';
                resultMetaEl.textContent = [data.source_platform, formatDuration(data.duration_seconds)]
                    .filter(Boolean)
                    .join(' · ');

                if (data.thumbnail_url) {
                    resultThumbEl.src = data.thumbnail_url;
                    resultThumbEl.alt = data.title || '';
                    resultThumbEl.classList.remove('d-none');
                } else {
                    resultThumbEl.classList.add('d-none');
                }

                renderOptions(data.options);
                showState('result');
            })
            .catch(function (error) {
                errorMessageEl.textContent = error.message;
                showState('error');
            })
            .finally(function () {
                submitButton.disabled = false;
            });
    }

    function handleProcess(optionId, triggerButton) {
        var buttons = resultOptionsEl.querySelectorAll('button');
        buttons.forEach(function (btn) {
            btn.disabled = true;
        });
        if (triggerButton) {
            triggerButton.textContent = 'Preparing…';
        }

        callApi('/api/v1/process', { url: currentUrl, option_id: optionId })
            .then(function (data) {
                if (data.output && data.output.url) {
                    // Point at our own download proxy, not the raw CDN
                    // URL directly: a cross-origin link never triggers a
                    // real download (no Content-Disposition from the CDN,
                    // and browsers ignore the `download` attribute across
                    // origins) — it just opens the video. The proxy
                    // re-serves the same bytes with that header set.
                    var filename = data.output.filename || 'video.mp4';
                    resultDownloadLink.href = '/api/v1/download?url=' + encodeURIComponent(data.output.url) +
                        '&filename=' + encodeURIComponent(filename);
                    resultOutputEl.classList.remove('d-none');
                }
            })
            .catch(function (error) {
                errorMessageEl.textContent = error.message;
                showState('error');
            })
            .finally(function () {
                buttons.forEach(function (btn) {
                    btn.disabled = false;
                });
            });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var url = urlInput.value.trim();
        if (!url) {
            urlInput.focus();
            return;
        }

        currentUrl = url;
        submitButton.disabled = true;
        handleMetadata(url);
    });

    errorRetryBtn.addEventListener('click', resetForm);
    resultResetBtn.addEventListener('click', resetForm);
})();
