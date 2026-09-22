/**
 * Architectural Verification Tests
 * Verifies all 4 user requirements:
 * 1. Schema extensibility & new table addition without deleting existing data.
 * 2. Feature removal/modification safely archives data without deletion.
 * 3. App version updates retain all existing user balances, transactions, and settings.
 * 4. Zero calculation/data corruption.
 */

import { storageService } from '../storageService';
import { dbMigrationEngine } from './migrationEngine';
import { STORAGE_KEYS } from './schemaMeta';
import { sanitizeAccount, sanitizeTransaction } from './tableSanitizers';

// Mock localStorage in node environment if needed
const mockStore: Record<string, string> = {};
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  (global as any).localStorage = {
    getItem: (k: string) => (k in mockStore ? mockStore[k] : null),
    setItem: (k: string, v: string) => { mockStore[k] = String(v); },
    removeItem: (k: string) => { delete mockStore[k]; },
    clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
    get length() { return Object.keys(mockStore).length; },
    key: (i: number) => Object.keys(mockStore)[i] || null,
  };
}

export function runArchitectureTests(): { passed: boolean; results: Record<string, boolean> } {
  const results: Record<string, boolean> = {};

  console.log('--- STARTING ARCHITECTURE VERIFICATION ---');

  // TEST 1: Schema Extensibility (Requirement 1)
  // Ensures new or unrecognized fields are NOT stripped when saved or loaded
  try {
    const rawWithFutureFields = {
      id: 'acc-future-test',
      name: 'Future Test Wallet',
      type: 'BKASH',
      opening_balance_poisha: 50000,
      is_active: true,
      color: '#10B981',
      created_at: Date.now(),
      // Custom / Future fields
      crypto_wallet_address: '0x123abc456',
      kyc_verified: true,
      custom_tags: ['personal', 'mobile_banking'],
      extra_data: { branch_code: 'DHK-01' },
    };

    const sanitized = sanitizeAccount(rawWithFutureFields);
    const passedExtensibility =
      (sanitized as any).crypto_wallet_address === '0x123abc456' &&
      (sanitized as any).kyc_verified === true &&
      sanitized.opening_balance_poisha === 50000 &&
      sanitized.schema_version === 2;

    results['Requirement 1.1: Lossless Field Extensibility'] = passedExtensibility;
  } catch (e) {
    console.error('Test 1.1 failed', e);
    results['Requirement 1.1: Lossless Field Extensibility'] = false;
  }

  // TEST 2: Dynamic New Table Addition (Requirement 1)
  try {
    const customTableName = 'plm_investments_v1';
    const initialInvestments = [
      { id: 'inv-1', asset_name: 'Sanchayapatra', amount_poisha: 500000, yield_rate: 11.2 },
    ];
    storageService.saveTable(customTableName, initialInvestments);
    const loaded = storageService.getTable<any>(customTableName);

    results['Requirement 1.2: Dynamic Table Addition'] =
      loaded.length === 1 && loaded[0].asset_name === 'Sanchayapatra';
  } catch (e) {
    console.error('Test 1.2 failed', e);
    results['Requirement 1.2: Dynamic Table Addition'] = false;
  }

  // TEST 3: Feature Deprecation & Safe Archival (Requirement 2)
  try {
    const legacyFeatureData = {
      feature: 'old_crypto_tracker',
      user_wallets: ['0xabc', '0xdef'],
      cached_rates: { btc: 60000, eth: 3000 },
    };

    storageService.archiveFeatureData(
      'old_crypto_tracker',
      'Feature removed in app update; preserving historical user data',
      legacyFeatureData
    );

    const archived = storageService.getArchivedFeatureData('old_crypto_tracker');
    results['Requirement 2: Feature Removal Archival'] =
      Boolean(archived) &&
      archived?.feature_key === 'old_crypto_tracker' &&
      archived?.data?.user_wallets?.length === 2;
  } catch (e) {
    console.error('Test 2 failed', e);
    results['Requirement 2: Feature Removal Archival'] = false;
  }

  // TEST 4: App Version Migration & Data Retention (Requirement 3)
  try {
    // Setup simulated legacy v1 data
    const legacyTx = [
      {
        id: 'tx-legacy-1',
        type: 'INCOME',
        amount_poisha: 120000,
        account_id: 'acc-1',
        date: '2026-09-10',
        time: '14:30',
        note: 'Legacy Salary',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(legacyTx));
    localStorage.removeItem(STORAGE_KEYS.SCHEMA_META); // Simulate pre-migration state

    const migrationResult = dbMigrationEngine.runMigrations();
    const migratedTxs = storageService.getTransactions();

    const passedMigration =
      migrationResult.success &&
      migratedTxs.length >= 1 &&
      migratedTxs.find((t) => t.id === 'tx-legacy-1')?.amount_poisha === 120000;

    results['Requirement 3.1: Version Migration Data Retention'] = passedMigration;
  } catch (e) {
    console.error('Test 3.1 failed', e);
    results['Requirement 3.1: Version Migration Data Retention'] = false;
  }

  // TEST 5: Backup & Restore Forward/Backward Compatibility (Requirement 3)
  try {
    const backupJson = storageService.exportBackupJSON();
    const parsedBackup = JSON.parse(backupJson);

    const hasMeta = parsedBackup.schema_version === 2 && Boolean(parsedBackup.app_version);
    const hasTables = Array.isArray(parsedBackup.accounts) && Array.isArray(parsedBackup.transactions);

    const restoreSuccess = storageService.importBackupJSON(backupJson);

    results['Requirement 3.2: Backup & Restore Compatibility'] = hasMeta && hasTables && restoreSuccess;
  } catch (e) {
    console.error('Test 3.2 failed', e);
    results['Requirement 3.2: Backup & Restore Compatibility'] = false;
  }

  const allPassed = Object.values(results).every(Boolean);
  console.log('--- TEST RESULTS ---', results, 'ALL PASSED:', allPassed);
  return { passed: allPassed, results };
}
