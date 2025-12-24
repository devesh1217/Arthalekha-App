import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBackup } from './backupUtils';

const AUTO_BACKUP_KEY = 'autoBackupEnabled';
const AUTO_BACKUP_FREQ_KEY = 'autoBackupFrequency';
const AUTO_BACKUP_LAST_KEY = 'autoBackupLastTime';

export const initBackgroundBackup = async () => {
  // Configure BackgroundFetch
  BackgroundFetch.configure({
    minimumFetchInterval: 15, // minutes (Android minimum)
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
  }, async (taskId) => {
    try {
      const enabled = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
      const freq = await AsyncStorage.getItem(AUTO_BACKUP_FREQ_KEY);
      const last = await AsyncStorage.getItem(AUTO_BACKUP_LAST_KEY);
      if (enabled === 'true') {
        const now = Date.now();
        const interval = freq ? Number(freq) : 24 * 60 * 60 * 1000;
        if (!last || now - Number(last) > interval) {
          await createBackup();
          await AsyncStorage.setItem(AUTO_BACKUP_LAST_KEY, String(now));
        }
      }
    } catch (e) {
      // Log error
    }
    BackgroundFetch.finish(taskId);
  }, (error) => {
    // Log error
  });
};

// For headless JS (Android)
export const backgroundFetchHeadlessTask = async (event) => {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId);
    return;
  }
  await initBackgroundBackup();
  BackgroundFetch.finish(event.taskId);
};

// Register headless task (Android)
BackgroundFetch.registerHeadlessTask(backgroundFetchHeadlessTask);
