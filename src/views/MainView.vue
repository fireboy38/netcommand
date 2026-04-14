<template>
  <div class="main-layout">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="top-left">
        <span class="logo">
          <el-icon :size="22" color="#409eff"><Monitor /></el-icon>
          <h1>新数网络调试工具</h1>
        </span>
        <el-tag size="small" type="info" effect="plain">交换机配置命令生成器</el-tag>
      </div>
      <div class="top-center">
        <!-- 设备标签页 -->
        <div class="tab-container">
          <div
            v-for="tab in store.tabs"
            :key="tab.id"
            class="device-tab"
            :class="{ active: store.activeTabId === tab.id }"
            @click="store.setActiveTab(tab.id)"
          >
            <span
              class="vendor-dot"
              :style="{ backgroundColor: vendorColor(tab.vendor) }"
            ></span>
            <span v-if="editingTabId !== tab.id" class="tab-name" @dblclick.stop="editingTabId = tab.id">
              {{ tab.name }}
            </span>
            <input
              v-else
              v-model="tab.name"
              class="tab-edit-input"
              size="mini"
              @blur="editingTabId = ''"
              @keyup.enter="editingTabId = ''"
              @click.stop
            />
            <el-icon
              class="tab-close"
              v-if="store.tabs.length > 1"
              @click.stop="store.removeTab(tab.id)"
            ><Close /></el-icon>
          </div>
          <button class="add-tab-btn" @click="store.addTab">
            <el-icon><Plus /></el-icon>
          </button>
        </div>

        <!-- 厂商选择 -->
        <el-select
          :model-value="store.activeTab?.vendor"
          @change="(v: string) => store.setVendor(v as any)"
          size="default"
          style="width: 120px; margin-left: 12px;"
        >
          <el-option label="华为 Huawei" value="huawei">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:50%;background:#e60012;display:inline-block;"></span>华为
            </span>
          </el-option>
          <el-option label="锐捷 Ruijie" value="ruijie">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:50%;background:#ff6a00;display:inline-block;"></span>锐捷
            </span>
          </el-option>
          <el-option label="华三 H3C" value="h3c">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:50%;background:#0099ff;display:inline-block;"></span>华三
            </span>
          </el-option>
        </el-select>
      </div>
      <div class="top-right">
        <!-- 全部复制按钮 -->
        <el-button type="primary" plain @click="copyAllCommands" :icon="CopyDocument">
          复制全部命令
        </el-button>

        <!-- 用户信息 -->
        <div class="user-area" v-if="authStore.isLoggedIn">
          <router-link
            v-if="authStore.canManageUsers"
            to="/users"
            class="user-manage-link"
            title="用户管理"
          >
            <el-icon :size="16"><Setting /></el-icon>
          </router-link>
          <el-dropdown trigger="hover" @command="handleUserCommand">
            <span class="user-trigger">
              <div class="user-avatar" :style="{ background: userAvatarColor }">
                {{ authStore.currentUser?.realName?.charAt(0) || 'U' }}
              </div>
              <span class="user-name">{{ authStore.currentUser?.realName || authStore.currentUser?.username }}</span>
              <el-icon :size="12" style="margin-left:2px;color:rgba(255,255,255,0.5)"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="dropdown-user-info">
                    <strong>{{ authStore.currentUser?.realName }}</strong>
                    <small>@{{ authStore.currentUser?.username }}</small>
                    <el-tag size="small" :type="authStore.isAdmin ? 'danger' : 'info'" effect="plain" style="margin-top:2px;">
                      {{ authStore.roleLabel }}
                    </el-tag>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item command="changePassword" divided>
                  <el-icon><EditPen /></el-icon> 修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="content-area">
      <!-- 左侧模块导航 -->
      <aside class="sidebar">
        <nav class="module-nav">
          <div
            v-for="mod in moduleList"
            :key="mod.key"
            class="nav-item"
            :class="{ active: store.activeModule === mod.key, enabled: store.activeTab?.moduleStates[mod.key] }"
            @click="store.activeModule = mod.key"
          >
            <el-icon :size="18"><component :is="mod.icon" /></el-icon>
            <span>{{ mod.label }}</span>
            <span
              v-if="store.activeTab?.moduleStates[mod.key]"
              class="status-dot"
            ></span>
          </div>
        </nav>
        <div class="sidebar-footer">
          <div style="font-size:10px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.6;">
            &copy; 2026 四川新数科技<br>
            <span class="version">v1.0.0</span>
          </div>
        </div>
      </aside>

      <!-- 中间配置区 -->
      <main class="config-panel">
        <transition name="slide-fade" mode="out-in">
          <component :is="currentModuleComponent" />
        </transition>
      </main>

      <!-- 右侧代码预览 -->
      <aside class="code-panel">
        <div class="code-header">
          <span class="code-title">
            <el-icon :size="14"><Monitor /></el-icon>
            命令预览 - {{ vendorName(store.activeTab?.vendor) }}
          </span>
          <el-button size="small" text type="primary" @click="copyAllCommands">
            <el-icon :size="13"><CopyDocument /></el-icon> 复制全部
          </el-button>
        </div>
        <div class="code-body">
          <pre class="code-block">{{ store.generatedCommands || '<!-- 请在左侧选择模块进行配置 -->' }}</pre>
        </div>
        <div class="code-footer" v-if="store.generatedCommands">
          <span class="line-count">共 {{ lineCount }} 行</span>
          <el-button size="small" text type="success" @click="downloadConfig">
            <el-icon :size="13"><Download /></el-icon> 导出文件
          </el-button>
        </div>
      </aside>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="pwdDialogVisible"
      title="修改密码"
      width="420px"
      :close-on-click-modal="false"
      destroy-on-close
      class="pwd-dialog"
    >
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdFormRules" label-width="80px" size="large">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="6-32 个字符" @input="onPwdInput" />
          <!-- 密码强度 -->
          <transition name="slide-down">
            <div v-if="pwdForm.newPassword" class="pwd-strength-bar">
              <div class="strength-track">
                <div class="strength-fill" :style="{ width: pwdStrengthPercent + '%', background: pwdStrengthColor }"></div>
              </div>
              <span class="strength-text" :style="{ color: pwdStrengthColor }">{{ pwdStrengthLabel }}</span>
            </div>
          </transition>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '../store/config'
import { useAuthStore } from '../store/auth'
import type { ModuleType, VendorType } from '../types'
// 各配置模块组件（懒加载）
import BasicModule from '../modules/BasicModule.vue'
import VlanModule from '../modules/VlanModule.vue'
import StpModule from '../modules/StpModule.vue'
import DhcpModule from '../modules/DhcpModule.vue'
import RouteModule from '../modules/RouteModule.vue'
import InterfaceModule from '../modules/InterfaceModule.vue'
import RemoteModule from '../modules/RemoteModule.vue'
import SnmpModule from '../modules/SnmpModule.vue'
import LogModule from '../modules/LogModule.vue'
import AclModule from '../modules/AclModule.vue'
import NtpModule from '../modules/NtpModule.vue'
import CustomModule from '../modules/CustomModule.vue'
import { ElMessage } from 'element-plus'
import {
  Setting, Connection, Share, Monitor, Promotion,
  Lock, View, Filter, Timer, EditPen,
  CopyDocument, Download, Plus, Document,
  ArrowDown, SwitchButton,
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const store = useConfigStore()
const authStore = useAuthStore()
const editingTabId = ref('')

// 模块列表
const moduleList = [
  { key: 'basic' as ModuleType, label: '基础配置', icon: markRaw(Setting) },
  { key: 'vlan' as ModuleType, label: 'VLAN', icon: markRaw(Connection) },
  { key: 'stp' as ModuleType, label: 'STP/MSTP', icon: markRaw(Share) },
  { key: 'dhcp' as ModuleType, label: 'DHCP', icon: markRaw(Monitor) },
  { key: 'route' as ModuleType, label: '路由', icon: markRaw(Promotion) },
  { key: 'interfaceConf' as ModuleType, label: '接口/聚合', icon: markRaw(Connection) },
  { key: 'remote' as ModuleType, label: 'SSH/Telnet', icon: markRaw(Lock) },
  { key: 'snmp' as ModuleType, label: 'SNMP', icon: markRaw(View) },
  { key: 'acl' as ModuleType, label: 'ACL/QoS', icon: markRaw(Filter) },
  { key: 'ntp' as ModuleType, label: 'NTP', icon: markRaw(Timer) },
  { key: 'log' as ModuleType, label: '日志配置', icon: markRaw(Document) },
  { key: 'custom' as ModuleType, label: '自定义', icon: markRaw(EditPen) },
]

// 当前活动模块对应的组件
const currentModuleComponent = computed(() => {
  const map: Record<ModuleType, any> = {
    basic: BasicModule,
    vlan: VlanModule,
    stp: StpModule,
    dhcp: DhcpModule,
    route: RouteModule,
    interfaceConf: InterfaceModule,
    remote: RemoteModule,
    snmp: SnmpModule,
    log: LogModule,
    acl: AclModule,
    ntp: NtpModule,
    custom: CustomModule,
  }
  return map[store.activeModule] || BasicModule
})

function vendorColor(vendor?: VendorType): string {
  switch (vendor) {
    case 'huawei': return '#e60012'
    case 'ruijie': return '#ff6a00'
    case 'h3c': return '#0099ff'
    default: return '#409eff'
  }
}

function vendorName(vendor?: VendorType): string {
  switch (vendor) {
    case 'huawei': return '华为'
    case 'ruijie': return '锐捷'
    case 'h3c': return '华三'
    default: return ''
  }
}

// ===== 用户操作 =====
const userAvatarColor = computed(() => {
  const name = authStore.currentUser?.username || ''
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#9b59b6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return colors[hash % colors.length]
})

function handleUserCommand(command: string) {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (command === 'changePassword') {
    openPwdDialog()
  }
}

// ===== 修改密码 =====
const pwdDialogVisible = ref(false)
const pwdFormRef = ref<FormInstance>()
const pwdSubmitting = ref(false)

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const confirmPwdValidator = (_rule: any, value: string, callback: any) => {
  if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const pwdFormRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '6-32 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: confirmPwdValidator, trigger: 'blur' },
  ],
}

function openPwdDialog() {
  Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
  pwdDialogVisible.value = true
}

// 密码强度（与登录页一致）
let pwdScore = 0
function calcPwdStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd.length) return { score: 0, label: '', color: '#dcdfe6' }
  let s = 0
  if (pwd.length >= 8) s++
  if (pwd.length >= 12) s++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++
  if (/\d/.test(pwd)) s++
  if (/[^a-zA-Z\d]/.test(pwd)) s++
  const levels = [
    { max: 1, label: '弱', color: '#f56c6c' },
    { max: 2, label: '较弱', color: '#e6a23c' },
    { max: 3, label: '中等', color: '#409eff' },
    { max: 4, label: '强', color: '#67c23a' },
    { max: 5, label: '非常强', color: '#13ce66' },
  ]
  const level = levels.find(l => s <= l.max) || levels[levels.length - 1]
  return { score: s, label: level.label, color: level.color }
}
const pwdStrengthPercent = computed(() => (pwdScore / 5) * 100)
const pwdStrengthLabel = computed(() => calcPwdStrength(pwdForm.newPassword).label)
const pwdStrengthColor = computed(() => calcPwdStrength(pwdForm.newPassword).color)
function onPwdInput() { pwdScore = calcPwdStrength(pwdForm.newPassword).score }

async function handleChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return

  pwdSubmitting.value = true
  await new Promise(r => setTimeout(r, 400))

  const result = authStore.changeMyPassword(pwdForm.oldPassword, pwdForm.newPassword)
  pwdSubmitting.value = false

  if (result.success) {
    ElMessage.success(result.message)
    pwdDialogVisible.value = false
    // 自动退出，让用户用新密码重新登录
    authStore.logout()
    router.push('/login')
  } else {
    ElMessage.error(result.message)
  }
}

const lineCount = computed(() => {
  if (!store.generatedCommands) return 0
  return store.generatedCommands.split('\n').filter(l => l.trim()).length
})

// ===== 操作方法 =====
async function copyAllCommands() {
  const cmd = store.generatedCommands
  if (!cmd) {
    ElMessage.warning('暂无生成的命令')
    return
  }
  try {
    await navigator.clipboard.writeText(cmd)
    ElMessage.success(`已复制 ${lineCount.value} 行命令到剪贴板`)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = cmd
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制到剪贴板')
  }
}

function downloadConfig() {
  const cmd = store.generatedCommands
  if (!cmd) return
  const blob = new Blob([cmd], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.activeTab?.name || 'config'}_${vendorName(store.activeTab?.vendor)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ===== 顶部栏 ===== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  flex-shrink: 0;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo h1 {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.top-center {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 600px;
}

.tab-container {
  display: flex;
  align-items: center;
  gap: 2px;
}

.device-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  transition: all 0.15s;
  position: relative;
}
.device-tab:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.08);
}
.device-tab.active {
  color: #fff;
  background: rgba(64,158,255,0.2);
}
.vendor-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tab-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-edit-input {
  width: 70px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 3px;
  color: #fff;
  outline: none;
  padding: 1px 4px;
  font-size: 12px;
}
.tab-close {
  opacity: 0;
  transition: opacity 0.15s;
  cursor: pointer;
  font-size: 11px;
}
.device-tab:hover .tab-close { opacity: 0.7; }
.tab-close:hover { opacity: 1 !important; }

.add-tab-btn {
  background: none;
  border: 1px dashed rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px 6px 0 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.add-tab-btn:hover {
  color: rgba(255,255,255,0.85);
  border-color: rgba(255,255,255,0.45);
}

.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: flex-end;
}

/* ===== 用户区域 ===== */
.user-area {
  display: flex;
  align-items: center;
  gap: 6px;
}
.user-manage-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: rgba(255,255,255,0.55);
  transition: all 0.15s;
}
.user-manage-link:hover { color: #fff; background: rgba(255,255,255,0.1); }
.user-trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  padding: 3px 10px 3px 3px;
  border-radius: 20px;
  transition: background 0.15s;
}
.user-trigger:hover { background: rgba(255,255,255,0.08); }
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}
.user-name {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0;
}

/* ===== 内容区 ===== */
.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===== 左侧导航 ===== */
.sidebar {
  width: 162px;
  min-width: 140px;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.module-nav {
  flex: 1;
  padding: 10px 0;
  overflow-y: auto;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  cursor: pointer;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  transition: all 0.15s;
  position: relative;
  user-select: none;
}
.nav-item:hover {
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.05);
}
.nav-item.active {
  color: #fff;
  background: rgba(64,158,255,0.15);
  border-right: 3px solid #409eff;
}
.nav-item .el-icon {
  opacity: 0.75;
  flex-shrink: 0;
}
.nav-item.active .el-icon { opacity: 1; }
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success-color);
  margin-left: auto;
  flex-shrink: 0;
}
.sidebar-footer {
  padding: 10px;
  text-align: center;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.version {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}

/* ===== 中间配置面板 ===== */
.config-panel {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--bg-primary);
  min-width: 400px;
}

/* ===== 右侧代码预览 ===== */
.code-panel {
  flex: 1 1 auto;
  min-width: 340px;
  max-width: 560px;
  background: var(--bg-code);
  display: flex;
  flex-direction: column;
  border-left: 1px solid #2d2d3f;
}
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #2d2d3f;
  flex-shrink: 0;
}
.code-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  font-weight: 500;
}
.code-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.code-block {
  margin: 0;
  font-family: 'Consolas','Monaco','Courier New','Noto Sans Mono CJK SC',monospace;
  font-size: 12.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-all;
  color: #abb2bf;
}
.code-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #2d2d3f;
  flex-shrink: 0;
}
.line-count {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}

/* ===== 响应式适配 ===== */
@media (max-width: 1200px) {
  .code-panel { max-width: 380px; min-width: 280px; }
  .config-panel { min-width: 360px; }
}
@media (max-width: 960px) {
  .code-panel { display: none; }
  .config-panel { max-width: none; }
}

/* ===== 修改密码对话框 ===== */
.pwd-strength-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
}
.strength-track {
  flex: 1;
  height: 3px;
  background: #e4e7ed;
  border-radius: 2px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
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
</style>
