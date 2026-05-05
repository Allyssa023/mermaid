export function usePushNotifications() {
  return { permission: 'default', supported: false, request: async () => 'unsupported', fire: () => {} }
}
