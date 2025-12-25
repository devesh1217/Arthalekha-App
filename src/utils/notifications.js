import notifee, { TimestampTrigger, TriggerType, RepeatFrequency } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_REMINDER_TIME = new Date().setHours(21, 0, 0, 0);

// Setup notifications and channel
export const setupNotifications = async () => {

    try {
        if (await AsyncStorage.getItem('notificationEnabled') === 'true') {
            return;
        }
        // Ask notification permission (Android 13+)
        if (Platform.OS === "android" && Platform.Version >= 33) {
            const re = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (re !== PermissionsAndroid.RESULTS.GRANTED) {
                console.log("Notification permission denied");
                return false;
            }
        }

        // Request Notifee permissions
        await notifee.requestPermission();

        // Create notification channel
        await notifee.createChannel({
            id: 'unified-channel',
            name: 'ArthaLekha Notifications',
        });

        await scheduleDailyReminder();

        return true;
    } catch (error) {
        console.error("Error setting up notifications:", error);
        return false;
    }
};

// Schedule daily reminder notification
export const scheduleDailyReminder = async (time = DEFAULT_REMINDER_TIME) => {
    try {
        // Cancel existing notifications
        await notifee.cancelAllNotifications();
        // Create trigger for daily notification

        const datetime = new Date(time);
        const now = new Date();
        if (datetime <= now) {
            datetime.setDate(datetime.getDate() + 1);
        }

        const trigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: datetime.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
        };
        // Schedule notification
        await notifee.createTriggerNotification(
            {
                title: 'Daily Reminder',
                body: 'Don\'t forget to log your expenses today!',
                android: {
                    channelId: 'unified-channel',
                    smallIcon: 'ic_launcher', // ensure you have this icon in your project
                },
            },
            trigger
        );

    }
    catch (error) {
        console.error("Error scheduling daily reminder:", error);
    }
};

// cancel all scheduled notifications
export const cancelAllNotifications = async () => {
    try {
        await notifee.cancelAllNotifications();
    } catch (error) {
        console.error("Error cancelling notifications:", error);
    }
};
