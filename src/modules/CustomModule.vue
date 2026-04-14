<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><EditPen /></el-icon>
      自定义命令
      <span class="form-hint">（手动输入任意CLI命令）</span>
    </div>

    <div class="custom-hint">
      <el-alert
        title="💡 在此输入任意厂商的命令，支持多条命令。这些命令将直接附加到最终配置末尾。"
        type="info" :closable="false" show-icon />
    </div>

    <!-- 自定义命令列表 -->
    <TransitionGroup name="list" tag="div" class="custom-list">
      <div v-for="(cmd, idx) in store.activeTab?.customCommands" :key="'c'+idx" class="custom-card">
        <div class="custom-header">
          <el-input v-model="cmd.title" placeholder="命令组标题（可选）"
            size="small" style="width:200px;" clearable>
            <template #prefix><el-icon :size="13"><EditPen /></el-icon></template>
          </el-input>
          <el-button :icon="Delete" type="danger" text circle size="small"
            @click="store.activeTab?.customCommands.splice(idx,1)" />
        </div>
        <el-input
          v-model="cmd.commands"
          type="textarea"
          :rows="5"
          placeholder="在此输入CLI命令，每行一条...&#10;&#10;示例：&#10;snmp-agent community read public&#10;snmp-agent sys-info version v2c v3&#10;undo snmp-agent trap enable"
          resize="vertical"
          class="code-textarea"
        />
      </div>
    </TransitionGroup>

    <el-button type="primary" plain @click="addCustomBlock" size="default"
      style="margin-top:12px;width:100%;">
      <el-icon><Plus /></el-icon> 添加自定义命令块
    </el-button>

    <!-- 预览 -->
    <el-divider content-position="left">命令预览</el-divider>
    <div class="module-preview">
      <pre class="code-block">{{ store.generateModuleCommands('custom') || '<!-- 添加命令后自动生成 -->' }}</pre>
      <el-button size="small" text type="primary" style="margin-top:8px"
        @click="copyModule('custom')" v-if="store.generateModuleCommands('custom')">
        <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../store/config'
import { Delete, Plus, CopyDocument, EditPen } from '@element-plus/icons-vue'

const store = useConfigStore()

function addCustomBlock() {
  if (!store.activeTab) return
  store.activeTab.customCommands.push({
    title: `自定义 #${store.activeTab.customCommands.length + 1}`,
    commands: ''
  })
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.form-hint {
  font-size: 12px; color: #909399; font-weight: normal;
}
.custom-hint { margin-bottom: 16px; }

.custom-list { margin-bottom: 8px; }
.custom-card {
  background: linear-gradient(135deg, #f0f7ff, #eef2ff);
  border: 1px solid #b3d8ff;
  border-radius: 10px; padding: 16px; margin-bottom: 14px;
}
.custom-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}

.code-textarea :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  background: #fafafa !important;
  border-color: #dcdfe6 !important;
}
.code-textarea :deep(.el-textarea__inner:focus) {
  border-color: var(--accent-color) !important;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.25s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
