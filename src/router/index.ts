import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/users',
      name: 'UserManage',
      component: () => import('../views/UserManageView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/MainView.vue'),
    },
  ],
})

// ===== 全局导航守卫 =====
router.beforeEach((to) => {
  const auth = useAuthStore()

  // 已登录时访问 /login → 跳转首页
  if (to.name === 'Login' && auth.isLoggedIn) {
    return { path: '/' }
  }

  // 公开页面放行（/login）
  if (to.meta.public) {
    return true
  }

  // 未登录 → 跳转登录页
  if (!auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // 需要管理员权限的页面
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    console.warn('需要管理员权限')
    return false // 留在当前页，或可改为跳转首页
  }

  return true
})

export default router
