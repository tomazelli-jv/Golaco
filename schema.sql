CREATE DATABASE IF NOT EXISTS golaco
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE GOLACO;

CREATE TABLE IF NOT EXISTS app_state (
    id INT NOT NULL PRIMARY KEY,
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_state (id, data)
VALUES (1, '{}')
ON DUPLICATE KEY UPDATE data = data;

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    photo LONGTEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    `position` VARCHAR(20) NOT NULL DEFAULT 'versatil',
    goalkeeper BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    INDEX idx_players_name (name),
    INDEX idx_players_active (active)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    date DATETIME NOT NULL,
    season INT NOT NULL,
    modality VARCHAR(20) NOT NULL DEFAULT 'society',
    format VARCHAR(10) NOT NULL,
    location VARCHAR(160) NULL,
    teamA VARCHAR(120) NOT NULL,
    teamB VARCHAR(120) NOT NULL,
    teamAIds JSON NOT NULL,
    teamBIds JSON NOT NULL,
    stats JSON NOT NULL,
    events JSON NULL,
    durationSeconds INT NOT NULL DEFAULT 0,
    scoreA INT NOT NULL DEFAULT 0,
    scoreB INT NOT NULL DEFAULT 0,
    winner VARCHAR(10) NOT NULL,
    mvpId VARCHAR(64) NULL,
    mvpTie JSON NULL,
    INDEX idx_matches_date (date),
    INDEX idx_matches_season (season),
    INDEX idx_matches_modality (modality)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
