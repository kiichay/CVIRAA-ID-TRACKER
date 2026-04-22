import { createRouter, createWebHistory } from 'vue-router'
import PersonnelView from '../views/PersonnelView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/dashboard'
  },
  {
    path: '/overview',
    name: 'overview',
    component: () => import(/* webpackChunkName: "overview" */ '../views/OverviewView.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '../views/DashboardView.vue')
  },
  {
    path: '/personnel',
    name: 'personnel',
    component: PersonnelView
  },
  {
    path: '/scanner',
    redirect: '/scanner-in'
  },
  {
    path: '/scanner-in',
    name: 'scanner-in',
    component: () => import(/* webpackChunkName: "scanner" */ '../views/QRScannerView.vue')
  },
  {
    path: '/scanner-out',
    name: 'scanner-out',
    component: () => import(/* webpackChunkName: "scanner" */ '../views/QRScannerView.vue')
  },
  {
    path: '/generate-files',
    name: 'generate-files',
    component: () => import(/* webpackChunkName: "generate-files" */ '../views/GenerateFilesView.vue')
  },
  {
    path: '/about',
    name: 'about',
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import(/* webpackChunkName: "settings" */ '../views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
