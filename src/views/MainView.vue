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
              ref="tabInput"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, watch, nextTick } from 'vue'
import { useConfigStore } from '../store/config'
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
  CopyDocument, Download, Plus, Tickets, Notebook
} from '@element-plus/icons-vue'

const store = useConfigStore()
const editingTabId = ref('')
const tabInput = ref<HTMLInputElement[]>()

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
  { key: 'log' as ModuleType, label: '日志配置', icon: markRaw(Tickets) },
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

/* ===== 内容区 ===== */
.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===== 左侧导航 ===== */
.sidebar {
  width: 170px;
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
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--bg-primary);
  min-width: 420px;
  max-width: 660px;
}

/* ===== 右侧代码预览 ===== */
.code-panel {
  width: 400px;
  background: var(--bg-code);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
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
@media (max-width: 1100px) {
  .code-panel { width: 320px; }
  .config-panel { max-width: 500px; }
}
</style>
