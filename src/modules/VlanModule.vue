<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Connection /></el-icon>
      VLAN 配置
      <el-switch
        v-model="cfg.enabled"
        size="small"
        style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('vlan', val)"
      />
    </div>

    <template v-if="cfg.enabled">
      <!-- VLAN列表 -->
      <div class="vlan-list">
        <TransitionGroup name="list" tag="div" class="vlan-items">
          <div v-for="(v, idx) in cfg.vlans" :key="idx" class="vlan-item">
            <div class="vlan-row">
              <el-input
                v-model.number="v.id"
                placeholder="VLAN ID"
                style="width:90px;flex-shrink:0;"
                size="default"
              >
                <template #prefix><span style="font-size:11px;color:#909399">VID</span></template>
              </el-input>
              <el-input
                v-model="v.name"
                placeholder="名称 (例: Office)"
                style="flex:1;margin:0 8px;"
                size="default"
              />
              <el-button
                :icon="Delete"
                type="danger"
                text
                circle
                size="small"
                @click="cfg.vlans.splice(idx, 1)"
                :disabled="cfg.vlans.length <= 1"
              />
            </div>
            <el-input
              v-model="v.description"
              placeholder="描述信息（可选）"
              size="small"
              style="margin-top:6px"
            />
          </div>
        </TransitionGroup>
      </div>

      <el-button type="primary" plain size="default" @click="addVlan" style="margin-top:12px">
        <el-icon><Plus /></el-icon> 添加 VLAN
      </el-button>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('vlan') || '<!-- 添加VLAN后自动生成 -->' }}</pre>
        <el-button
          size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('vlan')"
          v-if="store.generateModuleCommands('vlan')"
        >
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置VLAN" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'
import { Delete, Plus, CopyDocument } from '@element-plus/icons-vue'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.vlan)

function addVlan() {
  if (!cfg.value) return
  const lastId = Math.max(...cfg.value.vlans.map(v => Number(v.id) || 0))
  cfg.value.vlans.push({ id: String(lastId + 10), name: `VLAN${lastId + 10}` })
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.vlan-list { margin-bottom: 8px; }
.vlan-item {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.15s;
}
.vlan-item:hover { border-color: #c0c4cc; }
.vlan-row {
  display: flex;
  align-items: center;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.25s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
