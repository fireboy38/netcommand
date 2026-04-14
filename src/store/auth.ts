/**
 * 新数网络调试工具 (NetCommand)
 * Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
 * 用户认证与权限管理 - Pinia Store
 *
 * 说明：纯前端演示级实现，用户数据存储于 localStorage。
 * 生产环境应接入后端 API 进行认证。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, UserRole } from '../types'

const USERS_KEY = 'netcommand_users'
const CURRENT_KEY = 'netcommand_current_user'
const ATTEMPTS_KEY = 'netcommand_login_attempts'
const LOCKOUT_KEY = 'netcommand_login_lockout'

// ===== 安全配置 =====
const MAX_FAILED_ATTEMPTS = 5        // 最大失败次数
const LOCKOUT_DURATION_SEC = 60      // 锁定时长(秒)

// ===== 密码工具（简单 hash，仅前端演示） =====
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(36)
}

// ===== 默认管理员账号 =====
function getDefaultUsers(): UserInfo[] {
  return [
    {
      username: 'admin',
      password: simpleHash('admin123'),
      role: 'admin',
      realName: '系统管理员',
      enabled: true,
      createdAt: new Date().toISOString(),
    }
  ]
}

// ===== localStorage 操作 =====
function loadUsers(): UserInfo[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw)
    saveUsers(getDefaultUsers())
    return getDefaultUsers()
  } catch {
    return getDefaultUsers()
  }
}

function saveUsers(users: UserInfo[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadCurrentUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (!raw) return null
    const user: UserInfo = JSON.parse(raw)
    // 验证用户仍然存在且启用
    const users = loadUsers()
    const found = users.find(u => u.username === user.username && u.enabled)
    if (!found) {
      localStorage.removeItem(CURRENT_KEY)
      return null
    }
    // 返回不含密码的当前用户信息
    return { ...found, lastLogin: user.lastLogin }
  } catch {
    return null
  }
}

// ===== 登录尝试记录 =====
interface LoginAttemptRecord {
  attempts: number
  lastAttempt: string
  lockedUntil?: string
}

function loadAttempts(): LoginAttemptRecord {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { attempts: 0, lastAttempt: '' }
}

function saveAttempts(record: LoginAttemptRecord) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(record))
}

function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY)
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<UserInfo | null>(loadCurrentUser())
  const users = ref<UserInfo[]>(loadUsers())

  // ===== 计算属性 =====
  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const roleLabel = computed(() => {
    switch (currentUser.value?.role) {
      case 'admin': return '管理员'
      case 'user': return '操作员'
      case 'viewer': return '查看者'
      default: return ''
    }
  })
  const canManageUsers = computed(() => isAdmin.value)

  // ===== 登录（含失败计数和锁定） =====
  function loginWithAttempt(username: string, password: string): {
    success: boolean
    message: string
    lockoutSeconds?: number
  } {
    // 检查锁定状态
    const record = loadAttempts()
    if (record.lockedUntil && new Date(record.lockedUntil).getTime() > Date.now()) {
      const remainSec = Math.ceil((new Date(record.lockedUntil).getTime() - Date.now()) / 1000)
      return {
        success: false,
        message: `连续 ${MAX_FAILED_ATTEMPTS} 次登录失败，账户已锁定`,
        lockoutSeconds: remainSec,
      }
    }

    // 验证凭据
    const hashedPassword = simpleHash(password)
    const user = users.value.find(
      u => u.username === username && u.password === hashedPassword && u.enabled
    )

    if (!user) {
      // 失败：增加计数
      record.attempts += 1
      record.lastAttempt = new Date().toISOString()

      if (record.attempts >= MAX_FAILED_ATTEMPTS) {
        // 达到阈值，设置锁定
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_SEC * 1000).toISOString()
        record.lockedUntil = lockUntil
        saveAttempts(record)
        localStorage.setItem(LOCKOUT_KEY, lockUntil.toString())
        return {
          success: false,
          message: `连续 ${MAX_FAILED_ATTEMPTS} 次错误，已锁定 ${LOCKOUT_DURATION_SEC} 秒`,
          lockoutSeconds: LOCKOUT_DURATION_SEC,
        }
      }

      saveAttempts(record)
      const remaining = MAX_FAILED_ATTEMPTS - record.attempts
      return {
        success: false,
        message: `用户名或密码错误（还剩 ${remaining} 次机会）`,
      }
    }

    // 成功：清除失败记录
    clearAttempts()

    // 更新最后登录时间
    const idx = users.value.findIndex(u => u.username === username)
    const now = new Date().toISOString()
    users.value[idx].lastLogin = now
    saveUsers(users.value)

    // 设置当前用户（不存密码）
    currentUser.value = { ...user, password: '', lastLogin: now }
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ ...currentUser.value }))
    return { success: true, message: `欢迎回来，${user.realName}` }
  }

  /** 兼容旧接口的登录方法 */
  function login(username: string, password: string): { success: boolean; message: string } {
    const result = loginWithAttempt(username, password)
    return { success: result.success, message: result.message }
  }

  // ===== 登出 =====
  function logout() {
    currentUser.value = null
    localStorage.removeItem(CURRENT_KEY)
  }

  // ===== 修改当前用户密码 =====
  function changeMyPassword(oldPassword: string, newPassword: string):
    { success: boolean; message: string } {
    if (!currentUser.value) {
      return { success: false, message: '未登录' }
    }

    const idx = users.value.findIndex(u => u.username === currentUser.value!.username)
    if (idx < 0) {
      return { success: false, message: '用户不存在' }
    }

    // 验证旧密码
    if (users.value[idx].password !== simpleHash(oldPassword)) {
      return { success: false, message: '原密码不正确' }
    }

    // 校验新密码
    if (newPassword.length < 6) {
      return { success: false, message: '新密码至少 6 个字符' }
    }
    if (newPassword.length > 32) {
      return { success: false, message: '新密码最多 32 个字符' }
    }
    if (oldPassword === newPassword) {
      return { success: false, message: '新密码不能与原密码相同' }
    }

    // 更新密码
    users.value[idx].password = simpleHash(newPassword)
    saveUsers(users.value)

    return { success: true, message: '密码修改成功，请重新登录' }
  }

  // ===== 用户 CRUD =====

  /** 添加用户 */
  function addUser(payload: {
    username: string; password: string;
    realName: string; role: UserRole
  }): { success: boolean; message: string } {
    if (!isAdmin.value) return { success: false, message: '无权执行此操作' }
    if (!payload.username || !payload.password) {
      return { success: false, message: '用户名和密码不能为空' }
    }
    if (payload.username.length < 3) {
      return { success: false, message: '用户名至少 3 个字符' }
    }
    if (payload.password.length < 6) {
      return { success: false, message: '密码至少 6 个字符' }
    }
    if (users.value.find(u => u.username === payload.username)) {
      return { success: false, message: '用户名已存在' }
    }

    const newUser: UserInfo = {
      username: payload.username,
      password: simpleHash(payload.password),
      role: payload.role,
      realName: payload.realName,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    users.value.push(newUser)
    saveUsers(users.value)
    return { success: true, message: `用户 "${payload.username}" 创建成功` }
  }

  /** 更新用户 */
  function updateUser(username: string, updates: Partial<Pick<UserInfo, 'realName' | 'role' | 'enabled'> & { newPassword?: string }>): { success: boolean; message: string } {
    if (!isAdmin.value) return { success: false, message: '无权执行此操作' }
    if (username === 'admin') {
      // 不允许修改管理员的角色和禁用状态
      delete updates.role
      updates.enabled !== undefined ? (delete updates.enabled) : null
    }
    const idx = users.value.findIndex(u => u.username === username)
    if (idx < 0) return { success: false, message: '用户不存在' }

    if (updates.newPassword) {
      if (updates.newPassword.length < 6) {
        return { success: false, message: '新密码至少 6 个字符' }
      }
      users.value[idx].password = simpleHash(updates.newPassword)
      delete updates.newPassword
    }

    Object.assign(users.value[idx], updates)
    saveUsers(users.value)

    // 如果更新的是当前用户，同步更新 currentUser
    if (currentUser.value?.username === username) {
      currentUser.value = { ...users.value[idx], password: '', lastLogin: currentUser.value.lastLogin }
      localStorage.setItem(CURRENT_KEY, JSON.stringify(currentUser.value))
    }
    return { success: true, message: `用户 "${username}" 已更新` }
  }

  /** 删除用户 */
  function deleteUser(username: string): { success: boolean; message: string } {
    if (!isAdmin.value) return { success: false, message: '无权执行此操作' }
    if (username === 'admin') return { success: false, message: '不能删除系统管理员' }
    if (currentUser.value?.username === username) {
      return { success: false, message: '不能删除当前登录的账号' }
    }
    const idx = users.value.findIndex(u => u.username === username)
    if (idx < 0) return { success: false, message: '用户不存在' }
    users.value.splice(idx, 1)
    saveUsers(users.value)
    return { success: true, message: `用户 "${username}" 已删除` }
  }

  // 获取所有用户列表（隐藏密码）
  const userList = computed(() =>
    users.value.map(({ password, ...rest }) => rest as Omit<UserInfo, 'password'>)
  )

  return {
    currentUser, isLoggedIn, isAdmin, roleLabel, canManageUsers, userList,
    login, loginWithAttempt, logout, changeMyPassword,
    addUser, updateUser, deleteUser,
  }
})
