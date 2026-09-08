<section class="py-5">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <h1 class="h2 mb-4">Frequently asked questions</h1>

                <div class="accordion" id="faqFull">
                    <?php foreach ($faqEntries as $index => $item): ?>
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button <?= $index === 0 ? '' : 'collapsed' ?>" type="button"
                                        data-bs-toggle="collapse" data-bs-target="#faqFull<?= (int) $index ?>"
                                        aria-expanded="<?= $index === 0 ? 'true' : 'false' ?>"
                                        aria-controls="faqFull<?= (int) $index ?>">
                                    <?= e($item['question']) ?>
                                </button>
                            </h2>
                            <div id="faqFull<?= (int) $index ?>"
                                 class="accordion-collapse collapse <?= $index === 0 ? 'show' : '' ?>"
                                 data-bs-parent="#faqFull">
                                <div class="accordion-body text-body-secondary">
                                    <?= e($item['answer']) ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <p class="text-body-secondary small mt-4">
                    Didn't find what you were looking for? <a href="/contact">Get in touch</a>.
                </p>
            </div>
        </div>
    </div>
</section>
