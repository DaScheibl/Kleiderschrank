CREATE TABLE `einstellungen` (
	`schluessel` text PRIMARY KEY DEFAULT 'standard' NOT NULL,
	`alltags_formalitaet` integer DEFAULT 0 NOT NULL,
	`aussortier_nach_monaten` integer DEFAULT 9 NOT NULL,
	`abendvorschau_uhrzeit` text,
	`ort_manuell` text,
	`rundtour_abgeschlossen` integer DEFAULT false NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groessenprofil` (
	`bereich` text PRIMARY KEY NOT NULL,
	`system` text NOT NULL,
	`werte` text DEFAULT '[]' NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outfit` (
	`id` text PRIMARY KEY NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL,
	`datum` text NOT NULL,
	`anlass` text NOT NULL,
	`anlass_formalitaet` integer NOT NULL,
	`bewertung` text DEFAULT 'offen' NOT NULL,
	`ist_tageswahl` integer DEFAULT false NOT NULL,
	`getragen` integer DEFAULT false NOT NULL,
	`kombinations_schluessel` text NOT NULL,
	`titel` text,
	`begruendung` text,
	`begruendung_quelle` text,
	`regel_score` integer,
	`stil_heute` text
);
--> statement-breakpoint
CREATE INDEX `outfit_datum_idx` ON `outfit` (`datum`);--> statement-breakpoint
CREATE INDEX `outfit_sync_idx` ON `outfit` (`sync_offen`);--> statement-breakpoint
CREATE TABLE `outfit_teil` (
	`id` text PRIMARY KEY NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL,
	`outfit_id` text NOT NULL,
	`teil_id` text NOT NULL,
	`rolle` text NOT NULL,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teil_id`) REFERENCES `kleidungsstueck`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outfit_teil_eindeutig` ON `outfit_teil` (`outfit_id`,`teil_id`);--> statement-breakpoint
CREATE INDEX `outfit_teil_teil_idx` ON `outfit_teil` (`teil_id`);--> statement-breakpoint
CREATE INDEX `outfit_teil_sync_idx` ON `outfit_teil` (`sync_offen`);--> statement-breakpoint
CREATE TABLE `stilprofil` (
	`stil` text PRIMARY KEY NOT NULL,
	`gewichtung` text NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teil_lokal` (
	`teil_id` text PRIMARY KEY NOT NULL,
	`bild_lokal_uri` text,
	`original_lokal_uri` text,
	FOREIGN KEY (`teil_id`) REFERENCES `kleidungsstueck`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trage_eintrag` (
	`id` text PRIMARY KEY NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL,
	`teil_id` text NOT NULL,
	`outfit_id` text,
	`datum` text NOT NULL,
	FOREIGN KEY (`teil_id`) REFERENCES `kleidungsstueck`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trage_eintrag_eindeutig` ON `trage_eintrag` (`teil_id`,`datum`);--> statement-breakpoint
CREATE INDEX `trage_eintrag_datum_idx` ON `trage_eintrag` (`datum`);--> statement-breakpoint
CREATE INDEX `trage_eintrag_sync_idx` ON `trage_eintrag` (`sync_offen`);--> statement-breakpoint
CREATE TABLE `waescheschwelle` (
	`kategorie` text PRIMARY KEY NOT NULL,
	`schwelle` integer NOT NULL,
	`angelegt_am` text NOT NULL,
	`zuletzt_geaendert` text NOT NULL,
	`geloescht` integer DEFAULT false NOT NULL,
	`sync_offen` integer DEFAULT true NOT NULL
);
