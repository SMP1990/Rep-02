<section class="hero">
    <div class="container">
        <div class="row justify-content-center text-center">
            <div class="col-lg-8">
                <h1 class="display-5 fw-bold mb-3">Save media from any link, instantly.</h1>
                <p class="lead text-body-secondary mb-4">
                    Paste a link, choose your format, and get your file — fast, private, and free.
                </p>

                <form id="fetch-form" class="fetch-form" novalidate>
                    <div class="input-group input-group-lg">
                        <label for="media-url" class="visually-hidden">Media link</label>
                        <input
                            type="url"
                            class="form-control"
                            id="media-url"
                            name="url"
                            placeholder="Paste a link here…"
                            autocomplete="off"
                            required
                        >
                        <button class="btn btn-primary px-4" type="submit" id="fetch-submit">Fetch</button>
                    </div>
                    <div class="form-text text-start mt-2">
                        We don't store the links you submit any longer than it takes to process them.
                    </div>
                </form>

                <div class="fetch-states mt-4" aria-live="polite">
                    <div id="state-loading" class="fetch-state d-none">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading…</span>
                        </div>
                        <p class="mt-2 text-body-secondary">Looking up your link…</p>
                    </div>

                    <div id="state-error" class="fetch-state d-none text-start">
                        <div class="alert alert-danger" role="alert">
                            <p class="fw-semibold mb-1">We couldn't process that link</p>
                            <p class="mb-0" id="error-message"></p>
                        </div>
                        <button type="button" class="btn btn-outline-secondary btn-sm" id="error-retry">Try another link</button>
                    </div>

                    <div id="state-result" class="fetch-state d-none text-start">
                        <div class="card result-card">
                            <div class="card-body">
                                <div class="d-flex gap-3">
                                    <img id="result-thumbnail" src="" alt="" class="result-thumbnail d-none">
                                    <div>
                                        <p class="fw-semibold mb-1" id="result-title"></p>
                                        <p class="text-body-secondary small mb-0" id="result-meta"></p>
                                    </div>
                                </div>

                                <div class="mt-3" id="result-options"></div>

                                <div class="mt-3 d-none" id="result-output">
                                    <a href="#" id="result-download-link" class="btn btn-success">
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-outline-secondary btn-sm mt-3" id="result-reset">Fetch another link</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="how-it-works py-5">
    <div class="container">
        <h2 class="h3 text-center mb-5">How it works</h2>
        <div class="row g-4">
            <div class="col-md-4 text-center">
                <div class="step-number mx-auto">1</div>
                <h3 class="h5 mt-3">Paste your link</h3>
                <p class="text-body-secondary">Drop in the link you want to fetch media from.</p>
            </div>
            <div class="col-md-4 text-center">
                <div class="step-number mx-auto">2</div>
                <h3 class="h5 mt-3">Choose an option</h3>
                <p class="text-body-secondary">Pick the quality or format that works for you.</p>
            </div>
            <div class="col-md-4 text-center">
                <div class="step-number mx-auto">3</div>
                <h3 class="h5 mt-3">Get your file</h3>
                <p class="text-body-secondary">Your file is ready in seconds — no account required.</p>
            </div>
        </div>
    </div>
</section>

<section class="features py-5">
    <div class="container">
        <h2 class="h3 text-center mb-5">Why Fetchpoint</h2>
        <div class="row g-4">
            <div class="col-sm-6 col-lg-3">
                <div class="feature-card h-100">
                    <h3 class="h6">Fast</h3>
                    <p class="text-body-secondary small mb-0">Get results in seconds, not minutes.</p>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="feature-card h-100">
                    <h3 class="h6">No installs</h3>
                    <p class="text-body-secondary small mb-0">Works entirely in your browser, on any device.</p>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="feature-card h-100">
                    <h3 class="h6">Privacy-first</h3>
                    <p class="text-body-secondary small mb-0">We don't build a profile of what you fetch.</p>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="feature-card h-100">
                    <h3 class="h6">Free to use</h3>
                    <p class="text-body-secondary small mb-0">No account or subscription required.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<section class="faq-teaser py-5">
    <div class="container">
        <h2 class="h3 text-center mb-5">Frequently asked questions</h2>
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="accordion" id="faqTeaser">
                    <?php foreach ($faqTeaser as $index => $item): ?>
                        <div class="accordion-item">
                            <h3 class="accordion-header">
                                <button class="accordion-button <?= $index === 0 ? '' : 'collapsed' ?>" type="button"
                                        data-bs-toggle="collapse" data-bs-target="#faqTeaser<?= (int) $index ?>"
                                        aria-expanded="<?= $index === 0 ? 'true' : 'false' ?>"
                                        aria-controls="faqTeaser<?= (int) $index ?>">
                                    <?= e($item['question']) ?>
                                </button>
                            </h3>
                            <div id="faqTeaser<?= (int) $index ?>"
                                 class="accordion-collapse collapse <?= $index === 0 ? 'show' : '' ?>"
                                 data-bs-parent="#faqTeaser">
                                <div class="accordion-body text-body-secondary">
                                    <?= e($item['answer']) ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <p class="text-center mt-4">
                    <a href="/faq">View all FAQs &rarr;</a>
                </p>
            </div>
        </div>
    </div>
</section>
