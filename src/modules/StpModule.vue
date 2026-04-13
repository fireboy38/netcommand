<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Share /></el-icon>
      STP / MSTP 配置
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('stp', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="100px" size="default" class="config-form">
        <el-form-item label="STP模式">
          <el-radio-group v-model="cfg.mode" @change="onChange">
            <el-radio value="stp">STP</el-radio>
            <el-radio value="rstp">RSTP</el-radio>
            <el-radio value="mstp">MSTP</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="cfg.mode === 'mstp'">
          <el-divider content-position="left">MSTP 域配置</el-divider>
          <el-form-item label="域名称">
            <el-input v-model="cfg.mstRegionName" placeholder="例: REGION1" @change="onChange" />
          </el-form-item>
          <el-form-item label="修订版本号">
            <el-input-number v-model="cfg.mstRevision" :min="0" :max="65535" @change="onChange" />
          </el-form-item>

          <!-- MSTP实例 -->
          <div class="sub-section">
            <div class="sub-header">
              <span>MSTI 实例</span>
              <el-button type="primary" text size="small" @click="addInstance">
                <el-icon :size="13"><Plus /></el-icon> 添加实例
              </el-button>
            </div>
            <div v-for="(inst, idx) in cfg.mstInstances" :key="idx" class="inst-card">
              <div class="inst-row">
                <el-input-number v-model.number="inst.instance" :min="0" :max="4094"
                  label="实例ID" size="small" style="width:90px;" />
                <el-input v-model="inst.vlans" placeholder="VLAN列表 (例: 1 10 20)"
                  style="flex:1;margin-left:8px;" size="small" />
                <el-input-number v-model.number="inst.priority" :step="4096" :min="0" :max="61440"
                  label="优先级" size="small" style="width:110px;margin-left:8px;" />
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.mstInstances.splice(idx,1)" style="margin-left:8px;"
                  :disabled="cfg.mstInstances.length <= 1" />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <el-form-item label="桥优先级">
            <el-select v-model="cfg.bridgePriority" @change="onChange">
              <el-option label="32768 (默认)" :value="32768" />
              <el-option label="4096 (根桥候选)" :value="4096" />
              <el-option label="8192" :value="8192" />
              <el-option label="16384" :value="16384" />
              <el-option label="24576" :value="24576" />
            </el-select>
          </el-form-item>
        </template>

        <el-divider content-position="left">端口保护</el-divider>
        <el-form-item label="边缘端口">
          <el-switch v-model="cfg.edgePorts" active-text="" inactive-text=""
            @change="onChange" />
        </el-form-item>
        <el-form-item label="BPDU保护">
          <el-switch v-model="cfg.bpduProtect" active-text="" inactive-text=""
            @change="onChange" />
        </el-form-item>
      </el-form>

      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('stp') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('stp')" v-if="store.generateModuleCommands('stp')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置STP/MSTP" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.stp)

function addInstance() {
  if (!cfg.value) return
  const lastInst = cfg.value.mstInstances[cfg.value.mstInstances.length - 1]
  cfg.value.mstInstances.push({
    instance: (lastInst?.instance ?? 0) + 1,
    vlans: '',
    priority: 4096
  })
}

function onChange() { /* reactive */ }

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.sub-section { margin: 12px 0; }
.sub-header {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;
}
.inst-card {
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 12px; margin-bottom: 8px;
}
.inst-row { display: flex; align-items: center; }
</style>
