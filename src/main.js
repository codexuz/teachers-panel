import './assets/style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import OneSignalVuePlugin from '@onesignal/onesignal-vue3';

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.js'

const app = createApp(App)
app.component('QuillEditor', QuillEditor)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(OneSignalVuePlugin, {
    appId: '62c40ef3-658a-4e7a-b790-4d5af464c1d5',
    serviceWorkerPath: '/OneSignalSDKWorker.js',
    notifyButton: {
        enable: true,
        size: 'small',
        position: 'bottom-right',
        offset: {
            bottom: '20px',
            right: '20px'
        },
        theme: 'default',
        text: {
            'tip.state.unsubscribed': 'Subscribe to notifications',
            'tip.state.subscribed': 'You are subscribed to notifications',
            'tip.state.blocked': 'You have blocked notifications',
            'message.prenotify': 'Click to subscribe to notifications',
            'message.action.subscribed': 'Thank you for subscribing!',
            'message.action.resubscribed': 'Thank you for resubscribing!',
            'message.action.unsubscribed': 'You have unsubscribed from notifications',
            'dialog.main.title': 'Notifications',
            'dialog.main.button.subscribe': 'Subscribe',
            'dialog.main.button.unsubscribe': 'Unsubscribe'
        }
      },
    welcomeNotification: {
        title: 'Welcome to Teacher Panel',
        message: 'You can now receive notifications about important updates.',
        autoDismiss: 5
    },
    promptOptions: {
        siteName: 'Teacher Panel',
        actionMessage: 'Would you like to receive notifications from Teacher Panel?',
        acceptButtonText: 'Yes',
        cancelButtonText: 'No, thanks',
        autoAcceptTitle: 'You will receive notifications from Teacher Panel'
    },
    allowLocalhostAsSecureOrigin: true,
    persistNotification: true,
});

// Initialize auth store
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')
