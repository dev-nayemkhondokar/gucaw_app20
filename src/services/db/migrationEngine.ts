/**
 * Database Migration & Schema Management Engine
 * 
 * Provides:
 * 1. Automatic, safe database migrations upon app version updates.
 * 2. Pre-migration snapshotting to ensure zero data loss on unexpected runtime exceptions.
 * 3. Feature Deprecation & Archival Storage (safely stores data of removed/modified features).
 * 4. Generic Table Registry for forward-compatible table addition.
 */

import { SchemaMeta, MigrationContext, FeatureArchiveRecord } from '../../types';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_APP_VERSION,
  STORAGE_KEYS,
  DEFAULT_SCHEMA_META,
} from './schemaMeta';
import { MIGRATIONS } from './migrations';

class DatabaseMigrationEngine {
  private isInitialized = false;

  /**
   * Retrieves current database schema metadata.
   */
  public getSchemaMeta(): SchemaMeta {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEMA_META);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_SCHEMA_META,
            ...parsed,
            archived_features: parsed.archived_features || {},
            applied_migrations: Array.isArray(parsed.applied_migrations) ? parsed.applied_migrations : [],
          };
        }
      }
    } catch (err) {
      console.error('[DB Engine] Failed to read schema metadata', err);
    }
    return { ...DEFAULT_SCHEMA_META };
  }

  /**
   * Persists database schema metadata.
   */
  public saveSchemaMeta(meta: SchemaMeta): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEMA_META, JSON.stringify(meta));
    } catch (err) {
      console.error('[DB Engine] Failed to save schema metadata', err);
    }
  }

  /**
   * Creates a full snapshot of all PLM storage items before applying migrations.
   */
  private createSnapshot(): void {
    try {
      const snapshot: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('plm_')) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            snapshot[key] = val;
          }
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.PRE_MIGRATION_SNAPSHOT,
        JSON.stringify({
          created_at: Date.now(),
          app_version: CURRENT_APP_VERSION,
          schema_version: this.getSchemaMeta().schema_version,
          data: snapshot,
        })
      );
    } catch (err) {
      console.warn('[DB Engine] Pre-migration snapshot warning (storage may be near quota)', err);
    }
  }

  /**
   * Restores from pre-migration snapshot in case of a fatal migration failure.
   */
  private restoreSnapshot(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRE_MIGRATION_SNAPSHOT);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        Object.entries(parsed.data).forEach(([key, val]) => {
          if (typeof val === 'string') {
            localStorage.setItem(key, val);
          }
        });
        console.warn('[DB Engine] Restored database snapshot after migration error.');
      }
    } catch (err) {
      console.error('[DB Engine] Failed to restore snapshot', err);
    }
  }

  /**
   * Archive a modified or deprecated feature's data safely.
   * Requirement 2: Old data is NEVER deleted when a feature is removed or changed.
   */
  public archiveFeature(featureKey: string, reason: string, data: any): void {
    try {
      const meta = this.getSchemaMeta();
      const archives = meta.archived_features || {};

      const record: FeatureArchiveRecord = {
        feature_key: featureKey,
        archived_at: Date.now(),
        reason,
        app_version: CURRENT_APP_VERSION,
        schema_version: meta.schema_version,
        data,
      };

      archives[featureKey] = record;
      meta.archived_features = archives;
      this.saveSchemaMeta(meta);

      // Also persist to a standalone key for extra durability
      const rawFeatureArchive = localStorage.getItem(STORAGE_KEYS.FEATURE_ARCHIVE);
      let featureArchiveObj: Record<string, any> = {};
      if (rawFeatureArchive) {
        try {
          featureArchiveObj = JSON.parse(rawFeatureArchive) || {};
        } catch {
          featureArchiveObj = {};
        }
      }
      featureArchiveObj[featureKey] = record;
      localStorage.setItem(STORAGE_KEYS.FEATURE_ARCHIVE, JSON.stringify(featureArchiveObj));
      console.info(`[DB Engine] Feature '${featureKey}' archived safely: ${reason}`);
    } catch (err) {
      console.error(`[DB Engine] Failed to archive feature ${featureKey}`, err);
    }
  }

  /**
   * Retrieves an archived feature's data.
   */
  public getArchivedFeature(featureKey: string): FeatureArchiveRecord | undefined {
    const meta = this.getSchemaMeta();
    if (meta.archived_features && meta.archived_features[featureKey]) {
      return meta.archived_features[featureKey];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FEATURE_ARCHIVE);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed[featureKey];
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  /**
   * Retrieves all archived features.
   */
  public getAllArchivedFeatures(): Record<string, FeatureArchiveRecord> {
    const meta = this.getSchemaMeta();
    return meta.archived_features || {};
  }

  /**
   * Runs all pending migrations sequentially.
   * Ensures existing data across all tables is preserved and upgraded.
   */
  public runMigrations(): { success: boolean; migratedFrom: number; migratedTo: number } {
    if (this.isInitialized) {
      const current = this.getSchemaMeta().schema_version;
      return { success: true, migratedFrom: current, migratedTo: current };
    }

    const meta = this.getSchemaMeta();
    let currentVersion = meta.schema_version;

    // Detect if this is a legacy v1 database (data exists but no plm_schema_meta_v1)
    const hasExistingData =
      localStorage.getItem(STORAGE_KEYS.ACCOUNTS) !== null ||
      localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) !== null ||
      localStorage.getItem(STORAGE_KEYS.DEBTS) !== null;

    const isExistingUnversioned = !localStorage.getItem(STORAGE_KEYS.SCHEMA_META) && hasExistingData;

    if (isExistingUnversioned) {
      currentVersion = 1; // Mark as legacy schema v1 needing upgrade
    }

    if (currentVersion >= CURRENT_SCHEMA_VERSION && !isExistingUnversioned) {
      // Up to date. Just ensure app_version is updated
      if (meta.app_version !== CURRENT_APP_VERSION) {
        meta.app_version = CURRENT_APP_VERSION;
        this.saveSchemaMeta(meta);
      }
      this.isInitialized = true;
      return { success: true, migratedFrom: currentVersion, migratedTo: currentVersion };
    }

    console.info(`[DB Engine] Running migrations from schema v${currentVersion} to v${CURRENT_SCHEMA_VERSION}...`);
    this.createSnapshot();

    const context: MigrationContext = {
      getRawItem: (key: string) => localStorage.getItem(key),
      setRawItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeRawItem: (key: string) => localStorage.removeItem(key),
      archiveFeature: (featureKey: string, reason: string, data: any) => {
        this.archiveFeature(featureKey, reason, data);
      },
      getArchivedFeature: (featureKey: string) => this.getArchivedFeature(featureKey),
    };

    const applied = [...(meta.applied_migrations || [])];

    try {
      // Find all migrations from currentVersion up to CURRENT_SCHEMA_VERSION
      const pendingMigrations = MIGRATIONS.filter(
        (m) => m.fromVersion >= currentVersion && m.toVersion <= CURRENT_SCHEMA_VERSION
      ).sort((a, b) => a.fromVersion - b.fromVersion);

      for (const migration of pendingMigrations) {
        if (!applied.includes(migration.id)) {
          console.info(`[DB Engine] Applying migration: ${migration.id} (${migration.description})`);
          migration.migrate(context);
          applied.push(migration.id);
          currentVersion = migration.toVersion;
        }
      }

      // Update schema metadata
      meta.schema_version = CURRENT_SCHEMA_VERSION;
      meta.app_version = CURRENT_APP_VERSION;
      meta.last_migrated_at = Date.now();
      meta.applied_migrations = applied;
      this.saveSchemaMeta(meta);

      this.isInitialized = true;
      console.info(`[DB Engine] Database successfully migrated to schema v${CURRENT_SCHEMA_VERSION}!`);
      return { success: true, migratedFrom: meta.schema_version, migratedTo: CURRENT_SCHEMA_VERSION };
    } catch (err) {
      console.error('[DB Engine] Migration encountered an error. Restoring snapshot...', err);
      this.restoreSnapshot();
      return { success: false, migratedFrom: currentVersion, migratedTo: currentVersion };
    }
  }

  /**
   * Generic forward-compatible Table API
   * Requirement 1: Adding new tables in future versions is registered here cleanly.
   */
  public getGenericTable<T>(tableKey: string, fallback: T[] = []): T[] {
    try {
      const data = localStorage.getItem(tableKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(`[DB Engine] Failed to read table ${tableKey}`, e);
    }
    return fallback;
  }

  public saveGenericTable<T>(tableKey: string, items: T[]): void {
    try {
      localStorage.setItem(tableKey, JSON.stringify(items));
    } catch (e) {
      console.error(`[DB Engine] Failed to save table ${tableKey}`, e);
    }
  }
}

export const dbMigrationEngine = new DatabaseMigrationEngine();
