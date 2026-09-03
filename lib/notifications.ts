import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('debt-reminders', {
      name: 'Debt Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync()
  }
}

export async function scheduleDebtReminder(overdueCount: number, overdueAmount: number) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (overdueCount === 0) return

  const tomorrow9am = new Date()
  tomorrow9am.setDate(tomorrow9am.getDate() + 1)
  tomorrow9am.setHours(9, 0, 0, 0)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Chase your debts today 💰',
      body: `${overdueCount} customer${overdueCount > 1 ? 's' : ''} owe you ₦${overdueAmount.toLocaleString()}`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow9am },
  })
}
