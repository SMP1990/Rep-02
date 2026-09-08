-- Media Utility Platform — MySQL installation script
-- Design reference: docs/media-platform/phase-3-database-design.md
--
-- Target: MySQL 5.7+/8.0, InnoDB, utf8mb4. Written for a Hostinger shared
-- MySQL instance (no SUPER/trigger/event-scheduler privileges assumed).
--
-- Usage: import via hPanel phpMyAdmin, or:
--   mysql -u <user> -p <database> < database/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- languages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `languages` (
  `code`        VARCHAR(10)      NOT NULL,
  `name`        VARCHAR(60)      NOT NULL,
  `is_default`  TINYINT(1)       NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)       NOT NULL DEFAULT 1,
  `sort_order`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`code`),
  KEY `idx_languages_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- administrators
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `administrators` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`               VARCHAR(64)     NOT NULL,
  `email`                  VARCHAR(255)    NOT NULL,
  `password_hash`          VARCHAR(255)    NOT NULL,
  `is_active`              TINYINT(1)      NOT NULL DEFAULT 1,
  `failed_login_attempts`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until`           DATETIME        NULL DEFAULT NULL,
  `last_login_at`          DATETIME        NULL DEFAULT NULL,
  `created_at`             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_administrators_username` (`username`),
  UNIQUE KEY `uq_administrators_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- settings (key/value site configuration)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key`    VARCHAR(100)    NOT NULL,
  `setting_value`  TEXT            NULL,
  `setting_type`   ENUM('string','bool','int','json') NOT NULL DEFAULT 'string',
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- pages (admin-managed static content: About, Terms, Privacy, DMCA, Contact)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pages` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`              VARCHAR(190)    NOT NULL,
  `language_code`     VARCHAR(10)     NOT NULL DEFAULT 'en',
  `title`             VARCHAR(255)    NOT NULL,
  `content`           MEDIUMTEXT      NOT NULL,
  `meta_title`        VARCHAR(255)    NULL,
  `meta_description`  VARCHAR(320)    NULL,
  `noindex`           TINYINT(1)      NOT NULL DEFAULT 0,
  `is_published`      TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pages_slug_lang` (`slug`, `language_code`),
  KEY `idx_pages_published` (`is_published`),
  CONSTRAINT `fk_pages_language` FOREIGN KEY (`language_code`)
    REFERENCES `languages` (`code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- faq
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `faq` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `language_code`  VARCHAR(10)     NOT NULL DEFAULT 'en',
  `question`       VARCHAR(500)    NOT NULL,
  `answer`         MEDIUMTEXT      NOT NULL,
  `sort_order`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_published`   TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_lang_sort` (`language_code`, `sort_order`),
  KEY `idx_faq_published` (`is_published`),
  CONSTRAINT `fk_faq_language` FOREIGN KEY (`language_code`)
    REFERENCES `languages` (`code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- seo_settings (non-CMS routes + sitewide defaults; 'global' = fallback row)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `seo_settings` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `route_key`            VARCHAR(100)    NOT NULL,
  `meta_title`           VARCHAR(255)    NULL,
  `meta_description`     VARCHAR(320)    NULL,
  `og_image_path`        VARCHAR(255)    NULL,
  `canonical_override`   VARCHAR(255)    NULL,
  `noindex`              TINYINT(1)      NOT NULL DEFAULT 0,
  `updated_at`           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_seo_settings_route` (`route_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- advertisements (network-agnostic ad zones)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `advertisements` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `zone_key`       VARCHAR(50)     NOT NULL,
  `name`           VARCHAR(150)    NOT NULL,
  `snippet_html`   MEDIUMTEXT      NULL,
  `device_target`  ENUM('all','desktop','mobile') NOT NULL DEFAULT 'all',
  `is_active`      TINYINT(1)      NOT NULL DEFAULT 0,
  `sort_order`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `starts_at`      DATETIME        NULL DEFAULT NULL,
  `ends_at`        DATETIME        NULL DEFAULT NULL,
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ads_zone_active` (`zone_key`, `is_active`),
  KEY `idx_ads_schedule` (`starts_at`, `ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- processing_requests (metadata lookups + process/download actions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `processing_requests` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_type`     ENUM('metadata','process') NOT NULL,
  `source_platform`  VARCHAR(60)     NULL,
  `provider_name`    VARCHAR(60)     NULL,
  `url_hash`         CHAR(64)        NOT NULL,
  `option_id`        VARCHAR(100)    NULL,
  `status`           ENUM('success','failure') NOT NULL,
  `error_code`       VARCHAR(60)     NULL,
  `duration_ms`      MEDIUMINT UNSIGNED NULL,
  `ip_hash`          CHAR(64)        NOT NULL,
  `user_agent`       VARCHAR(255)    NULL,
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pr_created_at` (`created_at`),
  KEY `idx_pr_status_created` (`status`, `created_at`),
  KEY `idx_pr_source_created` (`source_platform`, `created_at`),
  KEY `idx_pr_iphash_created` (`ip_hash`, `created_at`),
  KEY `idx_pr_urlhash` (`url_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- error_logs (application/security errors not tied to a processing request)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `error_logs` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `channel`        ENUM('application','security') NOT NULL,
  `level`          ENUM('warning','error','critical') NOT NULL,
  `message`        VARCHAR(500)    NOT NULL,
  `context_json`   JSON            NULL,
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_errlog_channel_created` (`channel`, `created_at`),
  KEY `idx_errlog_level_created` (`level`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- visitor_daily_stats (aggregate dashboard counters)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `visitor_daily_stats` (
  `stat_date`            DATE NOT NULL,
  `unique_visitors`      INT UNSIGNED NOT NULL DEFAULT 0,
  `total_requests`       INT UNSIGNED NOT NULL DEFAULT 0,
  `successful_requests`  INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_requests`      INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- visitor_daily_seen (short-lived dedup set — pruned by a scheduled job
-- once each day's unique count has been rolled into visitor_daily_stats)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `visitor_daily_seen` (
  `stat_date`      DATE      NOT NULL,
  `ip_hash`        CHAR(64)  NOT NULL,
  `first_seen_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`stat_date`, `ip_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Seed data: minimal defaults so the app has something to boot against.
-- No administrator row is seeded here — creating the first admin account
-- is a deploy-time step (Backend Foundation / Deployment phase), never a
-- hard-coded credential in version control.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `languages` (`code`, `name`, `is_default`, `is_active`, `sort_order`)
VALUES ('en', 'English', 1, 1, 0);

INSERT IGNORE INTO `seo_settings` (`route_key`, `meta_title`, `meta_description`)
VALUES ('global', NULL, NULL);
