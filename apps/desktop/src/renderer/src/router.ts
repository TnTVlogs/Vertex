import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            component: () => import('./views/HomeView.vue'),
        },
        {
            path: '/invite/:code',
            name: 'invite',
            component: () => import('./views/InvitePreview.vue'),
            props: true,
        },
    ],
})

export default router
