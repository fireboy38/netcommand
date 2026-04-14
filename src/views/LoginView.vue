<!--
  新数网络调试工具 (NetCommand)
  Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
  用户登录页面 — 玻璃拟态风格
-->
<template>
  <div class="login-page" :class="{ 'dark-mode': isDark }">
    <!-- 动态背景 -->
    <div class="login-bg">
      <!-- 网格背景 -->
      <div class="grid-bg"></div>
      <!-- 光晕球 -->
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
      <!-- 浮动粒子 -->
      <div v-for="n in 12" :key="n" class="particle" :style="particleStyle(n)"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card" :class="{ 'card-enter': cardVisible }">
      <!-- 顶部品牌条 -->
      <div class="card-brand-bar">
        <div class="brand-inner">
          <div class="brand-logo">
            <el-icon :size="26" color="#409eff"><Monitor /></el-icon>
          </div>
          <span class="brand-text">新数网络调试工具</span>
          <el-tag size="small" effect="dark" type="primary" round>NetCommand</el-tag>
        </div>
      </div>

      <!-- 表单区域 -->
      <div class="card-body">
        <!-- 欢迎语 -->
        <div class="welcome-section">
          <h2 class="welcome-title">
            <span class="title-line1">欢迎回来</span>
            <span class="title-line2">请登录您的账号</span>
          </h2>
          <p class="welcome-sub">交换机配置命令生成器 · 华为 / 锐捷 / 华三</p>
        </div>

        <!-- 登录表单 -->
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          size="large"
          @keyup.enter="handleLogin"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <div class="input-wrapper" :class="{ focused: focusField === 'username', filled: !!formData.username }">
              <label class="input-label">用户名</label>
              <el-input
                v-model="formData.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                autocomplete="username"
                @focus="focusField = 'username'"
                @blur="focusField = ''"
              />
            </div>
          </el-form-item>

          <!-- 密码（含强度指示） -->
          <el-form-item prop="password">
            <div class="input-wrapper" :class="{ focused: focusField === 'password', filled: !!formData.password }">
              <label class="input-label">密码</label>
              <el-input
                v-model="formData.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                autocomplete="current-password"
                @focus="focusField = 'password'"
                @blur="focusField = ''"
                @input="onPasswordInput"
              />
              <!-- 密码强度条（仅注册/新用户提示时显示） -->
              <transition name="slide-down">
                <div v-if="showPasswordStrength && formData.password" class="strength-bar">
                  <div class="strength-track">
                    <div class="strength-fill" :style="{ width: strengthPercent + '%', background: strengthColor }"></div>
                  </div>
                  <span class="strength-text" :style="{ color: strengthColor }">{{ strengthLabel }}</span>
                </div>
              </transition>
            </div>
          </el-form-item>

          <!-- 记住我 & 提示 -->
          <div class="form-options">
            <el-checkbox v-model="rememberMe" class="remember-check">
              <span class="check-label">记住我的账号</span>
            </el-checkbox>
            <span class="default-hint">
              <el-icon :size="12"><InfoFilled /></el-icon> 默认: admin / admin123
            </span>
          </div>

          <!-- 登录按钮 -->
          <el-button
            type="primary"
            :loading="loading"
            class="login-btn"
            :disabled="!!loginLockoutRemaining"
            @click="handleLogin"
          >
            <template #loading>
              <span>验证中...</span>
            </template>
            <template v-if="!loginLockoutRemaining">
              <span>{{ loading ? '登录中...' : '登 录' }}</span>
            </template>
            <template v-else>
              <el-icon :size="14"><Timer /></el-icon>
              <span>请等待 {{ loginLockoutRemaining }}s 后重试</span>
            </template>
          </el-button>

          <!-- 错误提示 -->
          <transition name="shake">
            <div v-if="errorMessage" class="error-banner">
              <el-icon><WarningFilled /></el-icon>
              {{ errorMessage }}
            </div>
          </transition>

          <!-- 功能特性 -->
          <div class="feature-tags">
            <span class="feat-tag"><el-icon :size="12"><Check /></el-icon> 多厂商支持</span>
            <span class="feat-tag"><el-icon :size="12"><Check /></el-icon> 图形化配置</span>
            <span class="feat-tag"><el-icon :size="12"><Check /></el-icon> 命令自动生成</span>
          </div>
        </el-form>
      </div>

      <!-- 底部版权 -->
      <div class="card-footer">
        <span>&copy; 2026 四川新数科技有限公司</span>
        <span class="footer-dot">·</span>
        <span>v{{ appVersion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  User, Lock, Monitor, Check,
  InfoFilled, WarningFilled, Timer,
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(true)
const focusField = ref('')
const errorMessage = ref('')
const cardVisible = ref(false)
const isDark = ref(true)

// 密码强度相关
const showPasswordStrength = ref(true)
const passwordScore = ref(0)

// 登录锁定倒计时
const lockoutEndTime = ref<number | null>(null)
let lockoutTimer: ReturnType<typeof setInterval> | null = null

const appVersion = '1.0.0'

// ===== 表单数据 =====
const formData = reactive({
  username: '',
  password: '',
})

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度 2-20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度 6-32 个字符', trigger: 'blur' },
  ],
}

// ===== 密码强度计算 =====
function calcPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd.length) return { score: 0, label: '', color: '#dcdfe6' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z\d]/.test(pwd)) score++

  const levels = [
    { max: 1, label: '弱', color: '#f56c6c' },
    { max: 2, label: '较弱', color: '#e6a23c' },
    { max: 3, label: '中等', color: '#409eff' },
    { max: 4, label: '强', color: '#67c23a' },
    { max: 5, label: '非常强', color: '#13ce66' },
  ]
  const level = levels.find(l => score <= l.max) || levels[levels.length - 1]
  return { score, label: level.label, color: level.color }
}

const strengthPercent = computed(() => (passwordScore.value / 5) * 100)
const strengthLabel = computed(() => calcPasswordStrength(formData.password).label)
const strengthColor = computed(() => calcPasswordStrength(formData.password).color)

function onPasswordInput() {
  const result = calcPasswordStrength(formData.password)
  passwordScore.value = result.score
}

// ===== 登录锁定 =====
const loginLockoutRemaining = computed(() => {
  if (!lockoutEndTime.value) return 0
  const remain = Math.ceil((lockoutEndTime.value - Date.now()) / 1000)
  return remain > 0 ? remain : 0
})

function startLockout(seconds: number) {
  lockoutEndTime.value = Date.now() + seconds * 1000
  if (lockoutTimer) clearInterval(lockoutTimer)
  lockoutTimer = setInterval(() => {
    if (loginLockoutRemaining.value <= 0) {
      lockoutEndTime.value = null
      if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null }
    }
  }, 1000)
}

// ===== 登录处理 =====
async function handleLogin() {
  // 检查锁定状态
  if (loginLockoutRemaining.value > 0) {
    errorMessage.value = `登录已锁定，请在 ${loginLockoutRemaining.value} 秒后重试`
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 先检查密码强度提示（非强制）
  if (formData.password && passwordScore.value <= 1) {
    // 弱密码只警告，不阻止
  }

  loading.value = true
  errorMessage.value = ''

  await new Promise(resolve => setTimeout(resolve, 500))

  const result = authStore.loginWithAttempt(formData.username, formData.password)
  loading.value = false

  if (result.success) {
    errorMessage.value = ''
    ElMessage.success(result.message)

    if (rememberMe.value) {
      localStorage.setItem('netcommand_remember', formData.username)
    }

    router.push('/')
  } else {
    errorMessage.value = result.message

    // 如果是锁定提示，启动倒计时
    if (result.lockoutSeconds && result.lockoutSeconds > 0) {
      startLockout(result.lockoutSeconds)
    }
  }
}

// ===== 粒子样式 =====
function particleStyle(n: number) {
  const positions = [
    { left: '10%', top: '20%', size: 4, delay: 0 },
    { left: '85%', top: '15%', size: 3, delay: 2 },
    { left: '25%', top: '75%', size: 5, delay: 4 },
    { left: '70%', top: '80%', size: 3, delay: 1 },
    { left: '50%', top: '10%', size: 4, delay: 3 },
    { left: '90%', top: '55%', size: 2, delay: 5 },
    { left: '5%', top: '50%', size: 3, delay: 2.5 },
    { left: '40%', top: '88%', size: 4, delay: 1.5 },
    { left: '60%', top: '45%', size: 2, delay: 4.5 },
    { left: '15%', top: '35%', size: 3, delay: 3.5 },
    { left: '78%', top: '30%', size: 5, delay: 0.5 },
    { left: '33%', top: '60%', size: 2, delay: 5.5 },
  ]
  const p = positions[(n - 1) % positions.length]
  return {
    left: p.left,
    top: p.top,
    width: p.size + 'px',
    height: p.size + 'px',
    animationDelay: p.delay + 's',
  }
}

// ===== 初始化 =====
onMounted(() => {
  requestAnimationFrame(() => {
    cardVisible.value = true
  })

  // 自动填充记住的用户名
  const savedUser = localStorage.getItem('netcommand_remember')
  if (savedUser) {
    formData.username = savedUser
    rememberMe.value = true
  }

  // 检查是否有之前的锁定状态
  const savedLockout = localStorage.getItem('netcommand_login_lockout')
  if (savedLockout) {
    const endTime = parseInt(savedLockout, 10)
    if (!isNaN(endTime) && endTime > Date.now()) {
      lockoutEndTime.value = endTime
      lockoutTimer = setInterval(() => {
        if (loginLockoutRemaining.value <= 0) {
          lockoutEndTime.value = null
          localStorage.removeItem('netcommand_login_lockout')
          if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null }
        }
      }, 1000)
    }
  }
})

onUnmounted(() => {
  if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null }
})
</script>

<style scoped>
/* ===== 页面容器 ===== */
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0c1220 0%, #162032 35%, #1a2744 65%, #0f1729 100%);
}

/* ===== 动态背景 ===== */
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(64,158,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(64,158,255,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}

/* 光晕球 */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.25;
  animation: orbFloat 12s ease-in-out infinite alternate;
}
.orb-1 {
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(64,158,255,0.4), transparent 70%);
  top: -120px; right: 10%;
  animation-delay: 0s;
}
.orb-2 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(103,194,58,0.2), transparent 70%);
  bottom: -80px; left: 5%;
  animation-delay: -4s;
}
.orb-3 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(230,162,60,0.2), transparent 70%);
  top: 40%; left: 50%;
  animation-delay: -8s;
}

@keyframes orbFloat {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(20px, -30px) scale(1.05); }
  66%  { transform: translate(-15px, 20px) scale(0.95); }
  100% { transform: translate(10px, 10px) scale(1.02); }
}

/* 浮动粒子 */
.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(64, 158, 255, 0.5);
  box-shadow: 0 0 6px rgba(64, 158, 255, 0.4);
  animation: particleFloat 10s ease-in-out infinite alternate;
}
@keyframes particleFloat {
  0%   { transform: translate(0, 0) scale(1); opacity: 0.3; }
  25%  { transform: translate(15px, -20px) scale(1.2); opacity: 0.7; }
  50%  { transform: translate(-10px, -35px) scale(0.8); opacity: 0.4; }
  75%  { transform: translate(20px, -10px) scale(1.1); opacity: 0.6; }
  100% { transform: translate(0, -25px) scale(1); opacity: 0.3; }
}

/* ===== 登录卡片 ===== */
.login-card {
  width: 420px;
  max-width: 92vw;
  background: rgba(22, 28, 42, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 0 80px rgba(64, 158, 255, 0.06) inset;
  overflow: hidden;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px) scale(0.96);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.login-card.card-enter {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 品牌条 */
.card-brand-bar {
  padding: 18px 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(64, 158, 255, 0.04);
}
.brand-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #00d4ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
}
.brand-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #e8ecf2;
}

/* 表单区 */
.card-body {
  padding: 32px 36px 28px;
}

/* 表单项统一间距 */
.card-body :deep(.el-form-item) {
  margin-bottom: 18px;
}
.card-body :deep(.el-form-item:last-of-type) {
  margin-bottom: 0;
}

/* 欢迎语 */
.welcome-section {
  text-align: center;
  margin-bottom: 28px;
}
.welcome-title {
  margin: 0 0 6px;
}
.title-line1 {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #e8ecf2;
  line-height: 1.2;
}
.title-line2 {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255,255,255,0.4);
  margin-top: 4px;
}
.welcome-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  margin: 8px 0 0;
}

/* 输入框包装 */
.input-wrapper {
  position: relative;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  padding: 2px;
  width: 100%;
  box-sizing: border-box;
}
.input-wrapper.filled,
.input-wrapper.focused {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.35);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1), 0 2px 12px rgba(64, 158, 255, 0.08);
}
.input-label {
  position: absolute;
  top: -10px;
  left: 14px;
  font-size: 11px;
  font-weight: 600;
  color: #409eff;
  background: linear-gradient(180deg, rgba(22, 28, 42, 0.95) 50%, rgba(22, 28, 42, 0.85) 100%);
  padding: 0 8px;
  border-radius: 5px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.5px;
}
.input-wrapper.focused .input-label,
.input-wrapper.filled .input-label {
  opacity: 1;
  transform: translateY(0);
}

/* 覆盖 Element Plus 输入框样式 */
.input-wrapper :deep(.el-input) { width: 100%; }
.input-wrapper :deep(.el-input__wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 4px 12px !important;
  border-radius: 8px !important;
  display: flex !important;
  align-items: center !important;
  min-height: 36px !important;
}
.input-wrapper :deep(.el-input__inner) { height: 28px; line-height: 1.4; }
.input-wrapper :deep(.el-input__inner) {
  color: #e8ecf2;
  font-size: 14px;
  line-height: 1.6;
  caret-color: #409eff;
}
.input-wrapper :deep(.el-input__inner::placeholder) {
  color: rgba(255,255,255,0.18);
  font-size: 13.5px;
}
.input-wrapper :deep(.el-input__prefix) {
  color: rgba(255,255,255,0.3);
}
.input-wrapper :deep(.el-input__prefix .el-icon) {
  color: rgba(255,255,255,0.35);
  font-size: 16px;
}
.input-wrapper :deep(.el-input__suffix) {
  color: rgba(255,255,255,0.25);
}
/* 聚焦时图标高亮 */
.input-wrapper.focused :deep(.el-input__prefix .el-icon),
.input-wrapper.focused :deep(.el-input__suffix .el-icon) {
  color: #409eff;
}

/* 密码强度条 */
.strength-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 0;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.strength-track {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.35s ease, background 0.35s ease;
}
.strength-text {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 38px;
  text-align: right;
}
.slide-down-enter-active { animation: slideDown 0.25s ease; }
.slide-down-leave-active { animation: slideDown 0.2s ease reverse; }
@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 40px; }
}

/* 表单选项 */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.remember-check :deep(.el-checkbox__label) {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
}
.check-label { font-size: 13px !important; color: rgba(255,255,255,0.5) !important; }
.default-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.2);
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 40px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 4px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #409eff 0%, #2568d8 50%, #1a54c4 100%);
  box-shadow:
    0 6px 24px rgba(64, 158, 255, 0.3),
    inset 0 1px 0 rgba(255,255,255,0.15);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}
.login-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.5s;
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(64, 158, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
}
.login-btn:hover:not(:disabled)::before { left: 100%; }
.login-btn:active:not(:disabled) { transform: translateY(0); }
.login-btn:disabled {
  background: linear-gradient(135deg, #555, #444);
  box-shadow: none;
  cursor: not-allowed;
  letter-spacing: 1px;
  font-size: 13px;
}

/* 错误横幅 */
.error-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 10px 14px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.2);
  border-radius: 10px;
  color: #f56c6c;
  font-size: 13px;
  font-weight: 500;
}
.error-banner .el-icon { flex-shrink: 0; }

/* 抖动动画 */
.shake-enter-active { animation: shake 0.5s ease; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}

/* 特性标签 */
.feature-tags {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.feat-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}
.feat-tag .el-icon { color: #67c23a; }

/* 底部版权 */
.card-footer {
  text-align: center;
  padding: 14px 0;
  font-size: 11px;
  color: rgba(255,255,255,0.18);
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.footer-dot { opacity: 0.3; }

/* ===== 响应式 ===== */
@media (max-width: 520px) {
  .login-card {
    border-radius: 16px;
    width: 94vw;
  }
  .card-body { padding: 24px 20px 20px; }
  .brand-brand-bar { padding: 14px 20px; }
  .title-line1 { font-size: 20px; }
  .feature-tags { flex-wrap: wrap; gap: 10px; }
  .form-options { flex-direction: column; gap: 8px; align-items: flex-start; }
}
</style>
