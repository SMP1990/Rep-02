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
    var urlClearBtn = document.getElementById('url-clear');
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
    var resultThumbWrapEl = document.getElementById('result-thumb-wrap');
    var resultThumbEl = document.getElementById('result-thumbnail');
    var resultBadgeTypeEl = document.getElementById('result-badge-type');
    var resultSourceLinkEl = document.getElementById('result-source-link');
    var resultOptionsEl = document.getElementById('result-options');

    var currentUrl = '';

    // Guards every element this script looks up: if the HTML template on
    // the server is out of sync with this file (an old page cached, or a
    // deploy that updated one but not the other), a missing element
    // silently no-ops here instead of throwing and taking down the whole
    // fetch/download flow with a cryptic "Cannot read properties of null".
    function setHidden(el, hidden) {
        if (el) {
            el.classList.toggle('d-none', hidden);
        }
    }

    if (urlInput && urlClearBtn) {
        urlInput.addEventListener('input', function () {
            setHidden(urlClearBtn, urlInput.value.trim() === '');
        });

        urlClearBtn.addEventListener('click', function () {
            urlInput.value = '';
            setHidden(urlClearBtn, true);
            urlInput.focus();
        });
    }

    function showState(name) {
        Object.keys(states).forEach(function (key) {
            setHidden(states[key], key !== name);
        });
    }

    function hideAllStates() {
        Object.keys(states).forEach(function (key) {
            setHidden(states[key], true);
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

    var DOWNLOAD_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

    /**
     * One row per option, styled to match the reference layout (a badge
     * for the format, the label, and a single Download button per row) —
     * but only ever from real data /api/v1/metadata actually returned.
     * There's no resolution, file-size, or view-count data available from
     * the provider, so unlike a mocked design reference this never
     * fabricates numbers for those; it shows only what's genuinely known.
     */
    function renderOptions(options) {
        if (!resultOptionsEl) {
            return;
        }

        resultOptionsEl.innerHTML = '';

        if (!options || options.length === 0) {
            var note = document.createElement('p');
            note.className = 'text-body-secondary small mb-0';
            note.textContent = 'No download options are available for this link yet.';
            resultOptionsEl.appendChild(note);
            return;
        }

        options.forEach(function (option) {
            var row = document.createElement('div');
            row.className = 'option-row';

            var badge = document.createElement('span');
            badge.className = 'option-badge' + (option.id === 'hd' ? ' option-badge-hd' : '');
            badge.textContent = option.id === 'hd' ? 'HD' : 'SD';
            row.appendChild(badge);

            var info = document.createElement('div');
            info.className = 'option-info';
            var labelEl = document.createElement('span');
            labelEl.className = 'option-label';
            labelEl.textContent = option.label;
            info.appendChild(labelEl);
            if (option.format) {
                var formatEl = document.createElement('span');
                formatEl.className = 'option-format';
                formatEl.textContent = 'Format: ' + option.format.toUpperCase();
                info.appendChild(formatEl);
            }
            row.appendChild(info);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-primary option-download-btn';
            btn.innerHTML = DOWNLOAD_ICON_SVG + '<span>Download</span>';
            btn.addEventListener('click', function () {
                handleProcess(option.id, btn);
            });
            row.appendChild(btn);

            resultOptionsEl.appendChild(row);
        });
    }

    function handleMetadata(url) {
        showState('loading');

        callApi('/api/v1/metadata', { url: url })
            .then(function (data) {
                if (resultTitleEl) {
                    resultTitleEl.textContent = data.title || 'Untitled';
                }
                if (resultMetaEl) {
                    resultMetaEl.textContent = [data.source_platform, formatDuration(data.duration_seconds)]
                        .filter(Boolean)
                        .join(' · ');
                }

                if (resultThumbEl && resultThumbWrapEl) {
                    if (data.thumbnail_url) {
                        resultThumbEl.src = data.thumbnail_url;
                        resultThumbEl.alt = data.title || '';
                        setHidden(resultThumbWrapEl, false);
                    } else {
                        setHidden(resultThumbWrapEl, true);
                    }
                }

                if (resultBadgeTypeEl) {
                    resultBadgeTypeEl.textContent = /\/reel\//i.test(url) ? 'Reel' : 'Video';
                    setHidden(resultBadgeTypeEl, false);
                }

                if (resultSourceLinkEl) {
                    resultSourceLinkEl.href = url;
                    setHidden(resultSourceLinkEl, false);
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

    /**
     * A single click both resolves the direct stream (/api/v1/process)
     * and starts the download — no separate "now click Download" second
     * step, matching how each quality row is meant to behave.
     */
    function handleProcess(optionId, triggerButton) {
        var buttons = resultOptionsEl ? resultOptionsEl.querySelectorAll('button') : [];
        buttons.forEach(function (btn) {
            btn.disabled = true;
        });
        var originalHtml = triggerButton.innerHTML;
        triggerButton.innerHTML = '<span>Preparing…</span>';

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
                    var downloadUrl = '/api/v1/download?url=' + encodeURIComponent(data.output.url) +
                        '&filename=' + encodeURIComponent(filename);
                    window.location.href = downloadUrl;
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
                triggerButton.innerHTML = originalHtml;
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
